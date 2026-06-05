import {
  buildEditableActionSuggestions,
  deriveEditableObjectsFromSceneGraph,
  normalizeEditableObjects,
  stabilizeEditableObjects,
} from "./editableObjectsUtils";
import { normalizeSceneGraph } from "./sceneGraphUtils";
import {
  attachStyleConsistencyImpactToEditableObjects,
  normalizeStyleConsistency,
} from "./styleConsistencyUtils";
import { deriveDesignMutations, normalizeDesignMutations } from "./designMutationUtils";
import { normalizeGenerationPackages } from "./generationPackageUtils";

export const SPACE_TYPE_VALUES = [
  "kitchen",
  "living_room",
  "bedroom",
  "bathroom",
  "hallway",
  "dining_room",
  "office",
  "open_space",
  "commercial",
  "unknown",
];

export const SPACE_TYPE_LABELS_RU = {
  kitchen: "РљСѓС…РЅСЏ",
  living_room: "Р“РѕСЃС‚РёРЅР°СЏ",
  bedroom: "РЎРїР°Р»СЊРЅСЏ",
  bathroom: "РЎР°РЅСѓР·РµР»",
  hallway: "РџСЂРёС…РѕР¶Р°СЏ",
  dining_room: "РЎС‚РѕР»РѕРІР°СЏ",
  office: "РљР°Р±РёРЅРµС‚",
  open_space: "РћС‚РєСЂС‹С‚РѕРµ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРѕ",
  commercial: "РљРѕРјРјРµСЂС‡РµСЃРєРѕРµ РїРѕРјРµС‰РµРЅРёРµ",
  unknown: "РќРµ РѕРїСЂРµРґРµР»РµРЅРѕ",
};

export const ANALYSIS_MODES = ["quick", "pro", "spec"];

export const ANALYSIS_MODE_LABELS_RU = {
  quick: "QUICK",
  pro: "PRO",
  spec: "SPEC",
};

const LANGUAGE_MODES = new Set(["ru", "en"]);
const IMPORTANCE_LEVELS = new Set(["primary", "secondary", "decorative"]);
const PRIORITY_LEVELS = new Set(["high", "medium", "low"]);
const RISK_LEVELS = new Set(["low", "medium", "high"]);
const LIGHT_INTENSITY = new Set(["low", "medium", "high"]);
const LIGHT_DIFFUSION = new Set(["direct", "diffused", "mixed"]);
const LIGHT_TEMPERATURE = new Set(["warm", "neutral", "cool"]);

const GENERIC_HALLUCINATION_TERMS = [
  "travertine",
  "boucle",
  "smoked glass",
  "oak veneer",
  "quiet luxury",
  "gallery mood",
  "japandi",
  "wabi",
  "editorial",
  "soft contemporary",
  "contemporary minimal",
  "warm minimal",
  "nordic minimal",
  "scandinavian",
  "microcement",
  "limewash",
  "smoked oak",
  "brushed brass",
  "matte black steel",
];

const UNCONFIRMED_RU = "РІРёР·СѓР°Р»СЊРЅРѕ РЅРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeAnalysisMode(value) {
  const mode = asString(value).toLowerCase();
  return ANALYSIS_MODES.includes(mode) ? mode : "pro";
}

export function normalizeVisionRequestMode(value) {
  const mode = asString(value).toLowerCase();
  if (mode === "full") return "full";
  if (ANALYSIS_MODES.includes(mode)) return "full";
  return "full";
}

function baseColorUiTheme() {
  return {
    background: "",
    surface: "",
    accent: "",
    glow: "",
    text: "",
  };
}

function baseExtractedPalette(source = "vision") {
  return {
    dominant: [],
    accents: [],
    averageWarmth: "",
    averageBrightness: "",
    contrastLevel: "",
    source,
  };
}

function baseInterpretedPalette() {
  return {
    dominant: [],
    accents: [],
    descriptionRu: "",
  };
}

function baseColorAnalysis() {
  return {
    extractedPalette: baseExtractedPalette(),
    interpretedPalette: baseInterpretedPalette(),
    dominant: [],
    accents: [],
    temperature: "",
    contrast: "",
    colorLogicRu: "",
    uiTheme: baseColorUiTheme(),
  };
}

function baseMaterialAnalysis() {
  return {
    floor: [],
    walls: [],
    ceiling: [],
    furniture: [],
    textiles: [],
    metal: [],
    stone: [],
    glass: [],
  };
}

function emptyPipelines() {
  const shell = () => ({
    version: 1,
    ready: false,
    nodes: [],
    edges: [],
    meta: {},
  });
  return {
    bimGraph: shell(),
    supplierGraph: shell(),
    skuGraph: shell(),
    editableSceneGraph: shell(),
  };
}

function asConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, Math.round(num * 100) / 100));
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function asBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function pickEnum(value, allowed, fallback) {
  const raw = asString(value).toLowerCase();
  return allowed.has(raw) ? raw : fallback;
}

function normalizeHexColor(value) {
  const raw = asString(value);
  if (!raw) return "";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const hex = raw.slice(1);
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
  }
  return "";
}

function looksGenericHallucination(value) {
  const text = asString(value).toLowerCase();
  if (!text) return false;
  return GENERIC_HALLUCINATION_TERMS.some((term) => text.includes(term));
}

function sanitizeDescriptor(value) {
  const text = asString(value);
  if (!text) return "";
  if (looksGenericHallucination(text)) return UNCONFIRMED_RU;
  return text;
}

function sanitizeList(values, limit = 12) {
  const seen = new Set();
  const out = [];
  for (const item of asStringArray(values)) {
    const next = sanitizeDescriptor(item);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out.slice(0, limit);
}

function asPaletteEntry(value) {
  if (typeof value === "string") {
    const text = asString(value);
    if (!text) return null;
    const hex = normalizeHexColor(text);
    return { hex, labelRu: hex ? "" : text };
  }
  if (!value || typeof value !== "object") return null;
  const hex = normalizeHexColor(value.hex || value.color || value.value);
  const labelRu = asString(value.labelRu || value.label || value.name);
  if (!hex && !labelRu) return null;
  return { hex, labelRu: labelRu || (hex ? "" : UNCONFIRMED_RU) };
}

function asPaletteEntries(value) {
  if (!Array.isArray(value)) return [];
  return value.map(asPaletteEntry).filter(Boolean).slice(0, 12);
}

function asUiTheme(value) {
  const fallback = baseColorUiTheme();
  if (!value || typeof value !== "object") return fallback;
  return {
    background: normalizeHexColor(value.background) || asString(value.background) || fallback.background,
    surface: normalizeHexColor(value.surface) || asString(value.surface) || fallback.surface,
    accent: normalizeHexColor(value.accent) || asString(value.accent) || fallback.accent,
    glow: normalizeHexColor(value.glow) || asString(value.glow) || fallback.glow,
    text: normalizeHexColor(value.text) || asString(value.text) || fallback.text,
  };
}

function deriveUiThemeFromPalette(dominant, accents) {
  const colors = [...dominant, ...accents]
    .map((entry) => entry.hex)
    .filter(Boolean)
    .slice(0, 5);
  if (!colors.length) return baseColorUiTheme();
  return {
    background: colors[0],
    surface: colors[1] || colors[0],
    accent: colors[2] || colors[1] || colors[0],
    glow: colors[3] || colors[2] || colors[1] || colors[0],
    text: "#2B2B2B",
  };
}

function asSpaceType(value, legacySceneType = "") {
  const source = value && typeof value === "object" ? value : {};
  const rawValue = asString(source.value || legacySceneType).toLowerCase().replace(/\s+/g, "_");
  const normalizedValue = SPACE_TYPE_VALUES.includes(rawValue) ? rawValue : "unknown";
  return {
    value: normalizedValue,
    confidence: asConfidence(source.confidence),
    labelRu:
      asString(source.labelRu) ||
      SPACE_TYPE_LABELS_RU[normalizedValue] ||
      SPACE_TYPE_LABELS_RU.unknown,
  };
}

function asFunctionalZones(value, legacySceneZones = []) {
  const source = Array.isArray(value) ? value : Array.isArray(legacySceneZones) ? legacySceneZones : [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const type = asString(item.type || item.id);
      const labelRu = asString(item.labelRu || item.label);
      const position = asString(item.position);
      const visibleElements = sanitizeList(item.visibleElements || item.elements, 10);
      const designRole = sanitizeDescriptor(asString(item.designRole || item.description));
      const importance = pickEnum(item.importance, IMPORTANCE_LEVELS, "secondary");
      const confidence = asConfidence(item.confidence);
      if (!type && !labelRu && !visibleElements.length) return null;
      return {
        type: type || "custom_zone",
        labelRu: labelRu || type,
        position,
        visibleElements,
        designRole,
        importance,
        confidence,
      };
    })
    .filter(Boolean)
    .slice(0, 16);
}

