function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function displayString(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asFiniteNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueStrings(values) {
  return [...new Set(values.map(asString).filter(Boolean))];
}

function confidenceLabel(value) {
  const number = asFiniteNumber(value);
  if (number == null) return "";
  const percent = number <= 1 ? number * 100 : number;
  return `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
}

function scalarRows(source, fields) {
  return fields
    .map(([key, label]) => ({ key, label, value: displayString(source[key]) }))
    .filter((row) => row.value);
}

function objectRows(source) {
  return Object.entries(asObject(source))
    .map(([label, value]) => ({ label, value: displayString(value) }))
    .filter((row) => row.value);
}

function normalizeCandidate(candidate, index) {
  const value = asObject(candidate);
  const evidence = Array.isArray(value.evidence) ? value.evidence : [];
  const firstEvidence = asObject(evidence[0]);
  return {
    id: [asString(value.manufacturer_id), asString(value.article), asString(value.source), index + 1].filter(Boolean).join(":"),
    manufacturer:
      asString(value.manufacturer_name) ||
      asString(value.brandName) ||
      asString(value.manufacturer_id) ||
      "Неизвестный производитель",
    article: asString(value.article),
    confidence: confidenceLabel(value.confidence ?? value.match_confidence),
    source: asString(value.source),
    url: asString(value.url) || asString(firstEvidence.page_url),
  };
}

/** Pure Slice 2 presentation mapping: no discovery, validation, or estimate calculation. */
export function buildOfficeResultViewModel(result) {
  const payload = asObject(result);
  const status = asString(payload.status);
  const specification = asObject(payload.specification);
  const product = Object.keys(asObject(payload.product)).length
    ? asObject(payload.product)
    : asObject(specification.product);
  const estimateLine = asObject(asObject(payload.estimate).line);
  const audit = asObject(payload.audit);
  const gateG3 = asObject(asObject(audit.gates).g3 || asObject(payload.gates).g3 || payload.gateG3);
  const validated = status === "ok" && asString(gateG3.decision).toLowerCase() === "accept";

  const summaryLines = uniqueStrings(
    Array.isArray(payload.DesignerSummary?.lines)
      ? payload.DesignerSummary.lines
      : asString(payload.DesignerSummary?.text).split("\n"),
  ).slice(0, 6);
  const missingFields = uniqueStrings([
    ...(Array.isArray(payload.missing_fields) ? payload.missing_fields : []),
    ...(Array.isArray(audit.missing_fields) ? audit.missing_fields : []),
  ]);
  const candidates = [
    ...(Array.isArray(payload.candidates) ? payload.candidates : []),
    ...(Array.isArray(payload.evidence?.candidates) ? payload.evidence.candidates : []),
  ].map(normalizeCandidate);

  const productCard = {
    manufacturer:
      asString(specification.manufacturer) ||
      asString(payload.manufacturer?.brandName) ||
      asString(product.manufacturer),
    name: asString(specification.product_name) || asString(product.name) || asString(product.title),
    article: asString(specification.article) || asString(product.article),
    image: asString(specification.image) || asString(product.image),
    url: asString(specification.url) || asString(product.url),
    confidence: confidenceLabel(specification.confidence ?? product.match_confidence),
  };

  const price = asFiniteNumber(estimateLine.price ?? specification.price);
  const quantity = asFiniteNumber(estimateLine.quantity);
  const lineTotal = asFiniteNumber(estimateLine.line_total);
  const currency = asString(estimateLine.currency) || asString(specification.currency);
  const estimate = validated && asString(estimateLine.article || productCard.article)
    ? {
        article: asString(estimateLine.article) || productCard.article,
        quantity: quantity ?? 1,
        unit: asString(estimateLine.unit) || "pcs",
        price,
        lineTotal,
        currency,
        status: asString(estimateLine.status),
      }
    : null;

  return {
    status,
    kind: validated
      ? "validated"
      : status === "needs_human" || status === "ok"
        ? "needs_human"
        : "unknown",
    validated,
    reason:
      asString(payload.reason) ||
      (status === "ok" && !validated ? "Официальная проверка продукта не завершена." : ""),
    hitl: asString(payload.hitl),
    productCard,
    specification: {
      rows: scalarRows(specification, [
        ["category", "Категория"],
        ["subcategory", "Подкатегория"],
        ["collection", "Коллекция"],
        ["material", "Материал"],
        ["finish", "Отделка"],
        ["color", "Цвет"],
        ["style", "Стиль"],
        ["mounting", "Монтаж"],
      ]),
      dimensions: objectRows(specification.dimensions),
      technical: objectRows(specification.technical_specifications),
    },
    estimate,
    summaryLines,
    missingFields,
    candidates,
  };
}
