import { normalizeAnalysisMode } from "./validateSemanticDraft";

const SECTION_TITLES_RU = {
  styleIntent: "Стиль и замысел",
  roomPurpose: "Назначение помещения",
  atmosphere: "Атмосфера",
  colorLogic: "Цветовая логика",
  keyMaterials: "Ключевые материалы",
  preserve: "Что важно сохранить",
};

const SECTION_ORDER = [
  ["styleIntent", "style-intent"],
  ["roomPurpose", "space-purpose"],
  ["atmosphere", "atmosphere"],
  ["colorLogic", "color-logic"],
  ["keyMaterials", "materials"],
  ["preserve", "preserve"],
];

const OMIT_NARRATIVE_KEYS = new Set([
  "confidence",
  "position",
  "coordinates",
  "coordinate",
  "boundingBox",
  "bbox",
  "score",
  "scores",
  "relativePosition",
  "visualWeight",
  "importance",
  "estimatedKelvin",
  "kelvin",
  "x",
  "y",
  "z",
  "width",
  "height",
]);

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSection(raw, fallbackTitle) {
  if (!raw || typeof raw !== "object") {
    return { title: fallbackTitle, text: "", chips: [] };
  }
  const chips = Array.isArray(raw.chips)
    ? raw.chips.map((item) => asString(item)).filter(Boolean).slice(0, 6)
    : [];
  return {
    title: asString(raw.title) || fallbackTitle,
    text: asString(raw.text),
    chips,
  };
}

export function normalizeDesignNarrative(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    styleIntent: normalizeSection(source.styleIntent, SECTION_TITLES_RU.styleIntent),
    roomPurpose: normalizeSection(source.roomPurpose, SECTION_TITLES_RU.roomPurpose),
    atmosphere: normalizeSection(source.atmosphere, SECTION_TITLES_RU.atmosphere),
    colorLogic: normalizeSection(source.colorLogic, SECTION_TITLES_RU.colorLogic),
    keyMaterials: normalizeSection(source.keyMaterials, SECTION_TITLES_RU.keyMaterials),
    preserve: normalizeSection(source.preserve, SECTION_TITLES_RU.preserve),
  };
}

export function mapDesignNarrativeToSections(narrative) {
  const normalized = normalizeDesignNarrative(narrative);
  return SECTION_ORDER.map(([key, id]) => {
    const block = normalized[key];
    return {
      id,
      title: block.title,
      narrative: block.text,
      chips: block.chips,
    };
  }).filter((section) => section.narrative || section.chips.length);
}

export function isDesignNarrativeUsable(narrative) {
  const normalized = normalizeDesignNarrative(narrative);
  return SECTION_ORDER.some(([key]) => asString(normalized[key]?.text));
}

function sanitizeValue(key, value, depth = 0) {
  if (depth > 12) return undefined;
  if (value == null) return value;
  if (typeof key === "string" && OMIT_NARRATIVE_KEYS.has(key)) return undefined;

  if (Array.isArray(value)) {
    const next = value
      .map((item) => sanitizeValue("", item, depth + 1))
      .filter((item) => item !== undefined);
    return next.length ? next : undefined;
  }

  if (typeof value === "object") {
    const next = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      const sanitized = sanitizeValue(childKey, childValue, depth + 1);
      if (sanitized !== undefined) next[childKey] = sanitized;
    }
    return Object.keys(next).length ? next : undefined;
  }

  return value;
}

export function prepareSemanticDraftForNarrative(semanticDraft, analysisMode = "pro") {
  if (!semanticDraft || typeof semanticDraft !== "object") return null;
  const mode = normalizeAnalysisMode(analysisMode);
  const payload = {
    analysisMode: mode,
    languageMode: semanticDraft.languageMode || "ru",
    quickAnalysis: sanitizeValue("quickAnalysis", semanticDraft.quickAnalysis, 0),
    proAnalysis: sanitizeValue("proAnalysis", semanticDraft.proAnalysis, 0),
    specAnalysis: sanitizeValue("specAnalysis", semanticDraft.specAnalysis, 0),
    styleConsistency: sanitizeValue("styleConsistency", semanticDraft.styleConsistency, 0),
  };
  return payload;
}

export function buildNarrativeRequestKey(semanticDraft, analysisMode = "pro") {
  if (!semanticDraft) return "";
  const mode = normalizeAnalysisMode(analysisMode);
  const payload = prepareSemanticDraftForNarrative(semanticDraft, mode);
  try {
    return `${mode}:${JSON.stringify(payload)}`;
  } catch {
    return `${mode}:${Date.now()}`;
  }
}

const narrativeSectionSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    text: { type: "string" },
    chips: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["title", "text", "chips"],
  additionalProperties: false,
};

export function getDesignNarrativeJsonSchema() {
  return {
    type: "object",
    properties: {
      styleIntent: narrativeSectionSchema,
      roomPurpose: narrativeSectionSchema,
      atmosphere: narrativeSectionSchema,
      colorLogic: narrativeSectionSchema,
      keyMaterials: narrativeSectionSchema,
      preserve: narrativeSectionSchema,
    },
    required: ["styleIntent", "roomPurpose", "atmosphere", "colorLogic", "keyMaterials", "preserve"],
    additionalProperties: false,
  };
}

export function buildDesignNarrativeSystemPrompt(locale = "ru", tone = "professional_designer") {
  const isRu = locale !== "en";
  const toneLine =
    tone === "professional_designer"
      ? isRu
        ? "Пиши как опытный дизайнер интерьеров, который спокойно и профессионально объясняет замысел клиенту."
        : "Write as an experienced interior designer speaking calmly and professionally to a client."
      : isRu
        ? "Пиши профессионально и ясно."
        : "Write professionally and clearly.";

  return `${toneLine}
Тебе передан structured semanticDraft интерьера. Преобразуй его в человекочитаемое дизайнерское описание на ${isRu ? "русском" : "английском"} языке.

Правила:
- Не склеивай сырые теги и атрибуты в неловкие конструкции.
- Не упоминай confidence, проценты, center/back/left/right, координаты, scores и debug-метаданные.
- Материалы и предметы описывай естественно: "крупный кожаный диван спокойного коричневого оттенка", а не "матовая кожа диван".
- Каждый раздел: 2–4 короткие строки связного текста в поле text.
- chips — до 5 коротких смысловых маркеров, не дублируй дословно text.
- Спокойный, премиальный, профессиональный тон без маркетинговых клише и мистики.
- Не выдумывай объекты и материалы, которых нет во входных данных.
- Верни только JSON по схеме без markdown.`;
}
