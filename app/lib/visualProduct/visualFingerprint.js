/**
 * Universal Visual Fingerprint — GPT semanticDraft → product similarity.
 * No category-specific synonym tables; uses Vision output text as source of truth.
 */

import { resolveSceneObjectTypeFromSceneGraph } from "../sceneObjectRegistryRouting";

const FIELD_WEIGHTS = {
  objectType: 22,
  style: 16,
  colors: 16,
  materials: 18,
  shapes: 10,
  features: 13,
  roomContext: 5,
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeObjectType(value) {
  return asString(value).toLowerCase().replace(/\s+/g, "_");
}

function normalizeText(value) {
  return asString(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я\s/_-]/gi, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  const text = normalizeText(value);
  if (!text) return [];
  return text.split(" ").filter((token) => token.length >= 2);
}

function uniqueTerms(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    for (const token of tokenize(value)) {
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(token);
    }
  }
  return out;
}

function pushTerms(bucket, value) {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) bucket.push(...collectRawTerms(item));
    return;
  }
  if (typeof value === "object") {
    bucket.push(
      ...collectRawTerms(value.labelRu),
      ...collectRawTerms(value.name),
      ...collectRawTerms(value.nameRu),
      ...collectRawTerms(value.materialGuess),
      ...collectRawTerms(value.colorGuess),
      ...collectRawTerms(value.finish),
      ...collectRawTerms(value.possibleMaterial),
      ...collectRawTerms(value.type),
      ...collectRawTerms(value.note),
      ...collectRawTerms(value.descriptionRu),
      ...collectRawTerms(value.hex),
    );
    return;
  }
  const text = asString(value);
  if (text) bucket.push(text);
}

function collectRawTerms(value) {
  const bucket = [];
  pushTerms(bucket, value);
  return bucket;
}

export function resolvePrimarySceneObject(semanticDraft) {
  const objects = asArray(semanticDraft?.sceneGraph?.objects);
  if (!objects.length) return null;

  const routedType = resolveSceneObjectTypeFromSceneGraph(semanticDraft);
  if (routedType) {
    const matched = objects.find((obj) => normalizeObjectType(obj.type) === routedType);
    if (matched) return matched;
  }

  const skuPool = objects.filter(
    (obj) => obj?.futureReady?.skuRelevant || obj?.skuRelevant || obj?.budgetWeight === "high",
  );
  const pool = skuPool.length ? skuPool : objects;
  const highWeight = pool.filter((obj) => obj.visualWeight === "high");
  const candidates = highWeight.length ? highWeight : pool;

  return candidates.reduce((best, obj) => {
    const left = Number(obj?.confidence) || 0;
    const right = Number(best?.confidence) || 0;
    return left > right ? obj : best;
  }, candidates[0]);
}

function collectStyleTerms(semanticDraft) {
  const pro = semanticDraft?.proAnalysis || {};
  const quick = semanticDraft?.quickAnalysis || {};
  const terms = [];

  pushTerms(terms, pro.styleAnalysis?.labelRu);
  pushTerms(terms, pro.styleAnalysis?.primary);
  pushTerms(terms, pro.styleAnalysis?.secondary);
  pushTerms(terms, pro.styleAnalysis?.formLanguageRu);
  pushTerms(terms, pro.styleAnalysis?.spatialCharacterRu);
  pushTerms(terms, quick.styleAnalysis?.labelRu);
  pushTerms(terms, quick.styleAnalysis?.primary);
  pushTerms(terms, quick.styleAnalysis?.secondary);
  pushTerms(terms, pro.atmosphereRu);
  pushTerms(terms, quick.atmosphereRu);

  return uniqueTerms(terms);
}

function collectColorTerms(semanticDraft, primaryObject) {
  const pro = semanticDraft?.proAnalysis || {};
  const quick = semanticDraft?.quickAnalysis || {};
  const terms = [];

  pushTerms(terms, primaryObject?.colorGuess);
  pushTerms(terms, pro.colorAnalysis?.colorLogicRu);
  pushTerms(terms, quick.colorAnalysis?.colorLogicRu);
  pushTerms(terms, pro.colorAnalysis?.interpretedPalette?.descriptionRu);
  pushTerms(terms, quick.colorAnalysis?.interpretedPalette?.descriptionRu);
  pushTerms(terms, pro.colorAnalysis?.interpretedPalette?.dominant);
  pushTerms(terms, pro.colorAnalysis?.interpretedPalette?.accents);
  pushTerms(terms, pro.colorAnalysis?.dominant);
  pushTerms(terms, pro.colorAnalysis?.accents);
  pushTerms(terms, quick.colorAnalysis?.dominant);
  pushTerms(terms, quick.colorAnalysis?.accents);

  return uniqueTerms(terms);
}

