/**
 * Phase 5J.4I — read-only semantic draft regression diagnostics.
 * Logs immediately after vision analysis, before registry/supplier processing.
 */

import {
  buildCompactSemanticDisplay,
  buildCompactSemanticDisplayText,
} from "./buildCompactSemanticDisplay";

const DEBUG_TAG = "[OSA-SEMANTIC-REGRESSION]";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pickLayer(semanticDraft, analysisMode = "pro") {
  const mode = asString(analysisMode) || "pro";
  if (mode === "quick") return semanticDraft?.quickAnalysis || {};
  if (mode === "spec") return semanticDraft?.specAnalysis || {};
  return semanticDraft?.proAnalysis || {};
}

function extractDesignIntent(semanticDraft) {
  return {
    quick: semanticDraft?.quickAnalysis?.designIntent || null,
    pro: semanticDraft?.proAnalysis?.designIntent || null,
    spec: semanticDraft?.specAnalysis?.designIntent || null,
  };
}

function extractRoomStyle(semanticDraft, analysisMode) {
  const layer = pickLayer(semanticDraft, analysisMode);
  return {
    spaceType: layer?.spaceType || null,
    styleAnalysis: layer?.styleAnalysis || null,
    atmosphereRu: asString(layer?.atmosphereRu) || null,
  };
}

function extractSummary(semanticDraft) {
  const quick = semanticDraft?.quickAnalysis?.designIntent?.summaryRu;
  const pro = semanticDraft?.proAnalysis?.designIntent?.summaryRu;
  const spec = semanticDraft?.specAnalysis?.designIntent?.summaryRu;
  return { quick, pro, spec };
}

function extractStyleKeywords(semanticDraft) {
  const layers = [
    semanticDraft?.quickAnalysis?.styleAnalysis,
    semanticDraft?.proAnalysis?.styleAnalysis,
    semanticDraft?.specAnalysis?.styleAnalysis,
  ];
  const keywords = new Set();
  for (const style of layers) {
    if (!style || typeof style !== "object") continue;
    if (asString(style.primary)) keywords.add(style.primary);
    if (asString(style.labelRu)) keywords.add(style.labelRu);
    for (const item of asArray(style.secondary)) {
      if (asString(item)) keywords.add(item);
    }
  }
  return [...keywords];
}

function extractMaterialPalette(semanticDraft) {
  return {
    quick: semanticDraft?.quickAnalysis?.materialAnalysis || null,
    pro: semanticDraft?.proAnalysis?.materialAnalysis || null,
    spec: semanticDraft?.specAnalysis?.materialAnalysis || null,
  };
}

function extractColorPalette(semanticDraft) {
  return {
    quick: semanticDraft?.quickAnalysis?.colorAnalysis || null,
    pro: semanticDraft?.proAnalysis?.colorAnalysis || null,
    spec: semanticDraft?.specAnalysis?.colorAnalysis || null,
  };
}

function containsArtDecoHint(value) {
  const text = JSON.stringify(value || "").toLowerCase();
  return /арт[\s-]?деко|art[\s-]?deco/.test(text);
}

/** Mirrors VisionAnalysisPanel compact semantic display contract. */
export function buildUiRenderPreview(semanticDraft, analysisMode = "pro") {
  const display = buildCompactSemanticDisplay(semanticDraft, analysisMode, { includeAtmosphere: true });
  const combinedText = buildCompactSemanticDisplayText(display);

  return {
    analysisMode,
    compactSummary: {
      styleLine: display.styleTitle,
      styleSubtitle: display.styleSubtitle,
      summaryLine: display.summary,
      chips: display.chips,
      combinedText,
    },
    styleSecondaryShownInFullProPanel: display.chips,
    styleSecondaryShownInCompactSummary: display.chips.length > 0,
    budgetPlacementShowsAnalysisText: false,
    pipelinePlacementUsesDesignerNarrative: true,
  };
}

export function buildSemanticDraftRegressionSnapshot(semanticDraft, { analysisMode = "pro", rawFromApi = null } = {}) {
  const uiPreview = buildUiRenderPreview(semanticDraft, analysisMode);
  const snapshot = {
    semanticDraft,
    specAnalysis: semanticDraft?.specAnalysis || null,
    designIntent: extractDesignIntent(semanticDraft),
    roomStyle: extractRoomStyle(semanticDraft, analysisMode),
    summary: extractSummary(semanticDraft),
    styleKeywords: extractStyleKeywords(semanticDraft),
    materialPalette: extractMaterialPalette(semanticDraft),
    colorPalette: extractColorPalette(semanticDraft),
    uiRenderPreview: uiPreview,
    artDeco: {
      inValidatedDraft: containsArtDecoHint(semanticDraft),
      inRawApiPayload: containsArtDecoHint(rawFromApi),
      inUiStyleLine: containsArtDecoHint(uiPreview.compactSummary.combinedText),
      inStyleSecondary: containsArtDecoHint(uiPreview.compactSummary.chips),
      inSummaryLine: containsArtDecoHint(uiPreview.compactSummary.summaryLine),
    },
    regressionHint:
      containsArtDecoHint(semanticDraft) && !containsArtDecoHint(uiPreview.compactSummary.combinedText)
        ? "C_UI_PARTIAL"
        : !containsArtDecoHint(semanticDraft) && containsArtDecoHint(rawFromApi)
          ? "B_LOST_IN_VALIDATE"
          : containsArtDecoHint(semanticDraft)
            ? "A_STILL_IN_DRAFT"
            : "B_LOST_OR_NEVER_PRESENT",
  };

  if (rawFromApi) {
    snapshot.rawApiComparison = {
      rawStyleLabelRu:
        rawFromApi?.proAnalysis?.styleAnalysis?.labelRu ||
        rawFromApi?.quickAnalysis?.styleAnalysis?.labelRu ||
        null,
      validatedStyleLabelRu:
        semanticDraft?.proAnalysis?.styleAnalysis?.labelRu ||
        semanticDraft?.quickAnalysis?.styleAnalysis?.labelRu ||
        null,
      rawStyleSecondary:
        rawFromApi?.proAnalysis?.styleAnalysis?.secondary ||
        rawFromApi?.quickAnalysis?.styleAnalysis?.secondary ||
        [],
      validatedStyleSecondary:
        semanticDraft?.proAnalysis?.styleAnalysis?.secondary ||
        semanticDraft?.quickAnalysis?.styleAnalysis?.secondary ||
        [],
    };
  }

  return snapshot;
}

export function logSemanticDraftRegressionDiagnostic(
  semanticDraft,
  { analysisMode = "pro", rawFromApi = null, context = "analyze-image-complete" } = {},
) {
  if (!semanticDraft) {
    console.log(DEBUG_TAG, { context, error: "semanticDraft is empty" });
    return null;
  }

  const snapshot = buildSemanticDraftRegressionSnapshot(semanticDraft, { analysisMode, rawFromApi });

  console.log(DEBUG_TAG, {
    context,
    specAnalysis: snapshot.specAnalysis,
    designIntent: snapshot.designIntent,
    roomStyle: snapshot.roomStyle,
    summary: snapshot.summary,
    styleKeywords: snapshot.styleKeywords,
    materialPalette: snapshot.materialPalette,
    colorPalette: snapshot.colorPalette,
    uiRenderPreview: snapshot.uiRenderPreview,
    artDeco: snapshot.artDeco,
    regressionHint: snapshot.regressionHint,
    rawApiComparison: snapshot.rawApiComparison || null,
  });

  console.log(DEBUG_TAG, "semanticDraft.full", snapshot.semanticDraft);

  return snapshot;
}