function asStyleAnalysis(value, legacyStyle = []) {
  const source = value && typeof value === "object" ? value : {};
  const legacyArray = Array.isArray(value) ? asStringArray(value) : asStringArray(legacyStyle);
  const primary = sanitizeDescriptor(asString(source.primary) || legacyArray[0]);
  const secondary = asStringArray(source.secondary).length
    ? sanitizeList(source.secondary, 8)
    : sanitizeList(legacyArray.slice(1), 8);
  return {
    primary,
    secondary,
    labelRu: sanitizeDescriptor(asString(source.labelRu) || primary),
    confidence: asConfidence(source.confidence),
    spatialCharacterRu: sanitizeDescriptor(asString(source.spatialCharacterRu)),
    formLanguageRu: sanitizeDescriptor(asString(source.formLanguageRu)),
  };
}

function asInterpretedPalette(value, legacyPalette = {}) {
  const source = value && typeof value === "object" ? value : {};
  const paletteSource = legacyPalette && typeof legacyPalette === "object" ? legacyPalette : {};
  const dominant = asPaletteEntries(source.dominant).length
    ? asPaletteEntries(source.dominant)
    : asPaletteEntries(paletteSource.dominant);
  const accents = asPaletteEntries(source.accents).length
    ? asPaletteEntries(source.accents)
    : asPaletteEntries(paletteSource.accents);
  const descriptionRu = sanitizeDescriptor(
    asString(source.descriptionRu || source.colorLogicRu || paletteSource.colorLogicRu)
  );
  return {
    dominant,
    accents,
    descriptionRu,
  };
}

function asExtractedPalette(value, visionFallback = null) {
  const source = value && typeof value === "object" ? value : {};
  const fallback = visionFallback && typeof visionFallback === "object" ? visionFallback : {};
  const dominant = asPaletteEntries(source.dominant).length
    ? asPaletteEntries(source.dominant)
    : asPaletteEntries(fallback.dominant);
  const accents = asPaletteEntries(source.accents).length
    ? asPaletteEntries(source.accents)
    : asPaletteEntries(fallback.accents);
  const sourceLabel = asString(source.source).toLowerCase() === "extracted" ? "extracted" : "vision";
  return {
    dominant,
    accents,
    averageWarmth: sanitizeDescriptor(asString(source.averageWarmth || fallback.averageWarmth || fallback.temperature)),
    averageBrightness: sanitizeDescriptor(asString(source.averageBrightness || fallback.averageBrightness)),
    contrastLevel: sanitizeDescriptor(asString(source.contrastLevel || fallback.contrastLevel || fallback.contrast)),
    source: dominant.length || accents.length ? sourceLabel : "vision",
  };
}

function asColorAnalysis(value, legacyPalette = {}, options = {}) {
  const source = value && typeof value === "object" ? value : {};
  const paletteSource = legacyPalette && typeof legacyPalette === "object" ? legacyPalette : {};
  const interpretedPalette = asInterpretedPalette(
    source.interpretedPalette || {
      dominant: source.dominant,
      accents: source.accents,
      descriptionRu: source.colorLogicRu,
    },
    paletteSource
  );
  const visionFallback = {
    dominant: interpretedPalette.dominant,
    accents: interpretedPalette.accents,
    temperature: asString(source.temperature || paletteSource.temperature),
    contrast: asString(source.contrast || paletteSource.contrast),
    averageWarmth: asString(source.temperature || paletteSource.temperature),
    averageBrightness: "",
    contrastLevel: asString(source.contrast || paletteSource.contrast),
  };
  const extractedInput = options.extractedPalette || source.extractedPalette;
  const extractedPalette = asExtractedPalette(extractedInput, visionFallback);
  const hasExtractedInput =
    extractedInput &&
    typeof extractedInput === "object" &&
    (asPaletteEntries(extractedInput.dominant).length || asPaletteEntries(extractedInput.accents).length);
  if (hasExtractedInput) {
    extractedPalette.source = "extracted";
  } else if (!extractedPalette.dominant.length && !extractedPalette.accents.length) {
    extractedPalette.dominant = visionFallback.dominant;
    extractedPalette.accents = visionFallback.accents;
    extractedPalette.source = visionFallback.dominant.length || visionFallback.accents.length ? "vision" : "vision";
  } else if (!extractedPalette.source) {
    extractedPalette.source = "vision";
  }
  const dominant = extractedPalette.dominant.length ? extractedPalette.dominant : interpretedPalette.dominant;
  const accents = extractedPalette.accents.length ? extractedPalette.accents : interpretedPalette.accents;
  const uiTheme = asUiTheme(source.uiTheme || paletteSource.uiTheme);
  const derivedUiTheme =
    uiTheme.background || uiTheme.surface || uiTheme.accent
      ? uiTheme
      : deriveUiThemeFromPalette(dominant, accents);
  return {
    extractedPalette,
    interpretedPalette,
    dominant,
    accents,
    temperature: extractedPalette.averageWarmth || visionFallback.temperature,
    contrast: extractedPalette.contrastLevel || visionFallback.contrast,
    colorLogicRu: interpretedPalette.descriptionRu || sanitizeDescriptor(asString(source.colorLogicRu)),
    uiTheme: derivedUiTheme,
  };
}

function asMaterialSpec(value) {
  if (!value || typeof value !== "object") return null;
  const materialFamily = sanitizeDescriptor(asString(value.materialFamily || value.family));
  const possibleMaterial = sanitizeDescriptor(asString(value.possibleMaterial || value.material));
  const texture = sanitizeDescriptor(asString(value.texture));
  const finish = sanitizeDescriptor(asString(value.finish));
  const tone = sanitizeDescriptor(asString(value.tone));
  const note = sanitizeDescriptor(asString(value.note));
  const confidence = asConfidence(value.confidence);
  if (!materialFamily && !possibleMaterial && !texture && !finish && !tone) return null;
  return {
    materialFamily,
    possibleMaterial: possibleMaterial || UNCONFIRMED_RU,
    texture,
    finish,
    tone,
    confidence,
    note,
  };
}

function asMaterialBucket(value) {
  if (!Array.isArray(value)) return [];
  return value.map(asMaterialSpec).filter(Boolean).slice(0, 10);
}

function asMaterialAnalysis(value, legacyMaterials = {}) {
  const fallback = baseMaterialAnalysis();
  const source = value && typeof value === "object" ? value : {};
  const legacy = legacyMaterials && typeof legacyMaterials === "object" ? legacyMaterials : {};
  const next = {};
  for (const key of Object.keys(fallback)) {
    const legacyKey = key === "textiles" ? "textile" : key;
    const bucket = source[key] ?? legacy[legacyKey] ?? legacy[key];
    next[key] = asMaterialBucket(bucket);
  }
  return next;
}

function asNaturalLight(value, legacyLighting = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    present: asBoolean(source.present, Boolean(asString(source.direction) || legacyLighting.natural)),
    direction: sanitizeDescriptor(asString(source.direction || legacyLighting.direction) || "unknown"),
    intensity: pickEnum(source.intensity, LIGHT_INTENSITY, "medium"),
    diffusion: pickEnum(source.diffusion, LIGHT_DIFFUSION, "mixed"),
    temperatureEstimate: pickEnum(source.temperatureEstimate, LIGHT_TEMPERATURE, "neutral"),
    estimatedKelvin: sanitizeDescriptor(asString(source.estimatedKelvin) || "unknown"),
  };
}

function asArtificialLight(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const type = asString(item.type);
      const labelRu = asString(item.labelRu || item.label);
      const position = asString(item.position);
      const lightRole = sanitizeDescriptor(asString(item.lightRole || item.role));
      const temperatureEstimate = pickEnum(item.temperatureEstimate, LIGHT_TEMPERATURE, "neutral");
      const estimatedKelvin = sanitizeDescriptor(asString(item.estimatedKelvin) || "unknown");
      const confidence = asConfidence(item.confidence);
      if (!type && !labelRu) return null;
      return {
        type,
        labelRu: labelRu || type,
        position,
        lightRole,
        temperatureEstimate,
        estimatedKelvin,
        confidence,
      };
    })
    .filter(Boolean)
    .slice(0, 16);
}

function asLightingAnalysis(value, legacyLighting = {}) {
  const source = value && typeof value === "object" ? value : {};
  const legacy = legacyLighting && typeof legacyLighting === "object" ? legacyLighting : {};
  const artificialSource = Array.isArray(source.artificialLight)
    ? source.artificialLight
    : Array.isArray(source.artificial)
      ? source.artificial
      : legacy.artificial;
  return {
    naturalLight: asNaturalLight(source.naturalLight, legacy),
    artificialLight: asArtificialLight(artificialSource),
    overallLightingMood: sanitizeDescriptor(asString(source.overallLightingMood)),
    technicalNotes: sanitizeList(source.technicalNotes, 8),
  };
}

function asTextileAnalysis(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const type = asString(item.type);
      const labelRu = asString(item.labelRu || item.label);
      const materialGuess = sanitizeDescriptor(asString(item.materialGuess || item.material));
      const texture = sanitizeDescriptor(asString(item.texture));
      const pattern = sanitizeDescriptor(asString(item.pattern));
      const colorRole = sanitizeDescriptor(asString(item.colorRole));
      const confidence = asConfidence(item.confidence);
      if (!type && !labelRu) return null;
      return {
        type,
        labelRu: labelRu || type,
        materialGuess: materialGuess || UNCONFIRMED_RU,
        texture,
        pattern,
        colorRole,
        confidence,
      };
    })
    .filter(Boolean)
    .slice(0, 16);
}

