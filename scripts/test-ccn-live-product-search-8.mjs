/**
 * Phase #8 — Live Modelux product search proof + no-match.
 * Run: npx jiti scripts/test-ccn-live-product-search-8.mjs
 *
 * Expected article MD.8024.01FL is used ONLY for test assertion — never passed into search.
 */

import { readFileSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runChiefCatalogNavigatorLive } from "../app/lib/ccn/live/ccnLiveAdapter.js";
import { resetVisualMemoryStoreForTests } from "../app/lib/memory/visualMemoryStore.js";
import { runOsaPipeline } from "../app/lib/pipeline/osaPipeline.js";

const EXPECTED_ARTICLE = "MD.8024.01FL"; // test assertion only

const RICH_VISION = {
  category: "floor lamp",
  subtype: "freestanding floor lamp",
  mounting: "floor",
  material: "brass",
  finish: "aged brass",
  style: "modern classic",
  shape: "vertical stem with tapered shade",
  confidence: 0.94,
  construction: "straight vertical stem; articulated horizontal arm",
  proportions: "tall slender vertical proportions",
  silhouette: "tapered textile shade on vertical stem",
  distinctive_features: [
    "integrated circular side table",
    "articulated swing arm",
    "ornate stepped round base",
    "tapered textile shade",
    "aged brass finish",
  ],
  decorative_details: ["stepped base rings", "textile shade", "ornate base detailing"],
  functional_elements: ["integrated side table", "adjustable arm", "lamp shade", "reading / task light"],
  color_palette: ["aged brass", "warm textile"],
  material_combinations: ["brass / aged brass", "metal / textile"],
  search_constraints: [
    "floor lamp",
    "freestanding",
    "aged brass",
    "integrated side table",
    "articulated arm",
  ],
  negative_constraints: ["not wall-mounted", "not ceiling pendant", "not fixed rigid stem only"],
};

const INCOMPATIBLE_VISION = {
  category: "leather sofa",
  subtype: "three-seat sofa",
  mounting: "floor",
  material: "leather",
  finish: "cognac aniline",
  style: "mid-century",
  shape: "rectangular three-seat",
  confidence: 0.9,
  construction: "tufted back with tapered wood legs",
  silhouette: "low mid-century sofa silhouette",
  distinctive_features: ["tufted back cushions", "tapered wood legs", "button tufting"],
  functional_elements: ["seating for three"],
  negative_constraints: ["not a lamp", "not lighting fixture", "not floor lamp"],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

loadEnvLocal();
process.env.OSA_CCN_LIVE = "1";
process.env.OSA_CCN_BROWSER_ENV = "LOCAL";
if (process.env.OSA_CCN_HEADLESS === undefined) process.env.OSA_CCN_HEADLESS = "1";

try {
  // ── A. Real Modelux live proof ──
  const live = await runChiefCatalogNavigatorLive({
    vision: RICH_VISION,
    manufacturer_id: "modelux",
    // catalog_url omitted — resolved from vision category → floor lamps catalog
  });

  assert(live.product?.source === "CCN_LIVE", "A: source must be CCN_LIVE");
  assert(live.product?.url && /modelux\.ru\/product\//i.test(live.product.url), "A: official product URL");
  assert(
    String(live.product.article || "").toUpperCase().replace(/\s+/g, "") === EXPECTED_ARTICLE,
    `A: expected article ${EXPECTED_ARTICLE}, got ${live.product.article}`,
  );
  assert(
    live.product.price == null || Number.isFinite(Number(live.product.price)),
    "A: price must be number or null",
  );
  assert(typeof live.product.match_confidence === "number", "A: match_confidence");
  assert(Array.isArray(live.product.matched_features), "A: matched_features");
  assert(Array.isArray(live.product.conflicting_features), "A: conflicting_features");
  assert(live.gate?.decision === "accept", `A: gate accept, got ${live.gate?.decision}`);
  assert(live.product.match_confidence >= 0.8, `A: confidence >= 0.8, got ${live.product.match_confidence}`);

  // Pipeline learning check
  const dir = mkdtempSync(join(tmpdir(), "osa-live8-"));
  const store = resetVisualMemoryStoreForTests({ filePath: join(dir, "memory.json") });
  const pipeline = await runOsaPipeline({
    vision: RICH_VISION,
    manufacturer_id: "modelux",
    memoryStore: store,
  });
  assert(pipeline.status === "ok", `A: pipeline ok, got ${pipeline.status}`);
  assert(pipeline.memory?.learned === true, "A: memory should learn after live accept");
  assert(store.list().length >= 1, "A: visual memory stored");

  const proof = {
    url: live.product.url,
    article: live.product.article,
    price: live.product.price,
    currency: live.product.currency,
    match_confidence: live.product.match_confidence,
    match_type: live.product.match_type,
    matched_features: live.product.matched_features,
    conflicting_features: live.product.conflicting_features,
    memory_learned: pipeline.memory.learned,
  };

  // ── B. Live no-match ──
  const noMatch = await runChiefCatalogNavigatorLive({
    vision: INCOMPATIBLE_VISION,
    manufacturer_id: "modelux",
  });

  assert(noMatch.product?.match_type === "none" || noMatch.gate?.decision === "fail", "B: no match");
  assert(noMatch.product?.article == null, "B: must not invent article");
  assert(noMatch.product?.price == null, "B: must not invent price");
  assert(noMatch.product?.source === "CCN_LIVE", "B: source CCN_LIVE");

  console.log(
    JSON.stringify(
      {
        ok: true,
        proof,
        no_match: {
          match_type: noMatch.product?.match_type,
          article: noMatch.product?.article,
          price: noMatch.product?.price,
          gate: noMatch.gate?.decision,
          error: noMatch.error,
        },
      },
      null,
      2,
    ),
  );
} finally {
  restoreEnv();
}
