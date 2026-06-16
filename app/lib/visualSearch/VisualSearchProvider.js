/**
 * Visual search provider contract (plain JS).
 * Providers return raw results; pipeline normalizes via normalizeVisualCandidate().
 */

export const PROVIDER_IDS = {
  MOCK: "mock",
  JINA: "jina",
  GOOGLE_LENS: "google_lens",
};

/**
 * @typedef {Object} VisualSearchCapabilities
 * @property {boolean} imageSearch
 * @property {boolean} textSearch
 * @property {boolean} semanticDraftSearch
 */

/**
 * @typedef {Object} RawProviderResult
 * @property {string} [id]
 * @property {string} [title]
 * @property {string} [brand]
 * @property {string} [model]
 * @property {string|null} [imageUrl]
 * @property {string} [sourceUrl]
 * @property {number} [price]
 * @property {number} [visualMatchScore]
 * @property {object} [providerMeta]
 */

/**
 * @typedef {Object} VisualSearchProvider
 * @property {string} id
 * @property {VisualSearchCapabilities} capabilities
 * @property {(args: object) => Promise<RawProviderResult[]>} searchBySemanticDraft
 * @property {(args: object) => Promise<RawProviderResult[]>} searchByImage
 * @property {(raw: RawProviderResult, index?: number) => RawProviderResult} normalizeResult
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProviderResult(raw, index = 0) {
  const source = raw && typeof raw === "object" ? raw : {};
  const score = Number(source.visualMatchScore ?? source.visualMatchPercent);
  const visualSimilarityPercent = Number(source.visualSimilarityPercent ?? score);
  return {
    id: asString(source.id) || `provider-${index}`,
    title: asString(source.title) || asString(source.productName) || "Визуальный аналог",
    brand: asString(source.brand) || "—",
    model: asString(source.model) || asString(source.article) || "",
    imageUrl: source.imageUrl || source.image || null,
    sourceUrl: asString(source.sourceUrl) || asString(source.productUrl) || "",
    price: Number.isFinite(Number(source.price)) ? Number(source.price) : 0,
    visualMatchScore: Number.isFinite(score) ? score : 0,
    visualSimilarityPercent: Number.isFinite(visualSimilarityPercent) ? visualSimilarityPercent : 0,
    providerMeta: source.providerMeta && typeof source.providerMeta === "object" ? source.providerMeta : {},
  };
}