function asCeilingAnalysis(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    type: sanitizeDescriptor(asString(source.type) || "unknown"),
    labelRu: sanitizeDescriptor(asString(source.labelRu || source.label)),
    details: sanitizeList(source.details, 8),
    decorativeElements: sanitizeList(source.decorativeElements, 8),
    technicalNotes: sanitizeList(source.technicalNotes, 8),
    confidence: asConfidence(source.confidence),
  };
}

function asSurfaceAnalysisList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const zone = sanitizeDescriptor(asString(item.zone));
      const finish = sanitizeDescriptor(asString(item.finish));
      const texture = sanitizeDescriptor(asString(item.texture));
      const color = sanitizeDescriptor(asString(item.color));
      const decor = sanitizeList(item.decor, 8);
      const confidence = asConfidence(item.confidence);
      if (!zone && !finish && !texture && !color) return null;
      return { zone, finish, texture, color, decor, confidence };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function asFloorAnalysis(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const finish = sanitizeDescriptor(asString(item.finish));
      const materialGuess = sanitizeDescriptor(asString(item.materialGuess || item.material));
      const tone = sanitizeDescriptor(asString(item.tone));
      const details = sanitizeList(item.details, 8);
      const confidence = asConfidence(item.confidence);
      if (!finish && !materialGuess && !tone && !details.length) return null;
      return { finish, materialGuess: materialGuess || UNCONFIRMED_RU, tone, details, confidence };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function asFurnitureAnalysis(value, legacyObjects = []) {
  const source = Array.isArray(value) ? value : Array.isArray(legacyObjects) ? legacyObjects : [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const type = asString(item.type);
      const labelRu = asString(item.labelRu || item.label);
      const position = asString(item.position);
      const style = sanitizeDescriptor(asString(item.style));
      const materialGuess = sanitizeDescriptor(asString(item.materialGuess || item.material));
      const finish = sanitizeDescriptor(asString(item.finish));
      const color = sanitizeDescriptor(asString(item.color));
      const confidence = asConfidence(item.confidence);
      if (!type && !labelRu) return null;
      return {
        type,
        labelRu: labelRu || type,
        position,
        style,
        materialGuess: materialGuess || UNCONFIRMED_RU,
        finish,
        color,
        confidence,
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function asDecorAnalysis(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const type = asString(item.type);
      const labelRu = asString(item.labelRu || item.label);
      const position = asString(item.position);
      const confidence = asConfidence(item.confidence);
      if (!type && !labelRu) return null;
      return { type, labelRu: labelRu || type, position, confidence };
    })
    .filter(Boolean)
    .slice(0, 16);
}

function asProductCategories(value, legacySupplierCategories = []) {
  const source = Array.isArray(value) ? value : [];
  const legacy = Array.isArray(legacySupplierCategories) ? legacySupplierCategories : [];
  const fromObjects = source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const category = sanitizeDescriptor(asString(item.category));
      const reason = sanitizeDescriptor(asString(item.reason));
      const priority = pickEnum(item.priority, PRIORITY_LEVELS, "medium");
      if (!category) return null;
      return { category, reason, priority };
    })
    .filter(Boolean);
  if (fromObjects.length) return fromObjects.slice(0, 20);
  return legacy
    .map((item) => ({
      category: sanitizeDescriptor(asString(item)),
      reason: "",
      priority: "medium",
    }))
    .filter((item) => item.category)
    .slice(0, 20);
}

function asReplacementCandidates(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const target = sanitizeDescriptor(asString(item.target));
      const category = sanitizeDescriptor(asString(item.category));
      const reason = sanitizeDescriptor(asString(item.reason));
      const changeRisk = pickEnum(item.changeRisk || item.replacementRisk, RISK_LEVELS, "medium");
      const recommendation = sanitizeDescriptor(asString(item.recommendation));
      if (!target && !category) return null;
      return { target, category, reason, changeRisk, recommendation };
    })
    .filter(Boolean)
    .slice(0, 16);
}

function asDesignIntent(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    summaryRu: sanitizeDescriptor(asString(source.summaryRu || source.summary)),
    emotionalEffectRu: sanitizeDescriptor(asString(source.emotionalEffectRu || source.emotionalEffect)),
    keyDesignDrivers: sanitizeList(source.keyDesignDrivers, 8),
    whatMustBePreserved: sanitizeList(source.whatMustBePreserved, 8),
  };
}

function asBriefDesignIntent(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    summaryRu: sanitizeDescriptor(asString(source.summaryRu || source.summary)),
    emotionalEffectRu: sanitizeDescriptor(asString(source.emotionalEffectRu || source.emotionalEffect)),
  };
}

function asSpecificationAsset(value) {
  if (!value || typeof value !== "object") return null;
  const labelRu = asString(value.labelRu || value.target || value.label);
  const objectCategory = sanitizeDescriptor(asString(value.objectCategory));
  const supplierCategory = sanitizeDescriptor(asString(value.supplierCategory || value.category));
  const materialCategory = sanitizeDescriptor(asString(value.materialCategory));
  const replaceability = pickEnum(value.replaceability, RISK_LEVELS, "medium");
  const editablePotential = pickEnum(value.editablePotential, RISK_LEVELS, "medium");
  const budgetWeight = pickEnum(value.budgetWeight, PRIORITY_LEVELS, "medium");
  const specificationPriority = pickEnum(value.specificationPriority, PRIORITY_LEVELS, "medium");
  const zoneImportance = pickEnum(value.zoneImportance, IMPORTANCE_LEVELS, "secondary");
  const finishType = sanitizeDescriptor(asString(value.finishType || value.finish));
  const textureType = sanitizeDescriptor(asString(value.textureType || value.texture));
  const mountingType = sanitizeDescriptor(asString(value.mountingType));
  const lightingPurpose = sanitizeDescriptor(asString(value.lightingPurpose || value.lightRole));
  const estimatedMaterialClass = sanitizeDescriptor(
    asString(value.estimatedMaterialClass || value.materialCategory || value.materialGuess)
  );
  const probableExecutionType = sanitizeDescriptor(asString(value.probableExecutionType));
  const confidence = asConfidence(value.confidence);
  if (!labelRu && !objectCategory && !supplierCategory) return null;
  return {
    labelRu: labelRu || objectCategory || supplierCategory,
    objectCategory,
    supplierCategory,
    materialCategory,
    replaceability,
    editablePotential,
    budgetWeight,
    specificationPriority,
    zoneImportance,
    finishType,
    textureType,
    mountingType,
    lightingPurpose,
    estimatedMaterialClass: estimatedMaterialClass || UNCONFIRMED_RU,
    probableExecutionType,
    confidence,
  };
}

function asSpecificationAssets(value) {
  if (!Array.isArray(value)) return [];
  return value.map(asSpecificationAsset).filter(Boolean).slice(0, 32);
}

function asZoneSpecification(value) {
  if (!value || typeof value !== "object") return null;
  const zoneType = asString(value.zoneType || value.type);
  const labelRu = asString(value.labelRu || value.label);
  const zoneImportance = pickEnum(value.zoneImportance || value.importance, IMPORTANCE_LEVELS, "secondary");
  const specificationPriority = pickEnum(value.specificationPriority, PRIORITY_LEVELS, "medium");
  const budgetWeight = pickEnum(value.budgetWeight, PRIORITY_LEVELS, "medium");
  const supplierCategory = sanitizeDescriptor(asString(value.supplierCategory));
  const notes = sanitizeList(value.notes, 6);
  if (!zoneType && !labelRu) return null;
  return {
    zoneType: zoneType || "custom_zone",
    labelRu: labelRu || zoneType,
    zoneImportance,
    specificationPriority,
    budgetWeight,
    supplierCategory,
    notes,
  };
}

function asZoneSpecifications(value) {
  if (!Array.isArray(value)) return [];
  return value.map(asZoneSpecification).filter(Boolean).slice(0, 16);
}

function asSpecificationGroupItem(value) {
  if (!value || typeof value !== "object") return null;
  const name = sanitizeDescriptor(asString(value.name || value.labelRu || value.label));
  const category = sanitizeDescriptor(asString(value.category || value.supplierCategory));
  const visible = asBoolean(value.visible, true);
  const quantityEstimate = sanitizeDescriptor(asString(value.quantityEstimate || value.quantity));
  const replacementRisk = pickEnum(value.replacementRisk || value.replaceability, RISK_LEVELS, "medium");
  const skuReadiness = pickEnum(value.skuReadiness, PRIORITY_LEVELS, "medium");
  const note = sanitizeDescriptor(asString(value.note));
  if (!name && !category) return null;
  return {
    name: name || category,
    category,
    visible,
    quantityEstimate: quantityEstimate || "1",
    replacementRisk,
    skuReadiness,
    note,
  };
}

function asSpecificationGroups(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const group = sanitizeDescriptor(asString(entry.group));
      const priority = pickEnum(entry.priority, PRIORITY_LEVELS, "medium");
      const budgetWeight = pickEnum(entry.budgetWeight, PRIORITY_LEVELS, "medium");
      const items = Array.isArray(entry.items) ? entry.items.map(asSpecificationGroupItem).filter(Boolean) : [];
      if (!group && !items.length) return null;
      return {
        group: group || "Прочее",
        priority,
        budgetWeight,
        items: items.slice(0, 24),
      };
    })
    .filter(Boolean)
    .slice(0, 16);
}

