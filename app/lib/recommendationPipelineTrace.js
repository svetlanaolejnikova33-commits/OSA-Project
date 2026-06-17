/**
 * Phase 5K.2 — read-only recommendation pipeline trace diagnostics.
 * Logs each stage after Analyze Image; does not mutate pipeline data.
 */

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function itemKey(item) {
  return (
    asString(item?.id) ||
    asString(item?.sourceUrl) ||
    asString(item?.productUrl) ||
    asString(item?.title) ||
    asString(item?.productName) ||
    asString(item?.article) ||
    ""
  ).toLowerCase();
}

function isAnalogStudio(item) {
  const brand = asString(item?.brand);
  const title = asString(item?.title) || asString(item?.productName);
  return /analog studio/i.test(brand) || /analog studio/i.test(title);
}

function isModelux(item) {
  const brand = asString(item?.brand);
  const title = asString(item?.title) || asString(item?.productName);
  const url = asString(item?.sourceUrl) || asString(item?.productUrl);
  return /modelux|modelight|modemodern/i.test(`${brand} ${title} ${url}`);
}

function traceFromVisual(candidate) {
  return {
    source:
      candidate?.sourceType ||
      candidate?.providerMeta?.provider ||
      candidate?.providerMeta?.source ||
      "visual-search",
    category: asString(candidate?.category) || null,
    sku: asString(candidate?.model) || asString(candidate?.article) || "",
    title: asString(candidate?.title) || asString(candidate?.productName) || "",
    score: Number(candidate?.visualMatchPercent ?? candidate?.visualMatchScore) || 0,
    imageUrl: candidate?.image || candidate?.imageUrl || null,
    visualMatchReasons: asArray(candidate?.visualMatchReasons),
    isModelux: isModelux(candidate),
    isAnalogStudio: isAnalogStudio(candidate),
  };
}

function traceFromRanked(candidate) {
  return {
    source:
      candidate?.sourceType ||
      candidate?.providerMeta?.provider ||
      candidate?.providerMeta?.source ||
      "ranked",
    category: asString(candidate?.category) || null,
    sku: asString(candidate?.model) || asString(candidate?.article) || "",
    title: asString(candidate?.title) || asString(candidate?.productName) || "",
    score:
      Number(candidate?.visualMatchPercent ?? candidate?.semanticRankPercent ?? candidate?.visualMatchScore) ||
      0,
    imageUrl: candidate?.image || candidate?.imageUrl || null,
    visualMatchReasons: asArray(candidate?.visualMatchReasons),
    isModelux: isModelux(candidate),
    isAnalogStudio: isAnalogStudio(candidate),
  };
}

function traceFromRow(row) {
  return {
    source: row?.sourceType || row?.visualAnalogLabel || "recommendation-row",
    category: asString(row?.category) || null,
    sku: asString(row?.article) || "",
    title: asString(row?.productName) || "",
    score: Number(row?.matchScore) || 0,
    imageUrl: row?.imageUrl || null,
    visualMatchReasons: [],
    isModelux: isModelux(row),
    isAnalogStudio: isAnalogStudio(row),
  };
}

function firstN(items, limit = 10) {
  return asArray(items).slice(0, limit).map((item, index) => ({ index, ...item }));
}

function diffRemoved(priorItems, nextItems, removedAtStage, reasonForMissing) {
  const nextKeys = new Set(asArray(nextItems).map((item) => itemKey(item)));
  const removed = [];

  for (const item of asArray(priorItems)) {
    const key = itemKey(item);
    if (!key || nextKeys.has(key)) continue;
    removed.push({
      title: asString(item?.title) || asString(item?.productName) || key,
      sku: asString(item?.model) || asString(item?.article) || asString(item?.sku) || "",
      removedAtStage,
      reason: typeof reasonForMissing === "function" ? reasonForMissing(item) : reasonForMissing,
    });
  }

  return removed;
}

export function logPipelineTraceVisual(visualCandidates, meta = {}) {
  const items = asArray(visualCandidates).map(traceFromVisual);
  console.log("[PIPELINE_TRACE_VISUAL]", {
    count: items.length,
    first10: firstN(items),
    meta,
  });
  for (const item of items.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_VISUAL]", item);
  }
  return items;
}

export function logPipelineTraceRanked(rankedCandidates, visualCandidates, meta = {}) {
  const items = asArray(rankedCandidates).map(traceFromRanked);
  const removed = diffRemoved(
    asArray(visualCandidates),
    asArray(rankedCandidates),
    "rankedCandidates",
    (item) => {
      const traced = traceFromVisual(item);
      if (traced.score <= 0) return "semanticRank=0 or below cut after sort/slice";
      return "dropped during rank sort/slice (limit)";
    },
  );

  console.log("[PIPELINE_TRACE_RANKED]", {
    count: items.length,
    first10: firstN(items),
    removedCount: removed.length,
    meta,
  });
  for (const item of items.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_RANKED]", item);
  }
  for (const item of removed.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_RANKED] removed", item);
  }
  return { items, removed };
}

