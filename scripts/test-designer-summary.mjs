/**
 * Designer Summary smoke checks.
 * Run: npx jiti scripts/test-designer-summary.mjs
 */

import { assembleSpecification, assemblePartialSpecification } from "../app/lib/spec/specAssembler.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const VISION = {
  category: "floor lamp",
  mounting: "floor",
  material: "brass",
  finish: "aged brass",
  style: "modern classic",
  shape: "vertical",
  confidence: 0.94,
};

const success = assembleSpecification({
  vision: VISION,
  manufacturer: { manufacturer_id: "modelux", brandName: "Modelux" },
  product: {
    source: "CCN_LIVE",
    article: "MD.8024.01FL",
    title: "Floor lamp",
    price: 17000,
    currency: "RUB",
    url: "https://modelux.ru/product/example",
    match_confidence: 0.98,
    match_type: "exact",
  },
});

assert(success.DesignerSummary, "DesignerSummary present");
assert(success.DesignerSummary.lines.length <= 6, "max 6 lines");
assert(/Exact product found/i.test(success.DesignerSummary.text), "exact headline");
assert(/Modelux/.test(success.DesignerSummary.text), "manufacturer shown");
assert(/MD\.8024\.01FL/.test(success.DesignerSummary.text), "article shown");
assert(!/pipeline|memory|registry|scoring|feature flag/i.test(success.DesignerSummary.text), "no internals");

const partial = assemblePartialSpecification({
  vision: VISION,
  manufacturer: { manufacturer_id: "modelux", brandName: "Modelux" },
  product: {
    source: "CCN_LIVE",
    article: "MD.8024.01FL",
    title: "Floor lamp",
    url: "https://modelux.ru/product/example",
    match_confidence: 0.85,
    match_type: "strong_analog",
  },
  partial: true,
});

assert(/Price unavailable/i.test(partial.DesignerSummary.text), "price missing message");
assert(/Manual price verification/i.test(partial.DesignerSummary.text), "manual price");
assert(partial.DesignerSummary.lines.length <= 6, "partial max 6");
assert(partial.specification.article === "MD.8024.01FL", "package unchanged");

console.log(
  JSON.stringify(
    {
      ok: true,
      success_text: success.DesignerSummary.text,
      partial_text: partial.DesignerSummary.text,
    },
    null,
    2,
  ),
);
