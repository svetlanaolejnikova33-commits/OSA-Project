import {
  buildStructuredEstimateRows,
  sumStructuredEstimateRows,
} from "../projectSelectionStore";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function finiteOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isValidatedOfficeResult(result) {
  const payload = asObject(result);
  const auditG3 = asObject(asObject(asObject(payload.audit).gates).g3);
  const resultG3 = asObject(asObject(payload.gates).g3);
  const gateG3 = Object.keys(auditG3).length ? auditG3 : resultG3;
  return payload.status === "ok" && asString(gateG3.decision).toLowerCase() === "accept";
}

/**
 * Select the only estimate truth for the current decision path.
 * A validated Office result always wins, including when its price is missing.
 */
export function resolveEstimateTruth({ officeResult, selectedProjectItems, projectKey = "" } = {}) {
  if (isValidatedOfficeResult(officeResult)) {
    const payload = asObject(officeResult);
    const specification = asObject(payload.specification);
    const line = asObject(asObject(payload.estimate).line);
    const article = asString(line.article) || asString(specification.article);
    const row = article
      ? {
          id: `spec-assembler:${article}`,
          projectKey: asString(projectKey),
          category: asString(specification.category),
          brand: asString(specification.manufacturer),
          model: asString(specification.product_name),
          title: asString(specification.product_name) || article,
          article,
          price: finiteOrNull(line.price),
          quantity: finiteOrNull(line.quantity) ?? 1,
          unit: asString(line.unit) || "pcs",
          total: finiteOrNull(line.line_total),
          currency: asString(line.currency) || asString(specification.currency),
          sourceUrl: asString(specification.url),
          image: asString(specification.image) || null,
          matchPercent: finiteOrNull(specification.confidence),
          status: asString(line.status),
          source: "spec_assembler",
        }
      : null;

    return {
      source: "spec_assembler",
      canonical: true,
      rows: row ? [row] : [],
      total: row?.total ?? null,
      currency: row?.currency || "",
    };
  }

  const rows = buildStructuredEstimateRows(selectedProjectItems, projectKey);
  return {
    source: "legacy_basket",
    canonical: false,
    rows,
    total: sumStructuredEstimateRows(rows),
    currency: "RUB",
  };
}
