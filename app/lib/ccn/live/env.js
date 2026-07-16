/**
 * CCN Live environment — read-only configuration from process.env.
 * Never hardcodes secrets or project IDs.
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export class CcnLiveNotConfiguredError extends Error {
  /**
   * @param {string} message
   * @param {string[]} [missing]
   */
  constructor(message, missing = []) {
    super(message);
    this.name = "CcnLiveNotConfiguredError";
    this.code = "CCN_LIVE_NOT_CONFIGURED";
    this.missing = missing;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      missing: this.missing,
      configured: false,
    };
  }
}

/**
 * Feature flag: live CCN only when OSA_CCN_LIVE === "1".
 */
export function isCcnLiveEnabled() {
  return asString(process.env.OSA_CCN_LIVE) === "1";
}

/**
 * @returns {{
 *   configured: boolean,
 *   liveEnabled: boolean,
 *   mode: "mock" | "live-ready" | "live-enabled-unconfigured",
 *   browserbase: { apiKey: boolean, projectId: boolean },
 *   stagehand: { model: string | null },
 *   missing: string[],
 * }}
 */
export function getCcnLiveEnvStatus() {
  const liveEnabled = isCcnLiveEnabled();
  const apiKey = Boolean(asString(process.env.BROWSERBASE_API_KEY));
  const projectId = Boolean(asString(process.env.BROWSERBASE_PROJECT_ID));
  const model = asString(process.env.STAGEHAND_MODEL) || null;

  const missing = [];
  if (!apiKey) missing.push("BROWSERBASE_API_KEY");
  if (!projectId) missing.push("BROWSERBASE_PROJECT_ID");
  if (!model) missing.push("STAGEHAND_MODEL");

  const configured = missing.length === 0;

  let mode = "mock";
  if (liveEnabled && configured) mode = "live-ready";
  else if (liveEnabled && !configured) mode = "live-enabled-unconfigured";

  return {
    configured,
    liveEnabled,
    mode,
    browserbase: {
      apiKey,
      projectId,
    },
    stagehand: {
      model,
    },
    missing,
  };
}

/**
 * Resolve live env for runtime construction.
 * @throws {CcnLiveNotConfiguredError}
 */
export function requireCcnLiveEnv() {
  const status = getCcnLiveEnvStatus();
  if (!status.liveEnabled) {
    throw new CcnLiveNotConfiguredError(
      "CCN live mode is disabled. Set OSA_CCN_LIVE=1 to enable.",
      ["OSA_CCN_LIVE"],
    );
  }
  if (!status.configured) {
    throw new CcnLiveNotConfiguredError(
      "CCN live environment is incomplete.",
      status.missing,
    );
  }

  return {
    browserbaseApiKey: asString(process.env.BROWSERBASE_API_KEY),
    browserbaseProjectId: asString(process.env.BROWSERBASE_PROJECT_ID),
    stagehandModel: asString(process.env.STAGEHAND_MODEL),
    liveEnabled: true,
  };
}
