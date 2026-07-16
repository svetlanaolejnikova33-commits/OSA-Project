import { getAllSupplierBrands } from "../supplierSourcesRegistry";
import { MODELUX_PENDANTS_CATALOG_URL } from "../registry/fetchRegistryVisualCatalog";

const MODELUX_SITE = "https://modelux.ru";

/**
 * Extra catalog URL resolution for manufacturers present in OSA product flows
 * but not yet listed as a full SUPPLIER_SOURCES supplier row.
 * Does not mutate registry architecture — binding overlay only.
 */
const CATALOG_URL_OVERLAY = Object.freeze({
  modelux: MODELUX_PENDANTS_CATALOG_URL || `${MODELUX_SITE}/catalog/podvesnye-svetilniki`,
});

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeManufacturerId(value) {
  return asString(value).toLowerCase().replace(/\s+/g, "_");
}

/**
 * Resolve manufacturer_id → catalog binding from existing registry (+ overlay).
 *
 * @param {string} manufacturerId
 * @returns {{
 *   manufacturer_id: string,
 *   brandName: string,
 *   catalog_url: string,
 *   categoryIds: string[],
 *   status: string,
 *   supplierId: string | null,
 *   website: string,
 * } | null}
 */
export function resolveManufacturerCatalog(manufacturerId) {
  const id = normalizeManufacturerId(manufacturerId);
  if (!id) return null;

  const brands = getAllSupplierBrands();
  const brand =
    brands.find((entry) => normalizeManufacturerId(entry.id) === id) ||
    brands.find((entry) => normalizeManufacturerId(entry.supplierId) === id) ||
    brands.find((entry) => normalizeManufacturerId(entry.brandName) === id);

  if (brand) {
    const overlayUrl = CATALOG_URL_OVERLAY[id] || "";
    const catalogUrl = firstUrl(
      overlayUrl,
      brand.website,
      brand.sourceLinks?.collections,
      brand.sourceLinks?.priceList,
    );
    if (!catalogUrl) return null;

    return {
      manufacturer_id: normalizeManufacturerId(brand.id) || id,
      brandName: asString(brand.brandName) || id,
      catalog_url: catalogUrl,
      categoryIds: Array.isArray(brand.categoryIds) ? brand.categoryIds : [],
      status: asString(brand.status) || "active",
      supplierId: asString(brand.supplierId) || null,
      website: asString(brand.website),
    };
  }

  if (id === "modelux") {
    return {
      manufacturer_id: "modelux",
      brandName: "Modelux",
      catalog_url: CATALOG_URL_OVERLAY.modelux,
      categoryIds: ["lighting", "lighting.pendants", "lighting.floor_lamps"],
      status: "active",
      supplierId: null,
      website: MODELUX_SITE,
    };
  }

  return null;
}

function firstUrl(...values) {
  for (const value of values) {
    const text = asString(value);
    if (text && /^https?:\/\//i.test(text)) return text;
  }
  return "";
}
