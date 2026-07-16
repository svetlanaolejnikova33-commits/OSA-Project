/**
 * Phase #4 pipeline fixtures — happy / human_pick / fail.
 * Run: npx jiti tests/osa/pipeline/run-fixtures.mjs
 */

import { runOsaPipeline } from "../../../app/lib/pipeline/osaPipeline.js";
import { assembleSpecification } from "../../../app/lib/spec/specAssembler.js";

const VISION_HAPPY = {
  category: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.93,
};

const VISION_HUMAN_PICK = {
  category: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.9,
};

const VISION_FAIL = {
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

const happy = await runOsaPipeline({
  vision: VISION_HAPPY,
  manufacturer_id: "modelux",
});

assert(happy.status === "ok", `happy: expected ok, got ${happy.status}`);
assert(happy.specification?.product?.article === "MD.6102.AB", "happy: wrong article");
assert(Array.isArray(happy.estimate?.line_items) && happy.estimate.line_items.length === 1, "happy: line_items");
assert(happy.audit?.cvo_confidence === 0.93, "happy: cvo_confidence");
assert(happy.audit?.ccn_match_confidence >= 0.8, "happy: ccn_match_confidence");

const assembled = assembleSpecification({
  vision: VISION_HAPPY,
  product: happy.specification.product,
  gates: happy.audit.gates,
});
assert(assembled.specification.vision.category === "pendant light", "assemble: vision");
assert(assembled.estimate.line_items[0].article === "MD.6102.AB", "assemble: line item");

const humanPick = await runOsaPipeline({
  vision: VISION_HUMAN_PICK,
  manufacturer_id: "flos",
});

assert(humanPick.status === "needs_human", `human_pick: expected needs_human, got ${humanPick.status}`);
assert(humanPick.hitl === "H3", `human_pick: expected H3, got ${humanPick.hitl}`);
assert(Array.isArray(humanPick.candidates) && humanPick.candidates.length >= 2, "human_pick: candidates");

const fail = await runOsaPipeline({
  vision: VISION_FAIL,
  manufacturer_id: "artemide",
});

assert(fail.status === "needs_human", `fail: expected needs_human, got ${fail.status}`);
assert(fail.hitl === "H4", `fail: expected H4, got ${fail.hitl}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      cases: {
        happy: {
          status: happy.status,
          article: happy.specification.product.article,
          cvo_confidence: happy.audit.cvo_confidence,
          ccn_match_confidence: happy.audit.ccn_match_confidence,
        },
        human_pick: {
          status: humanPick.status,
          hitl: humanPick.hitl,
          top_candidates: humanPick.candidates.slice(0, 2).map((c) => c.article),
        },
        fail: {
          status: fail.status,
          hitl: fail.hitl,
          reason: fail.reason,
        },
      },
    },
    null,
    2,
  ),
);
