import { resolveEstimateTruth } from "../../../app/lib/estimate/resolveEstimateTruth.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const basket = [
  {
    id: "basket-conflict",
    projectKey: "project-1",
    status: "budget",
    category: "lamp",
    brand: "Wrong basket brand",
    model: "BASKET-1",
    article: "BASKET-1",
    price: 999,
  },
];

const validatedOffice = {
  status: "ok",
  specification: {
    manufacturer: "Modelux",
    product_name: "Pendant light",
    article: "MD.6102.AB",
    category: "pendant light",
    url: "https://modelux.ru/catalog/product/md-6102-ab",
    image: "https://modelux.ru/image/md-6102-ab.jpg",
    confidence: 0.93,
    currency: "RUB",
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
  audit: { gates: { g3: { decision: "accept" } } },
};

const canonical = resolveEstimateTruth({
  officeResult: validatedOffice,
  selectedProjectItems: basket,
  projectKey: "project-1",
});
assert(canonical.source === "spec_assembler", "validated: Spec Assembler must win");
assert(canonical.canonical === true, "validated: canonical flag");
assert(canonical.rows.length === 1, "validated: one Office estimate row");
assert(canonical.rows[0].article === "MD.6102.AB", "validated: basket article leaked");
assert(canonical.rows[0].source === "spec_assembler", "validated: source marker");
assert(canonical.total === 123456, "validated: supplied line_total must pass through");
assert(canonical.total !== canonical.rows[0].price * canonical.rows[0].quantity, "validated: selector recalculated line_total");

const missingPrice = resolveEstimateTruth({
  officeResult: {
    ...validatedOffice,
    estimate: {
      line: {
        article: "MD.6102.AB",
        quantity: 1,
        unit: "pcs",
        price: "",
        line_total: "",
        currency: "RUB",
      },
    },
  },
  selectedProjectItems: basket,
});
assert(missingPrice.source === "spec_assembler", "missing price: no basket fallback");
assert(missingPrice.rows[0].price === null, "missing price: must remain null");
assert(missingPrice.total === null, "missing total: must remain null");

for (const [hitl, decision] of [["H3", "human_pick"], ["H4", "reject"]]) {
  const unresolved = resolveEstimateTruth({
    officeResult: {
      ...validatedOffice,
      status: "needs_human",
      hitl,
      audit: { gates: { g3: { decision } } },
    },
    selectedProjectItems: basket,
  });
  assert(unresolved.source === "legacy_basket", `${hitl}: partial Office estimate must not be official`);
  assert(unresolved.rows[0].article === "BASKET-1", `${hitl}: legacy behavior remains available`);
}

const noOffice = resolveEstimateTruth({
  officeResult: null,
  selectedProjectItems: basket,
  projectKey: "project-1",
});
assert(noOffice.source === "legacy_basket", "legacy: expected basket source");
assert(noOffice.canonical === false, "legacy: canonical false");
assert(noOffice.total === 999, "legacy: existing basket calculation retained");

const rejectedStatusOk = resolveEstimateTruth({
  officeResult: {
    ...validatedOffice,
    audit: { gates: { g3: { decision: "human_pick" } } },
  },
  selectedProjectItems: basket,
});
assert(rejectedStatusOk.source === "legacy_basket", "G3 guard: status ok alone is insufficient");

console.log(JSON.stringify({
  ok: true,
  cases: {
    canonical_source: canonical.source,
    canonical_article: canonical.rows[0].article,
    passthrough_total: canonical.total,
    missing_price_source: missingPrice.source,
    missing_price_total: missingPrice.total,
    legacy_source: noOffice.source,
    legacy_total: noOffice.total,
    g3_guard_source: rejectedStatusOk.source,
  },
}, null, 2));
