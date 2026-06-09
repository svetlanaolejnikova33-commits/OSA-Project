import { getSkuFilterKeywords, isLightingCategoryId } from "./categorySkuKeywords";

/** Score weights (sum = 100). */
export const SKU_MATCH_WEIGHTS = {
  fixtureType: 35,
  category: 25,
  specKeywords: 20,
  materials: 10,
  style: 10,
};

const FIXTURE_PATTERNS = [
  { re: /подвесн|pendant/i, label: "подвесной светильник" },
  { re: /люстр|chandelier/i, label: "люстра" },
  { re: /настен|бра|sconce/i, label: "настенный светильник" },
  { re: /торшер|напольн|floor lamp/i, label: "торшер" },
  { re: /настольн|table lamp/i, label: "настольный светильник" },
  { re: /треков|track/i, label: "трековый светильник" },
  { re: /встраива|recessed|downlight/i, label: "встраиваемый светильник" },
  { re: /потолочн|ceiling/i, label: "потолочный светильник" },
];

const MATERIAL_HINTS = [
  { tokens: ["металл", "metal", "steel", "сталь", "латунь", "brass", "медь", "copper", "хром", "chrome"], label: "металлические акценты" },
  { tokens: ["стекл", "glass", "crystal", "хрустал"], label: "стекло в отделке" },
  { tokens: ["дерев", "wood", "дуб", "oak"], label: "деревянные элементы" },
  { tokens: ["ткан", "textile", "fabric"], label: "текстиль в отделке" },
];

const STYLE_CLUSTERS = [
  {
    tokens: ["modern", "modemodern", "современ", "contemporary", "minimal", "минимал"],
    label: "современного интерьера",
  },
  {
    tokens: ["scandi", "сканди", "nordic", "норд"],
    label: "скандинавского интерьера",
  },
  {
    tokens: ["classic", "классик", "luxury", "премиум", "premium"],
    label: "классического интерьера",
  },
  {
    tokens: ["industrial", "индустри", "loft", "лофт"],
    label: "индустриального интерьера",
  },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asLower(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value || "").trim();
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
  }
  return out;
}

function tokenizeForMatch(text) {
  return uniqueStrings(
    asLower(text)
      .split(/[^a-zа-яё0-9]+/i)
      .filter((token) => token.length >= 4),
  );
}

function findLightingGroup(normalizedSpecGroups) {
  for (const group of asArray(normalizedSpecGroups)) {
    if (isLightingCategoryId(group?.registryCategoryId)) return group;
  }
  return null;
}

function collectSpecTexts(budgetDraft, lightingGroup) {
  const texts = [
    lightingGroup?.sourceText,
    lightingGroup?.labelRu,
    lightingGroup?.parentLabelRu,
  ];

  for (const item of asArray(lightingGroup?.items)) {
    texts.push(item?.name, item?.category, item?.note, item?.materialGuess, item?.finish);
  }

  for (const group of asArray(budgetDraft?.groups)) {
    const groupLabel = String(group?.group || "");
    if (!/освещ|свет|light|lamp/i.test(groupLabel)) continue;
    texts.push(groupLabel);
    for (const item of asArray(group?.items)) {
      texts.push(item?.name, item?.category, item?.note, item?.materialGuess, item?.finish);
    }
  }

  for (const node of asArray(budgetDraft?.sceneGraphSnapshot?.nodes)) {
    if (!/light|lamp|свет|освещ/i.test(String(node?.categoryType || node?.labelRu || ""))) continue;
    texts.push(node?.labelRu, node?.categoryType, node?.materialGuess);
  }

  return uniqueStrings(texts.filter(Boolean));
}

function collectMaterialHints(budgetDraft, specTexts) {
  const hints = [];
  const concept = budgetDraft?.styleConsistencySnapshot?.conceptDNA || {};
  if (concept.materialCore) hints.push(concept.materialCore);

  for (const text of specTexts) hints.push(text);
  for (const item of asArray(findLightingGroup(budgetDraft?.normalizedSpecGroups)?.items)) {
    hints.push(item?.materialGuess, item?.finish);
  }

  return uniqueStrings(hints);
}

function collectStyleHints(budgetDraft) {
  const concept = budgetDraft?.styleConsistencySnapshot?.conceptDNA || {};
  return uniqueStrings([
    concept.styleCore,
    concept.atmosphereCore,
    concept.compositionCore,
  ]);
}

/**
 * Build matcher context from existing budget draft analysis snapshots.
 */
