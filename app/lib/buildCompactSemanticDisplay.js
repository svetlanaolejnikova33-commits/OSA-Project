/**
 * Presentation-only semantic style display contract.
 * Non-destructive — never mutates semanticDraft.
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const ANALYSIS_MODES = new Set(["quick", "pro", "spec"]);

function normalizeAnalysisMode(value) {
  const mode = asString(value).toLowerCase();
  return ANALYSIS_MODES.has(mode) ? mode : "pro";
}

function normalizeCompareKey(value) {
  return asString(value).toLowerCase().replace(/\s+/g, " ");
}

function isRedundant(candidate, corpusKeys) {
  const key = normalizeCompareKey(candidate);
  if (!key) return true;
  for (const existing of corpusKeys) {
    if (!existing) continue;
    if (existing === key || existing.includes(key) || key.includes(existing)) return true;
  }
  return false;
}

function pickLayer(semanticDraft, mode) {
  const normalized = normalizeAnalysisMode(mode);
  if (normalized === "quick") return semanticDraft?.quickAnalysis || {};
  if (normalized === "spec") return semanticDraft?.specAnalysis || {};
  return semanticDraft?.proAnalysis || {};
}

/**
 * @param {object} semanticDraft
 * @param {string} [mode]
 * @param {{ includeAtmosphere?: boolean }} [options]
 * @returns {{ styleTitle: string, styleSubtitle: string, summary: string, chips: string[] }}
 */
export function buildCompactSemanticDisplay(semanticDraft, mode = "pro", options = {}) {
  const { includeAtmosphere = true } = options;
  const layer = pickLayer(semanticDraft, mode);
  const style = layer?.styleAnalysis || {};

  const styleTitle = asString(style.labelRu) || asString(style.primary);
  const summary = asString(layer?.designIntent?.summaryRu);
  const spatialCharacterRu = asString(style.spatialCharacterRu);
  const atmosphereRu = includeAtmosphere ? asString(layer?.atmosphereRu) : "";

  const corpusKeys = [styleTitle, summary, spatialCharacterRu, atmosphereRu].map(normalizeCompareKey).filter(Boolean);

  const chips = [];
  for (const item of asArray(style.secondary).map(asString).filter(Boolean)) {
    if (!isRedundant(item, [...corpusKeys, ...chips.map(normalizeCompareKey)])) {
      chips.push(item);
      corpusKeys.push(normalizeCompareKey(item));
    }
  }

  let styleSubtitle = "";
  if (spatialCharacterRu && !isRedundant(spatialCharacterRu, corpusKeys)) {
    styleSubtitle = spatialCharacterRu;
    corpusKeys.push(normalizeCompareKey(spatialCharacterRu));
  }

  if (atmosphereRu && !isRedundant(atmosphereRu, corpusKeys)) {
    if (!styleSubtitle) {
      styleSubtitle = atmosphereRu;
      corpusKeys.push(normalizeCompareKey(atmosphereRu));
    } else if (!isRedundant(atmosphereRu, [...corpusKeys, normalizeCompareKey(styleSubtitle)])) {
      chips.push(atmosphereRu);
      corpusKeys.push(normalizeCompareKey(atmosphereRu));
    }
  }

  return { styleTitle, styleSubtitle, summary, chips };
}

/** Concatenated display text for regression guards. */
export function buildCompactSemanticDisplayText(display) {
  return [display?.styleTitle, display?.styleSubtitle, display?.summary, ...(display?.chips || [])]
    .filter(Boolean)
    .join(" ");
}

export function hasCompactSemanticDisplayContent(display) {
  if (!display) return false;
  return Boolean(
    display.styleTitle || display.styleSubtitle || display.summary || (display.chips && display.chips.length),
  );
}