function asPipelineGraph(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    version: Number.isFinite(Number(source.version)) ? Number(source.version) : 1,
    ready: asBoolean(source.ready, false),
    nodes: Array.isArray(source.nodes) ? source.nodes.slice(0, 64) : [],
    edges: Array.isArray(source.edges) ? source.edges.slice(0, 128) : [],
    meta: source.meta && typeof source.meta === "object" ? source.meta : {},
  };
}

function asPipelines(value) {
  const fallback = emptyPipelines();
  const source = value && typeof value === "object" ? value : {};
  return {
    bimGraph: asPipelineGraph(source.bimGraph || fallback.bimGraph),
    supplierGraph: asPipelineGraph(source.supplierGraph || fallback.supplierGraph),
    skuGraph: asPipelineGraph(source.skuGraph || fallback.skuGraph),
    editableSceneGraph: asPipelineGraph(source.editableSceneGraph || fallback.editableSceneGraph),
  };
}

function migrateLegacyParsed(parsed) {
  if (!parsed || typeof parsed !== "object") return {};
  if (parsed.quickAnalysis || parsed.proAnalysis || parsed.specAnalysis) {
    return parsed;
  }

  const legacyPalette = parsed.palette || parsed.colorAnalysis || {};
  const legacyStyle = parsed.style || parsed.styleAnalysis || [];
  const legacyMaterials = parsed.materials || parsed.materialAnalysis || {};
  const legacyLighting = parsed.lighting || parsed.lightingAnalysis || {};
  const legacyObjects = parsed.objects || parsed.furnitureAnalysis || [];
  const legacySceneZones = parsed.sceneZones || parsed.functionalZones || [];
  const legacySupplierCategories = parsed.supplierCategories || [];

  return {
    languageMode: parsed.languageMode,
    analysisMode: parsed.analysisMode,
    resultAnalysisMode: parsed.resultAnalysisMode || "pro",
    completedAnalysisModes: Array.isArray(parsed.completedAnalysisModes)
      ? parsed.completedAnalysisModes
      : ["pro"],
    proAnalysis: {
      spaceType: parsed.spaceType,
      styleAnalysis: parsed.styleAnalysis || legacyStyle,
      colorAnalysis: parsed.colorAnalysis || legacyPalette,
      functionalZones: legacySceneZones,
      lightingAnalysis: parsed.lightingAnalysis || legacyLighting,
      materialAnalysis: parsed.materialAnalysis || legacyMaterials,
      textileAnalysis: parsed.textileAnalysis,
      ceilingAnalysis: parsed.ceilingAnalysis,
      wallAnalysis: parsed.wallAnalysis,
      floorAnalysis: parsed.floorAnalysis,
      furnitureAnalysis: parsed.furnitureAnalysis || legacyObjects,
      decorAnalysis: parsed.decorAnalysis,
      atmosphereRu: parsed.atmosphereRu,
      productCategories: parsed.productCategories,
      designIntent: parsed.designIntent,
    },
    pipelines: parsed.pipelines,
    warnings: parsed.warnings,
    legacySupplierCategories,
  };
}

function sanitizeQuickAnalysis(quickSource, rootSource, languageMode, options = {}) {
  const source = quickSource && typeof quickSource === "object" ? quickSource : {};
  const legacyPalette = rootSource.palette || rootSource.colorAnalysis || {};
  const legacyStyle = rootSource.style || rootSource.styleAnalysis || [];
  const designIntent = asBriefDesignIntent(source.designIntent || rootSource.designIntent);
  const atmosphereRu = sanitizeDescriptor(
    asString(source.atmosphereRu || designIntent.emotionalEffectRu || rootSource.atmosphereRu)
  );
  return {
    spaceType: asSpaceType(source.spaceType || rootSource.spaceType, rootSource.sceneType),
    styleAnalysis: asStyleAnalysis(source.styleAnalysis || rootSource.styleAnalysis, legacyStyle),
    atmosphereRu,
    colorAnalysis: asColorAnalysis(source.colorAnalysis || rootSource.colorAnalysis, legacyPalette, options),
    designIntent,
  };
}

function sanitizeProAnalysis(proSource, rootSource, languageMode, options = {}) {
  const source = proSource && typeof proSource === "object" ? proSource : {};
  const quickSource = rootSource.quickAnalysis && typeof rootSource.quickAnalysis === "object" ? rootSource.quickAnalysis : {};
  const legacyPalette = rootSource.palette || rootSource.colorAnalysis || quickSource.colorAnalysis || {};
  const legacyStyle = rootSource.style || rootSource.styleAnalysis || quickSource.styleAnalysis || [];
  const legacyMaterials = rootSource.materials || rootSource.materialAnalysis || {};
  const legacyLighting = rootSource.lighting || rootSource.lightingAnalysis || {};
  const legacyObjects = rootSource.objects || rootSource.furnitureAnalysis || [];
  const legacySceneZones = rootSource.sceneZones || rootSource.functionalZones || [];
  const legacySupplierCategories = rootSource.legacySupplierCategories || rootSource.supplierCategories || [];
  const designIntent = asDesignIntent(source.designIntent || rootSource.designIntent || quickSource.designIntent);
  return {
    spaceType: asSpaceType(source.spaceType || quickSource.spaceType || rootSource.spaceType, rootSource.sceneType),
    styleAnalysis: asStyleAnalysis(source.styleAnalysis || quickSource.styleAnalysis || rootSource.styleAnalysis, legacyStyle),
    colorAnalysis: asColorAnalysis(
      source.colorAnalysis || quickSource.colorAnalysis || rootSource.colorAnalysis,
      legacyPalette,
      options
    ),
    functionalZones: asFunctionalZones(source.functionalZones, legacySceneZones),
    lightingAnalysis: asLightingAnalysis(source.lightingAnalysis || rootSource.lightingAnalysis, legacyLighting),
    materialAnalysis: asMaterialAnalysis(source.materialAnalysis || rootSource.materialAnalysis, legacyMaterials),
    textileAnalysis: asTextileAnalysis(source.textileAnalysis || rootSource.textileAnalysis),
    ceilingAnalysis: asCeilingAnalysis(source.ceilingAnalysis || rootSource.ceilingAnalysis),
    wallAnalysis: asSurfaceAnalysisList(source.wallAnalysis || rootSource.wallAnalysis),
    floorAnalysis: asFloorAnalysis(source.floorAnalysis || rootSource.floorAnalysis),
    furnitureAnalysis: asFurnitureAnalysis(source.furnitureAnalysis || rootSource.furnitureAnalysis, legacyObjects),
    decorAnalysis: asDecorAnalysis(source.decorAnalysis || rootSource.decorAnalysis),
    atmosphereRu: sanitizeDescriptor(asString(source.atmosphereRu || quickSource.atmosphereRu || rootSource.atmosphereRu)),
    designIntent,
  };
}

