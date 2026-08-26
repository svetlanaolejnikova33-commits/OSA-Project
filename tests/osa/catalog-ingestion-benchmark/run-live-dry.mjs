import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeProviderOutput, validateEntityShape, createProviderResult } from "./benchmark-core.mjs";
import { createBenchmarkJob } from "./providers/benchmark-job.mjs";
import { extractWithFirecrawl } from "./providers/firecrawl.mjs";
import { extractWithContextDev } from "./providers/context-dev.mjs";
import { mapFirecrawlScrapeToEntities } from "./providers/map-firecrawl-entities.mjs";

async function runDryPath(providerId, extract) {
  const job = createBenchmarkJob({
    mode: "dry-run",
    run_id: `dry-run:${providerId}:v1`,
    source_urls: ["https://catalog.fixture/dry-run"],
    provider_id: providerId,
  });
  const result = await extract(job);
  assert.equal(result.provider_id, providerId);
  assert.deepEqual(
    Object.keys(result).sort(),
    Object.keys(createProviderResult({
      provider_id: providerId,
      raw_response: {},
      metadata: {},
      usage: { pages: 0 },
      latency_ms: 0,
      provider_cost: 0,
    })).sort(),
  );
  assert.equal(result.extraction_metadata.mode, "dry-run");
  assert.equal(result.extraction_metadata.run_id, job.run_id);
  assert.deepEqual(result.extraction_metadata.source_urls, [...job.source_urls]);
  assert.equal(result.extraction_metadata.external_api_calls, 0);
  assert.equal(result.normalized_entities.length, 0);
  assert.equal(result.rejected_entities.length, 0);

  const normalized = normalizeProviderOutput(result.raw_response, {
    providerId: result.provider_id,
    extractionRunId: job.run_id,
  });
  assert.equal(normalized.rejected_entities.length, 0);
  for (const entity of normalized.normalized_entities) {
    assert.deepEqual(validateEntityShape(entity), []);
  }
  return {
    provider_id: providerId,
    run_id: job.run_id,
    external_api_calls: result.extraction_metadata.external_api_calls,
    normalized_count: normalized.normalized_entities.length,
    handoff: "normalizeProviderOutput+validateEntityShape",
  };
}

const firecrawl = await runDryPath("firecrawl", extractWithFirecrawl);
const contextDev = await runDryPath("context.dev", extractWithContextDev);

const mapped = mapFirecrawlScrapeToEntities({
  source_url: "https://oprime.ru/modeli/mercury",
  extraction_run_id: "offline-map:firecrawl:v1",
  firecrawl: {
    success: true,
    data: {
      markdown: "# МЕРКУРИЙ\n\n[technical pdf](https://oprime.ru/api/files/Catalog/image/ModelLinePage/mercury/spec.pdf)",
      metadata: {
        title: "МЕРКУРИЙ",
        sourceURL: "https://oprime.ru/modeli/mercury",
      },
      links: ["https://oprime.ru/api/files/Catalog/image/ModelLinePage/mercury/spec.pdf"],
    },
  },
});
assert.equal(mapped.length, 1);
const mappedNormalized = normalizeProviderOutput({ entities: mapped }, {
  providerId: "firecrawl",
  extractionRunId: "offline-map:firecrawl:v1",
});
assert.equal(mappedNormalized.rejected_entities.length, 0);
assert.equal(mappedNormalized.normalized_entities.length, 1);
const mappedEntity = mappedNormalized.normalized_entities[0];
assert.deepEqual(validateEntityShape(mappedEntity), []);
assert.equal(mappedEntity.identity.entity_type, "product_model");
assert.equal(mappedEntity.identity.title, "МЕРКУРИЙ");
assert.equal(mappedEntity.identity.manufacturer_id, "oprime");
assert.equal(mappedEntity.identity.source_identity_key, "url:/modeli/mercury");
assert.equal(mappedEntity.provenance_quality.field_evidence.technical_pdf.source_url.includes(".pdf"), true);

await assert.rejects(() => extractWithFirecrawl({}), /OFFLINE_STUB/);
await assert.rejects(() => extractWithContextDev({ mode: "live", run_id: "x", source_urls: [] }), /OFFLINE_STUB/);

const providerDir = join(dirname(fileURLToPath(import.meta.url)), "providers");
for (const name of ["firecrawl.mjs", "context-dev.mjs", "benchmark-job.mjs", "map-firecrawl-entities.mjs"]) {
  const source = await readFile(join(providerDir, name), "utf8");
  assert(!source.includes("gold/"), `${name} must not reference gold/`);
  assert(!source.includes("catalog-fixtures"), `${name} must not import fixtures gold`);
  assert(!source.includes("evaluateHardGate"), `${name} must not evaluate against gold`);
}

console.log(JSON.stringify({
  ok: true,
  mode: "dry-run",
  persistence: false,
  network: false,
  live_transport: false,
  gold_imported: false,
  paths: [firecrawl, contextDev],
}, null, 2));
