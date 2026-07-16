import { asConfidence } from "../validateSemanticDraft";
import { fieldSimilarity } from "../ccn/matchEngine";
import { buildRichVisualFingerprint } from "../buildRichVisualFingerprint";
import { VISION_JSON_ATTRIBUTE_KEYS, validateVisionJson } from "../visionJsonContract";
import { getVisualMemoryStore } from "./visualMemoryStore";

/** Legacy basic weights — used when rich fields are absent on both sides. */
const BASIC_MEMORY_FIELD_WEIGHTS = Object.freeze({
  category: 0.3,
  mounting: 0.2,
  material: 0.2,
  finish: 0.15,
  style: 0.1,
  shape: 0.05,
});

/**
 * Rich matching priority (Phase #7A):
 * 1 category+subtype, 2 construction+silhouette, 3 distinctive features,
 * 4 functional elements, 5 material+finish, 6 proportions, 7 style (low).
 */
const RICH_MEMORY_WEIGHTS = Object.freeze({
  category: 0.14,
  subtype: 0.14,
  construction: 0.12,
  silhouette: 0.1,
  distinctive_features: 0.14,
  functional_elements: 0.12,
  material: 0.07,
  finish: 0.07,
  proportions: 0.05,
  style: 0.03,
  shape: 0.02,
});

export const MEMORY_HIT_MIN = 0.95;

/** @deprecated use BASIC_MEMORY_FIELD_WEIGHTS via visionSimilarity fallback */
export const MEMORY_FIELD_WEIGHTS = BASIC_MEMORY_FIELD_WEIGHTS;