function collectMaterialTerms(semanticDraft, primaryObject) {
  const pro = semanticDraft?.proAnalysis || {};
  const terms = [];

  pushTerms(terms, primaryObject?.materialGuess);

  const materialAnalysis = pro.materialAnalysis;
  if (materialAnalysis && typeof materialAnalysis === "object") {
    for (const items of Object.values(materialAnalysis)) {
      pushTerms(terms, items);
    }
  }

  pushTerms(terms, pro.textileAnalysis);
  pushTerms(terms, pro.furnitureAnalysis);
  pushTerms(terms, pro.floorAnalysis);
  pushTerms(terms, pro.wallAnalysis);
  pushTerms(terms, pro.ceilingAnalysis);

  for (const group of asArray(semanticDraft?.specAnalysis?.specificationGroups)) {
    for (const item of asArray(group?.items)) {
      if (primaryObject?.labelRu && !matchesPrimaryObject(item, primaryObject)) continue;
      pushTerms(terms, item.materialGuess);
      pushTerms(terms, item.finish);
      pushTerms(terms, item.note);
    }
  }

  return uniqueTerms(terms);
}

function collectShapeTerms(semanticDraft, primaryObject) {
  const pro = semanticDraft?.proAnalysis || {};
  const terms = [];

  pushTerms(terms, pro.styleAnalysis?.formLanguageRu);
  pushTerms(terms, pro.styleAnalysis?.spatialCharacterRu);
  pushTerms(terms, primaryObject?.position?.horizontal);
  pushTerms(terms, primaryObject?.position?.vertical);
  pushTerms(terms, primaryObject?.position?.depth);
  pushTerms(terms, primaryObject?.visualWeight);

  return uniqueTerms(terms);
}

function matchesPrimaryObject(item, primaryObject) {
  const itemText = normalizeText([item?.name, item?.category, item?.note].filter(Boolean).join(" "));
  const label = normalizeText(primaryObject?.labelRu);
  const type = normalizeText(primaryObject?.type);
  if (!itemText) return false;
  if (label && itemText.includes(label)) return true;
  if (type && itemText.includes(type.replace(/_/g, " "))) return true;
  return false;
}

function collectFeatureTerms(semanticDraft, primaryObject) {
  const pro = semanticDraft?.proAnalysis || {};
  const terms = [];

  pushTerms(terms, primaryObject?.labelRu);
  pushTerms(terms, primaryObject?.type);

  for (const light of asArray(pro.lightingAnalysis?.artificialLight)) {
    pushTerms(terms, light.labelRu);
    pushTerms(terms, light.type);
    pushTerms(terms, light.lightRole);
    pushTerms(terms, light.temperatureEstimate);
    pushTerms(terms, light.estimatedKelvin);
  }

  pushTerms(terms, pro.designIntent?.summaryRu);
  pushTerms(terms, pro.designIntent?.whatMustBePreserved);
  pushTerms(terms, pro.lightingAnalysis?.overallLightingMood);
  pushTerms(terms, pro.lightingAnalysis?.technicalNotes);

  for (const group of asArray(semanticDraft?.specAnalysis?.specificationGroups)) {
    for (const item of asArray(group?.items)) {
      if (primaryObject && !matchesPrimaryObject(item, primaryObject)) continue;
      pushTerms(terms, item.name);
      pushTerms(terms, item.note);
    }
  }

  for (const obj of asArray(semanticDraft?.sceneGraph?.objects)) {
    if (primaryObject?.id && obj.id !== primaryObject.id) continue;
    pushTerms(terms, obj.labelRu);
    pushTerms(terms, obj.materialGuess);
    pushTerms(terms, obj.colorGuess);
  }

  return uniqueTerms(terms);
}

function collectRoomTerms(semanticDraft) {
  const pro = semanticDraft?.proAnalysis || {};
  const quick = semanticDraft?.quickAnalysis || {};
  const terms = [];

  pushTerms(terms, pro.spaceType?.labelRu);
  pushTerms(terms, pro.spaceType?.value);
  pushTerms(terms, quick.spaceType?.labelRu);
  pushTerms(terms, quick.spaceType?.value);
  pushTerms(terms, semanticDraft?.sceneGraph?.spaceType);
  for (const zone of asArray(pro.functionalZones)) {
    pushTerms(terms, zone?.labelRu);
    pushTerms(terms, zone?.type);
  }

  return uniqueTerms(terms);
}

function pushPhraseTerms(bucket, value) {
  const text = asString(value);
  if (!text) return;
  bucket.push(text);
  bucket.push(...tokenize(text));
}

function collectObjectTypeTerms(semanticDraft, primaryObject) {
  const terms = [];
  pushPhraseTerms(terms, primaryObject?.type?.replace(/_/g, " "));
  pushPhraseTerms(terms, primaryObject?.labelRu);
  pushPhraseTerms(terms, primaryObject?.categoryId);
  pushPhraseTerms(terms, primaryObject?.supplierCategoryId);

  for (const group of asArray(semanticDraft?.specAnalysis?.specificationGroups)) {
    for (const item of asArray(group?.items)) {
      if (primaryObject && !matchesPrimaryObject(item, primaryObject)) continue;
      pushPhraseTerms(terms, item.name);
      pushPhraseTerms(terms, item.category);
    }
  }

  return uniqueTerms(terms);
}

