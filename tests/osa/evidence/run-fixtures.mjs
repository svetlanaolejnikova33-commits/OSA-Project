/**
 * OSA Core V2 Roadmap v1.0 - Slice 1 Evidence Discovery MVP.
 * Provider-neutral fixtures only: providers are injected through fetchMatches.
 * Run: npx jiti tests/osa/evidence/run-fixtures.mjs
 */

import { runEvidenceDiscovery } from "../../../app/lib/evidence/runEvidenceDiscovery.js";
import { runOsaPipeline } from "../../../app/lib/pipeline/osaPipeline.js";

const PENDANT_VISION = {
  category: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.93,
};

const FLOOR_LAMP_VISION = {
  category: "floor lamp",
  subtype: "freestanding floor lamp",
  mounting: "floor",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.94,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function emptyMemory() {
  const records = [];
  return {
    list: () => records,
    findByFingerprint: () => [],
    upsert: (record) => {
      records.push(record);
      return record;
    },
  };
}

function registryBoundProvider(source = "fixture_provider_a") {
  return {
    ok: true,
    source,
    matches: [
      {
        title: "Modelux pendant visual evidence",
        page_url: "https://modelux.ru/product/pendant-evidence",
        image_url: "https://modelux.ru/storage/pendant-evidence.jpg",
        domain: "modelux.ru",
        brand_raw: "Modelux",
        position: 1,
        article: "UNTRUSTED-ARTICLE",
        price: 1,
        specifications: { material: "invented" },
      },
    ],
  };
}

const normalized = await runEvidenceDiscovery({
  vision: PENDANT_VISION,
  imagePublicUrl: "https://images.example.test/pendant.jpg",
  fetchMatches: async () => registryBoundProvider(),
});

assert(normalized.status === "ok", "normalized: expected ok");
assert(normalized.candidates.length === 1, "normalized: one Registry candidate");
assert(normalized.candidates[0].manufacturer_id === "modelux", "normalized: manufacturer_id");
assert(normalized.candidates[0].source === "fixture_provider_a", "normalized: source");
assert(normalized.candidates[0].evidence.length === 1, "normalized: evidence provenance");
for (const key of ["article", "price", "specifications"]) {
  assert(!(key in normalized.candidates[0]), "candidate leaked untrusted " + key);
  assert(!(key in normalized.candidates[0].evidence[0]), "evidence leaked untrusted " + key);
}

const pipeline = await runOsaPipeline({
  vision: PENDANT_VISION,
  imagePublicUrl: "https://images.example.test/pendant.jpg",
  memoryStore: emptyMemory(),
  evidenceFetchMatches: async () => registryBoundProvider(),
});

assert(pipeline.status === "ok", "pipeline: expected ok, got " + pipeline.status);
assert(pipeline.evidence?.status === "ok", "pipeline: evidence status");
assert(pipeline.evidence.candidates[0].manufacturer_id === "modelux", "pipeline: manufacturer");
assert(
  pipeline.specification?.product?.article === "MD.6102.AB",
  "pipeline: official article must come from CCN",
);
assert(pipeline.audit?.gates?.g3?.decision === "accept", "pipeline: G3 accept");

let explicitProviderCalls = 0;
const explicit = await runOsaPipeline({
  vision: PENDANT_VISION,
  manufacturer_id: "modelux",
  memoryStore: emptyMemory(),
  evidenceFetchMatches: async () => {
    explicitProviderCalls += 1;
    throw new Error("Evidence must not run");
  },
});
assert(explicit.status === "ok", "explicit: expected ok");
assert(explicitProviderCalls === 0, "explicit: Evidence must be skipped");
assert(!explicit.evidence, "explicit: no Evidence payload");

const unmapped = await runOsaPipeline({
  vision: FLOOR_LAMP_VISION,
  imagePublicUrl: "https://images.example.test/floor-lamp.jpg",
  memoryStore: emptyMemory(),
  evidenceFetchMatches: async () => ({
    ok: true,
    source: "fixture_provider_b",
    matches: [
      {
        title: "Unknown marketplace result",
        page_url: "https://unknown.example.test/item/123",
        image_url: "https://unknown.example.test/item.jpg",
        domain: "unknown.example.test",
        brand_raw: "Unknown",
        position: 1,
        article: "FAKE-ARTICLE",
        price: 100,
      },
    ],
  }),
});
assert(unmapped.status === "needs_human", "unmapped: expected needs_human");
assert(unmapped.hitl === "H4", "unmapped: expected H4");
assert(unmapped.evidence?.status === "empty", "unmapped: Evidence empty");
assert(!unmapped.product, "unmapped: no Official Product");

const invalidProvenance = await runEvidenceDiscovery({
  vision: FLOOR_LAMP_VISION,
  imagePublicUrl: "https://images.example.test/floor-lamp.jpg",
  fetchMatches: async () => ({
    ok: true,
    source: "fixture_provider_c",
    matches: [
      {
        title: "Modelux without verifiable page",
        page_url: "javascript:alert(1)",
        domain: "modelux.ru",
        brand_raw: "Modelux",
        position: 1,
      },
    ],
  }),
});
assert(invalidProvenance.status === "empty", "provenance: invalid URL rejected");

const providerError = await runOsaPipeline({
  vision: FLOOR_LAMP_VISION,
  imagePublicUrl: "https://images.example.test/floor-lamp.jpg",
  memoryStore: emptyMemory(),
  evidenceFetchMatches: async () => {
    throw new Error("fixture provider outage");
  },
});
assert(providerError.status === "needs_human", "error: expected needs_human");
assert(providerError.hitl === "H4", "error: expected H4");
assert(providerError.evidence?.status === "error", "error: Evidence error");
assert(providerError.reason.includes("fixture provider outage"), "error: diagnosable");
assert(!providerError.product, "error: no Official Product");

const explicitEmpty = await runEvidenceDiscovery({
  vision: FLOOR_LAMP_VISION,
  imagePublicUrl: "https://images.example.test/floor-lamp.jpg",
  fetchMatches: async () => ({
    ok: false,
    status: "empty",
    source: "fixture_provider_d",
    reason: "No visual evidence.",
    matches: [],
  }),
});
assert(explicitEmpty.status === "empty", "empty: provider status preserved");

const swapped = await runOsaPipeline({
  vision: PENDANT_VISION,
  imagePublicUrl: "https://images.example.test/pendant.jpg",
  memoryStore: emptyMemory(),
  evidenceFetchMatches: async () => registryBoundProvider("fixture_provider_swapped"),
});
assert(swapped.status === "ok", "swap: expected same pipeline result");
assert(swapped.specification?.product?.article === "MD.6102.AB", "swap: CCN/Spec unchanged");
assert(
  swapped.evidence?.candidates?.[0]?.source === "fixture_provider_swapped",
  "swap: provider provenance",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      cases: {
        normalized_candidate: normalized.candidates[0].manufacturer_id,
        pipeline_without_manufacturer: {
          status: pipeline.status,
          official_article: pipeline.specification.product.article,
          g3: pipeline.audit.gates.g3.decision,
        },
        explicit_manufacturer_skips_evidence: explicitProviderCalls === 0,
        unmapped_evidence: {
          status: unmapped.status,
          hitl: unmapped.hitl,
          evidence_status: unmapped.evidence.status,
        },
        invalid_provenance: invalidProvenance.status,
        provider_error: {
          status: providerError.status,
          evidence_status: providerError.evidence.status,
        },
        provider_swap: swapped.evidence.candidates[0].source,
      },
    },
    null,
    2,
  ),
);




