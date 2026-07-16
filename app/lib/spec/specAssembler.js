/**
 * Spec Assembler — Vision + Product Card → production Specification Package + Estimate Line.
 * Phase #9. No new AI specialists.
 */

import { buildDesignerSummary } from "./buildDesignerSummary";

export const OSA_PIPELINE_VERSION = "9.0.0";

export const FIELD_SOURCES = Object.freeze({
  VISION: "Vision",
  LIVE_PRODUCT: "Live Product",
  MEMORY: "Memory",
  REGISTRY: "Registry",
  CCN: "CCN",
  CALCULATED: "Calculated",
  UNKNOWN: "Unknown",
});

const REQUIRED_PACKAGE_FIELDS = Object.freeze([
  "manufacturer",
  "article",
  "product_name",
  "url",
  "category",
  "confidence",
  "data_source",
  "timestamp",
]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asFiniteNumber(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isValidHttpUrl(value) {
  const text = asString(value);
  if (!text) return false;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function pickFirstString(...values) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return "";
}

function sanitizeStringRecord(value) {
  const source = asObject(value);
  const out = {};
  for (const [key, entry] of Object.entries(source)) {
    const k = asString(key);
    if (!k) continue;
    if (entry == null) continue;
    if (typeof entry === "object") {
      out[k] = asString(JSON.stringify(entry));
    } else {
      const text = asString(entry);
      if (text) out[k] = text;
    }
  }
  return out;
}

function inferCollection(product, manufacturer) {
  return pickFirstString(
    product.collection,
    product.specifications?.collection,
    product.specifications?.Collection,
    asObject(product.specifications).series,
    manufacturer.brandName && product.title
      ? ""
      : "",
  );
}

function inferColor(vision, product) {
  return pickFirstString(
    product.color,
    product.specifications?.color,
    product.specifications?.Colour,
    product.specifications?.цвет,
    Array.isArray(vision.color_palette) ? vision.color_palette[0] : "",
    vision.finish,
  );
}

function inferDimensions(product) {
  const specs = asObject(product.specifications);
  const dims = asObject(product.dimensions);
  const height = pickFirstString(dims.height, dims.height_mm, specs.height_mm, specs.height, specs["Высота мм"]);
  const width = pickFirstString(dims.width, dims.width_mm, specs.width_mm, specs.width, specs["Ширина мм"]);
  const depth = pickFirstString(dims.depth, dims.depth_mm, specs.depth_mm, specs.depth);
  const diameter = pickFirstString(dims.diameter, dims.diameter_mm, specs.diameter_mm, specs.diameter);
  const out = {};
  if (height) out.height = height;
  if (width) out.width = width;
  if (depth) out.depth = depth;
  if (diameter) out.diameter = diameter;
  return out;
}

function resolveDataSource({ product, memory, livePath }) {
  if (memory?.used) return FIELD_SOURCES.MEMORY;
  const source = asString(product.source).toUpperCase();
  if (source === "CCN_LIVE" || livePath) return FIELD_SOURCES.LIVE_PRODUCT;
  if (source === "CCN" || source) return FIELD_SOURCES.CCN;
  return FIELD_SOURCES.UNKNOWN;
}

function resolveMemorySource(memory) {
  if (memory?.used) return "visual_memory";
  if (Array.isArray(memory?.experience_ranking) && memory.experience_ranking.length) {
    return "experience";
  }
  return "none";
}

function articleSource({ product, memory, livePath }) {
  if (memory?.used) return FIELD_SOURCES.MEMORY;
  if (asString(product.source).toUpperCase() === "CCN_LIVE" || livePath) {
    return FIELD_SOURCES.LIVE_PRODUCT;
  }
  return FIELD_SOURCES.CCN;
}

function priceSource({ product, memory, livePath }) {
  if (product.price == null || product.price === "") return FIELD_SOURCES.UNKNOWN;
  if (memory?.used) return FIELD_SOURCES.MEMORY;
  if (asString(product.source).toUpperCase() === "CCN_LIVE" || livePath) {
    return FIELD_SOURCES.LIVE_PRODUCT;
  }
  return FIELD_SOURCES.CCN;
}

/**
 * Strip undefined/null recursively; replace forbidden empties on required keys downstream.
 */
function scrubValue(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && !Number.isFinite(value)) return undefined;
  if (Array.isArray(value)) {
    return value.map(scrubValue).filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = scrubValue(entry);
      if (cleaned === undefined) continue;
      out[key] = cleaned;
    }
    return out;
  }
  return value;
}

