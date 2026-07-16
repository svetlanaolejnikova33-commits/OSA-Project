/**
 * Designer Summary — concise human-language result for designers.
 * Not an audit. Not JSON. Not a technical log.
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatConfidencePercent(value) {
  const num = asFiniteNumber(value);
  if (num == null) return "";
  const pct = num <= 1 ? Math.round(num * 100) : Math.round(num);
  return `${Math.max(0, Math.min(100, pct))}%`;
}

function hasPrice(specification) {
  const price = specification?.price;
  if (price === "" || price == null) return false;
  return Number.isFinite(Number(price));
}

/**
 * Build a designer-facing summary (max 6 short lines).
 *
 * @param {{
 *   ok?: boolean,
 *   specification?: object,
 *   estimate?: { line?: object, line_items?: object[] },
 *   missing_fields?: string[],
 *   product?: object,
 * }} assembled
 * @returns {{ lines: string[], text: string }}
 */
export function buildDesignerSummary(assembled = {}) {
  const spec = assembled.specification && typeof assembled.specification === "object"
    ? assembled.specification
    : {};
  const estimate = assembled.estimate && typeof assembled.estimate === "object"
    ? assembled.estimate
    : {};
  const missing = Array.isArray(assembled.missing_fields) ? assembled.missing_fields : [];
  const product = assembled.product && typeof assembled.product === "object"
    ? assembled.product
    : spec.product && typeof spec.product === "object"
      ? spec.product
      : {};

  const manufacturer = asString(spec.manufacturer);
  const article = asString(spec.article);
  const confidence = formatConfidencePercent(spec.confidence ?? product.match_confidence);
  const matchType = asString(product.match_type).toLowerCase();
  const exact = matchType === "exact" || (assembled.ok && article && hasPrice(spec));
  const hasEstimate = Boolean(
    estimate.line?.article ||
      (Array.isArray(estimate.line_items) && estimate.line_items.length > 0),
  );
  const priceMissing = missing.includes("price") || !hasPrice(spec);
  const articleMissing = !article || missing.includes("article");

  /** @type {string[]} */
  let lines = [];

  if (assembled.ok && article && !articleMissing) {
    if (exact) {
      lines = [
        "✓ Exact product found",
        `Manufacturer: ${manufacturer || "—"}`,
        `Article: ${article}`,
        confidence ? `Confidence: ${confidence}` : "Specification generated.",
        hasEstimate ? "Specification generated. Estimate line created." : "Specification generated.",
        "No further action required.",
      ];
    } else {
      lines = [
        "Product identified.",
        manufacturer ? `Manufacturer: ${manufacturer}` : "Specification generated.",
        `Article: ${article}`,
        confidence ? `Confidence: ${confidence}` : "Specification generated.",
        hasEstimate ? "Estimate line created." : "Specification generated.",
        priceMissing ? "Manual price verification required." : "No further action required.",
      ];
    }
  } else if (article && priceMissing) {
    lines = [
      "Product identified.",
      "Price unavailable on manufacturer website.",
      "Partial specification generated.",
      "Manual price verification required.",
    ];
  } else if (article) {
    lines = [
      "Product identified.",
      manufacturer ? `Manufacturer: ${manufacturer}` : "Partial specification generated.",
      `Article: ${article}`,
      "Partial specification generated.",
      "Manual verification required.",
    ];
  } else {
    lines = [
      "Product not confirmed.",
      "Partial specification generated.",
      "Manual verification required.",
    ];
  }

  // Hard cap: 6 short lines.
  lines = lines.map((line) => asString(line)).filter(Boolean).slice(0, 6);

  return {
    lines,
    text: lines.join("\n"),
  };
}
