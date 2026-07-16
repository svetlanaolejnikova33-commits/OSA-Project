/**
 * Canonical CVO Vision JSON (Engineering Tenders #1 / #4).
 * Attribute strings describe the observed product; confidence is 0–1.
 */
export interface VisionJson {
  category: string;
  mounting: string;
  material: string;
  finish: string;
  style: string;
  shape: string;
  confidence: number;
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