function stabilizeSpecificationGroups(specAnalysis, proAnalysis, sceneGraph = null) {
  const existing = asSpecificationGroups(specAnalysis?.specificationGroups);
  if (existing.length) return existing;

  const pro = proAnalysis && typeof proAnalysis === "object" ? proAnalysis : {};
  const groups = [];

  const pushGroup = (groupName, items, sourceField) => {
    const normalizedItems = items.filter(Boolean);
    if (!normalizedItems.length) return;
    groups.push({
      group: groupName,
      priority: "medium",
      budgetWeight: "medium",
      items: normalizedItems,
      source: "fallback",
      sourceField,
      sourceText: groupName,
    });
  };

  pushGroup(
    "Мебель",
    asArray(pro.furnitureAnalysis).map((item) =>
      asSpecificationGroupItem({
        name: item.labelRu,
        category: item.type,
        visible: true,
        quantityEstimate: "1",
      })
    ),
    "proAnalysis.furnitureAnalysis"
  );

  pushGroup(
    "Освещение",
    asArray(pro.lightingAnalysis?.artificialLight).map((item) =>
      asSpecificationGroupItem({
        name: item.labelRu,
        category: item.type || "lighting",
        visible: true,
        quantityEstimate: "1",
      })
    ),
    "proAnalysis.lightingAnalysis.artificialLight"
  );

  pushGroup(
    "Текстиль",
    asArray(pro.textileAnalysis).map((item) =>
      asSpecificationGroupItem({
        name: item.labelRu,
        category: item.type || "textile",
        visible: true,
        quantityEstimate: "1",
      })
    ),
    "proAnalysis.textileAnalysis"
  );

  pushGroup(
    "Отделка пола",
    asArray(pro.floorAnalysis).map((item) =>
      asSpecificationGroupItem({
        name: [item.finish, item.materialGuess, item.tone].filter(Boolean).join(" · ") || "Отделка пола",
        category: "floor_finish",
        visible: true,
        quantityEstimate: "1",
      })
    ),
    "proAnalysis.floorAnalysis"
  );

  pushGroup(
    "Отделка стен",
    asArray(pro.wallAnalysis).map((item) =>
      asSpecificationGroupItem({
        name: [item.zone, item.finish, item.texture].filter(Boolean).join(" · ") || "Отделка стен",
        category: "wall_finish",
        visible: true,
        quantityEstimate: "1",
      })
    ),
    "proAnalysis.wallAnalysis"
  );

  const ceiling = pro.ceilingAnalysis && typeof pro.ceilingAnalysis === "object" ? pro.ceilingAnalysis : {};
  if (asString(ceiling.labelRu) || asString(ceiling.type)) {
    pushGroup(
      "Потолок",
      [
        asSpecificationGroupItem({
          name: asString(ceiling.labelRu) || asString(ceiling.type),
          category: "ceiling",
          visible: true,
          quantityEstimate: "1",
        }),
      ],
      "proAnalysis.ceilingAnalysis"
    );
  }

  pushGroup(
    "Декор",
    asArray(pro.decorAnalysis).map((item) =>
      asSpecificationGroupItem({
        name: item.labelRu,
        category: item.type || "decor",
        visible: true,
        quantityEstimate: "1",
      })
    ),
    "proAnalysis.decorAnalysis"
  );

  const materialAnalysis = pro.materialAnalysis && typeof pro.materialAnalysis === "object" ? pro.materialAnalysis : {};
  const floorMaterials = [];
  const wallMaterials = [];
  for (const [bucketKey, bucketItems] of Object.entries(materialAnalysis)) {
    for (const item of asArray(bucketItems)) {
      const labelRu =
        typeof item === "string"
          ? item
          : asString(item?.possibleMaterial || item?.materialFamily || item?.materialGuess || item?.texture);
      const specItem = asSpecificationGroupItem({
        name: labelRu,
        category: bucketKey,
        visible: true,
        quantityEstimate: "1",
      });
      if (!specItem) continue;
      if (/floor|пол/i.test(bucketKey)) floorMaterials.push(specItem);
      else if (/wall|стен/i.test(bucketKey)) wallMaterials.push(specItem);
      else wallMaterials.push(specItem);
    }
  }
  if (floorMaterials.length) {
    pushGroup("Отделка пола", floorMaterials, "proAnalysis.materialAnalysis");
  }
  if (wallMaterials.length) {
    pushGroup("Отделка стен", wallMaterials, "proAnalysis.materialAnalysis");
  }

  const sceneObjects = asArray(sceneGraph?.objects);
  if (sceneObjects.length) {
    const sceneFurniture = [];
    const sceneLighting = [];
    const sceneTextile = [];
    const sceneDecor = [];
    for (const object of sceneObjects) {
      const item = asSpecificationGroupItem({
        name: object.labelRu,
        category: object.type,
        visible: true,
        quantityEstimate: "1",
      });
      if (!item) continue;
      const haystack = `${object.type} ${object.labelRu}`.toLowerCase();
      if (/light|свет|lamp|люстр|бра/i.test(haystack)) sceneLighting.push(item);
      else if (/textile|текстил|штор|ковер|ковёр/i.test(haystack)) sceneTextile.push(item);
      else if (/decor|декор|mirror|зеркал/i.test(haystack)) sceneDecor.push(item);
      else if (/wall|стен|floor|пол|ceiling|потол/i.test(haystack)) continue;
      else sceneFurniture.push(item);
    }
    pushGroup("Мебель", sceneFurniture, "sceneGraph.objects");
    pushGroup("Освещение", sceneLighting, "sceneGraph.objects");
    pushGroup("Текстиль", sceneTextile, "sceneGraph.objects");
    pushGroup("Декор", sceneDecor, "sceneGraph.objects");
  }

  return groups;
}

function sanitizeSpecAnalysis(specSource, rootSource) {
  const source = specSource && typeof specSource === "object" ? specSource : {};
  const proSource = rootSource.proAnalysis && typeof rootSource.proAnalysis === "object" ? rootSource.proAnalysis : {};
  const replacementCandidates = asReplacementCandidates(
    source.replacementCandidates || rootSource.replacementCandidates
  );
  const specificationAssets = asSpecificationAssets(source.specificationAssets);
  const derivedAssets = specificationAssets.length
    ? specificationAssets
    : replacementCandidates
        .map((item) =>
          asSpecificationAsset({
            labelRu: item.target,
            supplierCategory: item.category,
            specificationPriority: item.changeRisk === "high" ? "high" : "medium",
            replaceability: item.changeRisk,
            probableExecutionType: item.recommendation,
          })
        )
        .filter(Boolean);
  const designIntent = asDesignIntent(source.designIntent || proSource.designIntent || rootSource.designIntent);
  const specificationGroups = asSpecificationGroups(source.specificationGroups);
  const derivedGroups = specificationGroups.length
    ? specificationGroups
    : derivedAssets.reduce((groups, asset) => {
        const groupName = sanitizeDescriptor(asString(asset.materialCategory || asset.supplierCategory?.split("/")[0])) || "Прочее";
        const existing = groups.find((entry) => entry.group === groupName);
        const item = asSpecificationGroupItem({
          name: asset.labelRu,
          category: asset.supplierCategory || asset.objectCategory,
          visible: true,
          quantityEstimate: "1",
          replacementRisk: asset.replaceability,
          skuReadiness: asset.specificationPriority,
          note: asset.probableExecutionType,
        });
        if (!item) return groups;
        if (existing) {
          existing.items.push(item);
          return groups;
        }
        groups.push({
          group: groupName,
          priority: asset.specificationPriority,
          budgetWeight: asset.budgetWeight,
          items: [item],
        });
        return groups;
      }, []);
  return {
    functionalZones: asFunctionalZones(source.functionalZones, proSource.functionalZones),
    productCategories: asProductCategories(source.productCategories, proSource.productCategories),
    supplierCategories: asProductCategories(source.supplierCategories),
    specificationGroups: derivedGroups,
    specificationAssets: derivedAssets,
    zoneSpecifications: asZoneSpecifications(source.zoneSpecifications),
    replacementCandidates,
    procurementNotes: sanitizeList(source.procurementNotes, 12),
    whatMustBePreserved: sanitizeList(source.whatMustBePreserved || designIntent.whatMustBePreserved, 8),
  };
}

function hasQuickLayerContent(quickAnalysis) {
  const quick = quickAnalysis && typeof quickAnalysis === "object" ? quickAnalysis : {};
  if (asString(quick.atmosphereRu)) return true;
  if (asString(quick.designIntent?.summaryRu) || asString(quick.designIntent?.emotionalEffectRu)) return true;
  if (asString(quick.styleAnalysis?.labelRu) || asString(quick.styleAnalysis?.primary)) return true;
  if (asString(quick.colorAnalysis?.colorLogicRu)) return true;
  if (asString(quick.colorAnalysis?.interpretedPalette?.descriptionRu)) return true;
  if (Array.isArray(quick.colorAnalysis?.dominant) && quick.colorAnalysis.dominant.length) return true;
  if (Array.isArray(quick.colorAnalysis?.accents) && quick.colorAnalysis.accents.length) return true;
  if (Array.isArray(quick.colorAnalysis?.extractedPalette?.dominant) && quick.colorAnalysis.extractedPalette.dominant.length) {
    return true;
  }
  const space = quick.spaceType;
  return Boolean(space && (asConfidence(space.confidence) > 0 || space.value !== "unknown"));
}

function hasProLayerContent(proAnalysis) {
  const pro = proAnalysis && typeof proAnalysis === "object" ? proAnalysis : {};
  if (hasQuickLayerContent(pro)) return true;
  if (Array.isArray(pro.functionalZones) && pro.functionalZones.length) return true;
  if (Array.isArray(pro.textileAnalysis) && pro.textileAnalysis.length) return true;
  if (Array.isArray(pro.furnitureAnalysis) && pro.furnitureAnalysis.length) return true;
  if (hasMaterialAnalysis(pro.materialAnalysis)) return true;
  if (asString(pro.designIntent?.summaryRu) || asString(pro.designIntent?.emotionalEffectRu)) return true;
  if (Array.isArray(pro.designIntent?.keyDesignDrivers) && pro.designIntent.keyDesignDrivers.length) return true;
  if (Array.isArray(pro.designIntent?.whatMustBePreserved) && pro.designIntent.whatMustBePreserved.length) return true;
  if (asString(pro.lightingAnalysis?.overallLightingMood)) return true;
  if (Array.isArray(pro.lightingAnalysis?.artificialLight) && pro.lightingAnalysis.artificialLight.length) return true;
  if (Array.isArray(pro.lightingAnalysis?.technicalNotes) && pro.lightingAnalysis.technicalNotes.length) return true;
  if (hasSurfaceBlock(pro.ceilingAnalysis, pro.wallAnalysis, pro.floorAnalysis, pro.decorAnalysis)) return true;
  return false;
}

function hasSurfaceBlock(ceilingAnalysis, wallAnalysis, floorAnalysis, decorAnalysis) {
  const ceiling =
    ceilingAnalysis &&
    typeof ceilingAnalysis === "object" &&
    (ceilingAnalysis.labelRu ||
      ceilingAnalysis.type ||
      (Array.isArray(ceilingAnalysis.details) && ceilingAnalysis.details.length) ||
      (Array.isArray(ceilingAnalysis.decorativeElements) && ceilingAnalysis.decorativeElements.length));
  const walls = Array.isArray(wallAnalysis) && wallAnalysis.length > 0;
  const floors = Array.isArray(floorAnalysis) && floorAnalysis.length > 0;
  const decor = Array.isArray(decorAnalysis) && decorAnalysis.length > 0;
  return Boolean(ceiling || walls || floors || decor);
}