export function logPipelineTraceRows(recommendationRows, rankedCandidates, meta = {}) {
  const items = asArray(recommendationRows).map(traceFromRow);
  const removed = diffRemoved(
    asArray(rankedCandidates),
    asArray(recommendationRows).map((row) => ({
      ...row,
      title: row.productName,
      sourceUrl: row.productUrl,
    })),
    "recommendationRows",
    "dropped during visualCandidatesToRecommendationRows (unexpected)",
  );

  console.log("[PIPELINE_TRACE_ROWS]", {
    count: items.length,
    first10: firstN(items),
    removedCount: removed.length,
    meta,
  });
  for (const item of items.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_ROWS]", item);
  }
  for (const item of removed.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_ROWS] removed", item);
  }
  return { items, removed };
}

export function logPipelineTraceProducts({
  recommendationRows = [],
  previewBudgetRows = [],
  usingPreviewRows = false,
  meta = {},
}) {
  const recommendedProducts = usingPreviewRows ? asArray(previewBudgetRows) : asArray(recommendationRows);
  const items = recommendedProducts.map(traceFromRow);
  const removed = usingPreviewRows
    ? diffRemoved(
        asArray(recommendationRows).map((row) => ({ ...row, title: row.productName, sourceUrl: row.productUrl })),
        recommendedProducts.map((row) => ({ ...row, title: row.productName, sourceUrl: row.productUrl })),
        "recommendedProducts",
        "replaced by budgetDraft.previewBudgetRows (registry SKU path)",
      )
    : [];

  console.log("[PIPELINE_TRACE_PRODUCTS]", {
    count: items.length,
    usingPreviewRows,
    previewBudgetRowsCount: asArray(previewBudgetRows).length,
    recommendationRowsCount: asArray(recommendationRows).length,
    first10: firstN(items),
    removedCount: removed.length,
    meta,
  });
  for (const item of items.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_PRODUCTS]", item);
  }
  for (const item of removed.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_PRODUCTS] removed", item);
  }
  return { items, removed, recommendedProducts };
}

export function logPipelineTraceUi({ recommendedProducts = [], renderedCards = [], meta = {} }) {
  const items = asArray(renderedCards).map((card, index) => ({
    index,
    ...traceFromRow(card?.row || card),
    cardRole: card?.role || "primary",
  }));
  const removed = diffRemoved(
    asArray(recommendedProducts).map((row) => ({ ...row, title: row.productName, sourceUrl: row.productUrl })),
    asArray(renderedCards).map((card) => {
      const row = card?.row || card;
      return { ...row, title: row.productName, sourceUrl: row.productUrl };
    }),
    "renderedUICards",
    "not selected as primary/alternative card in BudgetRecommendationsSection",
  );

  console.log("[PIPELINE_TRACE_UI]", {
    count: items.length,
    first10: firstN(items),
    removedCount: removed.length,
    meta,
  });
  for (const item of items.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_UI]", item);
  }
  for (const item of removed.slice(0, 10)) {
    console.log("[PIPELINE_TRACE_UI] removed", item);
  }
  return { items, removed };
}

export function logPipelineTraceSummary(counts = {}) {
  const summary = {
    visualCandidatesCount: counts.visualCandidatesCount ?? 0,
    rankedCandidatesCount: counts.rankedCandidatesCount ?? 0,
    recommendationRowsCount: counts.recommendationRowsCount ?? 0,
    recommendedProductsCount: counts.recommendedProductsCount ?? 0,
    renderedUICardsCount: counts.renderedUICardsCount ?? 0,
  };
  console.log("[PIPELINE_TRACE_SUMMARY]", summary);
  return summary;
}

export function logRecommendationPipelineTrace({
  query = null,
  visualCandidates = [],
  rankedCandidates = [],
  recommendationRows = [],
}) {
  logPipelineTraceVisual(visualCandidates, { registryCategoryId: query?.registryCategoryId || null });
  logPipelineTraceRanked(rankedCandidates, visualCandidates, { registryCategoryId: query?.registryCategoryId || null });
  logPipelineTraceRows(recommendationRows, rankedCandidates, { registryCategoryId: query?.registryCategoryId || null });
  logPipelineTraceSummary({
    visualCandidatesCount: visualCandidates.length,
    rankedCandidatesCount: rankedCandidates.length,
    recommendationRowsCount: recommendationRows.length,
    recommendedProductsCount: recommendationRows.length,
    renderedUICardsCount: 0,
  });
}
