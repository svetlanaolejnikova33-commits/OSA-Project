/**
 * Phase #7A — Vision contract + rich fingerprint demonstration.
 * Run: npx jiti tests/osa/vision/run-fixtures.mjs
 */

import { validateVisionJson, normalizeVisionJson } from "../../../app/lib/visionJsonContract.js";
import { buildRichVisualFingerprint } from "../../../app/lib/buildRichVisualFingerprint.js";
import { visionSimilarity } from "../../../app/lib/memory/fingerprintMatcher.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const MINIMAL = {
  category: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.93,
};

const minimalResult = validateVisionJson(MINIMAL);
assert(minimalResult.ok, `minimal vision must validate: ${minimalResult.errors.join(", ")}`);
assert(!minimalResult.vision.subtype, "minimal vision should omit optional subtype");

const MODELUX_RICH = {
  category: "floor lamp",
  subtype: "freestanding floor lamp",
  mounting: "floor",
  material: "brass",
  finish: "aged brass",
  style: "modern classic",
  shape: "vertical stem with tapered shade",
  confidence: 0.94,
  construction: "straight vertical stem; articulated horizontal arm",
  proportions: "tall slender vertical proportions",
  silhouette: "tapered textile shade on vertical stem",
  distinctive_features: [
    "integrated circular side table",
    "articulated swing arm",
    "ornate stepped round base",
    "tapered textile shade",
    "aged brass finish",
  ],
  decorative_details: ["stepped base rings", "textile shade", "ornate base detailing"],
  functional_elements: ["integrated side table", "adjustable arm", "lamp shade", "reading / task light"],
  color_palette: ["aged brass", "warm textile"],
  material_combinations: ["brass / aged brass", "metal / textile"],
  likely_use: "reading / ambient lighting",
  visual_role: "focal lighting object",
  design_character: "warm traditional / modern-classic",
  search_constraints: [
    "floor lamp",
    "freestanding",
    "aged brass",
    "integrated side table",
    "articulated arm",
  ],
  negative_constraints: ["not wall-mounted", "not ceiling pendant", "not fixed rigid stem only"],
  context: {
    room_type: "living room",
    placement: "beside seating",
    adjacent_objects: ["sofa", "side chair"],
    design_intent: "warm reading light with useful side surface",
  },
  field_confidence: {
    category: 0.95,
    subtype: 0.93,
    mounting: 0.96,
    material: 0.92,
    finish: 0.93,
    style: 0.88,
    shape: 0.9,
    construction: 0.91,
    context: 0.85,
  },
};

const richResult = validateVisionJson(MODELUX_RICH);
assert(richResult.ok, `rich vision must validate: ${richResult.errors.join(", ")}`);
assert(richResult.vision.distinctive_features.includes("integrated circular side table"), "preserve table feature");

const fingerprint = buildRichVisualFingerprint(richResult.vision);
assert(fingerprint.category === "floor lamp", "fingerprint category");
assert(fingerprint.distinctive_features.includes("integrated circular side table"), "fingerprint features");
assert(!("article" in fingerprint), "fingerprint must not include article");
assert(!("manufacturer_id" in fingerprint), "fingerprint must not include manufacturer");

const GENERIC_FLOOR = normalizeVisionJson({
  category: "floor lamp",
  subtype: "freestanding floor lamp",
  mounting: "floor",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "vertical stem",
  confidence: 0.9,
  construction: "straight vertical stem; fixed stem",
  silhouette: "plain floor lamp silhouette",
  distinctive_features: ["aged brass finish"],
  functional_elements: ["lamp shade"],
  decorative_details: ["textile shade"],
  negative_constraints: ["no integrated side table", "not wall-mounted"],
});

const BRASS_PENDANT = normalizeVisionJson({
  category: "pendant light",
  subtype: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.9,
  construction: "ceiling suspended cylinder",
  silhouette: "cylindrical pendant",
  distinctive_features: ["aged brass finish", "cylindrical body"],
  functional_elements: ["ceiling mount"],
  negative_constraints: ["not freestanding floor lamp"],
});

const sameScore = visionSimilarity(MODELUX_RICH, MODELUX_RICH);
const genericScore = visionSimilarity(MODELUX_RICH, GENERIC_FLOOR);
const pendantScore = visionSimilarity(MODELUX_RICH, BRASS_PENDANT);

assert(sameScore >= 0.95, `same product similarity expected high, got ${sameScore}`);
assert(genericScore < sameScore, `generic floor should score below same, got ${genericScore}`);
assert(genericScore <= 0.85, `generic floor expected medium/low, got ${genericScore}`);
assert(pendantScore < genericScore, `pendant should score below generic floor, got ${pendantScore}`);
assert(pendantScore <= 0.55, `pendant expected low, got ${pendantScore}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      compatibility: {
        minimal_valid: minimalResult.ok,
        rich_valid: richResult.ok,
      },
      similarity: {
        same_modelux_rich: sameScore,
        generic_brass_floor_no_table: genericScore,
        brass_pendant: pendantScore,
      },
    },
    null,
    2,
  ),
);
