/** Map OSA registry category ids → product-name filter keywords for on-demand SKU resolve. */
const CATEGORY_KEYWORDS = {
  "lighting.pendants": ["подвес", "подвесной", "pendant"],
  "lighting.chandeliers": ["люстра", "chandelier"],
  "lighting.wall_sconces": ["настен", "бра", "sconce", "wall"],
  "lighting.floor_lamps": ["торшер", "напольн", "floor"],
  "lighting.table_lamps": ["настольн", "table lamp"],
  "lighting.track_systems": ["треков", "track"],
  "lighting.recessed_lights": ["встраива", "recessed", "downlight"],
  "lighting.hidden_led": ["лент", "led", "подсвет"],
  lighting: ["светильник", "люстр", "подвес", "lamp", "light"],
};

export function getSkuFilterKeywords(categoryId) {
  const id = typeof categoryId === "string" ? categoryId.trim().toLowerCase() : "";
  if (!id) return CATEGORY_KEYWORDS.lighting;
  if (CATEGORY_KEYWORDS[id]) return CATEGORY_KEYWORDS[id];
  if (id.startsWith("lighting.")) return CATEGORY_KEYWORDS.lighting;
  return [];
}

export function isLightingCategoryId(categoryId) {
  const id = typeof categoryId === "string" ? categoryId.trim().toLowerCase() : "";
  return id === "lighting" || id.startsWith("lighting.");
}
