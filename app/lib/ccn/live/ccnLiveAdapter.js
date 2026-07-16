/**
 * CCN Live Adapter — Stagehand/Browserbase path (Phase #6A: not wired).
 *
 * Returns the same Product Card contract as mock CCN when live is ready.
 * Until OSA_CCN_LIVE=1 and ENV is complete, throws CcnLiveNotConfiguredError.
 */

import { CcnLiveNotConfiguredError, getCcnLiveEnvStatus, isCcnLiveEnabled, requireCcnLiveEnv } from "./env";
import { createBrowserRuntimeFromEnv } from "./browserRuntime";

/**
 * @param {{
 *   vision: unknown,
 *   manufacturer_id: string,
 *   catalog_url?: string,
 * }} input
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   error: string | null,
 *   visionErrors: string[],
 *   gate: { decision: string, reason: string, match_confidence: number },
 *   vision: object | null,
 *   manufacturer: object | null,
 *   product: {
 *     source: "CCN",
 *     article: string | null,
 *     title: string | null,
 *     price: number | null,
 *     currency: string | null,
 *     url: string | null,
 *     specifications: object,
 *     match_confidence: number,
 *     navigator_trace_id: string,
 *     candidates: object[],
 *   },
 * }>}
 */
export async function runChiefCatalogNavigatorLive(input) {
  const status = getCcnLiveEnvStatus();

  if (!isCcnLiveEnabled()) {
    throw new CcnLiveNotConfiguredError(
      "CCN live adapter is not enabled. OSA_CCN_LIVE must be 1.",
      ["OSA_CCN_LIVE"],
    );
  }

  if (!status.configured) {
    throw new CcnLiveNotConfiguredError(
      "CCN live adapter is not configured.",
      status.missing,
    );
  }

  // Env is complete and flag is on — still no live browser in Phase #6A.
  requireCcnLiveEnv();
  const prepared = createBrowserRuntimeFromEnv();
  if (!prepared.ok) {
    throw new CcnLiveNotConfiguredError(
      prepared.error?.error || "Browser runtime not configured.",
      prepared.error?.missing || status.missing,
    );
  }

  void input;
  void prepared.runtime;

  throw new Error(
    "CCN live navigation is prepared but not implemented in Phase #6A. No Browserbase/Stagehand execution.",
  );
}

/**
 * Structured probe for health / smoke tests (no browser).
 */
export function probeCcnLiveAdapter() {
  const status = getCcnLiveEnvStatus();

  if (!status.liveEnabled) {
    return {
      ready: false,
      configured: false,
      code: "CCN_LIVE_NOT_CONFIGURED",
      error: "CCN live adapter is not enabled. OSA_CCN_LIVE must be 1.",
      missing: ["OSA_CCN_LIVE"],
      mode: status.mode,
    };
  }

  if (!status.configured) {
    return {
      ready: false,
      configured: false,
      code: "CCN_LIVE_NOT_CONFIGURED",
      error: "CCN live adapter is not configured.",
      missing: status.missing,
      mode: status.mode,
    };
  }

  return {
    ready: true,
    configured: true,
    code: null,
    error: null,
    missing: [],
    mode: "live-ready",
  };
}
