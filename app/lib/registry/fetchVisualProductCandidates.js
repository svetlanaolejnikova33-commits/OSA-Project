import { mapSpecToSupplierRegistry } from "../mapSpecToSupplierRegistry";
import { resolveRegistryCategoryFromSceneGraph } from "../sceneObjectRegistryRouting";
import { extractVisualQuery } from "../visualProduct/rankVisualCandidates";
import { resolveRegistryCategoryFromVisualType } from "../visualProductDiscovery";

const LIGHTING_PENDANTS_ID = "lighting.pendants";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolve registry category for Modelux catalog fetch from semantic draft.
 * @param {object|null|undefined} semanticDraft
 * @returns {string|null}
 */
export function resolveRegistryCategoryIdFromSemanticDraft(semanticDraft) {
  if (!semanticDraft || typeof semanticDraft !== "object") return null;

  const fromSceneGraph = resolveRegistryCategoryFromSceneGraph(semanticDraft);
  if (fromSceneGraph) return fromSceneGraph;

  const visualQuery = extractVisualQuery(semanticDraft);
  const fromType = resolveRegistryCategoryFromVisualType(visualQuery?.type);
  if (fromType) return fromType;

  const specAnalysis = semanticDraft.specAnalysis;
  if (specAnalysis && typeof specAnalysis === "object") {
    const { normalizedSpecGroups } = mapSpecToSupplierRegistry({ specAnalysis });
    const lighting = normalizedSpecGroups.find((group) =>
      asString(group?.registryCategoryId).startsWith("lighting."),
    );
    if (lighting?.registryCategoryId) return asString(lighting.registryCategoryId);
  }

  const sceneObjects = semanticDraft.sceneGraph?.objects;
  if (Array.isArray(sceneObjects)) {
    const match = sceneObjects.find((obj) => asString(obj?.categoryId).startsWith("lighting."));
    if (match?.categoryId) return asString(match.categoryId);
  }

  return null;
}
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
 * @param {{ registryCategoryId?: string, semanticDraft?: object }} [options]
 * @returns {Promise<Array<{ productName: string, imageUrl: string|null, productUrl: string }>>}
 */
export async function fetchVisualProductCandidates(options = {}) {
  const explicitCategory = asString(options?.registryCategoryId);
  const draftCategory = options?.semanticDraft
    ? asString(resolveRegistryCategoryIdFromSemanticDraft(options.semanticDraft))
    : "";
  const registryCategoryId = explicitCategory || draftCategory;

  const url = registryCategoryId
    ? `/api/registry/modelux-catalog?registryCategoryId=${encodeURIComponent(registryCategoryId)}`
    : "/api/registry/modelux-catalog";

  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Modelux catalog fetch failed.",
    );
  }

  return toVisualProductCandidates(payload.products);
}
