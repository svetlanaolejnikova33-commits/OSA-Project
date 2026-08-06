import { getAllSupplierBrands } from "../supplierSourcesRegistry";
import { getRegistryCacheSnapshot } from "./registryCache";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  return asString(value).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "_").replace(/^_|_$/g, "");
}

function normalizeText(value) {
  return asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostname(value) {
  const raw = asString(value);
  if (!raw) return "";
  try {
    const url = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function officialUrl(value) {
  const url = asString(value);
  if (!/^https?:\/\//i.test(url)) return "";
  const host = hostname(url);
  if (!host || host === "example.com" || host.endsWith(".example.com")) return "";
  return url;
}

function sanitizeCategoryCatalogs(value) {
  const result = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, url] of Object.entries(value)) {
    const normalizedUrl = officialUrl(url);
    if (asString(key) && normalizedUrl) result[asString(key)] = normalizedUrl;
  }
  return result;
}

/** Normalize static SUPPLIER_SOURCES rows and runtime Google Sheets rows to one read shape. */
export function normalizeManufacturerRegistryRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const manufacturerId = normalizeId(raw.manufacturer_id || raw.id || raw.supplierId || raw.brandName);
  const brandName = asString(raw.brandName || raw.supplierName);
  if (!manufacturerId || !brandName) return null;

  const sourceLinks = raw.sourceLinks && typeof raw.sourceLinks === "object" ? raw.sourceLinks : {};
  const website = officialUrl(raw.website);
  const categoryCatalogs = sanitizeCategoryCatalogs(sourceLinks.categoryCatalogs);
  const sources = {
    website,
    catalog: officialUrl(sourceLinks.collections) || website,
    catalog_pdf: officialUrl(sourceLinks.catalogPdf),
    price_list: officialUrl(sourceLinks.priceList),
    media: officialUrl(sourceLinks.mediaLibrary),
    technical: officialUrl(sourceLinks.technicalData),
    bim: officialUrl(sourceLinks.bim),
    models_3d: officialUrl(sourceLinks.models3d),
    api: officialUrl(sourceLinks.api),
    category_catalogs: categoryCatalogs,
  };
  const allowedDomains = [...new Set([
    sources.website,
    sources.catalog,
    sources.catalog_pdf,
    sources.price_list,
    sources.media,
    sources.technical,
    sources.bim,
    sources.models_3d,
    sources.api,
    ...Object.values(categoryCatalogs),
  ].map(hostname).filter(Boolean))];

  return Object.freeze({
    manufacturer_id: manufacturerId,
    brandName,
    aliases: [...new Set([brandName, manufacturerId, ...asArray(raw.aliases)].map(asString).filter(Boolean))],
    supplierId: asString(raw.supplierId || raw.id) || null,
    supplierName: asString(raw.supplierName) || brandName,
    country: asString(raw.country),
    segment: asString(raw.segment),
    status: asString(raw.status) || "active",
    categoryIds: asArray(raw.categoryIds).map(asString).filter(Boolean),
    website: sources.website,
    catalog_url: sources.catalog,
    allowed_domains: allowedDomains,
    sources: Object.freeze(sources),
  });
}

function staticRecords() {
  const staticRows = getAllSupplierBrands();
  const runtimeRows = asArray(getRegistryCacheSnapshot()?.manufacturers);
  const records = [...staticRows, ...runtimeRows]
    .map(normalizeManufacturerRegistryRecord)
    .filter(Boolean);
  const byId = new Map();
  for (const record of records) {
    if (!byId.has(record.manufacturer_id)) byId.set(record.manufacturer_id, record);
  }
  return [...byId.values()];
}

export function listManufacturerRegistry() {
  return staticRecords();
}

export function resolveManufacturer(manufacturerIdOrAlias) {
  const needleId = normalizeId(manufacturerIdOrAlias);
  const needleText = normalizeText(manufacturerIdOrAlias);
  if (!needleId && !needleText) return null;
  return staticRecords().find((record) =>
    record.manufacturer_id === needleId ||
    record.aliases.some((alias) => normalizeId(alias) === needleId || normalizeText(alias) === needleText)
  ) || null;
}

export function resolveManufacturerByDomain(domainOrUrl) {
  const host = hostname(domainOrUrl);
  if (!host) return null;
  return staticRecords().find((record) =>
    record.allowed_domains.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  ) || null;
}

export function resolveManufacturerFromText(value) {
  const haystack = ` ${normalizeText(value)} `;
  if (!haystack.trim()) return null;
  return staticRecords().find((record) => record.aliases.some((alias) => {
    const token = normalizeText(alias);
    return token.length >= 3 && haystack.includes(` ${token} `);
  })) || null;
}

export function getOfficialSourceBinding(manufacturerOrRow) {
  return typeof manufacturerOrRow === "string"
    ? resolveManufacturer(manufacturerOrRow)
    : normalizeManufacturerRegistryRecord(manufacturerOrRow);
}

export function resolveOfficialCatalogUrl(manufacturerOrBinding, categoryKey = "") {
  const binding = typeof manufacturerOrBinding === "string"
    ? resolveManufacturer(manufacturerOrBinding)
    : manufacturerOrBinding;
  if (!binding) return "";
  const key = asString(categoryKey);
  return binding.sources?.category_catalogs?.[key] || binding.catalog_url || "";
}

export function isOfficialManufacturerUrl(manufacturerOrBinding, url) {
  const binding = typeof manufacturerOrBinding === "string"
    ? resolveManufacturer(manufacturerOrBinding)
    : manufacturerOrBinding;
  const host = hostname(url);
  return Boolean(binding && host && binding.allowed_domains?.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  ));
}
