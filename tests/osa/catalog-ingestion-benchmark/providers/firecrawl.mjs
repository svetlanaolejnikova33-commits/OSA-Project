import { Agent, fetch as undiciFetch } from "undici";
import { createProviderResult } from "../benchmark-core.mjs";
import { isDryRunJob, isLiveJob } from "./benchmark-job.mjs";

const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v1";
const firecrawlAgent = new Agent({ connectTimeout: 30_000, bodyTimeout: 60_000 });

export function createFirecrawlFixtureResult(input) {
  return createProviderResult({ provider_id: "firecrawl", ...input });
}

async function scrapeUrl(url, apiKey) {
  const started = Date.now();
  const response = await undiciFetch(`${FIRECRAWL_API_BASE}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
    dispatcher: firecrawlAgent,
  });
  const latency_ms = Date.now() - started;
  const payload = await response.json().catch(() => ({ success: false, error: "invalid_json_response" }));
  if (!response.ok) {
    const detail = typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}`;
    throw new Error(`FIRECRAWL_TRANSPORT_ERROR: ${detail}`);
  }
  return { payload, latency_ms };
}

export async function extractWithFirecrawl(job) {
  if (isDryRunJob(job)) {
    return createFirecrawlFixtureResult({
      raw_response: { entities: [] },
      metadata: {
        mode: "dry-run",
        run_id: job.run_id,
        source_urls: [...job.source_urls],
        external_api_calls: 0,
      },
      usage: { pages: 0, calls: 0 },
      latency_ms: 0,
      provider_cost: 0,
    });
  }

  if (isLiveJob(job)) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_TRANSPORT_ERROR: FIRECRAWL_API_KEY missing");
    const url = job.source_urls[0];
    const { payload, latency_ms } = await scrapeUrl(url, apiKey);
    return createFirecrawlFixtureResult({
      raw_response: {
        entities: [],
        source_url: url,
        firecrawl: payload,
      },
      metadata: {
        mode: "live",
        run_id: job.run_id,
        source_urls: [url],
        external_api_calls: 1,
      },
      usage: { pages: 1, calls: 1 },
      latency_ms,
      provider_cost: 0,
    });
  }

  throw new Error("OFFLINE_STUB: Firecrawl extraction requires a valid dry-run or live BenchmarkJob");
}
