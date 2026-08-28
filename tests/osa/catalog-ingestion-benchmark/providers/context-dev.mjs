import { Agent, fetch as undiciFetch } from "undici";
import { createProviderResult } from "../benchmark-core.mjs";
import { isDryRunJob, isLiveJob } from "./benchmark-job.mjs";

const CONTEXT_DEV_API_BASE = "https://api.context.dev/v1";
const contextDevAgent = new Agent({ connectTimeout: 30_000, bodyTimeout: 120_000 });

export function createContextDevFixtureResult(input) {
  return createProviderResult({ provider_id: "context.dev", ...input });
}

async function scrapeMarkdown(url, apiKey) {
  const started = Date.now();
  const query = new URLSearchParams({
    url,
    useMainContentOnly: "true",
    includeLinks: "true",
    includeImages: "true",
  });
  const response = await undiciFetch(`${CONTEXT_DEV_API_BASE}/web/scrape/markdown?${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    dispatcher: contextDevAgent,
  });
  const latency_ms = Date.now() - started;
  const payload = await response.json().catch(() => ({ success: false, error: "invalid_json_response" }));
  if (!response.ok) {
    const detail = typeof payload?.error === "string"
      ? payload.error
      : typeof payload?.message === "string"
        ? payload.message
        : `HTTP ${response.status}`;
    throw new Error(`CONTEXT_DEV_TRANSPORT_ERROR: ${detail}`);
  }
  return { payload, latency_ms, http_status: response.status };
}

export async function extractWithContextDev(job) {
  if (isDryRunJob(job)) {
    return createContextDevFixtureResult({
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
    const apiKey = process.env.CONTEXT_DEV_API_KEY;
    if (!apiKey) throw new Error("CONTEXT_DEV_TRANSPORT_ERROR: CONTEXT_DEV_API_KEY missing");
    const url = job.source_urls[0];
    const { payload, latency_ms, http_status } = await scrapeMarkdown(url, apiKey);
    const credits = payload?.key_metadata ?? null;
    return createContextDevFixtureResult({
      raw_response: {
        entities: [],
        source_url: url,
        http_status,
        context_dev: payload,
      },
      metadata: {
        mode: "live",
        run_id: job.run_id,
        source_urls: [url],
        external_api_calls: 1,
      },
      usage: {
        pages: payload?.success ? 1 : 0,
        calls: 1,
        credits_consumed: credits?.credits_consumed ?? null,
        credits_remaining: credits?.credits_remaining ?? null,
      },
      latency_ms,
      provider_cost: credits?.credits_consumed ?? 0,
    });
  }

  throw new Error("OFFLINE_STUB: Context.dev extraction requires a valid dry-run or live BenchmarkJob");
}
