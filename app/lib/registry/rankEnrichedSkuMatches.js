function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/** Visual readiness: image confidence + presence (for designer-first sorting). */
export function visualReadinessScore(item) {
  let score = toNumber(item?.imageConfidence) * 100;
  if (item?.imageUrl) score += 12;
  return score;
}

/**
 * Sort enriched SKU matches for preview:
 * 1) visual readiness
 * 2) matchScore
 * 3) has image
 * 4) unitPrice (lowest priority tiebreaker)
 */
export function rankEnrichedSkuMatches(items) {
  return [...asArray(items)].sort((left, right) => {
    const leftVisual = visualReadinessScore(left);
    const rightVisual = visualReadinessScore(right);
    if (rightVisual !== leftVisual) return rightVisual - leftVisual;

    const leftMatch = toNumber(left?.matchScore);
    const rightMatch = toNumber(right?.matchScore);
    if (rightMatch !== leftMatch) return rightMatch - leftMatch;

    const leftImage = left?.imageUrl ? 1 : 0;
    const rightImage = right?.imageUrl ? 1 : 0;
    if (rightImage !== leftImage) return rightImage - leftImage;

    return toNumber(left?.unitPrice) - toNumber(right?.unitPrice);
  });
}
