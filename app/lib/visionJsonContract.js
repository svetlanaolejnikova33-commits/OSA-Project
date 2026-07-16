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

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * JSON Schema for the canonical Vision JSON object (CVO output).
 * Reuses the same schema style as getSemanticDraftJsonSchema.
 */
export function getVisionJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [...VISION_JSON_REQUIRED_KEYS],
    properties: {
      category: { type: "string", minLength: 1 },
      mounting: { type: "string", minLength: 1 },
      material: { type: "string", minLength: 1 },
      finish: { type: "string", minLength: 1 },
      style: { type: "string", minLength: 1 },
      shape: { type: "string", minLength: 1 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
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
 * Missing attributes become ""; confidence is clamped via asConfidence.
 */
export function normalizeVisionJson(input) {
  const source = unwrapVisionPayload(input);
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  return {
    category: asTrimmedString(source.category),
    mounting: asTrimmedString(source.mounting),
    material: asTrimmedString(source.material),
    finish: asTrimmedString(source.finish),
    style: asTrimmedString(source.style),
    shape: asTrimmedString(source.shape),
    confidence: asConfidence(source.confidence),
  };
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
