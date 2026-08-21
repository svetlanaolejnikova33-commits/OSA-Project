import { createProviderResult } from "../benchmark-core.mjs";

export function createContextDevFixtureResult(input) {
  return createProviderResult({ provider_id: "context.dev", ...input });
}

export async function extractWithContextDev() {
  throw new Error("OFFLINE_STUB: Context.dev live extraction is not implemented in the benchmark lab");
}
