/**
 * Project-level product selection basket (localStorage).
 * UI/state only — not the final budget engine.
 */

export const OSA_PROJECT_SELECTION_KEY = "osa-project-selection-v1";

export const PROJECT_SELECTION_STATUS = {
  SELECTED: "selected",
  BUDGET: "budget",
  EXCLUDED: "excluded",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeParseArray(raw) {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readAllProjectSelectionRows() {
  if (typeof localStorage === "undefined") return [];
  return safeParseArray(localStorage.getItem(OSA_PROJECT_SELECTION_KEY));
}

function writeAllProjectSelectionRows(list) {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(OSA_PROJECT_SELECTION_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.warn("OSA: project selection write failed", e);
    return false;
  }
}

function normalizeProjectKey(projectKey) {
  return typeof projectKey === "string" ? projectKey.trim() : "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Stable id from category + brand + model/article + source.
 */
export function buildProjectSelectionItemId({
  category = "",
  brand = "",
  model = "",
  article = "",
  title = "",
  sourceUrl = "",
} = {}) {
  const modelKey = normalizeText(model) || normalizeText(article) || normalizeText(title);
  const parts = [
    normalizeText(category).toLowerCase(),
    normalizeText(brand).toLowerCase(),
    modelKey.toLowerCase(),
    normalizeText(sourceUrl).toLowerCase(),
  ].filter(Boolean);
  return parts.length ? parts.join("::") : "";
}

export function buildProjectSelectionItemFromBudgetRow(row, { status = PROJECT_SELECTION_STATUS.SELECTED } = {}) {
  const category =
    normalizeText(row?.category) || "Прочее";
  const brand = normalizeText(row?.brand) || "—";
  const model = normalizeText(row?.article) || "";
  const title = normalizeText(row?.productName) || model || "—";
  const sourceUrl = normalizeText(row?.productUrl) || normalizeText(row?.searchUrl) || "";
  const id = buildProjectSelectionItemId({ category, brand, model, article: model, title, sourceUrl });
  if (!id) return null;

  const price = Number(row?.unitPrice);
  const matchPercent = Number.isFinite(row?.matchScore) ? row.matchScore : null;

  return {
    id,
    category,
    brand,
    model,
    title,
    price: Number.isFinite(price) ? price : 0,
    image: row?.imageUrl || null,
    sourceUrl,
    matchPercent,
    status,
    addedAt: new Date().toISOString(),
  };
}

export function readProjectSelectionItems(projectKey) {
  const key = normalizeProjectKey(projectKey);
  if (!key) return [];
  return readAllProjectSelectionRows()
    .filter((row) => row && row.projectKey === key)
    .sort((a, b) => String(b?.addedAt || "").localeCompare(String(a?.addedAt || "")));
}

export function getProjectSelectionItem(projectKey, itemId) {
  const key = normalizeProjectKey(projectKey);
  const id = normalizeText(itemId);
  if (!key || !id) return null;
  return readAllProjectSelectionRows().find((row) => row && row.projectKey === key && row.id === id) || null;
}

export function addProjectSelectionItem(projectKey, item) {
  const key = normalizeProjectKey(projectKey);
  if (!key || !item?.id) return null;

  const rows = readAllProjectSelectionRows();
  const existingIndex = rows.findIndex((row) => row && row.projectKey === key && row.id === item.id);
  if (existingIndex >= 0) {
    return rows[existingIndex];
  }

  const nextItem = {
    ...item,
    projectKey: key,
    status: item.status || PROJECT_SELECTION_STATUS.SELECTED,
    addedAt: item.addedAt || new Date().toISOString(),
  };
  writeAllProjectSelectionRows([nextItem, ...rows]);
  return nextItem;
}

export function updateProjectSelectionItemStatus(projectKey, itemId, status) {
  const key = normalizeProjectKey(projectKey);
  const id = normalizeText(itemId);
  if (!key || !id || !status) return null;

  let updated = null;
  const rows = readAllProjectSelectionRows().map((row) => {
    if (!row || row.projectKey !== key || row.id !== id) return row;
    updated = { ...row, status, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) return null;
  writeAllProjectSelectionRows(rows);
  return updated;
}

export function sumBudgetSelectionItems(items) {
  return asArray(items)
    .filter((item) => item && item.status === PROJECT_SELECTION_STATUS.BUDGET)
    .reduce((sum, item) => {
      const price = Number(item?.price);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);
}

export function groupProjectSelectionByCategory(items) {
  const map = new Map();
  for (const item of asArray(items)) {
    if (!item) continue;
    const category = normalizeText(item.category) || "Прочее";
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(item);
  }
  return map;
}
