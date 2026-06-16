/**
 * Designer-first visual discovery pipeline (search-ready, mock internet layer).
 * Internet discovery → registry enrichment → recommendation rows.
 */

import { mapSpecToSupplierRegistry } from "./mapSpecToSupplierRegistry";
import {
  discoverMockRawResults,
} from "./visualSearch/providers/mockCatalog";
import {
  extractVisualQuery,
  rankVisualCandidates as rankCatalogCandidates,
} from "./visualProduct/rankVisualCandidates";

export const REGISTRY_STATUS = {
  CONFIRMED: "confirmed",
  SIMILAR: "similar",
  NOT_FOUND: "not_found",
};

export const SOURCE_TYPE = {
  INTERNET: "internet",
  REGISTRY: "registry",
  HYBRID: "hybrid",
};

const STYLE_LABELS_RU = {
  modern: "современный",
  minimal: "минимализм",
  classic: "классический",
  scandi: "скандинавский",
  loft: "лофт",
};

const MATERIAL_LABELS_RU = {
  metal: "металл",
  glass: "стекло",
  wood: "дерево",
  stone: "камень",
  fabric: "текстиль",
};

const COLOR_LABELS_RU = {
  gold: "золото",
  black: "тёмная палитра",
  white: "светлая палитра",
  brass: "латунь",
  silver: "серебро",
};

const ROOM_LABELS_RU = {
  living_room: "гостиная",
  bedroom: "спальня",
  kitchen: "кухня",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableId(prefix, index, seed = "") {
  return `${prefix}-${index}-${asString(seed).slice(0, 48) || "item"}`;
}

function categoryLabelFromDraft(semanticDraft) {
  const spec = semanticDraft?.specAnalysis || {};
  const { normalizedSpecGroups } = mapSpecToSupplierRegistry({ specAnalysis: spec });
  const lighting = normalizedSpecGroups.find((g) => g?.registryCategoryId?.startsWith("lighting"));
  if (lighting) {
    const parent = asString(lighting.parentLabelRu);
    const label = asString(lighting.labelRu);
    if (parent && label) return `${parent} / ${label}`;
    return label || parent || "Освещение";
  }
  const first = normalizedSpecGroups[0];
  if (first) {
    const parent = asString(first.parentLabelRu);
    const label = asString(first.labelRu);
    if (parent && label) return `${parent} / ${label}`;
    return label || parent || "Прочее";
  }
  return "Освещение";
}

/**
 * Build bilingual search intent from vision signals.
 */
export function buildVisualSearchQuery(semanticDraft, { languageMode = "ru" } = {}) {
  const visualQuery = extractVisualQuery(semanticDraft);
  const pro = semanticDraft?.proAnalysis || {};
  const quick = semanticDraft?.quickAnalysis || {};
  const spec = semanticDraft?.specAnalysis || {};

  const styleRu =
    pro.styleAnalysis?.labelRu ||
    quick.styleAnalysis?.labelRu ||
    pro.styleAnalysis?.primary ||
    quick.styleAnalysis?.primary ||
    "";
  const roomRu =
    pro.spaceType?.labelRu ||
    quick.spaceType?.labelRu ||
    pro.spaceType?.value ||
    quick.spaceType?.value ||
    "";

  const styleTokens = visualQuery.styles.map((s) => STYLE_LABELS_RU[s] || s);
  const materialTokens = visualQuery.materials.map((m) => MATERIAL_LABELS_RU[m] || m);
  const colorTokens = visualQuery.colors.map((c) => COLOR_LABELS_RU[c] || c);
  const roomToken = visualQuery.room ? ROOM_LABELS_RU[visualQuery.room] || visualQuery.room : roomRu;

  const objectType = visualQuery.type || "подвесной светильник";
  const conceptKeywords = asArray(spec.designIntent?.whatMustBePreserved).slice(0, 2);

  const ruParts = uniqueStrings([
    styleRu,
    ...styleTokens,
    objectType,
    ...materialTokens,
    ...colorTokens,
    roomToken,
    ...conceptKeywords,
  ]);

  const enParts = uniqueStrings([
    visualQuery.styles[0] || "modern",
    visualQuery.materials.includes("metal") ? "metal" : "",
    visualQuery.materials.includes("glass") ? "glass" : "",
    visualQuery.colors.includes("brass") ? "brass" : "",
    visualQuery.colors.includes("white") ? "white glass" : "",
    "pendant light",
    visualQuery.room ? visualQuery.room.replace("_", " ") : "living room",
    "minimalist",
  ]);

  return {
    ru: ruParts.join(" "),
    en: enParts.join(" "),
    primary: languageMode === "en" ? enParts.join(" ") : ruParts.join(" "),
    visualQuery,
    category: categoryLabelFromDraft(semanticDraft),
    objectType,
  };
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = asString(value);
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
  }
  return out;
}

