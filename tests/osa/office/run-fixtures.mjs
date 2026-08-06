import { buildOfficeResultViewModel } from "../../../app/lib/office/buildOfficeResultViewModel.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const validatedPayload = {
  status: "ok",
  specification: {
    manufacturer: "Modelux",
    product_name: "Pendant light",
    article: "MD.6102.AB",
    url: "https://modelux.ru/catalog/product/md-6102-ab",
    image: "https://modelux.ru/image/md-6102-ab.jpg",
    price: 28700,
    currency: "RUB",
    category: "pendant light",
    material: "brass",
    finish: "aged brass",
    mounting: "ceiling",
    dimensions: { height: "400 mm" },
    technical_specifications: { power: "40 W" },
    confidence: 0.93,
  },
  estimate: {
    line: {
      article: "MD.6102.AB",
      quantity: 2,
      unit: "pcs",
      price: 28700,
      line_total: 123456,
      currency: "RUB",
      status: "ready",
    },
  },
  DesignerSummary: { lines: ["Product identified.", "Estimate line created."] },
  audit: { gates: { g3: { decision: "accept" } } },
};

const validated = buildOfficeResultViewModel(validatedPayload);
assert(validated.kind === "validated", "validated: expected validated view");
assert(validated.productCard.article === "MD.6102.AB", "validated: article");
assert(validated.productCard.url.startsWith("https://"), "validated: official URL");
assert(validated.specification.rows.some((row) => row.label === "Материал"), "validated: spec rows");
assert(validated.specification.dimensions[0].value === "400 mm", "validated: dimensions");
assert(validated.specification.technical[0].value === "40 W", "validated: technical specs");
assert(validated.summaryLines.length === 2, "validated: Designer Summary");
assert(validated.estimate.lineTotal === 123456, "estimate: must preserve supplied line total");
assert(validated.estimate.lineTotal !== validated.estimate.price * validated.estimate.quantity, "estimate: UI must not recalculate");

const sparse = buildOfficeResultViewModel({
  ...validatedPayload,
  specification: {
    manufacturer: "Modelux",
    product_name: "Pendant light",
    article: "MD.6102.AB",
    url: "https://modelux.ru/catalog/product/md-6102-ab",
    price: "",
    currency: "RUB",
    category: "pendant light",
    dimensions: {},
    technical_specifications: {},
  },
  estimate: { line: { article: "MD.6102.AB", quantity: 1, unit: "pcs", price: "", line_total: "", currency: "RUB" } },
  missing_fields: ["price", "image", "dimensions", "technical_specifications"],
});
assert(sparse.kind === "validated", "sparse: verified product remains validated");
assert(sparse.estimate.price === null, "sparse: missing price stays missing");
assert(sparse.estimate.lineTotal === null, "sparse: missing total stays missing");

const humanPick = buildOfficeResultViewModel({
  status: "needs_human",
  hitl: "H3",
  reason: "Choose between close candidates.",
  DesignerSummary: { lines: ["Two close candidates require selection."] },
  candidates: [
    { manufacturer_id: "flos", article: "FLOS-AIM-AB", confidence: 0.74, source: "CCN" },
    { manufacturer_id: "flos", article: "FLOS-STRING-AB", confidence: 0.71, source: "CCN" },
  ],
  specification: { manufacturer: "Flos", article: "", dimensions: {}, technical_specifications: {} },
  estimate: { line: { article: "", price: 100, line_total: 100 } },
  audit: { gates: { g3: { decision: "human_pick" } } },
});
assert(humanPick.kind === "needs_human", "H3: honest state");
assert(humanPick.candidates.length === 2, "H3: candidates visible");
assert(humanPick.summaryLines.length === 1, "H3: Designer Summary visible");
assert(humanPick.estimate === null, "H3: no estimate represented as official");

const notFound = buildOfficeResultViewModel({
  status: "needs_human",
  hitl: "H4",
  reason: "No official product confirmed.",
  missing_fields: ["article", "url", "price"],
  specification: { article: "", dimensions: {}, technical_specifications: {} },
});
assert(notFound.kind === "needs_human", "H4: honest state");
assert(!notFound.productCard.article, "H4: no invented article");
assert(notFound.missingFields.includes("article"), "H4: missing fields visible");

const unacceptedG3 = buildOfficeResultViewModel({
  ...validatedPayload,
  audit: { gates: { g3: { decision: "human_pick" } } },
});
assert(unacceptedG3.kind === "needs_human", "G3: status ok cannot bypass validation");
assert(unacceptedG3.estimate === null, "G3: unaccepted estimate hidden");

console.log(JSON.stringify({
  ok: true,
  cases: {
    validated_product: validated.productCard.article,
    structured_specification: validated.specification.rows.length,
    estimate_passthrough_total: validated.estimate.lineTotal,
    sparse_price: sparse.estimate.price,
    human_pick_candidates: humanPick.candidates.length,
    not_found_state: notFound.hitl,
    g3_guard: unacceptedG3.kind,
  },
}, null, 2));
