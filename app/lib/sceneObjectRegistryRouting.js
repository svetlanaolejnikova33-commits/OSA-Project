/**
 * Direct Vision sceneGraph object.type → supplier registry category.
 * Used before corpus / TYPE_SYNONYMS / pendant fallbacks.
 */

const SCENE_OBJECT_TYPE_TO_REGISTRY_CATEGORY = {
  floor_lamp: "lighting.floor_lamps",
  pendant: "lighting.pendants",
  wall_lamp: "lighting.wall_sconces",
  wall_sconce: "lighting.wall_sconces",
  chandelier: "lighting.pendants",
  table_lamp: "lighting.table_lamps",
  spotlight: "lighting.recessed_lights",
};

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObjectType(value) {
  return asString(value).toLowerCase().replace(/\s+/g, "_");
}

export function resolveRegistryCategoryFromSceneObjectType(objectType) {
  const key = normalizeObjectType(objectType);
  return key ? SCENE_OBJECT_TYPE_TO_REGISTRY_CATEGORY[key] || null : null;
}

/**
 * First sceneGraph lighting object with a known GPT type token.
 * @param {object|null|undefined} semanticDraft
 * @returns {string|null} normalized object.type key (e.g. floor_lamp)
 */
export function resolveSceneObjectTypeFromSceneGraph(semanticDraft) {
  for (const obj of asArray(semanticDraft?.sceneGraph?.objects)) {
    const key = normalizeObjectType(obj?.type);
    if (key && SCENE_OBJECT_TYPE_TO_REGISTRY_CATEGORY[key]) return key;
  }
  return null;
}

/**
 * @param {object|null|undefined} semanticDraft
 * @returns {string|null}
 */
export function resolveRegistryCategoryFromSceneGraph(semanticDraft) {
  const objectType = resolveSceneObjectTypeFromSceneGraph(semanticDraft);
  return objectType ? resolveRegistryCategoryFromSceneObjectType(objectType) : null;
}
