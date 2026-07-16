/**
 * Phase #5 Visual Memory fixtures — hit / miss / deleted URL fallback.
 * Run: npx jiti tests/osa/memory/run-fixtures.mjs
 */

import { join } from "path";
import { tmpdir } from "os";
import { mkdtempSync } from "fs";
import { runOsaPipeline } from "../../../app/lib/pipeline/osaPipeline.js";
import { storeVisualMemoryResult } from "../../../app/lib/memory/storeVisualMemoryResult.js";
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
  const dir = mkdtempSync(join(tmpdir(), `osa-mem-${label}-`));
  return resetVisualMemoryStoreForTests({
    filePath: join(dir, "memory.json"),
  });
}

// ── Fixture A: memory hit → CCN verifies → SUCCESS ──
const storeA = freshStore("a");
storeVisualMemoryResult(
  {
    vision: VISION,
    product: {
      article: "MD.6102.AB",
      title: "Modelux Pendant Cylinder — Aged Brass",
      price: 28700,
      currency: "RUB",
      url: "https://modelux.ru/catalog/product/md-6102-ab",
      match_confidence: 1,
      match_type: "ccn_live",
    },
    manufacturer: {
      manufacturer_id: "modelux",
      catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
    },
  },
  { store: storeA },
);

const fixtureA = await runOsaPipeline({
  vision: VISION,
  manufacturer_id: "modelux",
  memoryStore: storeA,
});

assert(fixtureA.status === "ok", `A: expected ok, got ${fixtureA.status}`);
assert(fixtureA.memory?.used === true, "A: memory should be used");
assert(fixtureA.specification?.product?.article === "MD.6102.AB", "A: article");
assert(fixtureA.memory?.fallback === false, "A: no fallback");

// ── Fixture B: memory miss → Registry → CCN → SUCCESS ──
const storeB = freshStore("b");
const fixtureB = await runOsaPipeline({
  vision: VISION,
  manufacturer_id: "modelux",
  memoryStore: storeB,
});

assert(fixtureB.status === "ok", `B: expected ok, got ${fixtureB.status}`);
assert(fixtureB.memory?.used === false, "B: memory should not be used");
assert(fixtureB.specification?.product?.article === "MD.6102.AB", "B: article from CCN");
assert(fixtureB.memory?.learned === true, "B: should learn after success");
assert(storeB.list().length === 1, "B: memory grew");

// ── Fixture C: remembered URL deleted → fallback Registry → CCN → SUCCESS ──
const storeC = freshStore("c");
storeVisualMemoryResult(
  {
    vision: VISION,
    product: {
      article: "MD.DELETED.01",
      title: "Gone Product",
      price: 1,
      currency: "RUB",
      url: "https://modelux.ru/catalog/product/md-deleted-01",
      match_confidence: 1,
      match_type: "ccn_live",
    },
    manufacturer: {
      manufacturer_id: "modelux",
      catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
    },
  },
  { store: storeC },
);

const fixtureC = await runOsaPipeline({
  vision: VISION,
  manufacturer_id: "modelux",
  memoryStore: storeC,
});

assert(fixtureC.status === "ok", `C: expected ok, got ${fixtureC.status}`);
assert(fixtureC.memory?.used === false, "C: deleted URL must not count as memory used");
assert(fixtureC.memory?.fallback === true, "C: should mark fallback after failed verify");
assert(fixtureC.specification?.product?.article === "MD.6102.AB", "C: fallback article");
assert(fixtureC.memory?.proposed_article === "MD.DELETED.01", "C: proposed deleted article");

console.log(
  JSON.stringify(
    {
      ok: true,
      cases: {
        A_memory_hit: {
          status: fixtureA.status,
          memory_used: fixtureA.memory.used,
          article: fixtureA.specification.product.article,
          similarity: fixtureA.memory.similarity,
        },
        B_memory_miss: {
          status: fixtureB.status,
          memory_used: fixtureB.memory.used,
          learned: fixtureB.memory.learned,
          article: fixtureB.specification.product.article,
          store_size: storeB.list().length,
        },
        C_deleted_url_fallback: {
          status: fixtureC.status,
          memory_used: fixtureC.memory.used,
          fallback: fixtureC.memory.fallback,
          proposed: fixtureC.memory.proposed_article,
          article: fixtureC.specification.product.article,
        },
      },
    },
    null,
    2,
  ),
);