export function extractSkuMatchContext(budgetDraft) {
  const lightingGroup = findLightingGroup(budgetDraft?.normalizedSpecGroups);
  const specTexts = collectSpecTexts(budgetDraft, lightingGroup);

  return {
    categoryId: lightingGroup?.registryCategoryId || "lighting.pendants",
    categoryLabel: lightingGroup?.labelRu || "Освещение",
    parentLabel: lightingGroup?.parentLabelRu || "Освещение",
    sourceText: lightingGroup?.sourceText || "",
    specTexts,
    materialHints: collectMaterialHints(budgetDraft, specTexts),
    styleHints: collectStyleHints(budgetDraft),
  };
}

function scoreFixtureType(productNameLower, context, reasons) {
  for (const entry of FIXTURE_PATTERNS) {
    if (!entry.re.test(productNameLower)) continue;
    reasons.push(entry.label);
    return SKU_MATCH_WEIGHTS.fixtureType;
  }

  const categoryKeywords = getSkuFilterKeywords(context.categoryId);
  if (categoryKeywords.some((keyword) => productNameLower.includes(keyword.toLowerCase()))) {
    const label = context.categoryLabel || "тип светильника из анализа";
    reasons.push(label.toLowerCase());
    return Math.round(SKU_MATCH_WEIGHTS.fixtureType * 0.7);
  }

  return 0;
}

function scoreCategory(productNameLower, context, reasons) {
  const keywords = getSkuFilterKeywords(context.categoryId);
  if (!keywords.some((keyword) => productNameLower.includes(keyword.toLowerCase()))) return 0;
  reasons.push(`соответствует категории ${context.categoryId}`);
  return SKU_MATCH_WEIGHTS.category;
}

function scoreSpecKeywords(productNameLower, context, reasons) {
  const tokens = tokenizeForMatch([context.sourceText, ...context.specTexts].join(" "));
  const matched = tokens.filter((token) => productNameLower.includes(token));
  if (!matched.length) return 0;

  const ratio = Math.min(1, matched.length / 3);
  const points = Math.round(SKU_MATCH_WEIGHTS.specKeywords * ratio);
  if (matched[0]) reasons.push(`совпадает с описанием сцены: «${matched[0]}»`);
  return points;
}

function scoreMaterials(productNameLower, context, reasons) {
  const haystack = asLower([...context.materialHints, ...context.specTexts].join(" "));
  for (const entry of MATERIAL_HINTS) {
    const sceneHit = entry.tokens.some((token) => haystack.includes(token));
    const productHit = entry.tokens.some((token) => productNameLower.includes(token));
    if (sceneHit && productHit) {
      reasons.push(`сочетается с ${entry.label}`);
      return SKU_MATCH_WEIGHTS.materials;
    }
  }
  return 0;
}

function scoreStyle(productNameLower, context, reasons) {
  const styleHaystack = asLower(context.styleHints.join(" "));
  for (const cluster of STYLE_CLUSTERS) {
    const sceneHit = cluster.tokens.some((token) => styleHaystack.includes(token));
    const productHit = cluster.tokens.some((token) => productNameLower.includes(token));
    if (sceneHit && productHit) {
      reasons.push(`подходит для ${cluster.label}`);
      return SKU_MATCH_WEIGHTS.style;
    }
    if (productHit && /modern|modemodern|minimal|scandi|classic|loft/i.test(productNameLower)) {
      reasons.push(`подходит для ${cluster.label}`);
      return Math.round(SKU_MATCH_WEIGHTS.style * 0.8);
    }
  }

  if (/modern|modemodern|minimal/i.test(productNameLower)) {
    reasons.push("подходит для современного интерьера");
    return Math.round(SKU_MATCH_WEIGHTS.style * 0.6);
  }

  return 0;
}

/**
 * Lightweight SKU match score (0–100) from existing analysis data.
 */
export function scoreSkuMatch(skuItem, context) {
  const productNameLower = asLower(skuItem?.productName);
  const reasons = [];

  if (!productNameLower) {
    return { matchScore: 0, matchReasons: [] };
  }

  let score = 0;
  score += scoreFixtureType(productNameLower, context, reasons);
  score += scoreCategory(productNameLower, context, reasons);
  score += scoreSpecKeywords(productNameLower, context, reasons);
  score += scoreMaterials(productNameLower, context, reasons);
  score += scoreStyle(productNameLower, context, reasons);

  return {
    matchScore: Math.min(100, Math.max(0, score)),
    matchReasons: uniqueStrings(reasons).slice(0, 4),
  };
}

export function scoreAndSortSkuMatches(skuMatches, budgetDraft) {
  const context = extractSkuMatchContext(budgetDraft);
  return asArray(skuMatches)
    .map((item) => {
      const { matchScore, matchReasons } = scoreSkuMatch(item, context);
      return { ...item, matchScore, matchReasons };
    })
    .sort((left, right) => (right.matchScore || 0) - (left.matchScore || 0));
}
