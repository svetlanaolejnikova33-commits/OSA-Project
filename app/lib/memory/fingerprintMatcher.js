import { asConfidence } from "../validateSemanticDraft";
import { fieldSimilarity } from "../ccn/matchEngine";
import { VISION_JSON_ATTRIBUTE_KEYS, validateVisionJson } from "../visionJsonContract";
import { getVisualMemoryStore } from "./visualMemoryStore";

/** Same attribute weights as CCN match engine — Vision JSON only. */
const MEMORY_FIELD_WEIGHTS = Object.freeze({
  category: 0.3,
  mounting: 0.2,
  material: 0.2,
  finish: 0.15,
  style: 0.1,
  shape: 0.05,
});

export const MEMORY_HIT_MIN = 0.95;

/**
 * Similarity between two Vision JSON objects (attribute-based, not embeddings).
 */
export function visionSimilarity(leftVision, rightVision) {
  let total = 0;
  for (const [field, weight] of Object.entries(MEMORY_FIELD_WEIGHTS)) {
    total += fieldSimilarity(leftVision?.[field], rightVision?.[field]) * weight;
  }
  return asConfidence(total);
}

/**
 * Search Visual Memory for remembered matches ordered by similarity.
 *
 * @param {unknown} visionInput
 * @param {{ manufacturer_id?: string, limit?: number, store?: import("./visualMemoryStore").VisualMemoryStore }} [options]
 * @returns {{ ok: boolean, error?: string, candidates: Array<{ similarity: number, manufacturer_id: string, article: string, product_url: string, catalog_url: string, category: string, confidence: number, match_type: string, last_verified_at: string }> }}
 */
export function searchVisualMemory(visionInput, options = {}) {
  const validation = validateVisionJson(visionInput);
  if (!validation.ok || !validation.vision) {
    return {
      ok: false,
      error: "Vision JSON validation failed.",
      visionErrors: validation.errors,
      candidates: [],
    };
  }

  const store = options.store || getVisualMemoryStore();
  const manufacturerFilter = typeof options.manufacturer_id === "string"
    ? options.manufacturer_id.trim().toLowerCase()
    : "";
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 10));

  const ranked = store
    .list()
    .filter((record) => {
      if (!manufacturerFilter) return true;
      return String(record.manufacturer_id).toLowerCase() === manufacturerFilter;
    })
    .map((record) => {
      const similarity = visionSimilarity(validation.vision, record.vision);
      return {
        similarity,
        manufacturer_id: record.manufacturer_id,
        article: record.article,
        product_url: record.product_url,
        catalog_url: record.catalog_url,
        category: record.category,
        confidence: record.confidence,
        match_type: record.match_type,
        last_verified_at: record.last_verified_at,
      };
    })
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      return String(a.article).localeCompare(String(b.article));
    })
    .slice(0, limit);

  return {
    ok: true,
    candidates: ranked,
  };
}

export { MEMORY_FIELD_WEIGHTS, VISION_JSON_ATTRIBUTE_KEYS };
