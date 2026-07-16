/**
 * Canonical CVO Vision JSON (Engineering Tenders #1 / #4 + Phase #7A rich fields).
 * Required attribute strings describe the observed product; confidence is 0–1.
 * Optional rich fields preserve professional object individuality.
 */
export interface VisionJsonContext {
  room_type?: string;
  placement?: string;
  adjacent_objects?: string[];
  design_intent?: string;
}

export interface VisionJsonFieldConfidence {
  category?: number;
  subtype?: number;
  mounting?: number;
  material?: number;
  finish?: number;
  style?: number;
  shape?: number;
  construction?: number;
  context?: number;
}

export interface VisionJson {
  category: string;
  mounting: string;
  material: string;
  finish: string;
  style: string;
  shape: string;
  confidence: number;
  subtype?: string;
  construction?: string;
  proportions?: string;
  silhouette?: string;
  distinctive_features?: string[];
  decorative_details?: string[];
  functional_elements?: string[];
  color_palette?: string[];
  material_combinations?: string[];
  likely_use?: string;
  visual_role?: string;
  design_character?: string;
  search_constraints?: string[];
  negative_constraints?: string[];
  context?: VisionJsonContext;
  field_confidence?: VisionJsonFieldConfidence;
}

/** Optional Tender #4 envelope around VisionJson. */
export interface VisionJsonEnvelope {
  source?: string;
  vision: VisionJson;
  optional_hints?: Record<string, unknown>;
}

export interface VisionJsonValidationResult {
  ok: boolean;
  vision: VisionJson | null;
  errors: string[];
}

export const VISION_JSON_ATTRIBUTE_KEYS: readonly [
  "category",
  "mounting",
  "material",
  "finish",
  "style",
  "shape",
];

export const VISION_JSON_REQUIRED_KEYS: readonly [
  "category",
  "mounting",
  "material",
  "finish",
  "style",
  "shape",
  "confidence",
];

export const VISION_JSON_OPTIONAL_STRING_KEYS: readonly string[];
export const VISION_JSON_OPTIONAL_ARRAY_KEYS: readonly string[];
export const VISION_JSON_FIELD_CONFIDENCE_KEYS: readonly string[];

export function getVisionJsonSchema(): {
  type: "object";
  additionalProperties: false;
  required: string[];
  properties: Record<string, unknown>;
};

export function unwrapVisionPayload(input: unknown): Record<string, unknown> | null;

export function normalizeVisionJson(input: unknown): VisionJson | null;

export function validateVisionJson(input: unknown): VisionJsonValidationResult;

export function isVisionJson(value: unknown): value is VisionJson;
