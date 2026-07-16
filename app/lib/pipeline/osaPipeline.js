import { runChiefCatalogNavigator } from "../ccn/chiefCatalogNavigator";
import { evaluateGateG3 } from "../ccn/gateG3";
import { getCcnBrowserEnv, isCcnLiveEnabled } from "../ccn/live/env";
import { runChiefCatalogNavigatorLive } from "../ccn/live/ccnLiveAdapter";
import { resolveCatalogUrlForVision } from "../ccn/live/resolveLiveTarget";
import { resolveManufacturerCatalog } from "../ccn/resolveManufacturerCatalog";
import { buildRichVisualFingerprint } from "../buildRichVisualFingerprint";
import { recommendManufacturersByExperience } from "../memory/experienceMemory";
import { MEMORY_HIT_MIN, searchVisualMemory } from "../memory/fingerprintMatcher";
import {
  recordVisualMemoryFailure,
  storeVisualMemoryResult,
} from "../memory/storeVisualMemoryResult";
import { getVisualMemoryStore } from "../memory/visualMemoryStore";
import { verifyRememberedProduct } from "../memory/verifyRememberedProduct";
import { assemblePartialSpecification, assembleSpecification } from "../spec/specAssembler";
import { runGateG1 } from "./gateG1";
import { runCVO } from "./runCVO";

/**
 * Dispatch CCN: Mock by default; LOCAL Stagehand when OSA_CCN_LIVE=1.
 * Public product-card contract unchanged.
 */
async function runCcnNavigation({
  vision,
  manufacturer_id,
  catalog_url,
  memory_candidates,
  experience_candidates,
}) {
  if (isCcnLiveEnabled() && getCcnBrowserEnv() === "LOCAL") {
    return runChiefCatalogNavigatorLive({
      vision,
      manufacturer_id,
      catalog_url,
      memory_candidates,
      experience_candidates,
    });
  }
  return runChiefCatalogNavigator({
    vision,
    manufacturer_id,
    catalog_url,
  });
}

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

/**
 * Memory learning rules (Phase #8):
 * Live path learns only after verified page + article + G3 accept + confidence >= 0.80
 * and match_type exact|strong_analog. Mock / memory-verified paths keep prior learning.
 */
function shouldLearnMemory({ product, gateG3, livePath, memoryUsed }) {
  if (!product?.article) return false;
  if (gateG3?.decision !== "accept") return false;

  if (livePath) {
    if (product.source !== "CCN_LIVE") return false;
    if (Number(product.match_confidence) < 0.8) return false;
    if (!["exact", "strong_analog"].includes(product.match_type)) return false;
    return true;
  }

  // Mock CCN or memory-verified success (Phases #4–#7B).
  return Boolean(memoryUsed || product.source === "CCN" || product.match_type);
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
  experience_ranking,
  livePath,
}) {
  const memoryMeta = {
    used: Boolean(memory?.used),
    similarity: memory?.similarity ?? null,
    proposed_article: memory?.proposed_article ?? null,
    fallback: Boolean(memory?.fallback),
    experience_ranking: experience_ranking || [],
  };

  const assembled = assembleSpecification({
    vision,
    product,
    manufacturer,
    placement: placement || {},
    gates: { g1, g3: gateG3 },
    human_overrides: human_overrides || [],
    memory: memoryMeta,
    livePath: Boolean(livePath),
  });

  const canLearn = shouldLearnMemory({
    product,
    gateG3,
    livePath: Boolean(livePath),
    memoryUsed: Boolean(memory?.used),
  });

  const learned = canLearn
    ? storeVisualMemoryResult(
        {
          vision,
          product: {
            ...product,
            match_type:
              product.match_type || (memory?.used ? "memory_verified" : "ccn_live"),
            url: product.url,
          },
          manufacturer,
          match_type: product.match_type || (memory?.used ? "memory_verified" : "ccn_live"),
        },
        { store },
      )
    : { ok: false, record: null };

  return {
    status: "ok",
    ...assembled,
    manufacturer,
    memory: {
      ...memoryMeta,
      learned: Boolean(learned.ok),
      experience: learned.record?.experience || null,
    },
  };
}

function finishNeedsHuman({
  hitl,
  reason,
  vision,
  product,
  manufacturer,
  placement,
  g1,
  gateG3,
  memory,
  experience_ranking,
  livePath,
  candidates,
  extra = {},
}) {
  const memoryMeta = {
    used: Boolean(memory?.used),
    similarity: memory?.similarity ?? null,
    proposed_article: memory?.proposed_article ?? null,
    fallback: Boolean(memory?.fallback),
    experience_ranking: experience_ranking || memory?.experience_ranking || [],
    learned: false,
  };

  const partial = assemblePartialSpecification({
    vision,
    product: product || {},
    manufacturer: manufacturer || {},
    placement: placement || {},
    gates: { g1, g3: gateG3 },
    memory: memoryMeta,
    livePath: Boolean(livePath),
  });

  return {
    status: "needs_human",
    hitl,
    reason,
    vision,
    manufacturer,
    product: product || null,
    candidates: Array.isArray(candidates) ? candidates : product?.candidates || [],
    gates: { g1, g3: gateG3 },
    memory: memoryMeta,
    specification: partial.specification,
    estimate: partial.estimate,
    audit: partial.audit,
    missing_fields: partial.missing_fields,
    DesignerSummary: partial.DesignerSummary,
    partial_specification: true,
    ...extra,
  };
}

