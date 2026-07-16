/**
 * Phase #6A smoke — env config + mock pipeline path (no Browserbase calls).
 * Run: npx jiti scripts/test-ccn-live-6a.mjs
 */

import { getCcnLiveEnvStatus, isCcnLiveEnabled, CcnLiveNotConfiguredError } from "../app/lib/ccn/live/env.js";
import { probeCcnLiveAdapter, runChiefCatalogNavigatorLive } from "../app/lib/ccn/live/ccnLiveAdapter.js";
import { createBrowserRuntimeFromEnv } from "../app/lib/ccn/live/browserRuntime.js";
import { runOsaPipeline } from "../app/lib/pipeline/osaPipeline.js";
import { resetVisualMemoryStoreForTests } from "../app/lib/memory/visualMemoryStore.js";
import { join } from "path";
import { tmpdir } from "os";
import { mkdtempSync } from "fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const previous = {
  OSA_CCN_LIVE: process.env.OSA_CCN_LIVE,
  BROWSERBASE_API_KEY: process.env.BROWSERBASE_API_KEY,
  BROWSERBASE_PROJECT_ID: process.env.BROWSERBASE_PROJECT_ID,
  STAGEHAND_MODEL: process.env.STAGEHAND_MODEL,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

try {
  // ── missing Browserbase ENV in BROWSERBASE mode → graceful configuration response ──
  delete process.env.BROWSERBASE_API_KEY;
  delete process.env.BROWSERBASE_PROJECT_ID;
  delete process.env.STAGEHAND_MODEL;
  process.env.OSA_CCN_LIVE = "1";
  process.env.OSA_CCN_BROWSER_ENV = "BROWSERBASE";

  const missingStatus = getCcnLiveEnvStatus();
  assert(missingStatus.configured === false, "expected configured=false when ENV missing");
  assert(missingStatus.missing.includes("BROWSERBASE_API_KEY"), "missing API key");
  assert(missingStatus.missing.includes("BROWSERBASE_PROJECT_ID"), "missing project id");

  const probe = probeCcnLiveAdapter();
  assert(probe.ready === false, "adapter should not be ready");
  assert(probe.code === "CCN_LIVE_NOT_CONFIGURED", "expected NOT_CONFIGURED code");

  process.env.OSA_CCN_BROWSER_ENV = "LOCAL";
  const runtimeResult = createBrowserRuntimeFromEnv();
  // LOCAL may still be unconfigured without model credentials
  assert(runtimeResult.ok === false || runtimeResult.ok === true, "runtime probe returns");
  if (!runtimeResult.ok) {
    assert(runtimeResult.error?.code === "CCN_LIVE_NOT_CONFIGURED", "runtime structured error");
  }

  process.env.OSA_CCN_BROWSER_ENV = "BROWSERBASE";
  let liveThrew = false;
  try {
    await runChiefCatalogNavigatorLive({
      vision: {
        category: "pendant light",
        mounting: "ceiling",
        material: "brass",
        finish: "aged brass",
        style: "modern",
        shape: "cylindrical",
        confidence: 0.93,
      },
      manufacturer_id: "modelux",
    });
  } catch (error) {
    liveThrew = true;
    assert(error instanceof CcnLiveNotConfiguredError, "expected CcnLiveNotConfiguredError");
    assert(error.toJSON().configured === false, "structured configured=false");
  }
  assert(liveThrew, "live adapter must throw when BROWSERBASE in 6B / missing ENV");

  // ── OSA_CCN_LIVE=0 → pipeline still uses Mock CCN ──
  process.env.OSA_CCN_LIVE = "0";
  process.env.OSA_CCN_BROWSER_ENV = "LOCAL";
  assert(isCcnLiveEnabled() === false, "live flag must be off");

  const store = resetVisualMemoryStoreForTests({
    filePath: join(mkdtempSync(join(tmpdir(), "osa-6a-")), "memory.json"),
  });

  const pipeline = await runOsaPipeline({
    vision: {
      category: "pendant light",
      mounting: "ceiling",
      material: "brass",
      finish: "aged brass",
      style: "modern",
      shape: "cylindrical",
      confidence: 0.93,
    },
    manufacturer_id: "modelux",
    memoryStore: store,
  });

  assert(pipeline.status === "ok", `mock pipeline expected ok, got ${pipeline.status}`);
  assert(pipeline.specification?.product?.article === "MD.6102.AB", "mock CCN product");
  assert(getCcnLiveEnvStatus().mode === "mock", "mode must be mock when flag is 0");

  console.log(
    JSON.stringify(
      {
        ok: true,
        cases: {
          missing_env: {
            configured: missingStatus.configured,
            missing: missingStatus.missing,
            probe_code: probe.code,
          },
          mock_pipeline: {
            status: pipeline.status,
            article: pipeline.specification.product.article,
            osa_ccn_live: process.env.OSA_CCN_LIVE,
            mode: getCcnLiveEnvStatus().mode,
          },
        },
      },
      null,
      2,
    ),
  );
} finally {
  restoreEnv();
}