function hasMaterialAnalysis(materialAnalysis) {
  if (!materialAnalysis || typeof materialAnalysis !== "object") return false;
  return Object.values(materialAnalysis).some((items) => Array.isArray(items) && items.length > 0);
}

function hasSpecLayerContent(specAnalysis) {
  const spec = specAnalysis && typeof specAnalysis === "object" ? specAnalysis : {};
  if (Array.isArray(spec.specificationGroups) && spec.specificationGroups.length) return true;
  if (Array.isArray(spec.specificationAssets) && spec.specificationAssets.length) return true;
  if (Array.isArray(spec.zoneSpecifications) && spec.zoneSpecifications.length) return true;
  if (Array.isArray(spec.replacementCandidates) && spec.replacementCandidates.length) return true;
  if (Array.isArray(spec.procurementNotes) && spec.procurementNotes.length) return true;
  if (Array.isArray(spec.functionalZones) && spec.functionalZones.length) return true;
  if (Array.isArray(spec.productCategories) && spec.productCategories.length) return true;
  if (Array.isArray(spec.whatMustBePreserved) && spec.whatMustBePreserved.length) return true;
  return false;
}

function normalizeCompletedModes(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const mode = normalizeAnalysisMode(item);
    if (!ANALYSIS_MODES.includes(mode) || seen.has(mode)) continue;
    seen.add(mode);
    out.push(mode);
  }
  return out;
}

function inferCompletedModes(draft) {
  const modes = [];
  if (hasQuickLayerContent(draft?.quickAnalysis)) modes.push("quick");
  if (hasProLayerContent(draft?.proAnalysis)) modes.push("pro");
  if (hasSpecLayerContent(draft?.specAnalysis)) modes.push("spec");
  return modes;
}

export function hasSemanticAnalysis(draft) {
  if (!draft || typeof draft !== "object") return false;
  return (
    hasQuickLayerContent(draft.quickAnalysis) ||
    hasProLayerContent(draft.proAnalysis) ||
    hasSpecLayerContent(draft.specAnalysis)
  );
}

export function hasSemanticDraftForMode(draft, mode) {
  if (!hasSemanticAnalysis(draft)) return false;
  const normalized = normalizeAnalysisMode(mode);
  const completed = normalizeCompletedModes(draft.completedAnalysisModes);
  if (completed.includes("quick") && completed.includes("pro") && completed.includes("spec")) {
    return true;
  }
  if (completed.length) return completed.includes(normalized);
  if (normalized === "quick") return hasQuickLayerContent(draft.quickAnalysis);
  if (normalized === "pro") return hasProLayerContent(draft.proAnalysis);
  return hasSpecLayerContent(draft.specAnalysis);
}

export function getAnalysisModeEmptyMessage(mode) {
  const label = ANALYSIS_MODE_LABELS_RU[normalizeAnalysisMode(mode)] || normalizeAnalysisMode(mode);
  return `Для режима ${label} нужен новый анализ. Нажмите «Анализировать интерьер».`;
}

export function emptySemanticDraft(languageMode = "ru", analysisMode = "pro") {
  return {
    languageMode: LANGUAGE_MODES.has(languageMode) ? languageMode : "ru",
    analysisMode: normalizeAnalysisMode(analysisMode),
    resultAnalysisMode: "",
    completedAnalysisModes: [],
    quickAnalysis: {
      spaceType: asSpaceType(),
      styleAnalysis: asStyleAnalysis(),
      atmosphereRu: "",
      colorAnalysis: baseColorAnalysis(),
      designIntent: asBriefDesignIntent(),
    },
    proAnalysis: {
      spaceType: asSpaceType(),
      styleAnalysis: asStyleAnalysis(),
      colorAnalysis: baseColorAnalysis(),
      functionalZones: [],
      lightingAnalysis: asLightingAnalysis(),
      materialAnalysis: baseMaterialAnalysis(),
      textileAnalysis: [],
      ceilingAnalysis: asCeilingAnalysis(),
      wallAnalysis: [],
      floorAnalysis: [],
      furnitureAnalysis: [],
      decorAnalysis: [],
      atmosphereRu: "",
      designIntent: asDesignIntent(),
    },
    specAnalysis: {
      functionalZones: [],
      productCategories: [],
      supplierCategories: [],
      specificationGroups: [],
      specificationAssets: [],
      zoneSpecifications: [],
      replacementCandidates: [],
      procurementNotes: [],
      whatMustBePreserved: [],
    },
    pipelines: emptyPipelines(),
    sceneGraph: normalizeSceneGraph(),
    editableObjects: [],
    editableActionSuggestions: [],
    styleConsistency: normalizeStyleConsistency(),
    designMutations: [],
    generationPackages: [],
    warnings: [],
  };
}

export function extractJsonObject(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
}

export function validateSemanticDraft(input, options = {}) {
  const parsed = extractJsonObject(input);
  const languageMode = LANGUAGE_MODES.has(asString(options.languageMode))
    ? asString(options.languageMode)
    : LANGUAGE_MODES.has(asString(parsed?.languageMode))
      ? asString(parsed.languageMode)
      : "ru";
  const requestMode = normalizeVisionRequestMode(options.analysisMode ?? parsed?.analysisMode ?? "full");
  const paletteOptions = {
    extractedPalette:
      options.extractedPalette && typeof options.extractedPalette === "object"
        ? options.extractedPalette
        : parsed?.extractedPalette,
  };

  if (!parsed || typeof parsed !== "object") {
    return emptySemanticDraft(languageMode, "pro");
  }

  const source = migrateLegacyParsed(parsed);
  const quickAnalysis = sanitizeQuickAnalysis(source.quickAnalysis, source, languageMode, paletteOptions);
  const proAnalysis = sanitizeProAnalysis(
    source.proAnalysis,
    { ...source, quickAnalysis },
    languageMode,
    paletteOptions
  );
  const specAnalysis = sanitizeSpecAnalysis(source.specAnalysis, { ...source, proAnalysis });
  const draft = {
    languageMode,
    analysisMode: requestMode,
    resultAnalysisMode: asString(source.resultAnalysisMode) || normalizeAnalysisMode(options.viewMode),
    completedAnalysisModes: normalizeCompletedModes(source.completedAnalysisModes),
    quickAnalysis,
    proAnalysis,
    specAnalysis,
    pipelines: asPipelines(source.pipelines),
    sceneGraph: normalizeSceneGraph(source.sceneGraph, {
      quickAnalysis,
      proAnalysis,
      specAnalysis,
    }),
    warnings: sanitizeList(source.warnings, 12),
  };
  draft.specAnalysis = {
    ...draft.specAnalysis,
    specificationGroups: stabilizeSpecificationGroups(draft.specAnalysis, draft.proAnalysis, draft.sceneGraph),
  };
  draft.editableObjects = normalizeEditableObjects(source.editableObjects, draft.sceneGraph);
  if (!draft.editableObjects.length) {
    draft.editableObjects = deriveEditableObjectsFromSceneGraph(draft.sceneGraph, draft);
  }
  draft.editableObjects = stabilizeEditableObjects(draft.editableObjects, draft.sceneGraph, draft);
  draft.styleConsistency = normalizeStyleConsistency(source.styleConsistency, draft);
  draft.editableObjects = attachStyleConsistencyImpactToEditableObjects(
    draft.editableObjects,
    draft.styleConsistency
  );
  draft.editableActionSuggestions = buildEditableActionSuggestions(draft.editableObjects);
  draft.designMutations = normalizeDesignMutations(source.designMutations, draft);
  if (!draft.designMutations.length) {
    draft.designMutations = deriveDesignMutations(draft);
  }
  draft.generationPackages = normalizeGenerationPackages(source.generationPackages, draft);
  if (!draft.completedAnalysisModes.length) {
    draft.completedAnalysisModes = inferCompletedModes(draft);
  }
  if (
    requestMode === "full" ||
    (hasQuickLayerContent(quickAnalysis) &&
      hasProLayerContent(proAnalysis) &&
      hasSpecLayerContent(specAnalysis))
  ) {
    draft.analysisMode = "full";
    draft.completedAnalysisModes = ["quick", "pro", "spec"];
  }
  return draft;
}

