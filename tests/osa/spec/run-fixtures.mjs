/**
 * Phase #9 Specification Intelligence fixtures.
 * Run: npx jiti tests/osa/spec/run-fixtures.mjs
 */

import { join } from "path";
import { tmpdir } from "os";
import { mkdtempSync } from "fs";
import {
  assemblePartialSpecification,
  assembleSpecification,
  validateSpecificationPackage,
  OSA_PIPELINE_VERSION,
} from "../../../app/lib/spec/specAssembler.js";
import { runOsaPipeline } from "../../../app/lib/pipeline/osaPipeline.js";
import { storeVisualMemoryResult } from "../../../app/lib/memory/storeVisualMemoryResult.js";
import { resetVisualMemoryStoreForTests } from "../../../app/lib/memory/visualMemoryStore.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoNulls(value, path = "root") {
  if (value === null || value === undefined) {
    throw new Error(`null/undefined at ${path}`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`NaN at ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoNulls(item, `${path}[${i}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      // Gate slots intentionally allow null for Phase #4 audit compatibility.
      if (path.endsWith("gates") && (key === "g1" || key === "g3") && entry === null) continue;
      assertNoNulls(entry, `${path}.${key}`);
    }
  }
}

const VISION = {
  category: "pendant light",
  mounting: "ceiling",
  material: "brass",
  finish: "aged brass",
  style: "modern",
  shape: "cylindrical",
  confidence: 0.93,
};

const MANUFACTURER = {
  manufacturer_id: "modelux",
  brandName: "Modelux",
  catalog_url: "https://modelux.ru/catalog/podvesnoi-svetilnik",
};

// ── 1. Happy path → complete specification + estimate ──
const happyPipeline = await runOsaPipeline({
  vision: VISION,
  manufacturer_id: "modelux",
});

assert(happyPipeline.status === "ok", `1: status ok, got ${happyPipeline.status}`);
assert(happyPipeline.specification?.article === "MD.6102.AB", "1: package article");
assert(happyPipeline.specification?.product?.article === "MD.6102.AB", "1: nested product article");
assert(happyPipeline.specification?.manufacturer, "1: manufacturer");
assert(happyPipeline.specification?.product_name, "1: product_name");
assert(happyPipeline.specification?.url, "1: url");
assert(happyPipeline.specification?.provenance?.style === "Vision", "1: style provenance Vision");
assert(happyPipeline.specification?.provenance?.manufacturer === "Registry", "1: manufacturer Registry");
assert(happyPipeline.estimate?.line_items?.length === 1, "1: estimate line");
assert(happyPipeline.estimate.line.quantity === 1, "1: quantity=1");
assert(happyPipeline.estimate.line.unit === "pcs", "1: unit=pcs");
assert(happyPipeline.estimate.line.line_total === happyPipeline.estimate.line.price * 1, "1: line_total");
assert(happyPipeline.audit?.pipeline_version === OSA_PIPELINE_VERSION, "1: pipeline version");
assert(typeof happyPipeline.audit?.generation_timestamp === "string", "1: timestamp");
assert(happyPipeline.ok === true, "1: assemble ok");

const packageSlice = Object.fromEntries(
  [
    "manufacturer",
    "collection",
    "article",
    "product_name",
    "url",
    "price",
    "currency",
    "image",
    "category",
    "subcategory",
    "material",
    "finish",
    "color",
    "style",
    "mounting",
    "dimensions",
    "technical_specifications",
    "confidence",
    "data_source",
    "memory_source",
    "timestamp",
  ].map((key) => [key, happyPipeline.specification[key]]),
);
assertNoNulls(packageSlice, "package");
assertNoNulls(happyPipeline.estimate.line, "estimate.line");
assertNoNulls(happyPipeline.specification.provenance, "provenance");

const packageValidation = validateSpecificationPackage(packageSlice);
assert(packageValidation.ok, `1: package valid: ${packageValidation.errors.join(", ")}`);

