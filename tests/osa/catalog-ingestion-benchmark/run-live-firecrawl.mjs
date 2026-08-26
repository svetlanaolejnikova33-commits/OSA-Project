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
    const value = trimmed.slice(eq + 1);
    if (!(key in process.env)) process.env[key] = value;
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
assert.equal(result.raw_response.entities.length, 0);
assert(result.raw_response.firecrawl?.success === true, "Firecrawl scrape did not succeed");

const normalized = normalizeProviderOutput(result.raw_response, {
  providerId: result.provider_id,
  extractionRunId: job.run_id,
});
assert.equal(normalized.rejected_entities.length, 0);
for (const entity of normalized.normalized_entities) {
  assert.deepEqual(validateEntityShape(entity), []);
}

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
  normalized_count: normalized.normalized_entities.length,
  validation_errors: 0,
  persistence: false,
  gold_imported: false,
  handoff: "ProviderResult→normalizeProviderOutput→validateEntityShape",
}, null, 2));