export function mergeSemanticDraftLayer(existing, incoming, mode, options = {}) {
  const layerMode = normalizeAnalysisMode(mode);
  const languageMode = LANGUAGE_MODES.has(asString(options.languageMode))
    ? asString(options.languageMode)
    : LANGUAGE_MODES.has(asString(existing?.languageMode))
      ? asString(existing.languageMode)
      : "ru";
  const base = existing && typeof existing === "object" ? validateSemanticDraft(existing, { languageMode }) : emptySemanticDraft(languageMode, layerMode);
  const layer = validateSemanticDraft(incoming, { languageMode, analysisMode: layerMode });
  const completed = new Set(base.completedAnalysisModes);

  const next = {
    ...base,
    languageMode,
    analysisMode: layerMode,
    resultAnalysisMode: layerMode,
    completedAnalysisModes: [...completed],
    sceneGraph: layer.sceneGraph?.objects?.length ? layer.sceneGraph : base.sceneGraph,
    editableObjects: layer.editableObjects?.length ? layer.editableObjects : base.editableObjects,
    styleConsistency: layer.styleConsistency?.editImpactRules?.length
      ? layer.styleConsistency
      : base.styleConsistency,
    designMutations: layer.designMutations?.length ? layer.designMutations : base.designMutations,
    generationPackages: layer.generationPackages?.length ? layer.generationPackages : base.generationPackages,
    warnings: layer.warnings,
  };

  if (layerMode === "quick") {
    next.quickAnalysis = layer.quickAnalysis;
  } else if (layerMode === "pro") {
    next.proAnalysis = layer.proAnalysis;
  } else {
    next.specAnalysis = layer.specAnalysis;
    next.pipelines = layer.pipelines;
  }

  if (!next.completedAnalysisModes.includes(layerMode)) {
    next.completedAnalysisModes = [...next.completedAnalysisModes, layerMode];
  }

  return validateSemanticDraft(next, { languageMode, analysisMode: layerMode });
}

function materialSpecSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      materialFamily: { type: "string" },
      possibleMaterial: { type: "string" },
      texture: { type: "string" },
      finish: { type: "string" },
      tone: { type: "string" },
      confidence: { type: "number" },
      note: { type: "string" },
    },
    required: ["materialFamily", "possibleMaterial", "texture", "finish", "tone", "confidence", "note"],
  };
}

function paletteEntrySchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      hex: { type: "string" },
      labelRu: { type: "string" },
    },
    required: ["hex", "labelRu"],
  };
}

function interpretedColorAnalysisSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      interpretedPalette: {
        type: "object",
        additionalProperties: false,
        properties: {
          dominant: { type: "array", items: paletteEntrySchema() },
          accents: { type: "array", items: paletteEntrySchema() },
          descriptionRu: { type: "string" },
        },
        required: ["dominant", "accents", "descriptionRu"],
      },
      colorLogicRu: { type: "string" },
      temperature: { type: "string" },
      contrast: { type: "string" },
      uiTheme: {
        type: "object",
        additionalProperties: false,
        properties: {
          background: { type: "string" },
          surface: { type: "string" },
          accent: { type: "string" },
          glow: { type: "string" },
          text: { type: "string" },
        },
        required: ["background", "surface", "accent", "glow", "text"],
      },
    },
    required: ["interpretedPalette", "colorLogicRu", "temperature", "contrast", "uiTheme"],
  };
}

function quickAnalysisSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      spaceType: {
        type: "object",
        additionalProperties: false,
        properties: {
          value: { type: "string" },
          confidence: { type: "number" },
          labelRu: { type: "string" },
        },
        required: ["value", "confidence", "labelRu"],
      },
      styleAnalysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          primary: { type: "string" },
          secondary: { type: "array", items: { type: "string" } },
          labelRu: { type: "string" },
          confidence: { type: "number" },
          spatialCharacterRu: { type: "string" },
          formLanguageRu: { type: "string" },
        },
        required: ["primary", "secondary", "labelRu", "confidence", "spatialCharacterRu", "formLanguageRu"],
      },
      atmosphereRu: { type: "string" },
      colorAnalysis: interpretedColorAnalysisSchema(),
      designIntent: {
        type: "object",
        additionalProperties: false,
        properties: {
          summaryRu: { type: "string" },
          emotionalEffectRu: { type: "string" },
        },
        required: ["summaryRu", "emotionalEffectRu"],
      },
    },
    required: ["spaceType", "styleAnalysis", "atmosphereRu", "colorAnalysis", "designIntent"],
  };
}

function proAnalysisSchema() {

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      spaceType: {
        type: "object",
        additionalProperties: false,
        properties: {
          value: { type: "string" },
          confidence: { type: "number" },
          labelRu: { type: "string" },
        },
        required: ["value", "confidence", "labelRu"],
      },
      styleAnalysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          primary: { type: "string" },
          secondary: { type: "array", items: { type: "string" } },
          labelRu: { type: "string" },
          confidence: { type: "number" },
          spatialCharacterRu: { type: "string" },
          formLanguageRu: { type: "string" },
        },
        required: ["primary", "secondary", "labelRu", "confidence", "spatialCharacterRu", "formLanguageRu"],
      },
      colorAnalysis: interpretedColorAnalysisSchema(),
      functionalZones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string" },
            labelRu: { type: "string" },
            position: { type: "string" },
            visibleElements: { type: "array", items: { type: "string" } },
            designRole: { type: "string" },
            importance: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["type", "labelRu", "position", "visibleElements", "designRole", "importance", "confidence"],
        },
      },
      lightingAnalysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          naturalLight: {
            type: "object",
            additionalProperties: false,
            properties: {
              present: { type: "boolean" },
              direction: { type: "string" },
              intensity: { type: "string" },
              diffusion: { type: "string" },
              temperatureEstimate: { type: "string" },
              estimatedKelvin: { type: "string" },
            },
            required: ["present", "direction", "intensity", "diffusion", "temperatureEstimate", "estimatedKelvin"],
          },
          artificialLight: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string" },
                labelRu: { type: "string" },
                position: { type: "string" },
                lightRole: { type: "string" },
                temperatureEstimate: { type: "string" },
                estimatedKelvin: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["type", "labelRu", "position", "lightRole", "temperatureEstimate", "estimatedKelvin", "confidence"],
            },
          },
          overallLightingMood: { type: "string" },
          technicalNotes: { type: "array", items: { type: "string" } },
        },
        required: ["naturalLight", "artificialLight", "overallLightingMood", "technicalNotes"],
      },
      materialAnalysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          floor: { type: "array", items: materialSpecSchema() },
          walls: { type: "array", items: materialSpecSchema() },
          ceiling: { type: "array", items: materialSpecSchema() },
          furniture: { type: "array", items: materialSpecSchema() },
          textiles: { type: "array", items: materialSpecSchema() },
          metal: { type: "array", items: materialSpecSchema() },
          stone: { type: "array", items: materialSpecSchema() },
          glass: { type: "array", items: materialSpecSchema() },
        },
        required: ["floor", "walls", "ceiling", "furniture", "textiles", "metal", "stone", "glass"],
      },
      textileAnalysis: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string" },
            labelRu: { type: "string" },
            materialGuess: { type: "string" },
            texture: { type: "string" },
            pattern: { type: "string" },
            colorRole: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["type", "labelRu", "materialGuess", "texture", "pattern", "colorRole", "confidence"],
        },
      },
      ceilingAnalysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string" },
          labelRu: { type: "string" },
          details: { type: "array", items: { type: "string" } },
          decorativeElements: { type: "array", items: { type: "string" } },
          technicalNotes: { type: "array", items: { type: "string" } },
          confidence: { type: "number" },
        },
        required: ["type", "labelRu", "details", "decorativeElements", "technicalNotes", "confidence"],
      },
      wallAnalysis: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            zone: { type: "string" },
            finish: { type: "string" },
            texture: { type: "string" },
            color: { type: "string" },
            decor: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
          },
          required: ["zone", "finish", "texture", "color", "decor", "confidence"],
        },
      },
      floorAnalysis: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            finish: { type: "string" },
            materialGuess: { type: "string" },
            tone: { type: "string" },
            details: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
          },
          required: ["finish", "materialGuess", "tone", "details", "confidence"],
        },
      },
      furnitureAnalysis: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string" },
            labelRu: { type: "string" },
            position: { type: "string" },
            style: { type: "string" },
            materialGuess: { type: "string" },
            finish: { type: "string" },
            color: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["type", "labelRu", "position", "style", "materialGuess", "finish", "color", "confidence"],
        },
      },
      decorAnalysis: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string" },
            labelRu: { type: "string" },
            position: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["type", "labelRu", "position", "confidence"],
        },
      },
      atmosphereRu: { type: "string" },
      designIntent: {
        type: "object",
        additionalProperties: false,
        properties: {
          summaryRu: { type: "string" },
          emotionalEffectRu: { type: "string" },
          keyDesignDrivers: { type: "array", items: { type: "string" } },
          whatMustBePreserved: { type: "array", items: { type: "string" } },
        },
        required: ["summaryRu", "emotionalEffectRu", "keyDesignDrivers", "whatMustBePreserved"],
      },
    },
    required: [
      "spaceType",
      "styleAnalysis",
      "colorAnalysis",
      "functionalZones",
      "lightingAnalysis",
      "materialAnalysis",
      "textileAnalysis",
      "ceilingAnalysis",
      "wallAnalysis",
      "floorAnalysis",
      "furnitureAnalysis",
      "decorAnalysis",
      "atmosphereRu",
      "designIntent",
    ],
  };
}

function specificationGroupItemSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      category: { type: "string" },
      visible: { type: "boolean" },
      quantityEstimate: { type: "string" },
      replacementRisk: { type: "string" },
      skuReadiness: { type: "string" },
      note: { type: "string" },
    },
    required: ["name", "category", "visible", "quantityEstimate", "replacementRisk", "skuReadiness", "note"],
  };
}

