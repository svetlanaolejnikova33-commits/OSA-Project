import { getCcnLiveEnvStatus, isCcnLiveEnabled } from "../../../../lib/ccn/live/env";
import { probeCcnLiveAdapter } from "../../../../lib/ccn/live/ccnLiveAdapter";

/**
 * GET /api/osa/ccn/health
 * Configuration probe only — does not open a browser.
 */
export async function GET() {
  const env = getCcnLiveEnvStatus();
  const probe = probeCcnLiveAdapter();

  const mode = !isCcnLiveEnabled()
    ? "mock"
    : env.configured
      ? "live-ready"
      : "mock";

  return Response.json({
    configured: env.configured && isCcnLiveEnabled(),
    browserbase:
      env.browserEnv === "LOCAL"
        ? "not_required"
        : env.browserbase.apiKey && env.browserbase.projectId
          ? "configured"
          : "missing",
    stagehand: env.stagehand.model ? `model:${env.stagehand.model}` : "missing",
    mode,
    browserEnv: env.browserEnv,
    headless: env.headless,
    liveEnabled: env.liveEnabled,
    missing: env.missing,
    adapter: {
      ready: probe.ready,
      code: probe.code,
      error: probe.error,
    },
  });
}
