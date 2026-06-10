import { mapSpecToSupplierRegistry } from "../mapSpecToSupplierRegistry";

const LIGHTING_PENDANTS_ID = "lighting.pendants";
/**
 * @typedef {Object} VisualProductCandidate
 * @property {string} productName
 * @property {string|null} imageUrl
 * @property {string} productUrl
 * @property {number} visualMatchScore
 * @property {string[]} visualMatchReasons
 */

/**
 * Detect lighting.pendants from semantic draft (spec groups / scene graph).
 * @param {object|null|undefined} semanticDraft
 * @returns {boolean}
 */
export function hasLightingPendantsCategory(semanticDraft) {
  if (!semanticDraft || typeof semanticDraft !== "object") return false;

  const specAnalysis = semanticDraft.specAnalysis;
  if (specAnalysis && typeof specAnalysis === "object") {
    const { normalizedSpecGroups } = mapSpecToSupplierRegistry({ specAnalysis });
    if (
      Array.isArray(normalizedSpecGroups) &&
      normalizedSpecGroups.some((group) => group?.registryCategoryId === LIGHTING_PENDANTS_ID)
    ) {
      return true;
    }
  }

  const sceneObjects = semanticDraft.sceneGraph?.objects;
  if (Array.isArray(sceneObjects)) {
    return sceneObjects.some(
      (obj) =>
        obj?.categoryId === LIGHTING_PENDANTS_ID ||
        obj?.supplierCategoryId === LIGHTING_PENDANTS_ID,
    );
  }

  return false;
}

/**
 * Map raw catalog products to transient candidate shape (without ranking).
 * @param {Array<{ productName: string, productUrl: string, imageUrl: string|null }>} products
 * @returns {Array<{ productName: string, imageUrl: string|null, productUrl: string }>}
 */
export function toVisualProductCandidates(products) {
  const list = Array.isArray(products) ? products : [];
  return list.map((product) => ({
    productName: product.productName,
    imageUrl: product.imageUrl || null,
    productUrl: product.productUrl,
  }));
}

/**
 * Fetch raw Modelux catalog products for visual discovery (ranking applied separately).
 * @returns {Promise<Array<{ productName: string, imageUrl: string|null, productUrl: string }>>}
 */
export async function fetchVisualProductCandidates() {
  const response = await fetch("/api/registry/modelux-catalog");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Modelux catalog fetch failed.",
    );
  }

  return toVisualProductCandidates(payload.products);
}
