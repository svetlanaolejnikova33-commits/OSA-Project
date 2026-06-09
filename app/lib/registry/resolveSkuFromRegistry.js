import { getSkuFilterKeywords } from "./categorySkuKeywords";
import { parseModeluxStockXml } from "./parseModeluxStockXml";
import {
  findManufacturerByBrandName,
  getRegistryCacheSnapshot,
  hasRegistryCache,
} from "./registryCache";
import { syncLightingTab } from "./syncLightingTab";

function unwrapRedirectUrl(url) {
  try {
    const parsed = new URL(url);
    if (/vk\.com$/i.test(parsed.hostname) && parsed.searchParams.get("to")) {
      return decodeURIComponent(parsed.searchParams.get("to"));
    }
  } catch {
    /* ignore */
  }
  return url;
}

function isXmlPriceListUrl(url) {
  const value = String(url || "").toLowerCase();
  return value.includes(".xml") || value.includes("stock.xml");
}

async function ensureRegistryLoaded() {
  if (!hasRegistryCache()) {
    await syncLightingTab();
  }
  return getRegistryCacheSnapshot();
}

/**
 * On-demand SKU resolve from manufacturer priceList URL (no catalog import).
 */
export async function resolveSkuFromRegistry({ categoryId, brandName, limit = 5 } = {}) {
  const catId = typeof categoryId === "string" ? categoryId.trim() : "";
  const brand = typeof brandName === "string" ? brandName.trim() : "";

  if (!catId || !brand) {
    return { ok: false, error: "categoryId and brandName are required." };
  }

  await ensureRegistryLoaded();

  const manufacturer = findManufacturerByBrandName(brand);
  if (!manufacturer) {
    return { ok: false, error: `Manufacturer not found for brand: ${brand}` };
  }

  const rawPriceListUrl = manufacturer?.sourceLinks?.priceList || "";
  const priceListUrl = unwrapRedirectUrl(String(rawPriceListUrl).trim());

  if (!priceListUrl || !/^https?:\/\//i.test(priceListUrl)) {
    return { ok: false, error: "No priceList URL for manufacturer." };
  }

  if (!isXmlPriceListUrl(priceListUrl)) {
    return {
      ok: false,
      error: "MVP resolver supports XML priceList only (Modelux stock.xml).",
      sourceUrl: priceListUrl,
    };
  }

  const response = await fetch(priceListUrl, {
    headers: { "User-Agent": "OSA-Registry-Resolver/1.0" },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      error: `Failed to fetch priceList: HTTP ${response.status}`,
      sourceUrl: priceListUrl,
    };
  }

  const xmlText = await response.text();
  const keywords = getSkuFilterKeywords(catId);
  const items = parseModeluxStockXml(xmlText, { keywords, limit });

  return {
    ok: true,
    brandName: manufacturer.brandName,
    categoryId: catId,
    sourceUrl: priceListUrl,
    sourceType: "xml",
    items,
    itemCount: items.length,
  };
}