function estimateFingerprintConfidence(semanticDraft, primaryObject) {
  const values = [
    primaryObject?.confidence,
    semanticDraft?.sceneGraph?.confidence,
    semanticDraft?.proAnalysis?.styleAnalysis?.confidence,
    semanticDraft?.quickAnalysis?.styleAnalysis?.confidence,
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) return 0.5;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.max(0, Math.min(1, Number(avg.toFixed(2))));
}

/**
 * @param {object|null|undefined} semanticDraft
 */
export function buildVisualFingerprint(semanticDraft) {
  const primaryObject = resolvePrimarySceneObject(semanticDraft);

  return {
    objectType: collectObjectTypeTerms(semanticDraft, primaryObject),
    style: collectStyleTerms(semanticDraft),
    colors: collectColorTerms(semanticDraft, primaryObject),
    materials: collectMaterialTerms(semanticDraft, primaryObject),
    shapes: collectShapeTerms(semanticDraft, primaryObject),
    features: collectFeatureTerms(semanticDraft, primaryObject),
    roomContext: collectRoomTerms(semanticDraft),
    confidence: estimateFingerprintConfidence(semanticDraft, primaryObject),
    primaryObjectId: asString(primaryObject?.id) || null,
    primaryObjectLabelRu: asString(primaryObject?.labelRu) || null,
  };
}

function productSearchText(product) {
  const urlSlug = asString(product?.productUrl).replace(/[/_-]+/g, " ");
  const productName = asString(product?.productName);
  const finishHints = [];

  const finishMatch =
    productName.match(/\bPL\s+([A-Z]{2})\b/i) || productName.match(/\b([A-Z]{2})\s*$/i);
  const finish = finishMatch?.[1]?.toUpperCase() || "";
  if (finish === "GD" || finish === "GO") {
    finishHints.push("gold golden золото золотой brass bronze латунь warm");
  }
  if (finish === "BS") {
    finishHints.push("silver серебро brushed steel metal");
  }
  if (finish === "BK") {
    finishHints.push("black темный graphite");
  }
  if (finish === "WH" || finish === "WT") {
    finishHints.push("white белый light светлый");
  }
  if (/modemodern|modelight|modelux/i.test(productName)) {
    finishHints.push("modern contemporary");
  }
  if (/напольн|floor/i.test(productName)) {
    finishHints.push("напольный floor lamp торшер");
  }
  if (/торшер/i.test(productName)) {
    finishHints.push("торшер floor lamp напольный");
  }
  if (/абажур|shade|linen|ткан/i.test(productName)) {
    finishHints.push("абажур shade fabric ткань textile");
  }

  return normalizeText(
    [
      productName,
      product?.title,
      product?.imageAlt,
      product?.metadata,
      product?.brand,
      product?.model,
      urlSlug,
      finishHints.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function termMatchesProduct(term, productText) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.length >= 3 && productText.includes(normalizedTerm)) return true;

  if (normalizedTerm.length >= 4) {
    const stem = normalizedTerm.slice(0, Math.min(6, normalizedTerm.length));
    if (productText.includes(stem)) return true;
  }

  const termTokens = tokenize(normalizedTerm);
  if (!termTokens.length) return false;

  const matchedTokens = termTokens.filter(
    (token) => token.length >= 3 && productText.includes(token),
  );
  return matchedTokens.length >= Math.max(1, Math.ceil(termTokens.length * 0.6));
}

function scoreField(terms, weight, productText) {
  if (!terms.length) {
    return { points: 0, maxPoints: 0, matched: [] };
  }

  const matched = terms.filter((term) => termMatchesProduct(term, productText));
  const ratio = matched.length / terms.length;

  return {
    points: weight * ratio,
    maxPoints: weight,
    matched,
  };
}

/**
 * @param {ReturnType<typeof buildVisualFingerprint>} fingerprint
 * @param {{ productName?: string, title?: string, imageAlt?: string, metadata?: string, productUrl?: string, brand?: string, model?: string }} product
 * @returns {{ score: number, matchedFields: string[] }}
 */
export function visualSimilarityScore(fingerprint, product) {
  if (!fingerprint || typeof fingerprint !== "object") {
    return { score: 0, matchedFields: [] };
  }

  const productText = productSearchText(product);
  if (!productText) {
    return { score: 0, matchedFields: [] };
  }

  let totalPoints = 0;
  let maxPoints = 0;
  const matchedFields = [];

  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const terms = asArray(fingerprint[field]);
    if (!terms.length) continue;

    const result = scoreField(terms, weight, productText);
    maxPoints += result.maxPoints;
    totalPoints += result.points;

    if (result.matched.length) {
      matchedFields.push(`${field}: ${result.matched.slice(0, 4).join(", ")}`);
    }
  }

  const rawScore = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
  const confidenceBoost = Number(fingerprint.confidence) || 0.5;
  const score = Math.max(0, Math.min(100, Math.round(rawScore * (0.85 + confidenceBoost * 0.15))));

  return { score, matchedFields: matchedFields };
}

export { FIELD_WEIGHTS };
