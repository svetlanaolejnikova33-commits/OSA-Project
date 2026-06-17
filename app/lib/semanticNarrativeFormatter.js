/**
 * Presentation-only formatter: semanticDraft → designer-facing narrative.
 * Non-destructive — never mutates semanticDraft.
 */

import { ANALYSIS_MODE_LABELS_RU, normalizeAnalysisMode } from "./validateSemanticDraft";
import {
  buildCompactSemanticDisplay,
  buildCompactSemanticDisplayText,
} from "./buildCompactSemanticDisplay";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueStrings(values, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = asString(value);
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function joinSentences(parts) {
  return uniqueStrings(parts, 6)
    .map((part) => {
      const text = part.replace(/\s+/g, " ").trim();
      if (!text) return "";
      return /[.!?…]$/.test(text) ? text : `${text}.`;
    })
    .filter(Boolean)
    .join(" ");
}

function pickLayer(semanticDraft, analysisMode) {
  const mode = normalizeAnalysisMode(analysisMode);
  const quick = semanticDraft?.quickAnalysis || {};
  const pro = semanticDraft?.proAnalysis || {};
  const spec = semanticDraft?.specAnalysis || {};

  if (mode === "quick") return { mode, layer: quick, quick, pro, spec };
  if (mode === "spec") return { mode, layer: spec, quick, pro, spec };
  return { mode, layer: pro, quick, pro, spec };
}

function collectMaterialPhrases(layer, pro) {
  const phrases = [];
  const materialAnalysis = pro?.materialAnalysis || layer?.materialAnalysis || {};

  for (const items of Object.values(materialAnalysis)) {
    for (const item of asArray(items)) {
      const parts = uniqueStrings([item?.finish, item?.possibleMaterial, item?.texture, item?.tone], 4);
      if (parts.length) phrases.push(parts.join(" "));
    }
  }

  for (const item of asArray(pro?.furnitureAnalysis || layer?.furnitureAnalysis)) {
    phrases.push(
      uniqueStrings([item?.materialGuess, item?.finish, item?.color, item?.labelRu || item?.type], 4).join(" ")
    );
  }

  for (const item of asArray(pro?.floorAnalysis || layer?.floorAnalysis)) {
    phrases.push(uniqueStrings([item?.finish, item?.materialGuess, item?.tone], 3).join(" "));
  }

  for (const item of asArray(pro?.textileAnalysis || layer?.textileAnalysis)) {
    phrases.push(uniqueStrings([item?.materialGuess, item?.texture, item?.labelRu || item?.type], 3).join(" "));
  }

  return uniqueStrings(phrases.filter(Boolean), 6);
}

function describeFocalElements(pro) {
  const furniture = asArray(pro?.furnitureAnalysis)
    .slice(0, 2)
    .map((item) => {
      const label = asString(item?.labelRu) || asString(item?.type);
      if (!label) return "";
      const material = asString(item?.materialGuess);
      const finish = asString(item?.finish);
      const detail = uniqueStrings([finish, material], 2).join(" ");
      return detail ? `${detail} ${label.toLowerCase()}` : label.toLowerCase();
    })
    .filter(Boolean);

  const lighting = asArray(pro?.lightingAnalysis?.artificialLight)
    .slice(0, 2)
    .map((item) => asString(item?.labelRu) || asString(item?.type))
    .filter(Boolean)
    .map((label) => label.toLowerCase());

  if (furniture.length && lighting.length) {
    const hero = furniture.length > 1 ? `являются ${furniture.join(" и ")}` : `является ${furniture[0]}`;
    return `Центральным элементом композиции ${hero} с акцентным ${lighting.join(" и ")}`;
  }
  if (furniture.length) {
    const hero = furniture.length > 1 ? `являются ${furniture.join(" и ")}` : `является ${furniture[0]}`;
    return `Центральным элементом композиции ${hero}`;
  }
  if (lighting.length) {
    return `Композицию поддержива${lighting.length > 1 ? "ют" : "ет"} ${lighting.join(" и ")}`;
  }
  return "";
}

function buildStyleSection({ mode, layer, quick, pro, spec }) {
  const display = buildCompactSemanticDisplay(
    { quickAnalysis: quick, proAnalysis: pro, specAnalysis: spec },
    mode,
    { includeAtmosphere: false },
  );

  const emotional =
    asString(layer?.designIntent?.emotionalEffectRu) ||
    asString(pro?.designIntent?.emotionalEffectRu) ||
    asString(quick?.designIntent?.emotionalEffectRu);

  const driverChips = uniqueStrings([
    ...asArray(layer?.designIntent?.keyDesignDrivers),
    ...asArray(pro?.designIntent?.keyDesignDrivers),
  ]).filter((item) => !buildCompactSemanticDisplayText(display).toLowerCase().includes(item.toLowerCase()));

  const narrative = joinSentences([
    [display.styleTitle, display.styleSubtitle].filter(Boolean).join(". "),
    display.summary,
    emotional,
  ]);

  const chips = uniqueStrings([...display.chips, ...driverChips]).slice(0, 6);

  return {
    id: "style-intent",
    title: "Стиль и замысел",
    narrative,
    chips,
  };
}

function buildSpaceSection({ layer, pro, quick, spec }) {
  const room =
    asString(layer?.spaceType?.labelRu) ||
    asString(layer?.spaceType?.value) ||
    asString(pro?.spaceType?.labelRu) ||
    asString(quick?.spaceType?.labelRu) ||
    asString(spec?.spaceType?.labelRu) ||
    "Помещение";

  const zoneRoles = asArray(pro?.functionalZones)
    .map((zone) => asString(zone?.designRole) || asString(zone?.labelRu))
    .filter(Boolean);

  const activities =
    zoneRoles.length > 0
      ? zoneRoles.slice(0, 2).join(" и ").toLowerCase()
      : "отдыха и общения";

  const purpose = `${room} предназначена для ${activities}`;
  const focal = describeFocalElements(pro);

  return {
    id: "space-purpose",
    title: "Назначение помещения",
    narrative: joinSentences([purpose, focal]),
    chips: [],
  };
}

function buildAtmosphereSection({ layer, pro, quick }) {
  const atmosphere =
    asString(layer?.atmosphereRu) ||
    asString(pro?.atmosphereRu) ||
    asString(quick?.atmosphereRu) ||
    asString(pro?.lightingAnalysis?.overallLightingMood);

  const moodChips = uniqueStrings([
    ...asArray(pro?.lightingAnalysis?.technicalNotes),
    asString(pro?.lightingAnalysis?.overallLightingMood),
  ]).slice(0, 4);

  return {
    id: "atmosphere",
    title: "Атмосфера",
    narrative: atmosphere || joinSentences(moodChips),
    chips: [],
  };
}

function buildColorSection({ layer, pro, quick }) {
  const colorAnalysis = layer?.colorAnalysis || pro?.colorAnalysis || quick?.colorAnalysis || {};
  const logic =
    asString(colorAnalysis?.colorLogicRu) ||
    asString(colorAnalysis?.interpretedPalette?.descriptionRu);

  const swatches = uniqueStrings([
    ...asArray(colorAnalysis?.dominant).map((c) => asString(c?.labelRu) || asString(c?.hex)),
    ...asArray(colorAnalysis?.accents).map((c) => asString(c?.labelRu) || asString(c?.hex)),
    ...asArray(colorAnalysis?.extractedPalette?.dominant).map((c) => asString(c?.labelRu)),
    ...asArray(colorAnalysis?.extractedPalette?.accents).map((c) => asString(c?.labelRu)),
  ]).filter((c) => c && !/^#/.test(c));

  const narrative =
    logic ||
    (swatches.length
      ? `Палитра строится на ${swatches.slice(0, 4).join(", ").toLowerCase()} с аккуратным балансом света и тени`
      : "");

  return {
    id: "color-logic",
    title: "Цветовая логика",
    narrative,
    chips: swatches.slice(0, 5),
  };
}

function buildMaterialsSection({ layer, pro }) {
  const phrases = collectMaterialPhrases(layer, pro);
  const narrative = phrases.length ? `${phrases.join(", ")}.` : "";

  return {
    id: "materials",
    title: "Ключевые материалы",
    narrative,
    chips: [],
  };
}

function buildPreserveSection({ layer, pro, spec }) {
  const items = uniqueStrings([
    ...asArray(layer?.designIntent?.whatMustBePreserved),
    ...asArray(pro?.designIntent?.whatMustBePreserved),
    ...asArray(spec?.designIntent?.whatMustBePreserved),
  ]);

  const joined = items.join(", ");
  const narrative = joined ? `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.` : "";

  return {
    id: "preserve",
    title: "Что важно сохранить",
    narrative,
    chips: [],
  };
}

/**
 * @returns {{ modeLabel: string, sections: Array<{ id: string, title: string, narrative: string, chips: string[] }> }}
 */
export function buildDesignerNarrative(semanticDraft, analysisMode = "pro") {
  if (!semanticDraft) {
    return { modeLabel: "", sections: [] };
  }

  const ctx = pickLayer(semanticDraft, analysisMode);
  const sections = [
    buildStyleSection(ctx),
    buildSpaceSection(ctx),
    buildAtmosphereSection(ctx),
    buildColorSection(ctx),
    buildMaterialsSection(ctx),
    buildPreserveSection(ctx),
  ].filter((section) => section.narrative || section.chips?.length);

  return {
    modeLabel: ANALYSIS_MODE_LABELS_RU[ctx.mode] || ctx.mode,
    sections,
  };
}

function formatConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `${Math.round(num * 100)}%`;
}

/**
 * Raw technical lines for optional debug panel (presentation export only).
 */
export function buildTechnicalAiSnapshot(semanticDraft, analysisMode = "pro") {
  if (!semanticDraft) return [];
  const { layer, pro, quick, mode } = pickLayer(semanticDraft, analysisMode);
  const lines = [`Режим: ${ANALYSIS_MODE_LABELS_RU[mode] || mode}`];

  const space = asString(layer?.spaceType?.labelRu) || asString(layer?.spaceType?.value);
  if (space) lines.push(`${space} · ${formatConfidence(layer?.spaceType?.confidence)}`.trim());

  const style = asString(layer?.styleAnalysis?.labelRu) || asString(layer?.styleAnalysis?.primary);
  if (style) lines.push(`${style} · ${formatConfidence(layer?.styleAnalysis?.confidence)}`.trim());

  for (const zone of asArray(pro?.functionalZones)) {
    lines.push(
      [
        zone?.labelRu || zone?.type,
        zone?.position,
        zone?.importance,
        formatConfidence(zone?.confidence),
      ]
        .filter(Boolean)
        .join(" · ")
    );
  }

  for (const item of asArray(pro?.furnitureAnalysis)) {
    lines.push(
      [
        item?.labelRu || item?.type,
        item?.position,
        item?.style,
        item?.materialGuess,
        item?.finish,
        item?.color,
        formatConfidence(item?.confidence),
      ]
        .filter(Boolean)
        .join(" · ")
    );
  }

  for (const item of asArray(pro?.lightingAnalysis?.artificialLight)) {
    lines.push(
      [
        item?.labelRu || item?.type,
        item?.position,
        item?.estimatedKelvin,
        formatConfidence(item?.confidence),
      ]
        .filter(Boolean)
        .join(" · ")
    );
  }

  if (!lines.length && asString(quick?.designIntent?.summaryRu)) {
    lines.push(asString(quick.designIntent.summaryRu));
  }

  return lines.filter(Boolean);
}
