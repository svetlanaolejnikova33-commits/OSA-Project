import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeProviderOutput, validateEntityShape, createProviderResult } from "./benchmark-core.mjs";
import { createBenchmarkJob } from "./providers/benchmark-job.mjs";
import { extractWithFirecrawl } from "./providers/firecrawl.mjs";

const benchmarkDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(benchmarkDir, "../../..");

async function loadEnvLocal() {
  const envPath = join(repoRoot, ".env.local");
  const text = await readFile(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^\uFEFF/, "");
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env) || !process.env[key]) process.env[key] = value;
  }
}

await loadEnvLocal();
assert(process.env.FIRECRAWL_API_KEY, "FIRECRAWL_API_KEY missing from .env.local");

const sourceUrl = "https://oprime.ru/modeli/mercury";
const job = createBenchmarkJob({
  mode: "live",
  run_id: "live:firecrawl:mercury-v1",
  source_urls: [sourceUrl],
  provider_id: "firecrawl",
});

const result = await extractWithFirecrawl(job);
assert.equal(result.provider_id, "firecrawl");
assert.deepEqual(
  Object.keys(result).sort(),
  Object.keys(createProviderResult({
    provider_id: "firecrawl",
    raw_response: {},
    metadata: {},
    usage: { pages: 0 },
    latency_ms: 0,
    provider_cost: 0,
  })).sort(),
);
assert.equal(result.extraction_metadata.mode, "live");
assert.equal(result.extraction_metadata.external_api_calls, 1);
assert.equal(result.raw_response.source_url, sourceUrl);
assert(Array.isArray(result.raw_response.entities));
assert(result.raw_response.firecrawl?.success === true, "Firecrawl scrape did not succeed");
assert.equal(result.raw_response.entities.length, 1, "expected one mapped primary page entity");

const normalized = normalizeProviderOutput(result.raw_response, {
  providerId: result.provider_id,
  extractionRunId: job.run_id,
});
assert.equal(normalized.rejected_entities.length, 0);
assert.equal(normalized.normalized_entities.length, 1);

const entity = normalized.normalized_entities[0];
const shapeErrors = validateEntityShape(entity);
assert.deepEqual(shapeErrors, []);
assert.equal(entity.identity.entity_type, "product_model");
assert.equal(entity.identity.manufacturer_id, "oprime");
assert.equal(entity.identity.official_url, sourceUrl);
assert(entity.identity.title.includes("МЕРКУР"), `unexpected title: ${entity.identity.title}`);
assert.equal(entity.identity.source_identity_key, "url:/modeli/mercury");
assert.equal(entity.relationships.configured_from.length, 0);
assert.equal(entity.media.records.length, 0);
assert(entity.provenance_quality.field_evidence["identity.title"]);
assert(entity.provenance_quality.field_evidence.technical_pdf?.source_url?.includes(".pdf") ?? false);

const markdown = result.raw_response.firecrawl?.data?.markdown;
console.log(JSON.stringify({
  ok: true,
  mode: "live",
  provider_id: "firecrawl",
  run_id: job.run_id,
  source_url: sourceUrl,
  external_api_calls: result.extraction_metadata.external_api_calls,
  latency_ms: result.latency_ms,
  firecrawl_success: result.raw_response.firecrawl?.success ?? false,
  markdown_bytes: typeof markdown === "string" ? markdown.length : 0,
  mapped_entities: result.raw_response.entities.length,
  normalized_count: normalized.normalized_entities.length,
  entity_type: entity.identity.entity_type,
  title: entity.identity.title,
  source_identity_key: entity.identity.source_identity_key,
  pdf_evidence: Boolean(entity.provenance_quality.field_evidence.technical_pdf),
  validation_errors: shapeErrors.length,
  persistence: false,
  gold_imported: false,
  handoff: "Firecrawl raw_response→mapFirecrawlScrapeToEntities→normalizeProviderOutput→validateEntityShape",
}, null, 2));
