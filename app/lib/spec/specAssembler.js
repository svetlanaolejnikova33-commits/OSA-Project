/**
 * Spec Assembler — merge Vision JSON + CCN product into canonical OSA result.
 */

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value, fallback = null) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * @param {{
 *   vision?: object | null,
 *   product?: object | null,
 *   placement?: object | null,
 *   gates?: { g1?: object, g3?: object } | null,
 *   human_overrides?: unknown[],
 * }} input
 */
export function assembleSpecification(input) {
  const vision = asObject(input?.vision);
  const product = asObject(input?.product);
  const placement = asObject(input?.placement);
  const gates = asObject(input?.gates);
  const humanOverrides = asArray(input?.human_overrides);

  const cvoConfidence = asNumber(vision.confidence, null);
  const ccnMatchConfidence = asNumber(
    product.match_confidence ?? gates?.g3?.match_confidence,
    null,
  );

  const lineItems = [];
  if (product.article) {
    lineItems.push({
      article: product.article,
      title: product.title ?? null,
      price: product.price ?? null,
      currency: product.currency ?? null,
      url: product.url ?? null,
      quantity: 1,
      source: product.source || "CCN",
    });
  }

  return {
    specification: {
      vision,
      product,
      placement,
    },
    estimate: {
      line_items: lineItems,
    },
    audit: {
      cvo_confidence: cvoConfidence,
      ccn_match_confidence: ccnMatchConfidence,
      human_overrides: humanOverrides,
      gates: {
        g1: gates.g1 ?? null,
        g3: gates.g3 ?? null,
      },
    },
  };
}
