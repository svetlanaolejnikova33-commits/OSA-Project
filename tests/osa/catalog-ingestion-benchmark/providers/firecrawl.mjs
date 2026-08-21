import { createProviderResult } from "../benchmark-core.mjs";

export function createFirecrawlFixtureResult(input) {
  return createProviderResult({ provider_id: "firecrawl", ...input });
}

export async function extractWithFirecrawl() {
  throw new Error("OFFLINE_STUB: Firecrawl live extraction is not implemented in the benchmark lab");
}
