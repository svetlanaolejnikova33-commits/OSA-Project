import { randomUUID } from "crypto";
import { validateVisionJson } from "../visionJsonContract";
import { evaluateGateG3 } from "./gateG3";
import { rankCatalogMatches } from "./matchEngine";
import { getMockCatalogProducts } from "./mockCatalogProvider";
import { resolveManufacturerCatalog } from "./resolveManufacturerCatalog";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildNavigatorTraceId() {
  try {
    return randomUUID();
  } catch {
    return `ccn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function toProductCard(product, matchConfidence, navigatorTraceId, candidates) {
  if (!product) {
    return {
      source: "CCN",
      article: null,
      title: null,
      price: null,
      currency: null,
      url: null,
      specifications: {},
      match_confidence: matchConfidence,
      navigator_trace_id: navigatorTraceId,
      candidates,
    };
  }

  return {
    source: "CCN",
    article: product.article,
    title: product.title,
    price: product.price,
    currency: product.currency,
    url: product.url,
    specifications: product.specifications || {},
    match_confidence: matchConfidence,
    navigator_trace_id: navigatorTraceId,
    candidates,
  };
}

/**
 * Chief Catalog Navigator — Phase #3 mock path.
 *
 * Vision JSON → registry bind → mock catalog → match → Gate G3.
 *
 * @param {{
 *   vision: unknown,
 *   manufacturer_id: string,
 *   catalog_url?: string,
 * }} input
 */
export function runChiefCatalogNavigator(input) {
  const navigatorTraceId = buildNavigatorTraceId();
  const visionValidation = validateVisionJson(input?.vision);

  if (!visionValidation.ok || !visionValidation.vision) {
    return {
      ok: false,
      error: "Vision JSON validation failed.",
      visionErrors: visionValidation.errors,
      gate: {
        decision: "fail",
        reason: "invalid Vision JSON",
        match_confidence: 0,
      },
      product: toProductCard(null, 0, navigatorTraceId, []),
      manufacturer: null,
    };
  }

  const manufacturerId = asString(input?.manufacturer_id);
  const binding = resolveManufacturerCatalog(manufacturerId);

  if (!binding) {
    return {
      ok: false,
      error: `Unknown manufacturer_id: ${manufacturerId || "(empty)"}`,
      visionErrors: [],
      gate: {
        decision: "fail",
        reason: "manufacturer not found in registry binding",
        match_confidence: 0,
      },
      product: toProductCard(null, 0, navigatorTraceId, []),
      manufacturer: null,
    };
  }

  const catalogUrl = asString(input?.catalog_url) || binding.catalog_url;
  const products = getMockCatalogProducts(binding.manufacturer_id);

  if (!products.length) {
    return {
      ok: false,
      error: `No mock catalog products for manufacturer_id: ${binding.manufacturer_id}`,
      visionErrors: [],
      gate: {
        decision: "fail",
        reason: "empty mock catalog",
        match_confidence: 0,
      },
      product: toProductCard(null, 0, navigatorTraceId, []),
      manufacturer: { ...binding, catalog_url: catalogUrl },
    };
  }

  const ranked = rankCatalogMatches(visionValidation.vision, products);
  const gate = evaluateGateG3(ranked);
  const candidates = ranked.map(({ fieldScores, ...rest }) => rest);

  const selected =
    gate.decision === "accept"
      ? gate.product
      : null;

  const productCard = toProductCard(
    selected,
    gate.match_confidence,
    navigatorTraceId,
    candidates,
  );

  return {
    ok: gate.decision !== "fail",
    error: gate.decision === "fail" ? gate.reason : null,
    visionErrors: [],
    gate: {
      decision: gate.decision,
      reason: gate.reason,
      match_confidence: gate.match_confidence,
    },
    vision: visionValidation.vision,
    manufacturer: { ...binding, catalog_url: catalogUrl },
    product: productCard,
  };
}
