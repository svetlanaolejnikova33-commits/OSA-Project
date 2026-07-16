/**
 * Phase #7B Experience Memory fixtures.
 * Run: npx jiti tests/osa/experience/run-fixtures.mjs
 */

import { join } from "path";
import { tmpdir } from "os";
import { mkdtempSync } from "fs";
import { buildRichVisualFingerprint } from "../../../app/lib/buildRichVisualFingerprint.js";
import {
  EXPERIENCE_FAILURE_DECAY,
  EXPERIENCE_INITIAL_GROWTH,
  EXPERIENCE_SUCCESS_GROWTH,
  recommendManufacturersByExperience,
} from "../../../app/lib/memory/experienceMemory.js";
import {
  recordVisualMemoryFailure,
  storeVisualMemoryResult,
} from "../../../app/lib/memory/storeVisualMemoryResult.js";
import { resetVisualMemoryStoreForTests } from "../../../app/lib/memory/visualMemoryStore.js";

const VISION = {
  category: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.93,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function freshStore(label) {
  const dir = mkdtempSync(join(tmpdir(), `osa-exp-${label}-`));
  return resetVisualMemoryStoreForTests({
    filePath: join(dir, "memory.json"),
  });
}

function storeSuccess(store, { manufacturer_id, article, catalog_url, url }) {
  return storeVisualMemoryResult(
    {
      vision: VISION,
      product: {
        article,
        title: `${manufacturer_id} ${article}`,
        price: 1000,
        currency: "RUB",
        url,
        match_confidence: 1,
        match_type: "ccn_live",
      },
      manufacturer: {
        manufacturer_id,
        catalog_url,
      },
    },
    { store },
  );
}

// ── 1. First successful match → manufacturer appears in experience ──
const store1 = freshStore("1");
const first = storeSuccess(store1, {
  manufacturer_id: "modelux",
  article: "MD.6102.AB",
  catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
  url: "https://modelux.ru/catalog/product/md-6102-ab",
});

assert(first.ok, "1: store must succeed");
const exp1 = first.record.experience;
assert(exp1.seen_count === 1, `1: seen_count=1, got ${exp1.seen_count}`);
assert(exp1.successful_matches === 1, "1: successful_matches=1");
assert(
  exp1.manufacturers_seen.some((m) => m.manufacturer_id === "modelux"),
  "1: modelux in manufacturers_seen",
);
assert(exp1.catalogs_seen.length === 1, "1: catalog recorded");
assert(exp1.last_success_at, "1: last_success_at set");
const growthAfterFirst = exp1.confidence_growth;

// ── 2. Five successful matches → confidence increases ──
const store2 = freshStore("2");
let lastGrowth = EXPERIENCE_INITIAL_GROWTH;
for (let i = 0; i < 5; i += 1) {
  const result = storeSuccess(store2, {
    manufacturer_id: "modelux",
    article: "MD.6102.AB",
    catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
    url: "https://modelux.ru/catalog/product/md-6102-ab",
  });
  assert(result.ok, `2: success ${i + 1}`);
  lastGrowth = result.record.experience.confidence_growth;
}

const exp2 = store2.list()[0].experience;
assert(exp2.successful_matches === 5, `2: successful_matches=5, got ${exp2.successful_matches}`);
assert(exp2.seen_count === 5, `2: seen_count=5, got ${exp2.seen_count}`);
assert(
  exp2.confidence_growth > growthAfterFirst,
  `2: confidence_growth should rise above first-success (${growthAfterFirst}), got ${exp2.confidence_growth}`,
);
assert(
  Math.abs(exp2.confidence_growth - (EXPERIENCE_INITIAL_GROWTH + 5 * EXPERIENCE_SUCCESS_GROWTH)) <
    1e-6,
  `2: expected growth ${EXPERIENCE_INITIAL_GROWTH + 5 * EXPERIENCE_SUCCESS_GROWTH}, got ${exp2.confidence_growth}`,
);
assert(lastGrowth === exp2.confidence_growth, "2: last growth matches store");

// ── 3. Failure → confidence decreases slightly; manufacturer remains ──
const beforeFailGrowth = exp2.confidence_growth;
const beforeFailManufacturer = exp2.manufacturers_seen.find((m) => m.manufacturer_id === "modelux");
assert(beforeFailManufacturer, "3: manufacturer present before failure");

const failResult = recordVisualMemoryFailure(
  {
    vision: VISION,
    manufacturer_id: "modelux",
    catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
  },
  { store: store2 },
);
assert(failResult.ok, "3: failure record ok");
assert(failResult.updated >= 1, "3: experience updated");

const exp3 = store2.list()[0].experience;
assert(exp3.failed_matches === 1, "3: failed_matches=1");
assert(
  exp3.confidence_growth < beforeFailGrowth,
  `3: confidence must decrease slightly (${beforeFailGrowth} → ${exp3.confidence_growth})`,
);
assert(
  Math.abs(exp3.confidence_growth - (beforeFailGrowth - EXPERIENCE_FAILURE_DECAY)) < 1e-6,
  `3: expected decay of ${EXPERIENCE_FAILURE_DECAY}, got ${exp3.confidence_growth}`,
);
assert(
  exp3.manufacturers_seen.some((m) => m.manufacturer_id === "modelux"),
  "3: manufacturer remains after failure",
);
assert(exp3.manufacturers_seen.length >= 1, "3: never delete manufacturers");
const afterFailManufacturer = exp3.manufacturers_seen.find((m) => m.manufacturer_id === "modelux");
assert(
  afterFailManufacturer.confidence < beforeFailManufacturer.confidence,
  "3: manufacturer confidence decreased slightly",
);

// ── 4. Two manufacturers → both preserved → recommendation sorted by score ──
const store4 = freshStore("4");
storeSuccess(store4, {
  manufacturer_id: "modelux",
  article: "MD.6102.AB",
  catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
  url: "https://modelux.ru/catalog/product/md-6102-ab",
});
// modelux gets more successes → higher score
storeSuccess(store4, {
  manufacturer_id: "modelux",
  article: "MD.6102.AB",
  catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
  url: "https://modelux.ru/catalog/product/md-6102-ab",
});
storeSuccess(store4, {
  manufacturer_id: "modelux",
  article: "MD.6102.AB",
  catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
  url: "https://modelux.ru/catalog/product/md-6102-ab",
});
storeSuccess(store4, {
  manufacturer_id: "flos",
  article: "FLOS-AIM-AB",
  catalog_url: "https://flos.com/catalog",
  url: "https://flos.com/product/aim-ab",
});

const records4 = store4.list();
assert(records4.length === 2, `4: two product records, got ${records4.length}`);

for (const record of records4) {
  const ids = record.experience.manufacturers_seen.map((m) => m.manufacturer_id).sort();
  assert(ids.includes("modelux"), "4: modelux preserved on shared fingerprint experience");
  assert(ids.includes("flos"), "4: flos preserved on shared fingerprint experience");
}

const fingerprint = buildRichVisualFingerprint(VISION);
const ranking = recommendManufacturersByExperience(fingerprint, { store: store4 });
assert(ranking.length >= 2, `4: weighted candidates (>=2), got ${ranking.length}`);
assert(
  ranking.every((entry) => entry.manufacturer_id && typeof entry.score === "number"),
  "4: each candidate has manufacturer_id + score",
);
assert(ranking[0].score >= ranking[1].score, "4: sorted by score desc");
assert(
  ranking[0].manufacturer_id === "modelux",
  `4: modelux should rank first (more successes), got ${ranking[0].manufacturer_id}`,
);
assert(
  ranking.some((entry) => entry.manufacturer_id === "flos"),
  "4: flos still recommended",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      cases: {
        first_success: {
          seen_count: exp1.seen_count,
          manufacturers: exp1.manufacturers_seen.map((m) => m.manufacturer_id),
          confidence_growth: exp1.confidence_growth,
        },
        five_successes: {
          successful_matches: exp2.successful_matches,
          confidence_growth: exp2.confidence_growth,
        },
        failure: {
          failed_matches: exp3.failed_matches,
          confidence_growth: exp3.confidence_growth,
          manufacturers_remain: exp3.manufacturers_seen.map((m) => m.manufacturer_id),
        },
        two_manufacturers: {
          records: records4.length,
          ranking,
        },
      },
    },
    null,
    2,
  ),
);