/**
 * Normalize raw internet/search result into visual candidate model.
 */
export function normalizeVisualCandidate(raw, index = 0) {
  const title = asString(raw?.title) || asString(raw?.productName) || "Визуальный аналог";
  const sourceUrl = asString(raw?.sourceUrl) || asString(raw?.productUrl) || "";
  const brand = asString(raw?.brand) || inferBrandFromTitle(title);
  const model = asString(raw?.model) || asString(raw?.article) || "";
  const category = asString(raw?.category) || "Освещение";
  const price = Number(raw?.price ?? raw?.unitPrice);
  const visualMatchPercent = Number.isFinite(raw?.visualMatchPercent)
    ? raw.visualMatchPercent
    : Number.isFinite(raw?.visualMatchScore)
      ? raw.visualMatchScore
      : null;
  const visualSimilarityPercent = Number.isFinite(raw?.visualSimilarityPercent)
    ? raw.visualSimilarityPercent
    : Number.isFinite(visualMatchPercent)
      ? visualMatchPercent
      : null;

  return {
    id: asString(raw?.id) || stableId("visual", index, `${title}-${sourceUrl}`),
    category,
    title,
    brand,
    model,
    image: raw?.image || raw?.imageUrl || null,
    sourceUrl,
    price: Number.isFinite(price) ? price : 0,
    visualMatchPercent: Number.isFinite(visualMatchPercent) ? visualMatchPercent : 0,
    visualSimilarityPercent: Number.isFinite(visualSimilarityPercent) ? visualSimilarityPercent : null,
    registryStatus: raw?.registryStatus || REGISTRY_STATUS.NOT_FOUND,
    registryMatches: asArray(raw?.registryMatches),
    sourceType: raw?.sourceType || SOURCE_TYPE.INTERNET,
    providerMeta: raw?.providerMeta && typeof raw.providerMeta === "object" ? raw.providerMeta : {},
  };
}

function inferBrandFromTitle(title) {
  const text = asString(title);
  if (!text) return "—";
  if (/modelux|modelight/i.test(text)) return "MODELUX";
  const first = text.split(/\s+/)[0];
  return first && first.length <= 18 ? first : "—";
}

/**
 * Mock/search-ready internet discovery via VisualSearchProvider API.
 * Falls back to local mock catalog when API is unavailable.
 */
