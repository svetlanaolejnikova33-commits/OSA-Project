import { asConfidence, extractJsonObject } from "./validateSemanticDraft";

/** Required string attribute keys on a Vision JSON object (Tender #1 / #4). */
export const VISION_JSON_ATTRIBUTE_KEYS = Object.freeze([
  "category",
  "mounting",
  "material",
  "finish",
  "style",
  "shape",
]);

export const VISION_JSON_REQUIRED_KEYS = Object.freeze([
  ...VISION_JSON_ATTRIBUTE_KEYS,
  "confidence",
]);

/** Optional rich intelligence fields (Phase #7A). */
export const VISION_JSON_OPTIONAL_STRING_KEYS = Object.freeze([
  "subtype",
  "construction",
  "proportions",
  "silhouette",
  "likely_use",
  "visual_role",
  "design_character",
]);

export const VISION_JSON_OPTIONAL_ARRAY_KEYS = Object.freeze([
  "distinctive_features",
  "decorative_details",
  "functional_elements",
  "color_palette",
  "material_combinations",
  "search_constraints",
  "negative_constraints",
]);

export const VISION_JSON_FIELD_CONFIDENCE_KEYS = Object.freeze([
  "category",
  "subtype",
  "mounting",
  "material",
  "finish",
  "style",
  "shape",
  "construction",
  "context",
]);

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value) {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return items.length ? items : undefined;
}

function asOptionalString(value) {
  const text = asTrimmedString(value);
  return text || undefined;
}

function asFieldConfidence(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out = {};
  for (const key of VISION_JSON_FIELD_CONFIDENCE_KEYS) {
    if (value[key] == null) continue;
    const num = Number(value[key]);
    if (!Number.isFinite(num)) continue;
    out[key] = asConfidence(num);
  }
  return Object.keys(out).length ? out : undefined;
}

function asContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const room_type = asOptionalString(value.room_type);
  const placement = asOptionalString(value.placement);
  const design_intent = asOptionalString(value.design_intent);
  const adjacent_objects = asStringArray(value.adjacent_objects);
  if (!room_type && !placement && !design_intent && !adjacent_objects) return undefined;
  const context = {};
  if (room_type) context.room_type = room_type;
  if (placement) context.placement = placement;
  if (adjacent_objects) context.adjacent_objects = adjacent_objects;
  if (design_intent) context.design_intent = design_intent;
  return context;
}

/**
 * JSON Schema for the canonical Vision JSON object (CVO output).
 * New rich fields are optional for backward compatibility.
 */
export function getVisionJsonSchema() {
  const stringProp = { type: "string", minLength: 1 };
  const optionalString = { type: "string" };
  const stringArray = { type: "array", items: { type: "string" } };

  return {
    type: "object",
    additionalProperties: false,
    required: [...VISION_JSON_REQUIRED_KEYS],
    properties: {
      category: stringProp,
      mounting: stringProp,
      material: stringProp,
      finish: stringProp,
      style: stringProp,
      shape: stringProp,
      confidence: { type: "number", minimum: 0, maximum: 1 },
      subtype: optionalString,
      construction: optionalString,
      proportions: optionalString,
      silhouette: optionalString,
      distinctive_features: stringArray,
      decorative_details: stringArray,
      functional_elements: stringArray,
      color_palette: stringArray,
      material_combinations: stringArray,
      likely_use: optionalString,
      visual_role: optionalString,
      design_character: optionalString,
      search_constraints: stringArray,
      negative_constraints: stringArray,
      context: {
        type: "object",
        additionalProperties: false,
        properties: {
          room_type: optionalString,
          placement: optionalString,
          adjacent_objects: stringArray,
          design_intent: optionalString,
        },
      },
      field_confidence: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(
          VISION_JSON_FIELD_CONFIDENCE_KEYS.map((key) => [
            key,
            { type: "number", minimum: 0, maximum: 1 },
          ]),
        ),
      },
    },
  };
}

/**
 * Unwrap `{ source, vision }` envelopes from Tender #4, or accept a bare vision object.
 */
export function unwrapVisionPayload(input) {
  const parsed = extractJsonObject(input);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  if (parsed.vision && typeof parsed.vision === "object" && !Array.isArray(parsed.vision)) {
    return parsed.vision;
  }
  return parsed;
}

/**
 * Normalize a candidate Vision JSON into the canonical shape.
 * Required fields always present; optional rich fields included only when set.
 */
export function normalizeVisionJson(input) {
  const source = unwrapVisionPayload(input);
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  /** @type {import("./visionJsonContract").VisionJson} */
  const vision = {
    category: asTrimmedString(source.category),
    mounting: asTrimmedString(source.mounting),
    material: asTrimmedString(source.material),
    finish: asTrimmedString(source.finish),
    style: asTrimmedString(source.style),
    shape: asTrimmedString(source.shape),
    confidence: asConfidence(source.confidence),
  };

  for (const key of VISION_JSON_OPTIONAL_STRING_KEYS) {
    const value = asOptionalString(source[key]);
    if (value) vision[key] = value;
  }

  for (const key of VISION_JSON_OPTIONAL_ARRAY_KEYS) {
    const value = asStringArray(source[key]);
    if (value) vision[key] = value;
  }

  const context = asContext(source.context);
  if (context) vision.context = context;

  const fieldConfidence = asFieldConfidence(source.field_confidence);
  if (fieldConfidence) vision.field_confidence = fieldConfidence;

  return vision;
}

/**
 * Validate Vision JSON. Returns normalized object + errors (empty when valid).
 *
 * @param {unknown} input
 * @returns {{ ok: boolean, vision: import("./visionJsonContract").VisionJson | null, errors: string[] }}
 */
export function validateVisionJson(input) {
  const errors = [];
  const vision = normalizeVisionJson(input);

  if (!vision) {
    return {
      ok: false,
      vision: null,
      errors: ["Vision JSON must be a non-null object (or { vision: {...} })."],
    };
  }

  for (const key of VISION_JSON_ATTRIBUTE_KEYS) {
    if (!vision[key]) {
      errors.push(`Missing or empty required field: ${key}`);
    }
  }

  if (input != null) {
    const raw = unwrapVisionPayload(input);
    if (raw && typeof raw === "object" && !("confidence" in raw)) {
      errors.push("Missing required field: confidence");
    } else if (
      raw &&
      typeof raw === "object" &&
      raw.confidence != null &&
      !Number.isFinite(Number(raw.confidence))
    ) {
      errors.push("confidence must be a finite number between 0 and 1");
    }
  }

  return {
    ok: errors.length === 0,
    vision,
    errors,
  };
}

/**
 * @param {unknown} value
 * @returns {value is import("./visionJsonContract").VisionJson}
 */
export function isVisionJson(value) {
  const result = validateVisionJson(value);
  return result.ok;
}
