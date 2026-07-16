/**
 * Phase #6B local browser smoke — launch Chromium, open catalog URL, confirm, close.
 * Does NOT require a product match.
 *
 * Run: npx jiti scripts/test-ccn-local-smoke-6b.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { resolveManufacturerCatalog } from "../app/lib/ccn/resolveManufacturerCatalog.js";
import { createBrowserRuntimeFromEnv } from "../app/lib/ccn/live/browserRuntime.js";
import { getCcnLiveEnvStatus } from "../app/lib/ccn/live/env.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Load .env.local into process.env without printing values. */
function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const previous = {
  OSA_CCN_LIVE: process.env.OSA_CCN_LIVE,
  OSA_CCN_BROWSER_ENV: process.env.OSA_CCN_BROWSER_ENV,
  OSA_CCN_HEADLESS: process.env.OSA_CCN_HEADLESS,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

try {
  loadEnvLocal();
  process.env.OSA_CCN_LIVE = "1";
  process.env.OSA_CCN_BROWSER_ENV = "LOCAL";
  process.env.OSA_CCN_HEADLESS = process.env.OSA_CCN_HEADLESS || "1";

  const status = getCcnLiveEnvStatus();
  if (!status.configured) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          skipped: true,
          reason: "local live env not configured",
          missing: status.missing,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const binding = resolveManufacturerCatalog("modelux");
  assert(binding?.catalog_url, "modelux catalog_url missing from registry binding");

  const prepared = createBrowserRuntimeFromEnv();
  assert(prepared.ok, "browser runtime not prepared");
  const runtime = prepared.runtime;

  let pageUrl = null;
  let pageTitle = null;

  try {
    const { page } = await runtime.openSession();
    assert(page, "no page after openSession");
    const nav = await runtime.goto(page, binding.catalog_url);
    pageUrl = nav.url || (typeof page.url === "function" ? page.url() : null);
    pageTitle = nav.title;
    assert(pageUrl, "page URL missing after navigation");
    assert(String(pageUrl).includes("modelux"), `unexpected URL: ${pageUrl}`);
  } finally {
    await runtime.closeSession();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        browserEnv: "LOCAL",
        catalog_url: binding.catalog_url,
        pageUrl,
        pageTitle,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: String(error?.message || error),
        code: error?.code || null,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  restoreEnv();
}