function asString(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function listOverlap(left, right) {
  const a = Array.isArray(left) ? left.map(asString).filter(Boolean) : [];
  const b = new Set((Array.isArray(right) ? right : []).map(asString).filter(Boolean));
  if (!a.length && !b.size) return null; // both absent → ignore
  if (!a.length || !b.size) return 0.35; // one-sided weak signal
  let hit = 0;
  for (const token of a) {
    if (b.has(token)) {
      hit += 1;
      continue;
    }
    for (const other of b) {
      if (token.includes(other) || other.includes(token)) {
        hit += 0.7;
        break;
      }
    }
  }
  return Math.max(0, Math.min(1, hit / Math.max(a.length, b.size)));
}

function hasRichSignal(vision) {
  if (!vision || typeof vision !== "object") return false;
  return Boolean(
    vision.subtype ||
      vision.construction ||
      vision.silhouette ||
      vision.proportions ||
      (Array.isArray(vision.distinctive_features) && vision.distinctive_features.length) ||
      (Array.isArray(vision.functional_elements) && vision.functional_elements.length) ||
      (Array.isArray(vision.material_combinations) && vision.material_combinations.length),
  );
}

function basicVisionSimilarity(leftVision, rightVision) {
  let total = 0;
  for (const [field, weight] of Object.entries(BASIC_MEMORY_FIELD_WEIGHTS)) {
    total += fieldSimilarity(leftVision?.[field], rightVision?.[field]) * weight;
  }
  return asConfidence(total);
}

function hasFeatureHint(list, patterns) {
  const text = (Array.isArray(list) ? list : []).join(" ").toLowerCase();
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Critical feature conflicts strongly reduce similarity.
 */
export function criticalFeaturePenalty(leftVision, rightVision) {
  let penalty = 0;
  const leftMount = asString(leftVision?.mounting);
  const rightMount = asString(rightVision?.mounting);
  if (leftMount && rightMount && leftMount !== rightMount) {
    penalty += 0.35;
  }

  const leftFunc = leftVision?.functional_elements;
  const rightFunc = rightVision?.functional_elements;
  const leftTable = hasFeatureHint(leftFunc, [/side table/, /integrated table/, /столик/]);
  const rightTable = hasFeatureHint(rightFunc, [/side table/, /integrated table/, /столик/]);
  const leftFeat = leftVision?.distinctive_features;
  const rightFeat = rightVision?.distinctive_features;
  const leftTableFeat = hasFeatureHint(leftFeat, [/side table/, /integrated/, /столик/]);
  const rightTableFeat = hasFeatureHint(rightFeat, [/side table/, /integrated/, /столик/]);
  if ((leftTable || leftTableFeat) !== (rightTable || rightTableFeat) && (leftTable || leftTableFeat || rightTable || rightTableFeat)) {
    penalty += 0.28;
  }

  const leftArm = /articulated|swing/.test(
    `${asString(leftVision?.construction)} ${(leftFeat || []).join(" ")}`,
  );
  const rightArm = /articulated|swing/.test(
    `${asString(rightVision?.construction)} ${(rightFeat || []).join(" ")}`,
  );
  const leftFixed = /fixed stem|rigid/.test(asString(leftVision?.construction));
  const rightFixed = /fixed stem|rigid/.test(asString(rightVision?.construction));
  if ((leftArm && rightFixed) || (rightArm && leftFixed) || (leftArm !== rightArm && (leftArm || rightArm) && (leftFixed || rightFixed))) {
    penalty += 0.22;
  }

  const leftShadeMulti = /multi|multiple|два|три|cluster/.test(
    `${asString(leftVision?.silhouette)} ${(leftFeat || []).join(" ")}`,
  );
  const rightShadeMulti = /multi|multiple|два|три|cluster/.test(
    `${asString(rightVision?.silhouette)} ${(rightFeat || []).join(" ")}`,
  );
  if (leftShadeMulti !== rightShadeMulti && (leftShadeMulti || rightShadeMulti)) {
    penalty += 0.18;
  }

  return Math.min(0.85, penalty);
}

function richVisionSimilarity(leftVision, rightVision) {
  const leftFp = buildRichVisualFingerprint(leftVision);
  const rightFp = buildRichVisualFingerprint(rightVision);

  let weighted = 0;
  let weightSum = 0;

  for (const [field, weight] of Object.entries(RICH_MEMORY_WEIGHTS)) {
    let score = null;
    if (field === "distinctive_features" || field === "functional_elements") {
      score = listOverlap(leftFp[field], rightFp[field]);
    } else if (field === "material_combinations") {
      score = listOverlap(leftFp.material_combinations, rightFp.material_combinations);
    } else {
      const leftVal = leftFp[field];
      const rightVal = rightFp[field];
      if (!leftVal && !rightVal) score = null;
      else score = fieldSimilarity(leftVal, rightVal);
    }

    if (score == null) continue;
    weighted += score * weight;
    weightSum += weight;
  }

  const base = weightSum > 0 ? weighted / weightSum : basicVisionSimilarity(leftVision, rightVision);
  const penalty = criticalFeaturePenalty(leftVision, rightVision);
  return asConfidence(Math.max(0, base - penalty));
}

/**
 * Similarity between two Vision JSON objects (attribute-based, not embeddings).
 * Uses rich fingerprint when either side has rich fields; otherwise basic fallback.
 */
export function visionSimilarity(leftVision, rightVision) {
  if (hasRichSignal(leftVision) || hasRichSignal(rightVision)) {
    return richVisionSimilarity(leftVision, rightVision);
  }
  return basicVisionSimilarity(leftVision, rightVision);
}

/**
 * Search Visual Memory for remembered matches ordered by similarity.
 */
export function searchVisualMemory(visionInput, options = {}) {
  const validation = validateVisionJson(visionInput);
  if (!validation.ok || !validation.vision) {
    return {
      ok: false,
      error: "Vision JSON validation failed.",
      visionErrors: validation.errors,
      candidates: [],
    };
  }

  const store = options.store || getVisualMemoryStore();
  const manufacturerFilter = typeof options.manufacturer_id === "string"
    ? options.manufacturer_id.trim().toLowerCase()
    : "";
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 10));

  const ranked = store
    .list()
    .filter((record) => {
      if (!manufacturerFilter) return true;
      return String(record.manufacturer_id).toLowerCase() === manufacturerFilter;
    })
    .map((record) => {
      const similarity = visionSimilarity(validation.vision, record.vision);
      return {
        similarity,
        manufacturer_id: record.manufacturer_id,
        article: record.article,
        product_url: record.product_url,
        catalog_url: record.catalog_url,
        category: record.category,
        confidence: record.confidence,
        match_type: record.match_type,
        last_verified_at: record.last_verified_at,
      };
    })
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      return String(a.article).localeCompare(String(b.article));
    })
    .slice(0, limit);

  return {
    ok: true,
    candidates: ranked,
  };
}

export { VISION_JSON_ATTRIBUTE_KEYS, RICH_MEMORY_WEIGHTS, BASIC_MEMORY_FIELD_WEIGHTS };
