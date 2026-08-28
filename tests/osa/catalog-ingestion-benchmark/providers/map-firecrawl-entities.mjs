/**
 * Provider-neutral mapping from Firecrawl scrape payload to Contract v2 candidates.
 * Uses page metadata, markdown content, labeled fields, and linked assets only.
 * No gold access and no manufacturer-specific extraction rules.
 */

import { createHash } from "node:crypto";
import { buildEntityId } from "../benchmark-core.mjs";

function hostnameManufacturerId(url) {
  try {
    const label = new URL(url).hostname.toLowerCase().split(".")[0];
    return label || null;
  } catch {
    return null;
  }
}

function pathIdentityKey(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
    return `url:${path}`;
  } catch {
    return null;
  }
}

function normalizeLabel(label) {
  return String(label ?? "")
    .replace(/:$/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseNumber(value) {
  const match = String(value ?? "").match(/([\d\s]+(?:[.,]\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function isGenericSiteTitle(title, metadata = {}) {
  const text = String(title ?? "").trim();
  if (!text) return false;
  if (/official site|официальный сайт|купить от официального/i.test(text)) return true;
  if (metadata.description && text === metadata.description && text.length > 40) return true;
  if (text.split("|").length >= 3 && text.length > 60) return true;
  return false;
}

function firstMarkdownH1(markdown) {
  if (typeof markdown !== "string") return null;
  const match = markdown.match(/^#\s+(.+?)\s*$/m);
  return match?.[1]?.trim() || null;
}

function extractMarkdownImageAlts(markdown) {
  if (typeof markdown !== "string") return [];
  const alts = [];
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g)) {
    const alt = match[1]?.trim();
    const url = match[2]?.trim();
    if (!alt || !url) continue;
    if (/^(video|404|file\.|recaptcha)/i.test(alt)) continue;
    if (/video-play|404-bg|favicon|recaptcha/i.test(url)) continue;
    if (alt.length < 8) continue;
    alts.push(alt);
  }
  return alts;
}

function dominantProductAlt(alts) {
  if (!alts.length) return null;
  const counts = new Map();
  for (const alt of alts) counts.set(alt, (counts.get(alt) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1] || right[0].length - left[0].length);
  return sorted[0]?.[0] ?? null;
}

function pickProductTitle({ markdown, metadata }) {
  const h1 = firstMarkdownH1(markdown);
  if (h1) return { title: h1, locator: "firecrawl:markdown.h1", confidence: 0.95 };

  const dominantAlt = dominantProductAlt(extractMarkdownImageAlts(markdown));
  if (dominantAlt) return { title: dominantAlt, locator: "firecrawl:markdown.image_alt", confidence: 0.9 };

  const ogTitle = String(metadata.ogTitle ?? "").trim();
  if (ogTitle && !isGenericSiteTitle(ogTitle, metadata)) {
    return { title: ogTitle, locator: "firecrawl:metadata.ogTitle", confidence: 0.9 };
  }

  const metaTitle = String(metadata.title ?? "").trim();
  if (metaTitle && !isGenericSiteTitle(metaTitle, metadata)) {
    return { title: metaTitle, locator: "firecrawl:metadata.title", confidence: 0.85 };
  }

  return null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function captureLabeledValue(markdown, labels) {
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\s{2,})${escapeRegex(label)}\\s{2,}(.+?)(?=\\s{2,}(?:РРЦ|RRP|Price|Цена|MSRP|Коллекция|Collection|Характеристики|Specifications|Диаметр|Diameter|Material|Материал)|\\n\\n|$)`,
      "is",
    );
    const match = markdown.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

function extractLabeledFields(markdown) {
  const fields = new Map();
  const add = (key, labels) => {
    const value = captureLabeledValue(markdown, labels);
    if (value) fields.set(key, value);
  };

  add("article", ["Артикул", "Article", "SKU", "Item number", "Model number"]);
  add("material", ["Материал", "Material"]);
  add("finish", ["Материал арматуры/Покрытие", "Материал арматуры/тип", "Finish"]);
  add("color", ["Цвет рассеивателя плафона", "Цвет рассеивателя", "Color", "Colour"]);
  add("price", ["РРЦ", "RRP", "Price", "Цена", "MSRP"]);
  add("diameter_mm", ["Диаметр мм", "Diameter mm", "Diameter"]);
  add("height_mm", ["Высота мм", "Height mm", "Height"]);
  add("max_height_mm", ["Максимальная высота мм", "Maximum height mm", "Max height mm"]);
  add("width_mm", ["Ширина мм", "Width mm", "Width"]);
  add("depth_mm", ["Глубина мм", "Depth mm", "Depth"]);
  add("cutout_mm", ["Размер врезного отверстия мм", "Cutout mm"]);
  add("canopy_size", ["Размер потолочной чаши", "Canopy size"]);
  add("illuminated_area_m2", ["Площадь освещения м2", "Illuminated area m2"]);
  add("net_weight_kg", ["Масса нетто кг", "Net weight kg"]);
  add("gross_weight_kg", ["Масса Брутто кг", "Gross weight kg"]);
  add("package_volume_m3", ["Объемы упаковки м3", "Package volume m3"]);
  add("socket_type", ["Тип цоколя", "Socket type"]);
  add("power_w", ["Общая мощность Вт", "Total power W", "Power W"]);
  add("lamp_power_w", ["Мощность Вт", "Lamp power W"]);
  add("lamp_count", ["Общее количество ламп", "Lamp count"]);
  add("supply_voltage_v", ["Напряжение питания В", "Supply voltage V"]);
  add("fixture_type", ["Тип светильника", "Fixture type"]);
  add("mounting", ["Крепление", "Mounting"]);
  add("lamps_included", ["Лампы в комплекте", "Lamps included"]);
  add("lamp_type", ["Тип лампы", "Lamp type"]);
  add("ip_rating", ["Степень пылевлагозащиты IP", "IP rating"]);
  add("electrical_class", ["Класс электробезопасности", "Electrical class"]);
  add("placement", ["Место размещения", "Placement"]);
  add("warranty_months", ["Гарантия месяцы", "Warranty months"]);

  return fields;
}

function extractArticle(fields) {
  const raw = fields.get("article");
  if (!raw) return null;
  return raw.split(/\n+/)[0].replace(/\s{2,}.*$/, "").trim() || null;
}

function extractPrice(fields, markdown) {
  const labeled = fields.get("price");
  if (labeled) {
    const amount = parseNumber(labeled);
    if (amount !== null) {
      const currency = /₽|rub/i.test(labeled) ? "RUB" : /€|eur/i.test(labeled) ? "EUR" : /\$|usd/i.test(labeled) ? "USD" : null;
      return { price: amount, currency, raw: labeled, label: "price" };
    }
  }
  const inline = markdown.match(/(?:ррц|rrp|price|цена)\s*:?\s*([\d\s]+(?:[.,]\d+)?)\s*(₽|rub|€|eur|\$|usd)?/i);
  if (inline) {
    const amount = parseNumber(inline[1]);
    if (amount === null) return null;
    const token = inline[2]?.toUpperCase() ?? "";
    const currency = /₽|RUB/.test(token) ? "RUB" : /€|EUR/.test(token) ? "EUR" : /\$|USD/.test(token) ? "USD" : null;
    return { price: amount, currency, raw: inline[0], label: "inline_price" };
  }
  return null;
}

function extractMaterial(fields) {
  return fields.get("material") ?? null;
}

function extractFinish(fields) {
  return fields.get("finish") ?? null;
}

function extractColor(fields) {
  return fields.get("color") ?? null;
}

function extractDimensions(fields) {
  const dimensions = {};
  for (const key of [
    "diameter_mm", "height_mm", "max_height_mm", "width_mm", "depth_mm",
    "cutout_mm", "canopy_size", "illuminated_area_m2", "net_weight_kg", "gross_weight_kg", "package_volume_m3",
  ]) {
    const value = fields.get(key);
    if (!value) continue;
    const numeric = parseNumber(value);
    dimensions[key] = numeric !== null ? numeric : value.trim();
  }
  return Object.keys(dimensions).length ? dimensions : null;
}

function extractSpecifications(fields) {
  const specifications = {};
  for (const key of [
    "socket_type", "power_w", "lamp_power_w", "lamp_count", "supply_voltage_v", "fixture_type",
    "lamps_included", "lamp_type", "ip_rating", "electrical_class", "placement", "warranty_months",
  ]) {
    const value = fields.get(key);
    if (!value) continue;
    const numeric = parseNumber(value);
    specifications[key] = numeric !== null && /^\s*[\d\s.,]+/.test(value) ? numeric : value.trim();
  }
  return Object.keys(specifications).length ? specifications : null;
}

function normalizeComparable(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9\u0400-\u04ff]/gi, "");
}

function isRelatedSectionHeading(headingText) {
  const text = String(headingText ?? "").trim().toLowerCase();
  return /(?:other models?|related(?: products?| items?)?|similar(?: products?| items?)?|accessories|recommended|you may also|also (?:viewed|bought)|cross[\s-]?sell|другие модели|сопутств|аксессуар|похожие? (?:товар|модел|продукт)|рекоменд|смотрите также)/i.test(text);
}

function relatedSectionCutoffIndex(markdown) {
  if (typeof markdown !== "string") return null;
  let earliest = null;
  for (const match of markdown.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    if (!isRelatedSectionHeading(match[1])) continue;
    const index = match.index ?? 0;
    if (earliest === null || index < earliest) earliest = index;
  }
  return earliest;
}

function extractComparableProductCodes(text) {
  const codes = new Set();
  for (const match of String(text).matchAll(/\b[A-Za-z]{1,}[A-Za-z0-9]*(?:[.\-/][A-Za-z0-9]+)+\b|\b[A-Za-z]*\d{3,}[A-Za-z0-9.-]*\b/g)) {
    const normalized = normalizeComparable(match[0]);
    if (normalized.length >= 5 && /[a-z\u0400-\u04ff]/.test(normalized) && /\d/.test(normalized)) {
      codes.add(normalized);
    }
  }
  return codes;
}

function altMatchesArticle(alt, article) {
  if (!article) return false;
  const nAlt = normalizeComparable(alt);
  const nArticle = normalizeComparable(article);
  return Boolean(nArticle && nArticle.length >= 3 && nAlt.includes(nArticle));
}

function altMatchesTitle(alt, title) {
  if (!title) return false;
  const nAlt = normalizeComparable(alt);
  const nTitle = normalizeComparable(title);
  if (!nTitle) return false;
  const minLength = nTitle.length >= 6 ? 6 : 4;
  if (nTitle.length < minLength) return false;
  return nAlt.includes(nTitle);
}

function altReferencesForeignProductCode(alt, article) {
  if (!article) return false;
  const nArticle = normalizeComparable(article);
  for (const code of extractComparableProductCodes(alt)) {
    if (code.length < 6) continue;
    if (nArticle.includes(code) || code.includes(nArticle)) continue;
    return true;
  }
  return false;
}

function isProvenCurrentProductImage({ alt }, { article, title }) {
  const trimmedAlt = String(alt ?? "").trim();
  if (!trimmedAlt || trimmedAlt.length < 3) return false;
  if (/^(video|404|file\.|recaptcha)/i.test(trimmedAlt)) return false;
  if (article && altMatchesArticle(trimmedAlt, article)) return true;
  if (article && altReferencesForeignProductCode(trimmedAlt, article)) return false;
  if (title && altMatchesTitle(trimmedAlt, title)) return true;
  return false;
}

function extractMarkdownImageCandidates(markdown) {
  if (typeof markdown !== "string") return [];
  const images = [];
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g)) {
    const url = match[2]?.trim();
    if (!url) continue;
    images.push({ alt: match[1]?.trim() ?? "", url, index: match.index ?? 0 });
  }
  return images;
}

function filterCurrentProductImages(candidates, markdown, { article, title }) {
  const cutoff = relatedSectionCutoffIndex(markdown);
  const maxIndex = cutoff ?? Number.POSITIVE_INFINITY;
  const seen = new Set();
  const images = [];
  for (const image of candidates) {
    if (image.index >= maxIndex) continue;
    if (seen.has(image.url)) continue;
    if (/video-play|404-bg|favicon|recaptcha/i.test(image.url)) continue;
    if (!/\.(?:jpg|jpeg|png|webp)(?:\?|$)/i.test(image.url)) continue;
    if (!isProvenCurrentProductImage(image, { article, title })) continue;
    seen.add(image.url);
    images.push({ alt: image.alt, url: image.url });
  }
  return images;
}

function extractMarkdownImages(markdown, _official_url, productContext = {}) {
  return filterCurrentProductImages(extractMarkdownImageCandidates(markdown), markdown, productContext);
}

function discoverPdfLinks({ links, markdown }) {
  const found = new Set();
  if (Array.isArray(links)) {
    for (const link of links) {
      const href = typeof link === "string" ? link : link?.url ?? link?.href;
      if (typeof href === "string" && /\.pdf(?:\?|#|$)/i.test(href)) found.add(href);
    }
  }
  if (typeof markdown === "string") {
    for (const match of markdown.matchAll(/https?:\/\/[^\s<>\)"]+\.pdf(?:\?[^\s<>\)"]*)?/gi)) {
      found.add(match[0]);
    }
  }
  return [...found];
}

function emptyRelationships() {
  return { member_of: [], variant_of: [], configured_from: [], component_of: [] };
}

function emptyProcurementAttributes() {
  return {
    dimensions: null,
    specifications: null,
    material: null,
    finish: null,
    color: null,
    mounting: null,
    price: null,
    currency: null,
    availability: null,
  };
}

function contentHash(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex").slice(0, 16);
}

export function inspectFirecrawlSourceGuard(firecrawl) {
  const metadata = firecrawl?.data?.metadata;
  if (!metadata || typeof metadata !== "object") {
    return { rejected: false, reason: null, statusCode: null, error: null, source_url: null };
  }
  const statusCode = Number(metadata.statusCode);
  const source_url = metadata.sourceURL || metadata.url || null;
  if (Number.isFinite(statusCode) && statusCode >= 400) {
    return {
      rejected: true,
      reason: "http_source_error",
      statusCode,
      error: metadata.error ?? null,
      source_url,
    };
  }
  return { rejected: false, reason: null, statusCode: Number.isFinite(statusCode) ? statusCode : null, error: null, source_url };
}

export function mapFirecrawlScrapeToEntities({
  source_url,
  firecrawl,
  extraction_run_id,
  provider_id = "firecrawl",
}) {
  if (!firecrawl?.success || !firecrawl?.data || typeof firecrawl.data !== "object") return [];
  if (inspectFirecrawlSourceGuard(firecrawl).rejected) return [];

  const data = firecrawl.data;
  const markdown = typeof data.markdown === "string" ? data.markdown : "";
  const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const official_url = metadata.sourceURL || metadata.url || metadata.ogUrl || source_url;
  const manufacturer_id = hostnameManufacturerId(official_url);
  const source_identity_key = pathIdentityKey(official_url);
  const titlePick = pickProductTitle({ markdown, metadata });

  if (!titlePick?.title || !official_url || !manufacturer_id || !source_identity_key) return [];

  const labeled = extractLabeledFields(markdown);
  const article = extractArticle(labeled);
  const priceInfo = extractPrice(labeled, markdown);
  const material = extractMaterial(labeled);
  const finish = extractFinish(labeled);
  const color = extractColor(labeled);
  const dimensions = extractDimensions(labeled);
  const specifications = extractSpecifications(labeled);
  const pdfs = discoverPdfLinks({ links: data.links, markdown });
  const images = extractMarkdownImages(markdown, official_url, {
    article,
    title: titlePick.title,
  });

  const identitySeed = {
    manufacturer_id,
    entity_type: "product_model",
    source_identity_key,
  };
  const entity_id = buildEntityId(identitySeed);

  const field_evidence = {
    "identity.title": { source_url: official_url, locator: titlePick.locator },
    "identity.official_url": { source_url: official_url, locator: "firecrawl:metadata.sourceURL|metadata.url" },
  };
  const field_confidence = {
    "identity.title": titlePick.confidence,
    "identity.official_url": 1,
  };
  const validation_warnings = [
    "procurement_eligible_not_evidenced",
    "entity_type_default_primary_page",
    "content_hash_unverified",
  ];

  if (article) {
    field_evidence["identity.article"] = { source_url: official_url, locator: "firecrawl:markdown.labeled_field" };
    field_confidence["identity.article"] = 0.95;
  }
  if (material) {
    field_evidence["procurement_attributes.material"] = { source_url: official_url, locator: "firecrawl:markdown.labeled_field" };
    field_confidence["procurement_attributes.material"] = 0.95;
  }
  if (finish) {
    field_evidence["procurement_attributes.finish"] = { source_url: official_url, locator: "firecrawl:markdown.labeled_field" };
    field_confidence["procurement_attributes.finish"] = 0.95;
  }
  if (color) {
    field_evidence["procurement_attributes.color"] = { source_url: official_url, locator: "firecrawl:markdown.labeled_field" };
    field_confidence["procurement_attributes.color"] = 0.95;
  }
  if (dimensions) {
    field_evidence["procurement_attributes.dimensions"] = { source_url: official_url, locator: "firecrawl:markdown.labeled_field" };
    field_confidence["procurement_attributes.dimensions"] = 0.95;
  }
  if (specifications) {
    field_evidence["procurement_attributes.specifications"] = { source_url: official_url, locator: "firecrawl:markdown.labeled_field" };
    field_confidence["procurement_attributes.specifications"] = 0.95;
  }
  if (priceInfo) {
    field_evidence["procurement_attributes.price"] = { source_url: official_url, locator: "firecrawl:markdown.labeled_field" };
    field_confidence["procurement_attributes.price"] = 0.95;
  }
  if (images.length) {
    field_evidence["media.records"] = { source_url: official_url, locator: "firecrawl:markdown.image" };
    field_confidence["media.records"] = 0.9;
  }
  if (pdfs[0]) {
    field_evidence.technical_pdf = { source_url: pdfs[0], locator: "firecrawl:linked_pdf" };
    field_confidence.technical_pdf = 0.9;
  }

  const mediaRecords = images.map(({ url }, index) => ({
    media_id: `${entity_id}:image:${index}`,
    official_url: url,
    media_type: "image",
    entity_id,
    is_primary: index === 0,
    source_url: official_url,
    content_hash: `unverified:${contentHash(url)}`,
  }));

  return [{
    identity: {
      entity_id,
      ...identitySeed,
      article,
      title: titlePick.title,
      official_url,
      registry_category_id: null,
      procurement_eligible: false,
    },
    relationships: emptyRelationships(),
    media: {
      records: mediaRecords,
      primary_image_id: mediaRecords[0]?.media_id ?? null,
    },
    procurement_attributes: {
      ...emptyProcurementAttributes(),
      dimensions,
      specifications,
      material,
      finish,
      color,
      mounting: labeled.get("mounting") ?? null,
      price: priceInfo?.price ?? null,
      currency: priceInfo?.currency ?? null,
    },
    provenance_quality: {
      source_url: official_url,
      source_type: "provider_scrape",
      retrieved_at: new Date().toISOString(),
      source_snapshot_id: metadata.scrapeId ? String(metadata.scrapeId) : `firecrawl:${extraction_run_id}`,
      field_evidence,
      field_confidence,
      extraction_provider: provider_id,
      extraction_run_id,
      content_hash: metadata.contentHash ? String(metadata.contentHash) : "unverified:provider_scrape",
      validation_warnings,
    },
  }];
}
