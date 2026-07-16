/**
 * Browser Runtime — Browserbase + Stagehand lifecycle shell for Phase #6A.
 *
 * Constructs configuration and policies only.
 * Does NOT open Browserbase sessions or execute Stagehand.
 */

import {
  CcnLiveNotConfiguredError,
  getCcnLiveEnvStatus,
  requireCcnLiveEnv,
} from "./env";

export const DEFAULT_SESSION_TIMEOUT_MS = 90_000;
export const DEFAULT_RETRY_ATTEMPTS = 2;
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

/**
 * Browser Runtime handle — prepared for live sessions in a later phase.
 * Phase #6A: no network calls.
 */
export class BrowserRuntime {
  /**
   * @param {{
   *   browserbaseApiKey: string,
   *   browserbaseProjectId: string,
   *   stagehandModel: string,
   *   policy?: Partial<BrowserRuntimePolicy>,
   *   logger?: { info: Function, warn: Function, error: Function },
   * }} config
   */
  constructor(config) {
    this.browserbaseApiKey = config.browserbaseApiKey;
    this.browserbaseProjectId = config.browserbaseProjectId;
    this.stagehandModel = config.stagehandModel;
    this.policy = createBrowserRuntimePolicy(config.policy);
    this.logger = config.logger || console;
    this._session = null;
    this._stagehand = null;
    this._browserbaseClient = null;
  }

  /**
   * Build (do not connect) Browserbase + Stagehand client descriptors.
   * No live API calls.
   */
  prepareClients() {
    this.logger.info?.("[BrowserRuntime] prepareClients — no live calls", {
      projectIdSet: Boolean(this.browserbaseProjectId),
      model: this.stagehandModel,
      policy: this.policy,
    });

    this._browserbaseClient = {
      provider: "browserbase",
      projectId: this.browserbaseProjectId,
      prepared: true,
      connected: false,
    };

    this._stagehand = {
      provider: "stagehand",
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
   * Session lifecycle placeholder — Phase #6A does not open sessions.
   * @throws {CcnLiveNotConfiguredError|Error}
   */
  async openSession() {
    throw new Error(
      "BrowserRuntime.openSession is not enabled in Phase #6A. No live Browserbase sessions.",
    );
  }

  /**
   * Close session placeholder — safe no-op when no session exists.
   */
  async closeSession() {
    this.logger.info?.("[BrowserRuntime] closeSession", {
      hadSession: Boolean(this._session),
    });
    this._session = null;
    if (this._stagehand) {
      this._stagehand.started = false;
    }
    return { closed: true };
  }

  getStatus() {
    return {
      prepared: Boolean(this._browserbaseClient && this._stagehand),
      sessionOpen: Boolean(this._session),
      policy: this.policy,
      stagehandModel: this.stagehandModel,
    };
  }
}

/**
 * Create a BrowserRuntime from env, or return structured configuration error.
 *
 * @returns {{ ok: true, runtime: BrowserRuntime } | { ok: false, error: ReturnType<CcnLiveNotConfiguredError['toJSON']> }}
 */
export function createBrowserRuntimeFromEnv() {
  const status = getCcnLiveEnvStatus();
  try {
    const env = requireCcnLiveEnv();
    const runtime = new BrowserRuntime({
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
