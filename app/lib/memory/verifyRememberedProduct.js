import { randomUUID } from "crypto";
import { scoreProductAgainstVision } from "../ccn/matchEngine";
import { getMockCatalogProducts } from "../ccn/mockCatalogProvider";
import { resolveManufacturerCatalog } from "../ccn/resolveManufacturerCatalog";
import { asConfidence } from "../validateSemanticDraft";
import { validateVisionJson } from "../visionJsonContract";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildTraceId() {
  try {
    return randomUUID();
  } catch {
    return `mem-${Date.now()}`;
  }
}

/**
 * Verify a remembered product against the live (mock) catalog.
 * Memory never replaces CCN — this is the CCN verification step for memory proposals.
 *
 * @returns {{ ok: boolean, reason: string, product: object | null, manufacturer: object | null }}
 */
export function verifyRememberedProduct({
  vision,
  manufacturer_id,
  article,
  product_url,
  catalog_url,
}) {
  const visionValidation = validateVisionJson(vision);
  if (!visionValidation.ok || !visionValidation.vision) {
    return {
      ok: false,
      reason: "invalid Vision JSON",
      product: null,
      manufacturer: null,
    };
  }

  const binding = resolveManufacturerCatalog(manufacturer_id);
  if (!binding) {
    return {
      ok: false,
      reason: "manufacturer not found",
      product: null,
      manufacturer: null,
    };
  }

  const products = getMockCatalogProducts(binding.manufacturer_id);
  const articleKey = asString(article);
  const urlKey = asString(product_url);
  const found = products.find(
    (product) =>
      (articleKey && product.article === articleKey) ||
      (urlKey && product.url === urlKey),
  );

  if (!found) {
    return {
      ok: false,
      reason: "remembered_url_unavailable",
      product: null,
      manufacturer: {
        ...binding,
        catalog_url: asString(catalog_url) || binding.catalog_url,
      },
    };
  }

  const { score } = scoreProductAgainstVision(visionValidation.vision, found);
  if (score < 0.8) {
    return {
      ok: false,
      reason: "remembered_product_mismatch",
      product: null,
      manufacturer: {
        ...binding,
        catalog_url: asString(catalog_url) || binding.catalog_url,
      },
    };
  }

  const navigatorTraceId = buildTraceId();
  return {
    ok: true,
    reason: "memory_verified",
    manufacturer: {
      ...binding,
      catalog_url: asString(catalog_url) || binding.catalog_url,
    },
    product: {
      source: "CCN",
      article: found.article,
      title: found.title,
      price: found.price,
      currency: found.currency,
      url: found.url,
      specifications: found.specifications || {},
      match_confidence: asConfidence(score),
      navigator_trace_id: navigatorTraceId,
      candidates: [
        {
          article: found.article,
          title: found.title,
          price: found.price,
          currency: found.currency,
          url: found.url,
          specifications: found.specifications || {},
          match_confidence: asConfidence(score),
        },
      ],
      match_type: "memory_verified",
    },
  };
}