/**
 * Validate specification package — no undefined/null/NaN; required fields non-empty; URLs well-formed when present.
 * Only inspects Specification Package fields (ignores nested vision/product compatibility blobs).
 */
export function validateSpecificationPackage(pkg) {
  const errors = [];
  const missing_fields = [];
  const source = asObject(pkg);

  const packageKeys = [
    "manufacturer",
    "collection",
    "article",
    "product_name",
    "url",
    "price",
    "currency",
    "image",
    "category",
    "subcategory",
    "material",
    "finish",
    "color",
    "style",
    "mounting",
    "dimensions",
    "technical_specifications",
    "confidence",
    "data_source",
    "memory_source",
    "timestamp",
  ];

  for (const key of REQUIRED_PACKAGE_FIELDS) {
    const value = source[key];
    if (value === undefined || value === null) {
      errors.push(`required field missing: ${key}`);
      missing_fields.push(key);
      continue;
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      errors.push(`NaN/invalid number: ${key}`);
      missing_fields.push(key);
      continue;
    }
    if (typeof value === "string" && !value.trim()) {
      errors.push(`required field empty: ${key}`);
      missing_fields.push(key);
    }
  }

  if (source.url && !isValidHttpUrl(source.url)) {
    errors.push("broken URL: url");
    missing_fields.push("url");
  }
  if (source.image && asString(source.image) && !isValidHttpUrl(source.image)) {
    errors.push("broken URL: image");
  }

  for (const key of packageKeys) {
    if (!(key in source)) continue;
    const value = source[key];
    if (value === undefined) errors.push(`undefined at specification.${key}`);
    if (value === null) errors.push(`null at specification.${key}`);
    if (typeof value === "number" && !Number.isFinite(value)) {
      errors.push(`NaN at specification.${key}`);
    }
    if (key === "dimensions" || key === "technical_specifications") {
      if (value != null && typeof value === "object") {
        for (const [subKey, subVal] of Object.entries(value)) {
          if (subVal === undefined || subVal === null) {
            errors.push(`null/undefined at specification.${key}.${subKey}`);
          }
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    missing_fields: [...new Set(missing_fields)],
  };
}

/**
 * Build one estimate row. Quantity always 1 pcs until CDIO.
 */
export function buildEstimateLine({
  specification,
  product,
  manufacturer,
  position = 1,
}) {
  const spec = asObject(specification);
  const prod = asObject(product);
  const mfr = asObject(manufacturer);

  const price = asFiniteNumber(spec.price ?? prod.price);
  const quantity = 1;
  const unit = "pcs";
  const lineTotal = price == null ? 0 : Number((price * quantity).toFixed(2));
  const confidence = asFiniteNumber(spec.confidence ?? prod.match_confidence) ?? 0;
  const hasArticle = Boolean(asString(spec.article || prod.article));
  const hasPrice = price != null;
  const status = hasArticle && hasPrice ? "ready" : hasArticle ? "incomplete" : "blocked";

  return scrubValue({
    position: Number(position) > 0 ? Number(position) : 1,
    article: pickFirstString(spec.article, prod.article) || "unknown",
    manufacturer: pickFirstString(spec.manufacturer, mfr.brandName, mfr.manufacturer_id) || "unknown",
    description: pickFirstString(spec.product_name, prod.title, spec.category) || "product",
    unit,
    quantity,
    price: hasPrice ? price : 0,
    currency: pickFirstString(spec.currency, prod.currency, "RUB") || "RUB",
    line_total: lineTotal,
    status,
    confidence,
    // Phase #4 compatibility aliases
    title: pickFirstString(spec.product_name, prod.title) || "product",
    url: pickFirstString(spec.url, prod.url),
    source: pickFirstString(prod.source, spec.data_source, "CCN"),
  });
}

/**
 * Assemble production Specification Package + Estimate Line + Audit.
 *
 * @param {{
 *   vision?: object | null,
 *   product?: object | null,
 *   manufacturer?: object | null,
 *   placement?: object | null,
 *   gates?: { g1?: object, g3?: object } | null,
 *   human_overrides?: unknown[],
 *   memory?: object | null,
 *   livePath?: boolean,
 *   partial?: boolean,
 * }} input
 */
export function assembleSpecification(input = {}) {
  const vision = asObject(input?.vision);
  const product = asObject(input?.product);
  const manufacturer = asObject(input?.manufacturer);
  const placement = asObject(input?.placement);
  const gates = asObject(input?.gates);
  const humanOverrides = asArray(input?.human_overrides);
  const memory = asObject(input?.memory);
  const livePath = Boolean(input?.livePath);
  const forcePartial = Boolean(input?.partial);

  const timestamp = new Date().toISOString();
  const cvoConfidence = asFiniteNumber(vision.confidence) ?? 0;
  const productConfidence =
    asFiniteNumber(product.match_confidence ?? gates?.g3?.match_confidence) ?? 0;
  const packageConfidence = Number(
    Math.max(0, Math.min(1, (cvoConfidence + productConfidence) / 2)).toFixed(4),
  );

  const dataSource = resolveDataSource({ product, memory, livePath });
  const memorySource = resolveMemorySource(memory);

  const article = pickFirstString(product.article);
  const productName = pickFirstString(product.title, vision.category, "unnamed product");
  const urlRaw = pickFirstString(product.url, product.product_url);
  const url = isValidHttpUrl(urlRaw) ? urlRaw : "";
  const imageRaw = pickFirstString(product.image_url, product.image, product.thumbnail);
  const image = isValidHttpUrl(imageRaw) ? imageRaw : "";
  const priceNum = asFiniteNumber(product.price);
  const currency = pickFirstString(product.currency);

  const manufacturerName = pickFirstString(
    manufacturer.brandName,
    manufacturer.manufacturer_id,
    product.manufacturer_id,
    product.manufacturer,
  );

  const collection = pickFirstString(
    inferCollection(product, manufacturer),
    product.specifications?.коллекция,
  );

  const technical = sanitizeStringRecord(product.specifications);
  const dimensions = inferDimensions(product);

  const material = pickFirstString(product.material, vision.material);
  const finish = pickFirstString(product.finish, vision.finish);
  const style = pickFirstString(vision.style, product.style);
  const mounting = pickFirstString(product.mounting, vision.mounting);
  const category = pickFirstString(product.category, vision.category, "unknown");
  const subcategory = pickFirstString(
    product.subcategory,
    vision.subtype,
    vision.category !== category ? vision.category : "",
  );
  const color = inferColor(vision, product);

  /** @type {Record<string, string>} */
  const provenance = {
    manufacturer: manufacturerName ? FIELD_SOURCES.REGISTRY : FIELD_SOURCES.UNKNOWN,
    collection: collection ? FIELD_SOURCES.LIVE_PRODUCT : FIELD_SOURCES.UNKNOWN,
    article: article ? articleSource({ product, memory, livePath }) : FIELD_SOURCES.UNKNOWN,
    product_name: product.title
      ? articleSource({ product, memory, livePath })
      : FIELD_SOURCES.VISION,
    url: url ? articleSource({ product, memory, livePath }) : FIELD_SOURCES.UNKNOWN,
    price: priceSource({ product, memory, livePath }),
    currency: currency ? priceSource({ product, memory, livePath }) : FIELD_SOURCES.UNKNOWN,
    image: image ? articleSource({ product, memory, livePath }) : FIELD_SOURCES.UNKNOWN,
    category: product.category ? articleSource({ product, memory, livePath }) : FIELD_SOURCES.VISION,
    subcategory: vision.subtype ? FIELD_SOURCES.VISION : FIELD_SOURCES.UNKNOWN,
    material: product.material ? articleSource({ product, memory, livePath }) : FIELD_SOURCES.VISION,
    finish: product.finish ? articleSource({ product, memory, livePath }) : FIELD_SOURCES.VISION,
    color: color
      ? product.color || product.specifications?.color
        ? articleSource({ product, memory, livePath })
        : FIELD_SOURCES.VISION
      : FIELD_SOURCES.UNKNOWN,
    style: FIELD_SOURCES.VISION,
    mounting: product.mounting ? articleSource({ product, memory, livePath }) : FIELD_SOURCES.VISION,
    dimensions: Object.keys(dimensions).length ? FIELD_SOURCES.LIVE_PRODUCT : FIELD_SOURCES.UNKNOWN,
    technical_specifications: Object.keys(technical).length
      ? articleSource({ product, memory, livePath })
      : FIELD_SOURCES.UNKNOWN,
    confidence: FIELD_SOURCES.CALCULATED,
    data_source: FIELD_SOURCES.CALCULATED,
    memory_source: FIELD_SOURCES.CALCULATED,
    timestamp: FIELD_SOURCES.CALCULATED,
  };

  const specificationPackage = scrubValue({
    manufacturer: manufacturerName || "unknown",
    collection: collection || "",
    article: article || "",
    product_name: productName,
    url,
    price: priceNum == null ? "" : priceNum,
    currency: currency || "",
    image,
    category: category || "unknown",
    subcategory: subcategory || "",
    material: material || "",
    finish: finish || "",
    color: color || "",
    style: style || "",
    mounting: mounting || "",
    dimensions,
    technical_specifications: technical,
    confidence: packageConfidence,
    data_source: dataSource,
    memory_source: memorySource,
    timestamp,
  });

  // Ensure no nulls remain after scrub — fill string holes with "".
  for (const key of Object.keys(specificationPackage)) {
    if (specificationPackage[key] === undefined) {
      delete specificationPackage[key];
    }
  }
  for (const key of [
    "collection",
    "article",
    "url",
    "currency",
    "image",
    "subcategory",
    "material",
    "finish",
    "color",
    "style",
    "mounting",
  ]) {
    if (!(key in specificationPackage)) specificationPackage[key] = "";
  }
  if (!("dimensions" in specificationPackage)) specificationPackage.dimensions = {};
  if (!("technical_specifications" in specificationPackage)) {
    specificationPackage.technical_specifications = {};
  }
  if (!("price" in specificationPackage)) specificationPackage.price = "";

  const validation = validateSpecificationPackage(specificationPackage);
  const missing_fields = [...validation.missing_fields];
  if (priceNum == null) missing_fields.push("price");
  if (!collection) missing_fields.push("collection");
  if (!image) missing_fields.push("image");
  if (!Object.keys(dimensions).length) missing_fields.push("dimensions");
  if (!Object.keys(technical).length) missing_fields.push("technical_specifications");

  const uniqueMissing = [...new Set(missing_fields.filter(Boolean))];
  const isComplete = validation.ok && Boolean(article) && Boolean(url) && !forcePartial;

  const estimateLine = buildEstimateLine({
    specification: specificationPackage,
    product,
    manufacturer,
    position: 1,
  });

  const lineItems = article
    ? [
        {
          ...estimateLine,
        },
      ]
    : [];

  const audit = scrubValue({
    cvo_confidence: cvoConfidence,
    ccn_match_confidence: productConfidence,
    product_confidence: productConfidence,
    vision_confidence: cvoConfidence,
    memory_used: Boolean(memory.used),
    live_search_used: Boolean(livePath) || asString(product.source).toUpperCase() === "CCN_LIVE",
    registry_manufacturer: pickFirstString(manufacturer.manufacturer_id, manufacturer.brandName),
    pipeline_version: OSA_PIPELINE_VERSION,
    generation_timestamp: timestamp,
    human_overrides: humanOverrides,
    gates: {
      g1: gates.g1 ?? null,
      g3: gates.g3 ?? null,
    },
    complete: isComplete,
    missing_fields: uniqueMissing,
    validation_errors: validation.errors,
  });

  // Restore gate nulls explicitly as empty objects avoided — Phase #4 expects null gates slots.
  audit.gates = {
    g1: gates.g1 ?? null,
    g3: gates.g3 ?? null,
  };

  return {
    ok: isComplete,
    specification: {
      // Phase #9 package fields (flat, production-ready)
      ...specificationPackage,
      provenance,
      // Phase #4–#8 compatibility
      vision,
      product,
      placement,
    },
    estimate: {
      line_items: lineItems,
      line: estimateLine,
    },
    audit,
    missing_fields: uniqueMissing,
    DesignerSummary: buildDesignerSummary({
      ok: isComplete,
      specification: specificationPackage,
      estimate: {
        line_items: lineItems,
        line: estimateLine,
      },
      missing_fields: uniqueMissing,
      product,
    }),
  };
}

/**
 * Partial assembly for needs_human / live failure paths.
 */
export function assemblePartialSpecification(input = {}) {
  return assembleSpecification({
    ...input,
    partial: true,
  });
}
