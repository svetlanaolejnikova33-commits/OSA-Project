import { rankEnrichedSkuMatches } from "./rankEnrichedSkuMatches";
import { extractSkuMatchContext, scoreSkuMatch } from "./scoreSkuMatch";

const LIGHTING_CATEGORY_LABEL = "Освещение";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toUnitPrice(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Build transient budget preview rows from on-demand SKU shortlist (lighting MVP).
 */
export function buildPreviewBudgetRowsFromSkuMatches(skuMatches, { maxRows = 5, budgetDraft = null } = {}) {
  const context = budgetDraft ? extractSkuMatchContext(budgetDraft) : null;
  const scored = asArray(skuMatches).map((item) => {
    if (!context) return item;
    const { matchScore, matchReasons } = scoreSkuMatch(item, context);
    return { ...item, matchScore, matchReasons };
  });
  const ranked = rankEnrichedSkuMatches(scored);

  return ranked
    .slice(0, maxRows)
    .map((item) => {
      const unitPrice = toUnitPrice(item?.unitPrice);
      return {
        category: LIGHTING_CATEGORY_LABEL,
        brand: typeof item?.brandName === "string" ? item.brandName.trim() : "—",
        article: typeof item?.article === "string" ? item.article.trim() : "",
        productName: typeof item?.productName === "string" ? item.productName.trim() : "",
        unitPrice,
        quantity: 1,
        totalPrice: unitPrice,
        matchScore: Number.isFinite(item?.matchScore) ? item.matchScore : 0,
        matchReasons: asArray(item?.matchReasons),
        imageUrl: item?.imageUrl || null,
        productUrl: item?.productUrl || null,
        imageSource: item?.imageSource || null,
        imageConfidence: Number.isFinite(item?.imageConfidence) ? item.imageConfidence : 0,
        searchUrl: item?.searchUrl || null,
      };
    })
    .filter((row) => row.article && row.productName && row.unitPrice > 0);
}

export function sumPreviewBudgetRows(rows) {
  return asArray(rows).reduce((sum, row) => sum + toUnitPrice(row?.totalPrice), 0);
}
