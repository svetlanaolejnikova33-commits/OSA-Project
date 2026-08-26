import { createProviderResult } from "../benchmark-core.mjs";
import { isDryRunJob } from "./benchmark-job.mjs";

export function createContextDevFixtureResult(input) {
  return createProviderResult({ provider_id: "context.dev", ...input });
}

export async function extractWithContextDev(job) {
  if (!isDryRunJob(job)) {
    throw new Error("OFFLINE_STUB: Context.dev live extraction is not implemented in the benchmark lab");
  }
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
