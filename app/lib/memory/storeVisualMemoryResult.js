import { buildVisualFingerprint, getVisualMemoryStore } from "./visualMemoryStore";

/**
 * Persist a successful CCN / memory-verified result into Visual Memory.
 */
export function storeVisualMemoryResult(input, options = {}) {
  const store = options.store || getVisualMemoryStore();
  const vision = input?.vision && typeof input.vision === "object" ? input.vision : null;
  const product = input?.product && typeof input.product === "object" ? input.product : null;
  const manufacturer = input?.manufacturer && typeof input.manufacturer === "object" ? input.manufacturer : {};

  if (!vision || !product?.article) {
    return { ok: false, error: "vision and product.article are required.", record: null };
  }

  return store.upsert({
    visual_fingerprint: buildVisualFingerprint(vision),
    vision,
    manufacturer_id: manufacturer.manufacturer_id || input?.manufacturer_id,
    catalog_url: manufacturer.catalog_url || product.catalog_url || "",
    product_url: product.url || "",
    article: product.article,
    category: vision.category || product.category || "",
    confidence: product.match_confidence ?? vision.confidence ?? 0,
    match_type: product.match_type || input?.match_type || "ccn_live",
    last_verified_at: new Date().toISOString(),
  });
}