export async function discoverVisualCandidates({
  semanticDraft,
  searchQuery,
  imageBase64 = "",
  mimeType = "image/jpeg",
  imagePublicUrl = "",
  limit = 12,
  provider,
} = {}) {
  const maxResults = Math.min(Math.max(Number(limit) || 12, 1), 24);
  const hasImage = Boolean(stripBase64Payload(imageBase64));
  const mode = hasImage ? "image" : "semantic";

  try {
    const response = await fetch("/api/visual-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        provider,
        semanticDraft,
        searchQuery,
        imageBase64: stripBase64Payload(imageBase64),
        mimeType,
        imagePublicUrl,
        limit: maxResults,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    const rawResults = Array.isArray(payload?.results) ? payload.results : [];

    if (payload?.ok && rawResults.length) {
      return rawResults.map((row, index) =>
        normalizeVisualCandidate(
          {
            title: row.title,
            productName: row.title,
            brand: row.brand,
            model: row.model,
            imageUrl: row.imageUrl,
            sourceUrl: row.sourceUrl,
            productUrl: row.sourceUrl,
            category: searchQuery?.category || "Освещение",
            price: row.price,
            visualMatchScore: row.visualMatchScore,
            visualSimilarityPercent: row.visualSimilarityPercent ?? row.visualMatchScore,
            sourceType: row.sourceType || SOURCE_TYPE.INTERNET,
            providerMeta: row.providerMeta,
            registryStatus: REGISTRY_STATUS.NOT_FOUND,
          },
          index,
        ),
      );
    }
  } catch (error) {
    console.warn("OSA: visual-search request failed, trying mock provider route", error);
  }

  return discoverVisualCandidatesViaApiMock({
    semanticDraft,
    searchQuery,
    mimeType,
    limit: maxResults,
  });
}

async function discoverVisualCandidatesViaApiMock({ semanticDraft, searchQuery, mimeType, limit }) {
  try {
    const response = await fetch("/api/visual-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "semantic",
        provider: "mock",
        semanticDraft,
        searchQuery,
        limit,
        mimeType,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    const rawResults = Array.isArray(payload?.results) ? payload.results : [];

    if (payload?.ok && rawResults.length) {
      return rawResults.map((row, index) =>
        normalizeVisualCandidate(
          {
            title: row.title,
            productName: row.title,
            brand: row.brand,
            model: row.model,
            imageUrl: row.imageUrl,
            sourceUrl: row.sourceUrl,
            productUrl: row.sourceUrl,
            category: searchQuery?.category || "Освещение",
            price: row.price,
            visualMatchScore: row.visualMatchScore,
            visualSimilarityPercent: row.visualSimilarityPercent ?? row.visualMatchScore,
            sourceType: row.sourceType || SOURCE_TYPE.INTERNET,
            providerMeta: row.providerMeta,
            registryStatus: REGISTRY_STATUS.NOT_FOUND,
          },
          index,
        ),
      );
    }
  } catch (error) {
    console.warn("OSA: mock visual-search route failed", error);
  }

  return discoverVisualCandidatesLocalFallback(searchQuery, limit);
}

function stripBase64Payload(value) {
  const raw = asString(value);
  if (!raw) return "";
  const comma = raw.indexOf(",");
  return comma >= 0 ? raw.slice(comma + 1).trim() : raw;
}

async function discoverVisualCandidatesLocalFallback(searchQuery, maxResults) {
  const rawResults = await discoverMockRawResults(searchQuery, { limit: maxResults });
  return rawResults.map((row, index) =>
    normalizeVisualCandidate(
      {
        title: row.title,
        productName: row.title,
        brand: row.brand,
        model: row.model,
        imageUrl: row.imageUrl,
        sourceUrl: row.sourceUrl,
        productUrl: row.sourceUrl,
        category: searchQuery?.category || "Освещение",
        price: row.price,
        visualMatchScore: row.visualMatchScore,
        visualSimilarityPercent: row.visualSimilarityPercent ?? row.visualMatchScore,
        sourceType: SOURCE_TYPE.INTERNET,
        registryStatus: REGISTRY_STATUS.NOT_FOUND,
      },
      index,
    ),
  );
}

/**
 * Rank visual candidates using semantic draft signals.
 */
export function rankVisualCandidates(candidates, semanticDraft, { limit = 8 } = {}) {
  const list = asArray(candidates);
  if (!list.length) return [];

  const catalogInput = list.map((candidate) => ({
    productName: candidate.title,
    productUrl: candidate.sourceUrl,
    imageUrl: candidate.image,
  }));

  const ranked = rankCatalogCandidates(semanticDraft, catalogInput);
  const scoreByUrl = new Map(
    ranked.map((row) => [asString(row.productUrl), row.visualMatchScore || 0])
  );

  return list
    .map((candidate) => {
      const semanticRank = scoreByUrl.get(asString(candidate.sourceUrl)) || 0;
      const visualSimilarity = Number(candidate.visualSimilarityPercent) || 0;
      const hasVisualSimilarity = visualSimilarity > 0;
      const blendedScore = hasVisualSimilarity
        ? Math.round(0.8 * visualSimilarity + 0.2 * semanticRank)
        : semanticRank || candidate.visualMatchPercent || 0;

      return {
        ...candidate,
        semanticRankPercent: semanticRank,
        visualMatchPercent: blendedScore,
      };
    })
    .sort((a, b) => (b.visualMatchPercent || 0) - (a.visualMatchPercent || 0))
    .slice(0, limit);
}

function normalizeMatchText(value) {
  return asString(value).toLowerCase();
}

function findRegistrySkuMatch(candidate, skuMatches) {
  const title = normalizeMatchText(candidate.title);
  for (const sku of asArray(skuMatches)) {
    const article = normalizeMatchText(sku?.article);
    const productName = normalizeMatchText(sku?.productName);
    const brandName = normalizeMatchText(sku?.brandName);
    if (article && title.includes(article)) return sku;
    if (productName && (title.includes(productName) || productName.includes(title.slice(0, 20)))) return sku;
    if (brandName && title.includes(brandName) && article) return sku;
  }
  return null;
}

function collectRegistryBrandNames(budgetDraft) {
  const names = new Set();
  for (const group of asArray(budgetDraft?.normalizedSpecGroups)) {
    for (const brand of asArray(group?.supplierCandidates?.matchedBrands)) {
      const name = asString(brand?.brandName);
      if (name) names.add(name.toLowerCase());
    }
  }
  return names;
}

/**
 * Registry validation/enrichment layer (read-only; does not mutate registry algorithms).
 */
export function enrichCandidatesWithRegistry(candidates, { budgetDraft } = {}) {
  const skuMatches = asArray(budgetDraft?.skuMatches);
  const brandNames = collectRegistryBrandNames(budgetDraft);

  return asArray(candidates).map((candidate) => {
    const sku = findRegistrySkuMatch(candidate, skuMatches);
    if (sku) {
      const price = Number(sku.unitPrice);
      return {
        ...candidate,
        brand: asString(sku.brandName) || candidate.brand,
        model: asString(sku.article) || candidate.model,
        title: asString(sku.productName) || candidate.title,
        price: Number.isFinite(price) && price > 0 ? price : candidate.price,
        image: sku.imageUrl || candidate.image,
        sourceUrl: sku.productUrl || sku.searchUrl || candidate.sourceUrl,
        registryStatus: REGISTRY_STATUS.CONFIRMED,
        registryMatches: [{ type: "sku", article: sku.article, brandName: sku.brandName }],
        sourceType: SOURCE_TYPE.HYBRID,
      };
    }

    const titleLower = normalizeMatchText(candidate.title);
    const brandLower = normalizeMatchText(candidate.brand);
    const hasBrandOverlap = [...brandNames].some(
      (name) => titleLower.includes(name) || brandLower.includes(name)
    );

    if (hasBrandOverlap) {
      return {
        ...candidate,
        registryStatus: REGISTRY_STATUS.SIMILAR,
        registryMatches: [{ type: "brand_category" }],
        sourceType: candidate.sourceType === SOURCE_TYPE.INTERNET ? SOURCE_TYPE.HYBRID : candidate.sourceType,
      };
    }

    return {
      ...candidate,
      registryStatus: REGISTRY_STATUS.NOT_FOUND,
      registryMatches: [],
      sourceType: candidate.sourceType || SOURCE_TYPE.INTERNET,
    };
  });
}

/**
 * Map enriched visual candidates to compact recommendation row shape (UI + project selection).
 */
export function visualCandidatesToRecommendationRows(candidates) {
  return asArray(candidates).map((candidate) => ({
    id: candidate.id,
    category: candidate.category || "Прочее",
    brand: candidate.brand || "—",
    article: candidate.model || "",
    productName: candidate.title || candidate.model || "—",
    unitPrice: Number.isFinite(candidate.price) ? candidate.price : 0,
    quantity: 1,
    totalPrice: Number.isFinite(candidate.price) ? candidate.price : 0,
    matchScore: Number.isFinite(candidate.visualMatchPercent) ? candidate.visualMatchPercent : 0,
    imageUrl: candidate.image || null,
    productUrl: candidate.sourceUrl || null,
    searchUrl: candidate.sourceUrl || null,
    registryStatus: candidate.registryStatus,
    sourceType: candidate.sourceType,
    visualAnalogLabel: registryStatusLabel(
      candidate.registryStatus,
      candidate.sourceType,
      candidate.providerMeta?.provider,
    ),
  }));
}

export function registryStatusLabel(status, sourceType, providerId) {
  if (status === REGISTRY_STATUS.CONFIRMED) return "подтверждено реестром";
  if (providerId === "google_lens") return "визуальный аналог из интернета";
  if (status === REGISTRY_STATUS.SIMILAR) return "аналог найден, ожидает подтверждения поставщика";
  if (sourceType === SOURCE_TYPE.INTERNET) return "из интернета";
  return "визуальный аналог";
}

export function sumRecommendationRows(rows) {
  return asArray(rows).reduce((sum, row) => {
    const price = Number(row?.unitPrice ?? row?.totalPrice);
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);
}

/**
 * End-to-end designer-first recommendation pipeline.
 */
export async function buildVisualRecommendationPipeline(
  semanticDraft,
  { budgetDraft, languageMode = "ru", imageBase64 = "", mimeType = "image/jpeg", imagePublicUrl = "" } = {},
) {
  if (!semanticDraft) {
    return { query: null, candidates: [], rows: [], emptyMessage: "Визуальные аналоги пока не найдены" };
  }

  const query = buildVisualSearchQuery(semanticDraft, { languageMode });
  const discovered = await discoverVisualCandidates({
    semanticDraft,
    searchQuery: query,
    imageBase64,
    mimeType,
    imagePublicUrl,
    limit: 12,
  });
  const ranked = rankVisualCandidates(discovered, semanticDraft);
  const enriched = enrichCandidatesWithRegistry(ranked, { budgetDraft });
  const rows = visualCandidatesToRecommendationRows(enriched);

  return {
    query,
    candidates: enriched,
    rows,
    emptyMessage: rows.length ? "" : "Визуальные аналоги пока не найдены",
  };
}
