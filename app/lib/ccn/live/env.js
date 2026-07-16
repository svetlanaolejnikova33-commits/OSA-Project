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
 * @returns {"LOCAL" | "BROWSERBASE"}
 */
export function getCcnBrowserEnv() {
  const value = asString(process.env.OSA_CCN_BROWSER_ENV).toUpperCase();
  return value === "BROWSERBASE" ? "BROWSERBASE" : "LOCAL";
}

/**
 * Headless by default; OSA_CCN_HEADLESS=0 enables visible Chromium.
 */
export function isCcnHeadless() {
  return asString(process.env.OSA_CCN_HEADLESS) !== "0";
}

/**
 * Resolve Stagehand model id without printing secrets.
 * Prefers STAGEHAND_MODEL; falls back to openai/gpt-4o when OPENAI_API_KEY exists.
 */
export function resolveStagehandModel() {
  const explicit = asString(process.env.STAGEHAND_MODEL);
  if (explicit) return explicit;
  if (asString(process.env.OPENAI_API_KEY)) return "openai/gpt-4o";
  return null;
}

function hasModelCredentials(model) {
  const name = asString(model).toLowerCase();
  if (!name) return false;
  if (name.startsWith("openai/") || name.startsWith("gpt-")) {
    return Boolean(asString(process.env.OPENAI_API_KEY));
  }
  if (name.startsWith("anthropic/") || name.startsWith("claude")) {
    return Boolean(asString(process.env.ANTHROPIC_API_KEY));
  }
  if (name.startsWith("google/") || name.startsWith("gemini")) {
    return Boolean(asString(process.env.GOOGLE_API_KEY) || asString(process.env.GOOGLE_GENERATIVE_AI_API_KEY));
  }
  // Unknown provider — require STAGEHAND_MODEL only; Stagehand may resolve via its own env.
  return Boolean(asString(process.env.STAGEHAND_MODEL));
}

/**
 * @returns {{
 *   configured: boolean,
 *   liveEnabled: boolean,
 *   browserEnv: "LOCAL" | "BROWSERBASE",
 *   headless: boolean,
 *   mode: "mock" | "live-ready" | "live-enabled-unconfigured",
 *   browserbase: { apiKey: boolean, projectId: boolean },
 *   stagehand: { model: string | null },
 *   missing: string[],
 * }}
 */
export function getCcnLiveEnvStatus() {
  const liveEnabled = isCcnLiveEnabled();
  const browserEnv = getCcnBrowserEnv();
  const headless = isCcnHeadless();
  const model = resolveStagehandModel();
  const apiKey = Boolean(asString(process.env.BROWSERBASE_API_KEY));
  const projectId = Boolean(asString(process.env.BROWSERBASE_PROJECT_ID));

  const missing = [];

  if (browserEnv === "BROWSERBASE") {
    if (!apiKey) missing.push("BROWSERBASE_API_KEY");
    if (!projectId) missing.push("BROWSERBASE_PROJECT_ID");
    if (!model) missing.push("STAGEHAND_MODEL");
  } else {
    // LOCAL — Browserbase credentials are not required.
    if (!model) missing.push("STAGEHAND_MODEL");
    else if (!hasModelCredentials(model)) {
      if (model.toLowerCase().startsWith("openai/") || model.toLowerCase().startsWith("gpt-")) {
        missing.push("OPENAI_API_KEY");
      } else if (model.toLowerCase().startsWith("anthropic/") || model.toLowerCase().startsWith("claude")) {
        missing.push("ANTHROPIC_API_KEY");
      } else {
        missing.push("MODEL_API_KEY");
      }
    }
  }

  const configured = missing.length === 0;

  let mode = "mock";
  if (liveEnabled && configured) mode = "live-ready";
  else if (liveEnabled && !configured) mode = "live-enabled-unconfigured";

  return {
    configured,
    liveEnabled,
    browserEnv,
    headless,
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
    browserEnv: status.browserEnv,
    headless: status.headless,
    browserbaseApiKey: asString(process.env.BROWSERBASE_API_KEY),
    browserbaseProjectId: asString(process.env.BROWSERBASE_PROJECT_ID),
    stagehandModel: status.stagehand.model,
    liveEnabled: true,
  };
}
