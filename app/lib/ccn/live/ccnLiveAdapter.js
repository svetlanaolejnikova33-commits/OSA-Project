/**
 * CCN Live Adapter — LOCAL Stagehand live product search (Phase #8).
 * Returns CCN_LIVE product cards only (no mock catalog in the live path).
 */

import { randomUUID } from "crypto";
import { validateVisionJson } from "../../visionJsonContract";
import { createBrowserRuntimeFromEnv } from "./browserRuntime";
import {
  CcnLiveNotConfiguredError,
  getCcnBrowserEnv,
  getCcnLiveEnvStatus,
  isCcnLiveEnabled,
} from "./env";
import { runLiveProductSearch } from "./liveProductSearch";
import { normalizeCcnLiveError } from "./normalizeError";
import { resolveLiveSearchTarget } from "./resolveLiveTarget";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildTraceId() {
  try {
    return randomUUID();
  } catch {
    return `ccn-live-${Date.now()}`;
  }
}

function emptyLiveProduct(traceId, manufacturerId = null) {
  return {
    source: "CCN_LIVE",
    manufacturer_id: manufacturerId,
    article: null,
    title: null,
    price: null,
    currency: null,
    url: null,
    image_url: null,
    specifications: {},
    availability: null,
    match_confidence: 0,
    match_type: "none",
    matched_features: [],
    conflicting_features: [],
    navigator_trace_id: traceId,
    verified_at: new Date().toISOString(),
    candidates: [],
  };
}

/**
 * Structured probe for health / smoke tests.
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
      browserEnv: status.browserEnv,
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
      browserEnv: status.browserEnv,
    };
  }

  return {
    ready: true,
    configured: true,
    code: null,
    error: null,
    missing: [],
    mode: "live-ready",
    browserEnv: status.browserEnv,
  };
}

/**
 * Live CCN navigation via LOCAL Stagehand.
 *
 * Input:
 * {
 *   vision,
 *   manufacturer_id?,
 *   catalog_url?,
 *   memory_candidates?,
 *   experience_candidates?,
 * }
 */
export async function runChiefCatalogNavigatorLive(input) {
  const navigatorTraceId = buildTraceId();
  const status = getCcnLiveEnvStatus();

  if (!isCcnLiveEnabled()) {
    throw new CcnLiveNotConfiguredError(
      "CCN live adapter is not enabled. OSA_CCN_LIVE must be 1.",
      ["OSA_CCN_LIVE"],
    );
  }

  if (getCcnBrowserEnv() === "BROWSERBASE") {
    throw new CcnLiveNotConfiguredError(
      "BROWSERBASE mode is not enabled for live product search. Set OSA_CCN_BROWSER_ENV=LOCAL.",
      ["OSA_CCN_BROWSER_ENV"],
    );
  }

  if (!status.configured) {
    const missing = status.missing.length ? status.missing : ["STAGEHAND_MODEL"];
    const code = missing.includes("STAGEHAND_MODEL") || missing.some((item) => /API_KEY/.test(item))
      ? "model_not_configured"
      : "not_configured";
    throw new CcnLiveNotConfiguredError(
      code === "model_not_configured"
        ? "Stagehand model is not configured."
        : "CCN live adapter is not configured.",
      missing,
    );
  }

  const visionValidation = validateVisionJson(input?.vision);
  if (!visionValidation.ok || !visionValidation.vision) {
    return {
      ok: false,
      error: "product_not_found",
      reason: "invalid Vision JSON",
      visionErrors: visionValidation.errors,
      gate: {
        decision: "fail",
        reason: "invalid Vision JSON",
        match_confidence: 0,
      },
      vision: null,
      manufacturer: null,
      product: emptyLiveProduct(navigatorTraceId),
    };
  }

  const target = resolveLiveSearchTarget({
    manufacturer_id: input?.manufacturer_id,
    catalog_url: input?.catalog_url,
    vision: visionValidation.vision,
    memory_candidates: input?.memory_candidates,
    experience_candidates: input?.experience_candidates,
  });

  if (!target.ok || !target.binding) {
    return {
      ok: false,
      error: target.error || "catalog_not_reached",
      reason: target.reason || "catalog_not_reached",
      visionErrors: [],
      gate: {
        decision: "fail",
        reason: target.reason || "manufacturer not resolved from registry",
        match_confidence: 0,
      },
      vision: visionValidation.vision,
      manufacturer: null,
      product: emptyLiveProduct(navigatorTraceId),
    };
  }

  const prepared = createBrowserRuntimeFromEnv();
  if (!prepared.ok) {
    throw new CcnLiveNotConfiguredError(
      prepared.error?.error || "Browser runtime not configured.",
      prepared.error?.missing || status.missing,
    );
  }

  const runtime = prepared.runtime;
  runtime.policy = {
    ...runtime.policy,
    timeoutMs: Math.max(runtime.policy.timeoutMs, 120_000),
    retryAttempts: 0,
  };
  const vision = visionValidation.vision;
  const binding = target.binding;
  const catalogUrl = target.catalog_url;

  try {
    const result = await runtime.withRetry(async () => {
      const { stagehand, page } = await runtime.openSession();
      if (!page) {
        const err = new Error("browser_launch_failed");
        err.code = "browser_launch_failed";
        throw err;
      }

      return runLiveProductSearch({
        stagehand,
        page,
        runtime,
        vision,
        binding,
        catalogUrl,
        navigatorTraceId,
      });
    });

    return {
      ...result,
      vision: result.vision || vision,
      target_source: target.source,
    };
  } catch (error) {
    if (error instanceof CcnLiveNotConfiguredError) throw error;
    const code = normalizeCcnLiveError(error);
    return {
      ok: false,
      error: code,
      reason: code,
      visionErrors: [],
      gate: {
        decision: "fail",
        reason: code,
        match_confidence: 0,
      },
      vision,
      manufacturer: { ...binding, catalog_url: catalogUrl },
      product: emptyLiveProduct(navigatorTraceId, binding.manufacturer_id),
    };
  } finally {
    await runtime.closeSession();
  }
}

export { resolveLiveSearchTarget };
