/**
 * Phase #8 generic live-scoring test (no manufacturer article).
 * Synthetic product evidence — not tied to any real Modelux SKU.
 * Run: npx jiti scripts/test-ccn-live-scoring-generic-8.mjs
 */

import { scoreLiveCandidate } from "../app/lib/ccn/live/scoreLiveCandidate.js";
import { buildLiveSearchTerms } from "../app/lib/ccn/live/buildLiveSearchTerms.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const VISION = {
  category: "floor lamp",
  subtype: "freestanding floor lamp",
  mounting: "floor",
  material: "steel",
  finish: "blackened steel",
  style: "industrial",
  shape: "dual shade vertical stem",
  confidence: 0.91,
  construction: "straight stem; articulated reading arm",
  silhouette: "dual linen shades on vertical stem",
  distinctive_features: [
    "integrated marble shelf",
    "dual linen shades",
    "articulated reading arm",
    "blackened steel finish",
  ],
  functional_elements: ["integrated side table", "adjustable arm", "lamp shade"],
  search_constraints: ["floor lamp", "marble shelf", "blackened steel"],
  negative_constraints: ["not wall-mounted", "not ceiling pendant"],
};

const MATCHING_EVIDENCE = {
  title: "Industrial floor lamp with marble shelf",
  article: "SYN.FL.9001",
  url: "https://example-manufacturer.test/product/industrial-floor-marble-shelf",
  page_text:
    "Freestanding floor lamp on a straight blackened steel stem. " +
    "Integrated marble shelf / side table. Dual linen shades. " +
    "Articulated reading arm with adjustable swing. Not a pendant.",
  specifications: { mounting: "floor", material: "steel" },
};

const CONFLICTING_EVIDENCE = {
  title: "Glass cylinder ceiling pendant",
  article: "SYN.PD.2002",
  url: "https://example-manufacturer.test/product/glass-cylinder-pendant",
  page_text:
    "Ceiling mounted pendant light with glass cylinder diffuser. " +
    "Canopy mount only. No floor base. No side table. No articulated arm.",
  specifications: { mounting: "ceiling", material: "glass" },
};

const terms = buildLiveSearchTerms(VISION);
const termsBlob = JSON.stringify(terms);
assert(!/8024|SYN\.FL|SYN\.PD|MD\./i.test(termsBlob), "search terms must not contain articles/SKUs");
assert(/floor|торшер|напольн/i.test(terms.primaryQuery + " " + terms.tokens.join(" ")), "terms reflect floor lamp");

const match = scoreLiveCandidate(VISION, MATCHING_EVIDENCE);
const conflict = scoreLiveCandidate(VISION, CONFLICTING_EVIDENCE);

assert(
  match.match_confidence > conflict.match_confidence,
  `matching (${match.match_confidence}) must outrank conflict (${conflict.match_confidence})`,
);
assert(match.match_confidence >= 0.6, `matching confidence expected >= 0.6, got ${match.match_confidence}`);
assert(
  conflict.match_type === "none" || conflict.match_confidence < 0.6,
  `conflict should be weak/none, got ${conflict.match_type} @ ${conflict.match_confidence}`,
);
assert(match.matched_features.length > 0, "matching should list features");
assert(
  conflict.conflicting_features.length > 0,
  "conflict should list mounting/category disagreements",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      search_terms_sample: terms.primaryQuery,
      matching: {
        confidence: match.match_confidence,
        match_type: match.match_type,
        matched_features: match.matched_features,
        conflicting_features: match.conflicting_features,
      },
      conflicting: {
        confidence: conflict.match_confidence,
        match_type: conflict.match_type,
        matched_features: conflict.matched_features,
        conflicting_features: conflict.conflicting_features,
      },
    },
    null,
    2,
  ),
);