// ── 2. Memory product → specification + memory marked ──
const memDir = mkdtempSync(join(tmpdir(), "osa-spec-mem-"));
const memStore = resetVisualMemoryStoreForTests({ filePath: join(memDir, "memory.json") });
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
    manufacturer: MANUFACTURER,
  },
  { store: memStore },
);

const memoryPipeline = await runOsaPipeline({
  vision: VISION,
  manufacturer_id: "modelux",
  memoryStore: memStore,
});

assert(memoryPipeline.status === "ok", `2: status ok, got ${memoryPipeline.status}`);
assert(memoryPipeline.memory?.used === true, "2: memory used");
assert(memoryPipeline.audit?.memory_used === true, "2: audit memory_used");
assert(memoryPipeline.specification?.memory_source === "visual_memory", "2: memory_source");
assert(memoryPipeline.specification?.article === "MD.6102.AB", "2: article from memory path");
assert(memoryPipeline.estimate?.line?.article === "MD.6102.AB", "2: estimate article");

// ── 3. Live/CCN failure → partial specification + needs_human ──
const failPipeline = await runOsaPipeline({
  vision: {
    category: "oak dining table",
    mounting: "floor",
    material: "oak",
    finish: "natural oak",
    style: "rustic",
    shape: "rectangular",
    confidence: 0.88,
  },
  manufacturer_id: "artemide",
});

assert(failPipeline.status === "needs_human", `3: needs_human, got ${failPipeline.status}`);
assert(failPipeline.partial_specification === true, "3: partial_specification flag");
assert(failPipeline.specification, "3: partial specification present");
assert(Array.isArray(failPipeline.missing_fields), "3: missing_fields");
assert(failPipeline.missing_fields.length > 0, "3: missing fields listed");
assert(failPipeline.audit?.complete === false, "3: audit incomplete");

// ── 4. Missing optional specs → still valid package when required present ──
const sparse = assembleSpecification({
  vision: VISION,
  manufacturer: MANUFACTURER,
  product: {
    source: "CCN",
    article: "MD.6102.AB",
    title: "Sparse Pendant",
    price: 1000,
    currency: "RUB",
    url: "https://modelux.ru/catalog/product/md-6102-ab",
    match_confidence: 0.9,
    specifications: {},
  },
  memory: { used: false },
  livePath: false,
});

assert(sparse.ok === true, "4: sparse still complete (required present)");
assert(sparse.specification.collection === "", "4: empty optional collection ok");
assert(sparse.specification.image === "", "4: empty optional image ok");
assert(typeof sparse.specification.dimensions === "object", "4: dimensions object");
assert(sparse.estimate.line.quantity === 1, "4: quantity");
assert(sparse.missing_fields.includes("image") || sparse.specification.image === "", "4: tracks optional gaps");
const sparseValidation = validateSpecificationPackage(sparse.specification);
assert(sparseValidation.ok, `4: validation ok: ${sparseValidation.errors.join(", ")}`);

// Direct partial assembler
const partial = assemblePartialSpecification({
  vision: VISION,
  manufacturer: MANUFACTURER,
  product: { source: "CCN_LIVE", match_confidence: 0.2, match_type: "none" },
  livePath: true,
});
assert(partial.ok === false, "4b: partial not complete");
assert(partial.audit.live_search_used === true, "4b: live_search_used");

console.log(
  JSON.stringify(
    {
      ok: true,
      cases: {
        happy: {
          article: happyPipeline.specification.article,
          estimate_status: happyPipeline.estimate.line.status,
          line_total: happyPipeline.estimate.line.line_total,
          pipeline_version: happyPipeline.audit.pipeline_version,
        },
        memory: {
          memory_used: memoryPipeline.audit.memory_used,
          memory_source: memoryPipeline.specification.memory_source,
        },
        live_failure: {
          status: failPipeline.status,
          missing_fields: failPipeline.missing_fields.slice(0, 8),
          partial: failPipeline.partial_specification,
        },
        sparse_optional: {
          ok: sparse.ok,
          missing_optional: sparse.missing_fields.filter((f) =>
            ["image", "collection", "dimensions", "technical_specifications"].includes(f),
          ),
        },
      },
    },
    null,
    2,
  ),
);