function specAnalysisSchema() {
  const categorySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      category: { type: "string" },
      reason: { type: "string" },
      priority: { type: "string" },
    },
    required: ["category", "reason", "priority"],
  };

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      functionalZones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string" },
            labelRu: { type: "string" },
            position: { type: "string" },
            visibleElements: { type: "array", items: { type: "string" } },
            designRole: { type: "string" },
            importance: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["type", "labelRu", "position", "visibleElements", "designRole", "importance", "confidence"],
        },
      },
      productCategories: { type: "array", items: categorySchema },
      supplierCategories: { type: "array", items: categorySchema },
      specificationGroups: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            group: { type: "string" },
            priority: { type: "string" },
            budgetWeight: { type: "string" },
            items: { type: "array", items: specificationGroupItemSchema() },
          },
          required: ["group", "priority", "budgetWeight", "items"],
        },
      },
      replacementCandidates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            target: { type: "string" },
            category: { type: "string" },
            reason: { type: "string" },
            changeRisk: { type: "string" },
            recommendation: { type: "string" },
          },
          required: ["target", "category", "reason", "changeRisk", "recommendation"],
        },
      },
      procurementNotes: { type: "array", items: { type: "string" } },
      whatMustBePreserved: { type: "array", items: { type: "string" } },
    },
    required: [
      "functionalZones",
      "productCategories",
      "supplierCategories",
      "specificationGroups",
      "replacementCandidates",
      "procurementNotes",
      "whatMustBePreserved",
    ],
  };
}

function pipelineGraphSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      version: { type: "number" },
      ready: { type: "boolean" },
      nodes: { type: "array", items: { type: "object", additionalProperties: false, properties: {}, required: [] } },
      edges: { type: "array", items: { type: "object", additionalProperties: false, properties: {}, required: [] } },
      meta: { type: "object", additionalProperties: false, properties: {}, required: [] },
    },
    required: ["version", "ready", "nodes", "edges", "meta"],
  };
}

function pipelinesSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      bimGraph: pipelineGraphSchema(),
      supplierGraph: pipelineGraphSchema(),
      skuGraph: pipelineGraphSchema(),
      editableSceneGraph: pipelineGraphSchema(),
    },
    required: ["bimGraph", "supplierGraph", "skuGraph", "editableSceneGraph"],
  };
}

function sceneGraphSchema() {
  const futureReadySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      maskEditable: { type: "boolean" },
      bimRelevant: { type: "boolean" },
      skuRelevant: { type: "boolean" },
      budgetRelevant: { type: "boolean" },
    },
    required: ["maskEditable", "bimRelevant", "skuRelevant", "budgetRelevant"],
  };

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      version: { type: "string" },
      spaceType: { type: "string" },
      coordinateSystem: { type: "string" },
      confidence: { type: "number" },
      zones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            labelRu: { type: "string" },
            type: { type: "string" },
            position: { type: "string" },
            role: { type: "string" },
            relatedObjects: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
          },
          required: ["id", "labelRu", "type", "position", "role", "relatedObjects", "confidence"],
        },
      },
      objects: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            labelRu: { type: "string" },
            type: { type: "string" },
            categoryId: { type: "string" },
            supplierCategoryId: { type: "string" },
            zoneId: { type: "string" },
            position: {
              type: "object",
              additionalProperties: false,
              properties: {
                horizontal: { type: "string" },
                vertical: { type: "string" },
                depth: { type: "string" },
              },
              required: ["horizontal", "vertical", "depth"],
            },
            visualWeight: { type: "string" },
            replacementRisk: { type: "string" },
            editablePotential: { type: "string" },
            budgetWeight: { type: "string" },
            materialGuess: { type: "string" },
            colorGuess: { type: "string" },
            confidence: { type: "number" },
            futureReady: futureReadySchema,
          },
          required: [
            "id",
            "labelRu",
            "type",
            "categoryId",
            "supplierCategoryId",
            "zoneId",
            "position",
            "visualWeight",
            "replacementRisk",
            "editablePotential",
            "budgetWeight",
            "materialGuess",
            "colorGuess",
            "confidence",
            "futureReady",
          ],
        },
      },
      relationships: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            fromObjectId: { type: "string" },
            toObjectId: { type: "string" },
            relation: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["fromObjectId", "toObjectId", "relation", "confidence"],
        },
      },
      preservationRules: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            targetId: { type: "string" },
            ruleRu: { type: "string" },
            importance: { type: "string" },
          },
          required: ["targetId", "ruleRu", "importance"],
        },
      },
    },
    required: [
      "version",
      "spaceType",
      "coordinateSystem",
      "confidence",
      "zones",
      "objects",
      "relationships",
      "preservationRules",
    ],
  };
}

function styleConsistencySchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      conceptDNA: {
        type: "object",
        additionalProperties: false,
        properties: {
          styleCore: { type: "string" },
          atmosphereCore: { type: "string" },
          colorCore: { type: "string" },
          materialCore: { type: "string" },
          compositionCore: { type: "string" },
          mustPreserve: { type: "array", items: { type: "string" } },
        },
        required: [
          "styleCore",
          "atmosphereCore",
          "colorCore",
          "materialCore",
          "compositionCore",
          "mustPreserve",
        ],
      },
      editImpactRules: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            targetType: { type: "string" },
            targetId: { type: "string" },
            impactArea: { type: "string" },
            riskLevel: { type: "string" },
            warningRu: { type: "string" },
            preserveHintRu: { type: "string" },
            intentionalChangeHintRu: { type: "string" },
          },
          required: [
            "targetType",
            "targetId",
            "impactArea",
            "riskLevel",
            "warningRu",
            "preserveHintRu",
            "intentionalChangeHintRu",
          ],
        },
      },
      flexibility: {
        type: "object",
        additionalProperties: false,
        properties: {
          allowIntentionalBreaks: { type: "boolean" },
          mode: { type: "string" },
        },
        required: ["allowIntentionalBreaks", "mode"],
      },
    },
    required: ["conceptDNA", "editImpactRules", "flexibility"],
  };
}

function editableObjectsSchema() {
  const futureReadySchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      maskEditable: { type: "boolean" },
      skuRelevant: { type: "boolean" },
      budgetRelevant: { type: "boolean" },
      bimRelevant: { type: "boolean" },
    },
    required: ["maskEditable", "skuRelevant", "budgetRelevant", "bimRelevant"],
  };

  return {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        sourceObjectId: { type: "string" },
        labelRu: { type: "string" },
        type: { type: "string" },
        categoryId: { type: "string" },
        supplierCategoryId: { type: "string" },
        zoneId: { type: "string" },
        editTypes: { type: "array", items: { type: "string" } },
        editSafety: { type: "string" },
        replacementRisk: { type: "string" },
        styleImpact: { type: "string" },
        budgetImpact: { type: "string" },
        preservationNotes: { type: "array", items: { type: "string" } },
        dependencies: { type: "array", items: { type: "string" } },
        promptHintRu: { type: "string" },
        futureReady: futureReadySchema,
        confidence: { type: "number" },
      },
      required: [
        "id",
        "sourceObjectId",
        "labelRu",
        "type",
        "categoryId",
        "supplierCategoryId",
        "zoneId",
        "editTypes",
        "editSafety",
        "replacementRisk",
        "styleImpact",
        "budgetImpact",
        "preservationNotes",
        "dependencies",
        "promptHintRu",
        "futureReady",
        "confidence",
      ],
    },
  };
}

function designMutationsSchema() {
  return {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        labelRu: { type: "string" },
        mutationType: { type: "string" },
        goalRu: { type: "string" },
        preserveDNA: { type: "array", items: { type: "string" } },
        changeTargets: { type: "array", items: { type: "string" } },
        affectedEditableObjects: { type: "array", items: { type: "string" } },
        affectedSpecGroups: { type: "array", items: { type: "string" } },
        styleImpact: { type: "string" },
        budgetImpact: { type: "string" },
        riskLevel: { type: "string" },
        promptTemplateRu: { type: "string" },
        noteRu: { type: "string" },
        confidence: { type: "number" },
      },
      required: [
        "id",
        "labelRu",
        "mutationType",
        "goalRu",
        "preserveDNA",
        "changeTargets",
        "affectedEditableObjects",
        "affectedSpecGroups",
        "styleImpact",
        "budgetImpact",
        "riskLevel",
        "promptTemplateRu",
        "noteRu",
        "confidence",
      ],
    },
  };
}

export function getSemanticDraftJsonSchema(analysisMode = "full") {
  normalizeVisionRequestMode(analysisMode);
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      languageMode: { type: "string" },
      analysisMode: { type: "string" },
      quickAnalysis: quickAnalysisSchema(),
      proAnalysis: proAnalysisSchema(),
      specAnalysis: specAnalysisSchema(),
      pipelines: pipelinesSchema(),
      sceneGraph: sceneGraphSchema(),
      editableObjects: editableObjectsSchema(),
      styleConsistency: styleConsistencySchema(),
      designMutations: designMutationsSchema(),
      warnings: { type: "array", items: { type: "string" } },
    },
    required: [
      "languageMode",
      "analysisMode",
      "quickAnalysis",
      "proAnalysis",
      "specAnalysis",
      "pipelines",
      "sceneGraph",
      "editableObjects",
      "styleConsistency",
      "designMutations",
      "warnings",
    ],
  };
}
