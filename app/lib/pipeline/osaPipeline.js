import { runChiefCatalogNavigator } from "../ccn/chiefCatalogNavigator";
import { evaluateGateG3 } from "../ccn/gateG3";
import { resolveManufacturerCatalog } from "../ccn/resolveManufacturerCatalog";
import { MEMORY_HIT_MIN, searchVisualMemory } from "../memory/fingerprintMatcher";
import { storeVisualMemoryResult } from "../memory/storeVisualMemoryResult";
import { getVisualMemoryStore } from "../memory/visualMemoryStore";
import { verifyRememberedProduct } from "../memory/verifyRememberedProduct";
import { assembleSpecification } from "../spec/specAssembler";
import { runGateG1 } from "./gateG1";
import { runCVO } from "./runCVO";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function needsHumanPayload(hitl, reason, extra = {}) {
  return {
    status: "needs_human",
    hitl,
    reason,
    ...extra,
  };
}

function finishSuccess({
  vision,
  product,
  manufacturer,
  placement,
  g1,
  gateG3,
  human_overrides,
  memory,
  store,
}) {
  const assembled = assembleSpecification({
    vision,
    product,
    placement: placement || {},
    gates: { g1, g3: gateG3 },
    human_overrides: human_overrides || [],
  });

  const learned = storeVisualMemoryResult(
    {
      vision,
      product: {
        ...product,
        match_type: product.match_type || memory?.used ? "memory_verified" : "ccn_live",
      },
      manufacturer,
      match_type: product.match_type || (memory?.used ? "memory_verified" : "ccn_live"),
    },
    { store },
  );

  return {
    status: "ok",
    ...assembled,
    manufacturer,
    memory: {
      used: Boolean(memory?.used),
      similarity: memory?.similarity ?? null,
      proposed_article: memory?.proposed_article ?? null,
      fallback: Boolean(memory?.fallback),
      learned: Boolean(learned.ok),
    },
  };
}

/**
 * OSA production pipeline orchestrator (Phase #5 — Visual Memory).
 *
 * CVO → G1 → Visual Memory (≥0.95 propose) → verify via CCN
 *   else Registry → CCN → G3 → SpecAssembler (+ learn)
 *
 * @param {{
 *   vision?: unknown,
 *   imageBase64?: string,
 *   mimeType?: string,
 *   languageMode?: string,
 *   manufacturer_id: string,
 *   catalog_url?: string,
 *   placement?: object,
 *   human_overrides?: unknown[],
 *   memoryStore?: import("../memory/visualMemoryStore").VisualMemoryStore,
 * }} input
 */
export async function runOsaPipeline(input) {
  const store = input?.memoryStore || getVisualMemoryStore();

  const cvo = await runCVO({
    vision: input?.vision,
    imageBase64: input?.imageBase64,
    mimeType: input?.mimeType,
    languageMode: input?.languageMode,
    analysisMode: input?.analysisMode,
    extractedPalette: input?.extractedPalette,
  });

  if (!cvo.ok || !cvo.vision) {
    return needsHumanPayload("H1", cvo.error || "CVO failed", {
      visionErrors: cvo.visionErrors,
      semanticDraft: cvo.semanticDraft,
    });
  }

  const g1 = runGateG1(cvo.vision);
  if (g1.decision === "block") {
    return needsHumanPayload("H1", g1.reason, {
      vision: cvo.vision,
      gates: { g1 },
    });
  }

  const manufacturerId = asString(input?.manufacturer_id);
  const manufacturer = resolveManufacturerCatalog(manufacturerId);
  if (!manufacturer) {
    return needsHumanPayload("H4", `Unknown manufacturer_id: ${manufacturerId || "(empty)"}`, {
      vision: cvo.vision,
      gates: { g1 },
    });
  }

  const catalogUrl = asString(input?.catalog_url) || manufacturer.catalog_url;

  const memorySearch = searchVisualMemory(cvo.vision, {
    manufacturer_id: manufacturer.manufacturer_id,
    store,
    limit: 5,
  });
  const topMemory = memorySearch.ok ? memorySearch.candidates[0] : null;

  if (topMemory && topMemory.similarity >= MEMORY_HIT_MIN) {
    const verified = verifyRememberedProduct({
      vision: cvo.vision,
      manufacturer_id: topMemory.manufacturer_id || manufacturer.manufacturer_id,
      article: topMemory.article,
      product_url: topMemory.product_url,
      catalog_url: topMemory.catalog_url || catalogUrl,
    });

    if (verified.ok && verified.product) {
      const gateG3 = {
        decision: "accept",
        reason: "memory proposal verified by CCN",
        match_confidence: verified.product.match_confidence,
      };

      return finishSuccess({
        vision: cvo.vision,
        product: verified.product,
        manufacturer: verified.manufacturer || { ...manufacturer, catalog_url: catalogUrl },
        placement: input?.placement,
        g1,
        gateG3,
        human_overrides: input?.human_overrides,
        memory: {
          used: true,
          similarity: topMemory.similarity,
          proposed_article: topMemory.article,
          fallback: false,
        },
        store,
      });
    }

    // Remembered URL failed — continue Registry → CCN (do not stop).
  }

  const ccn = runChiefCatalogNavigator({
    vision: cvo.vision,
    manufacturer_id: manufacturer.manufacturer_id,
    catalog_url: catalogUrl,
  });

  const g3 = evaluateGateG3(ccn.product?.candidates || []);
  const gateG3 = {
    decision: ccn.gate?.decision || g3.decision,
    reason: ccn.gate?.reason || g3.reason,
    match_confidence: ccn.gate?.match_confidence ?? g3.match_confidence,
  };

  if (gateG3.decision === "human_pick") {
    return needsHumanPayload("H3", gateG3.reason, {
      vision: cvo.vision,
      manufacturer: { ...manufacturer, catalog_url: catalogUrl },
      product: ccn.product,
      candidates: ccn.product?.candidates || [],
      gates: { g1, g3: gateG3 },
      memory: {
        used: false,
        similarity: topMemory?.similarity ?? null,
        proposed_article: topMemory?.article ?? null,
        fallback: Boolean(topMemory && topMemory.similarity >= MEMORY_HIT_MIN),
      },
    });
  }

  if (gateG3.decision === "fail") {
    return needsHumanPayload("H4", gateG3.reason, {
      vision: cvo.vision,
      manufacturer: { ...manufacturer, catalog_url: catalogUrl },
      product: ccn.product,
      candidates: ccn.product?.candidates || [],
      gates: { g1, g3: gateG3 },
      memory: {
        used: false,
        similarity: topMemory?.similarity ?? null,
        proposed_article: topMemory?.article ?? null,
        fallback: Boolean(topMemory && topMemory.similarity >= MEMORY_HIT_MIN),
      },
    });
  }

  return finishSuccess({
    vision: cvo.vision,
    product: { ...ccn.product, match_type: "ccn_live" },
    manufacturer: { ...manufacturer, catalog_url: catalogUrl },
    placement: input?.placement,
    g1,
    gateG3,
    human_overrides: input?.human_overrides,
    memory: {
      used: false,
      similarity: topMemory?.similarity ?? null,
      proposed_article: topMemory?.article ?? null,
      fallback: Boolean(topMemory && topMemory.similarity >= MEMORY_HIT_MIN),
    },
    store,
  });
}
