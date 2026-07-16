/**
 * Browser Runtime — LOCAL Stagehand + Browserbase scaffold.
 *
 * LOCAL: launches Stagehand with env "LOCAL" (Chromium).
 * BROWSERBASE: scaffold retained; openSession still blocked without live BB calls in 6B.
 */

import { Stagehand } from "@browserbasehq/stagehand";
import {
  CcnLiveNotConfiguredError,
  getCcnBrowserEnv,
  getCcnLiveEnvStatus,
  isCcnHeadless,
  requireCcnLiveEnv,
} from "./env";
import { normalizeCcnLiveError } from "./normalizeError";

export const DEFAULT_SESSION_TIMEOUT_MS = 90_000;
export const DEFAULT_RETRY_ATTEMPTS = 1; // one retry after the first attempt
export const DEFAULT_RETRY_DELAY_MS = 1_500;

/**
 * @typedef {{
 *   timeoutMs: number,
 *   retryAttempts: number,
 *   retryDelayMs: number,
 * }} BrowserRuntimePolicy
 */

/**
 * @param {Partial<BrowserRuntimePolicy>} [overrides]
 * @returns {BrowserRuntimePolicy}
 */
export function createBrowserRuntimePolicy(overrides = {}) {
  return {
    timeoutMs: Number(overrides.timeoutMs) > 0 ? Number(overrides.timeoutMs) : DEFAULT_SESSION_TIMEOUT_MS,
    retryAttempts:
      Number(overrides.retryAttempts) >= 0 ? Number(overrides.retryAttempts) : DEFAULT_RETRY_ATTEMPTS,
    retryDelayMs:
      Number(overrides.retryDelayMs) >= 0 ? Number(overrides.retryDelayMs) : DEFAULT_RETRY_DELAY_MS,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Browser Runtime handle for LOCAL Stagehand sessions.
 */
export class BrowserRuntime {
  /**
   * @param {{
   *   browserEnv?: "LOCAL" | "BROWSERBASE",
   *   headless?: boolean,
   *   browserbaseApiKey?: string,
   *   browserbaseProjectId?: string,
   *   stagehandModel: string,
   *   policy?: Partial<BrowserRuntimePolicy>,
   *   logger?: { info?: Function, warn?: Function, error?: Function },
   * }} config
   */
  constructor(config) {
    this.browserEnv = config.browserEnv || "LOCAL";
    this.headless = config.headless !== false;
    this.browserbaseApiKey = config.browserbaseApiKey || "";
    this.browserbaseProjectId = config.browserbaseProjectId || "";
    this.stagehandModel = config.stagehandModel;
    this.policy = createBrowserRuntimePolicy(config.policy);
    this.logger = config.logger || console;
    this._session = null;
    this._stagehand = null;
    this._browserbaseClient = null;
  }

  /**
   * Prepare client descriptors (no network for Browserbase scaffold).
   */
  prepareClients() {
    this.logger.info?.("[BrowserRuntime] prepareClients", {
      browserEnv: this.browserEnv,
      headless: this.headless,
      modelSet: Boolean(this.stagehandModel),
      policy: this.policy,
    });

    if (this.browserEnv === "BROWSERBASE") {
      this._browserbaseClient = {
        provider: "browserbase",
        projectId: this.browserbaseProjectId,
        prepared: true,
        connected: false,
      };
    } else {
      this._browserbaseClient = null;
    }

    this._stagehand = {
      provider: "stagehand",
      env: this.browserEnv,
      model: this.stagehandModel,
      prepared: true,
      started: false,
    };

    return {
      browserbase: this._browserbaseClient,
      stagehand: this._stagehand,
    };
  }

  /**
   * Open a Stagehand session.
   * LOCAL: launches Chromium via Stagehand.
   * BROWSERBASE: not opened in Phase #6B.
   */
  async openSession() {
    this.prepareClients();

    if (this.browserEnv === "BROWSERBASE") {
      throw new Error(
        "BrowserRuntime.openSession for BROWSERBASE is not enabled in Phase #6B.",
      );
    }

    try {
      const stagehand = new Stagehand({
        env: "LOCAL",
        model: this.stagehandModel,
        verbose: 0,
        disablePino: true,
        localBrowserLaunchOptions: {
          headless: this.headless,
        },
      });

      await stagehand.init();
      this._stagehandInstance = stagehand;
      this._session = {
        env: "LOCAL",
        openedAt: new Date().toISOString(),
      };
      if (this._stagehand) this._stagehand.started = true;

      const page =
        stagehand.context.activePage?.() ||
        (typeof stagehand.context.pages === "function" ? stagehand.context.pages()[0] : null);

      this.logger.info?.("[BrowserRuntime] LOCAL session opened");
      return { stagehand, page };
    } catch (error) {
      const code = normalizeCcnLiveError(error);
      const wrapped = new Error(code);
      wrapped.code = code;
      wrapped.cause = error;
      throw wrapped;
    }
  }

  /**
   * Navigate with timeout handling.
   */
  async goto(page, url) {
    const timeoutMs = this.policy.timeoutMs;
    try {
      await Promise.race([
        page.goto(url, { waitUntil: "domcontentloaded" }),
        sleep(timeoutMs).then(() => {
          throw new Error("navigation_timeout");
        }),
      ]);
      return {
        url: typeof page.url === "function" ? page.url() : page.url,
        title: typeof page.title === "function" ? await page.title() : null,
      };
    } catch (error) {
      const code = normalizeCcnLiveError(error);
      const wrapped = new Error(code === "live_failed" ? "catalog_not_reached" : code);
      wrapped.code = wrapped.message;
      wrapped.cause = error;
      throw wrapped;
    }
  }

  /**
   * Run an async operation with one retry.
   */
  async withRetry(operation) {
    const attempts = 1 + this.policy.retryAttempts;
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;
        this.logger.warn?.("[BrowserRuntime] attempt failed", {
          attempt,
          code: normalizeCcnLiveError(error),
        });
        if (attempt < attempts) {
          await this.closeSession();
          await sleep(this.policy.retryDelayMs);
        }
      }
    }

    throw lastError;
  }

  /**
   * Close Stagehand / browser cleanly.
   */
  async closeSession() {
    const stagehand = this._stagehandInstance;
    this.logger.info?.("[BrowserRuntime] closeSession", {
      hadSession: Boolean(this._session),
    });

    this._session = null;
    this._stagehandInstance = null;
    if (this._stagehand) this._stagehand.started = false;

    if (stagehand && typeof stagehand.close === "function") {
      try {
        await stagehand.close({ force: true });
      } catch {
        // best-effort cleanup
      }
    }

    return { closed: true };
  }

  getStatus() {
    return {
      browserEnv: this.browserEnv,
      prepared: Boolean(this._stagehand),
      sessionOpen: Boolean(this._session),
      policy: this.policy,
      stagehandModel: this.stagehandModel,
      headless: this.headless,
    };
  }
}

/**
 * Create a BrowserRuntime from env, or return structured configuration error.
 */
export function createBrowserRuntimeFromEnv() {
  const status = getCcnLiveEnvStatus();
  try {
    const env = requireCcnLiveEnv();
    const runtime = new BrowserRuntime({
      browserEnv: env.browserEnv || getCcnBrowserEnv(),
      headless: env.headless ?? isCcnHeadless(),
      browserbaseApiKey: env.browserbaseApiKey,
      browserbaseProjectId: env.browserbaseProjectId,
      stagehandModel: env.stagehandModel,
    });
    runtime.prepareClients();
    return { ok: true, runtime };
  } catch (error) {
    if (error instanceof CcnLiveNotConfiguredError) {
      return { ok: false, error: error.toJSON(), envStatus: status };
    }
    throw error;
  }
}
