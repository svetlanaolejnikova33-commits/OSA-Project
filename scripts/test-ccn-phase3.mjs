/**
 * Phase #3 CCN fixtures — accept / human_pick / fail.
 * Run: npx jiti scripts/test-ccn-phase3.mjs
 */

import { runChiefCatalogNavigator } from "../app/lib/ccn/chiefCatalogNavigator.js";

const VISION_ACCEPT = {
  category: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.93,
};

const VISION_AMBIGUOUS = {
  category: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.9,
};

const VISION_ZERO = {
  category: "oak dining table",
  mounting: "floor",
  material: "oak",
  finish: "natural oak",
  style: "rustic",
  shape: "rectangular",
  confidence: 0.88,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const accept = runChiefCatalogNavigator({
  vision: VISION_ACCEPT,
  manufacturer_id: "modelux",
});

assert(accept.gate.decision === "accept", `expected accept, got ${accept.gate.decision}`);
assert(accept.product.article === "MD.6102.AB", `expected MD.6102.AB, got ${accept.product.article}`);
assert(accept.product.match_confidence >= 0.8, "accept confidence must be >= 0.80");
assert(accept.product.source === "CCN", "source must be CCN");
assert(accept.manufacturer.catalog_url, "catalog_url must resolve");

const ambiguous = runChiefCatalogNavigator({
  vision: VISION_AMBIGUOUS,
  manufacturer_id: "flos",
});

assert(ambiguous.gate.decision === "human_pick", `expected human_pick, got ${ambiguous.gate.decision}`);
assert(ambiguous.product.article == null, "human_pick must not auto-select article");
assert(ambiguous.product.candidates.length >= 2, "human_pick needs candidates");
assert(
  ambiguous.product.candidates[0].match_confidence - ambiguous.product.candidates[1].match_confidence <= 0.08,
  "top two must be within ambiguity delta",
);

const zero = runChiefCatalogNavigator({
  vision: VISION_ZERO,
  manufacturer_id: "artemide",
});

assert(zero.gate.decision === "fail", `expected fail, got ${zero.gate.decision}`);
assert(zero.product.match_confidence < 0.6, "fail confidence must be < 0.60");
assert(zero.product.article == null, "fail must not select article");

console.log(
  JSON.stringify(
    {
      ok: true,
      cases: {
        accept: {
          decision: accept.gate.decision,
          article: accept.product.article,
          match_confidence: accept.product.match_confidence,
          catalog_url: accept.manufacturer.catalog_url,
        },
        ambiguous: {
          decision: ambiguous.gate.decision,
          candidates: ambiguous.product.candidates.slice(0, 2).map((c) => ({
            article: c.article,
            match_confidence: c.match_confidence,
          })),
        },
        zero: {
          decision: zero.gate.decision,
          match_confidence: zero.product.match_confidence,
        },
      },
    },
    null,
    2,
  ),
);
