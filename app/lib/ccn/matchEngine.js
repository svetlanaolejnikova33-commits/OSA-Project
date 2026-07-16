import { asConfidence } from "../validateSemanticDraft";

const FIELD_WEIGHTS = Object.freeze({
  category: 0.3,
  mounting: 0.2,
  material: 0.2,
  finish: 0.15,
  style: 0.1,
  shape: 0.05,
});

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value) {
  return asString(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я\s/-]/gi, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

/**
 * Deterministic field similarity in [0, 1].
 */
export function fieldSimilarity(visionValue, productValue) {
  const left = normalizeText(visionValue);
  const right = normalizeText(productValue);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.92;

  const leftTokens = tokenize(left);
  const rightTokens = new Set(tokenize(right));
  if (!leftTokens.length || !rightTokens.size) return 0;

  let hit = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      hit += 1;
      continue;
    }
    for (const other of rightTokens) {
      if (token.length >= 4 && other.length >= 4 && (token.startsWith(other.slice(0, 4)) || other.startsWith(token.slice(0, 4)))) {
        hit += 0.7;
        break;
      }
    }
  }

  return Math.max(0, Math.min(1, hit / leftTokens.length));
}

/**
 * Score one product against Vision JSON.
 *
 * @param {import("../visionJsonContract").VisionJson} vision
 * @param {object} product
 * @returns {{ score: number, fieldScores: Record<string, number> }}
 */
export function scoreProductAgainstVision(vision, product) {
  const fieldScores = {};
  let total = 0;

  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const similarity = fieldSimilarity(vision?.[field], product?.[field]);
    fieldScores[field] = Number(similarity.toFixed(4));
    total += similarity * weight;
  }

  return {
    score: asConfidence(total),
    fieldScores,
  };
}

/**
 * Rank mock catalog products against Vision JSON (deterministic descending score, then article).
 *
 * @param {import("../visionJsonContract").VisionJson} vision
 * @param {object[]} products
 */
export function rankCatalogMatches(vision, products) {
  const list = Array.isArray(products) ? products : [];
  const ranked = list.map((product) => {
    const { score, fieldScores } = scoreProductAgainstVision(vision, product);
    return {
      article: product.article,
      title: product.title,
      price: product.price,
      currency: product.currency,
      url: product.url,
      specifications: product.specifications || {},
      match_confidence: score,
      fieldScores,
    };
  });

  ranked.sort((a, b) => {
    if (b.match_confidence !== a.match_confidence) return b.match_confidence - a.match_confidence;
    return String(a.article).localeCompare(String(b.article));
  });

  return ranked;
}

export { FIELD_WEIGHTS };
