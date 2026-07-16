import { createHash } from "crypto";
import { VISION_JSON_ATTRIBUTE_KEYS } from "./visionJsonContract";

function asString(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function asStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .sort();
}

/**
 * Deterministic rich visual fingerprint from Vision JSON only.
 * Excludes manufacturer, article, price, catalog URL, and remembered results.
 *
 * @param {import("./visionJsonContract").VisionJson | null | undefined} vision
 */
export function buildRichVisualFingerprint(vision) {
  const source = vision && typeof vision === "object" ? vision : {};

  return {
    category: asString(source.category),
    subtype: asString(source.subtype),
    mounting: asString(source.mounting),
    construction: asString(source.construction),
    proportions: asString(source.proportions),
    silhouette: asString(source.silhouette),
    material_combinations: asStringList(source.material_combinations),
    finish: asString(source.finish),
    material: asString(source.material),
    distinctive_features: asStringList(source.distinctive_features),
    functional_elements: asStringList(source.functional_elements),
    decorative_details: asStringList(source.decorative_details),
    style: asString(source.style),
    shape: asString(source.shape),
    negative_constraints: asStringList(source.negative_constraints),
  };
}

/**
 * Stable hash key for rich fingerprint persistence / identity.
 */
export function richFingerprintKey(fingerprint) {
  const fp = fingerprint && typeof fingerprint === "object" ? fingerprint : {};
  const payload = JSON.stringify(fp);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/**
 * Legacy basic fingerprint (Phases #1–#5) — kept for backward-compatible identity.
 */
export function buildBasicVisualFingerprint(vision) {
  const source = vision && typeof vision === "object" ? vision : {};
  const fingerprint = {};
  for (const key of VISION_JSON_ATTRIBUTE_KEYS) {
    fingerprint[key] = asString(source[key]);
  }
  return fingerprint;
}
