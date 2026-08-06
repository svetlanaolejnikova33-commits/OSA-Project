import { createHash } from "crypto";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableId(prefix, ...parts) {
  return `${prefix}_${createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 20)}`;
}

export function buildProductIndex({ manufacturer_id, source_snapshot_id, products }) {
  const manufacturerId = text(manufacturer_id).toLowerCase();
  if (!manufacturerId || !text(source_snapshot_id)) throw new Error("Product Index requires Registry manufacturer and source snapshot.");
  const records = (Array.isArray(products) ? products : []).map((raw) => {
    const article = text(raw.article || raw.sku);
    const officialUrl = text(raw.official_url || raw.productUrl);
    if (!article || !officialUrl) return null;
    return Object.freeze({
      product_id: stableId("product", manufacturerId, article),
      manufacturer_id: manufacturerId,
      article,
      title: text(raw.title || raw.productName),
      official_url: officialUrl,
      price: Number.isFinite(Number(raw.price)) ? Number(raw.price) : null,
      currency: text(raw.currency) || null,
      source_snapshot_id: text(source_snapshot_id),
    });
  }).filter(Boolean);
  return Object.freeze({ schema_version: "osa.product-index.v1", records });
}

export function buildMediaIndex({ product_index, products }) {
  const raws = Array.isArray(products) ? products : [];
  const byArticle = new Map(raws.map((raw) => [text(raw.article || raw.sku), raw]));
  const records = product_index.records.map((product) => {
    const raw = byArticle.get(product.article) || {};
    const officialUrl = text(raw.image_url || raw.imageUrl);
    if (!officialUrl) return null;
    return Object.freeze({
      media_id: stableId("media", product.product_id, officialUrl),
      product_id: product.product_id,
      manufacturer_id: product.manufacturer_id,
      article: product.article,
      official_url: officialUrl,
      media_type: "image",
      source_snapshot_id: product.source_snapshot_id,
    });
  }).filter(Boolean);
  return Object.freeze({ schema_version: "osa.media-index.v1", records });
}

export { stableId };
