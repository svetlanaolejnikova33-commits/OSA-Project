/**
 * Parsing-ready semantic layout for visuals. Mock implementation — swap for Vision AI later.
 * @typedef {Object} SemanticDraft
 * @property {string[]} style
 * @property {string[]} materials
 * @property {string[]} palette
 * @property {string[]} objects
 * @property {string[]} lighting
 * @property {string[]} atmosphere
 * @property {string[]} possibleCategories
 * @property {string[]} possibleSupplierCategories
 */

const SEMANTIC_KEYS = [
  "style",
  "materials",
  "palette",
  "objects",
  "lighting",
  "atmosphere",
  "possibleCategories",
  "possibleSupplierCategories",
];

export function emptySemanticDraft() {
  return {
    style: [],
    materials: [],
    palette: [],
    objects: [],
    lighting: [],
    atmosphere: [],
    possibleCategories: [],
    possibleSupplierCategories: [],
  };
}

function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean);
}

/** Normalize persisted or partial drafts to a stable shape. */
export function normalizeSemanticDraft(input) {
  if (!input || typeof input !== "object") return emptySemanticDraft();
  const out = {};
  for (const k of SEMANTIC_KEYS) {
    out[k] = asStringArray(input[k]);
  }
  return out;
}

/**
 * Derive placeholder semantics from interior prompt text (mock).
 */
export function createSemanticDraftFromPrompt(promptText) {
  const pt = typeof promptText === "string" ? promptText.trim() : "";
  const draft = emptySemanticDraft();
  if (!pt) return draft;
  draft.style.push("concept-from-prompt-text");
  if (/\bдерево|деревянн|oak|дерев\b/i.test(pt)) draft.materials.push("wood-tones");
  if (/светл|минимал|бел\b/i.test(pt)) draft.atmosphere.push("light-tones");
  return draft;
}

/**
 * Refine semantics when user adds an edit instruction (mock).
 */
export function createSemanticDraftFromEdit(editInstruction, sourceSemanticDraft) {
  const base = normalizeSemanticDraft(sourceSemanticDraft);
  const ed = typeof editInstruction === "string" ? editInstruction.trim() : "";
  if (!ed) return normalizeSemanticDraft(base);
  const next = normalizeSemanticDraft(base);
  next.style.push(`edit-note:${ed.slice(0, 120)}`);
  return next;
}

/**
 * SKU / catalog funnel placeholder (mock).
 */
export function extractPossibleProductCategories(semanticDraft) {
  const d = normalizeSemanticDraft(semanticDraft);
  const tags = [...d.materials, ...d.objects];
  const out = [...d.possibleCategories];
  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.some((t) => t.includes("chair") || t.includes("стул"))) {
    out.push("seating");
  }
  if (lowerTags.some((t) => t.includes("lamp") || t.includes("свет"))) {
    out.push("lighting");
  }
  return [...new Set(out)].slice(0, 24);
}
