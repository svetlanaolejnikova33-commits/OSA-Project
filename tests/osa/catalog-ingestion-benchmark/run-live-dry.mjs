import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeProviderOutput, validateEntityShape, createProviderResult } from "./benchmark-core.mjs";
import { createBenchmarkJob } from "./providers/benchmark-job.mjs";
import { extractWithFirecrawl } from "./providers/firecrawl.mjs";
import { extractWithContextDev } from "./providers/context-dev.mjs";
import { inspectFirecrawlSourceGuard, mapFirecrawlScrapeToEntities } from "./providers/map-firecrawl-entities.mjs";

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

const productPage = mapFirecrawlScrapeToEntities({
  source_url: "https://catalog.fixture/product/sample-sku-001",
  extraction_run_id: "offline-map:firecrawl:product-v1",
  firecrawl: {
    success: true,
    data: {
      markdown: [
        "![Sample Pendant SAMPLE-001](https://catalog.fixture/storage/sample-001.jpg)",
        "![Sample Pendant SAMPLE-001](https://catalog.fixture/storage/sample-001.jpg)",
        "Коллекция  FIXTURE  Артикул  SAMPLE-001  РРЦ:  12 500 ₽",
        "Характеристики  Материал  Metal, Glass  Диаметр мм  400  Высота мм  230",
        "Тип цоколя  E27  Общая мощность Вт  60",
      ].join("  "),
      metadata: {
        title: "Catalog | Official Site | Buy lighting from manufacturer",
        sourceURL: "https://catalog.fixture/product/sample-sku-001",
        statusCode: 200,
      },
    },
  },
});
assert.equal(productPage.length, 1);
const productEntity = normalizeProviderOutput({ entities: productPage }, {
  providerId: "firecrawl",
  extractionRunId: "offline-map:firecrawl:product-v1",
}).normalized_entities[0];
assert.deepEqual(validateEntityShape(productEntity), []);
assert.equal(productEntity.identity.title, "Sample Pendant SAMPLE-001");
assert.equal(productEntity.identity.article, "SAMPLE-001");
assert.equal(productEntity.procurement_attributes.price, 12500);
assert.equal(productEntity.procurement_attributes.currency, "RUB");
assert.equal(productEntity.procurement_attributes.material, "Metal, Glass");
assert.equal(productEntity.procurement_attributes.dimensions.diameter_mm, 400);
assert.equal(productEntity.media.records.length, 1);

const contaminatedProductPage = mapFirecrawlScrapeToEntities({
  source_url: "https://catalog.fixture/product/sample-sku-002",
  extraction_run_id: "offline-map:firecrawl:media-filter-v1",
  firecrawl: {
    success: true,
    data: {
      markdown: [
        "![Current Pendant SAMPLE-002](https://catalog.fixture/storage/sample-002-a.jpg)",
        "![Current Pendant SAMPLE-002](https://catalog.fixture/storage/sample-002-b.jpg)",
        "## Other models in collection",
        "![Sibling Pendant SAMPLE-001](https://catalog.fixture/storage/sample-001.jpg)",
        "![file. (70).png](https://catalog.fixture/storage/ambiguous.png)",
        "Артикул  SAMPLE-002  РРЦ:  9 900 ₽",
      ].join("\n\n"),
      metadata: {
        title: "Catalog | Official Site | Buy lighting from manufacturer",
        sourceURL: "https://catalog.fixture/product/sample-sku-002",
        statusCode: 200,
      },
    },
  },
});
assert.equal(contaminatedProductPage.length, 1);
const filteredProductEntity = normalizeProviderOutput({ entities: contaminatedProductPage }, {
  providerId: "firecrawl",
  extractionRunId: "offline-map:firecrawl:media-filter-v1",
}).normalized_entities[0];
assert.deepEqual(validateEntityShape(filteredProductEntity), []);
assert.equal(filteredProductEntity.identity.article, "SAMPLE-002");
assert.equal(filteredProductEntity.media.records.length, 2);
assert.ok(
  filteredProductEntity.media.records.every((record) => /sample-002/i.test(record.official_url)),
  "media.records must exclude related-section and foreign-SKU images",
);

const errorPageFirecrawl = {
  success: true,
  data: {
    markdown: "Страница не найдена\n\n404",
    metadata: {
      title: "Generic site title",
      sourceURL: "https://catalog.fixture/product/missing",
      statusCode: 404,
      error: "Not Found",
    },
  },
};
const errorGuard = inspectFirecrawlSourceGuard(errorPageFirecrawl);
assert.equal(errorGuard.rejected, true);
assert.equal(errorGuard.reason, "http_source_error");
assert.equal(errorGuard.statusCode, 404);
assert.equal(errorGuard.error, "Not Found");
const rejected404 = mapFirecrawlScrapeToEntities({
  source_url: "https://catalog.fixture/product/missing",
  extraction_run_id: "offline-map:firecrawl:404-v1",
  firecrawl: errorPageFirecrawl,
});
assert.equal(rejected404.length, 0);
const rejected404Normalized = normalizeProviderOutput({ entities: rejected404 }, {
  providerId: "firecrawl",
  extractionRunId: "offline-map:firecrawl:404-v1",
});
assert.equal(rejected404Normalized.normalized_entities.length, 0);

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
