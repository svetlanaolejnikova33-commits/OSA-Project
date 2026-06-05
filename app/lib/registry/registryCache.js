/**
 * In-memory registry cache (MVP v0). Server process only.
 */

let cache = {
  manufacturers: [],
  supplierSources: [],
  syncedAt: null,
  sheetName: null,
  source: null,
  skipped: 0,
};

function buildUpdatePolicy() {
  return {
    updateFrequency: "manual",
    hasArchive: false,
    archiveStrategy: "none",
    notes: "Synced from Google Sheets (read-only MVP v0).",
  };
}

function toBrandRecord(manufacturer) {
  return {
    id: manufacturer.id,
    brandName: manufacturer.brandName,
    categoryIds: manufacturer.categoryIds,
    segment: manufacturer.segment,
    sourceLinks: manufacturer.sourceLinks,
    updatePolicy: buildUpdatePolicy(),
    status: manufacturer.status,
    notes: manufacturer.dealer ? `Дилер: ${manufacturer.dealer}` : "",
  };
}

function toSupplierRecord(manufacturer) {
  return {
    id: manufacturer.id,
    supplierName: manufacturer.supplierName,
    country: manufacturer.country || "",
    website: manufacturer.website || "",
    brands: [toBrandRecord(manufacturer)],
  };
}

export function setRegistryCache(payload) {
  const manufacturers = Array.isArray(payload?.manufacturers) ? payload.manufacturers : [];
  cache = {
    manufacturers,
    supplierSources: manufacturers.map(toSupplierRecord),
    syncedAt: payload?.syncedAt || new Date().toISOString(),
    sheetName: payload?.sheetName || null,
    source: payload?.source || null,
    skipped: payload?.skipped || 0,
  };
  return getRegistryCacheSnapshot();
}

export function getRegistryCacheSnapshot() {
  return {
    ...cache,
    count: cache.manufacturers.length,
  };
}

export function getRegistrySupplierSources() {
  return cache.supplierSources.length ? cache.supplierSources : null;
}

export function hasRegistryCache() {
  return cache.supplierSources.length > 0;
}
