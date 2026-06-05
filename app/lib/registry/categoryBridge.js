/** Google Sheets tab name → OSA supplierRegistry category ids. */
export const LIGHTING_SHEET_NAME = "ОСВЕЩЕНИЕ";

export const LIGHTING_CATEGORY_IDS = [
  "lighting",
  "lighting.pendants",
  "lighting.chandeliers",
  "lighting.wall_sconces",
  "lighting.floor_lamps",
  "lighting.table_lamps",
  "lighting.track_systems",
  "lighting.recessed_lights",
  "lighting.hidden_led",
];

const SHEET_CATEGORY_MAP = {
  [LIGHTING_SHEET_NAME]: LIGHTING_CATEGORY_IDS,
  OSVESHCENIE: LIGHTING_CATEGORY_IDS,
};

export function getCategoryIdsForSheet(sheetName) {
  const key = typeof sheetName === "string" ? sheetName.trim() : "";
  if (!key) return [];
  return SHEET_CATEGORY_MAP[key] || SHEET_CATEGORY_MAP[key.toUpperCase()] || [];
}