/**
 * OSA production pipeline orchestrator (Phase #9 — Specification Intelligence).
 *
 * Vision → Visual Memory → Experience → Registry → CCN → Spec Assembler → Estimate → Result
 */
export async function runOsaPipeline(input) {
  const store = input?.memoryStore || getVisualMemoryStore();
  const livePath = isCcnLiveEnabled() && getCcnBrowserEnv() === "LOCAL";

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

  const richFingerprint = buildRichVisualFingerprint(cvo.vision);
  const memorySearchOpen = searchVisualMemory(cvo.vision, {
    store,
    limit: 5,
  });
  const memoryCandidates = memorySearchOpen.ok ? memorySearchOpen.candidates : [];
  const topMemoryOpen = memoryCandidates[0] || null;

  const experienceRanking = recommendManufacturersByExperience(richFingerprint, {
    store,
  });

  // Manufacturer: explicit → experience → fail (registry resolve still required).
  let manufacturerId = asString(input?.manufacturer_id);
  if (!manufacturerId && experienceRanking.length) {
    manufacturerId = experienceRanking[0].manufacturer_id;
  }

  const manufacturer = resolveManufacturerCatalog(manufacturerId);
  if (!manufacturer) {
    return needsHumanPayload("H4", `Unknown manufacturer_id: ${manufacturerId || "(empty)"}`, {
      vision: cvo.vision,
      gates: { g1 },
      memory: {
        used: false,
        experience_ranking: experienceRanking,
      },
    });
  }

  const catalogUrl =
    asString(input?.catalog_url) ||
    resolveCatalogUrlForVision(manufacturer, cvo.vision) ||
    manufacturer.catalog_url;

  const memorySearch = searchVisualMemory(cvo.vision, {
    manufacturer_id: manufacturer.manufacturer_id,
    store,
    limit: 5,
  });
  const topMemory = memorySearch.ok
    ? memorySearch.candidates[0]
    : topMemoryOpen &&
        String(topMemoryOpen.manufacturer_id).toLowerCase() ===
          manufacturer.manufacturer_id.toLowerCase()
      ? topMemoryOpen
      : null;

  // Memory verify stays on mock catalog verification unless live path handles remembered URL later.
  if (!livePath && topMemory && topMemory.similarity >= MEMORY_HIT_MIN) {
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
        experience_ranking: experienceRanking,
        livePath: false,
      });
    }

    recordVisualMemoryFailure(
      {
        vision: cvo.vision,
        manufacturer_id: topMemory.manufacturer_id || manufacturer.manufacturer_id,
        catalog_url: topMemory.catalog_url || catalogUrl,
        article: topMemory.article,
      },
      { store },
    );
  }

  const ccn = await runCcnNavigation({
    vision: cvo.vision,
    manufacturer_id: manufacturer.manufacturer_id,
    catalog_url: catalogUrl,
    memory_candidates: memoryCandidates,
    experience_candidates: experienceRanking,
  });

  const g3 = evaluateGateG3(ccn.product?.candidates || []);
  const gateG3 = {
    decision: ccn.gate?.decision || g3.decision,
    reason: ccn.gate?.reason || g3.reason,
    match_confidence: ccn.gate?.match_confidence ?? g3.match_confidence,
  };

  if (gateG3.decision === "human_pick") {
    return finishNeedsHuman({
      hitl: "H3",
      reason: gateG3.reason,
      vision: cvo.vision,
      product: ccn.product,
      manufacturer: { ...manufacturer, catalog_url: catalogUrl },
      placement: input?.placement,
      g1,
      gateG3,
      memory: {
        used: false,
        similarity: topMemory?.similarity ?? null,
        proposed_article: topMemory?.article ?? null,
        fallback: Boolean(topMemory && topMemory.similarity >= MEMORY_HIT_MIN),
      },
      experience_ranking: experienceRanking,
      livePath,
      candidates: ccn.product?.candidates || [],
    });
  }

  if (gateG3.decision === "fail") {
    return finishNeedsHuman({
      hitl: "H4",
      reason: gateG3.reason,
      vision: cvo.vision,
      product: ccn.product,
      manufacturer: { ...manufacturer, catalog_url: catalogUrl },
      placement: input?.placement,
      g1,
      gateG3,
      memory: {
        used: false,
        similarity: topMemory?.similarity ?? null,
        proposed_article: topMemory?.article ?? null,
        fallback: Boolean(topMemory && topMemory.similarity >= MEMORY_HIT_MIN),
      },
      experience_ranking: experienceRanking,
      livePath,
      candidates: ccn.product?.candidates || [],
    });
  }

  return finishSuccess({
    vision: cvo.vision,
    product: {
      ...ccn.product,
      match_type: ccn.product?.match_type || (livePath ? ccn.product?.match_type : "ccn_live"),
    },
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
    experience_ranking: experienceRanking,
    livePath,
  });
}
