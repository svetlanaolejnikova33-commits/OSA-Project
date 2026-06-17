/**
 * Server-safe Modelux catalog fetch (shared by MockProvider and API route pattern).
 */

import {
  MODELUX_FLOOR_LAMPS_CATALOG_URL,
  MODELUX_PENDANTS_CATALOG_URL,
  parseModeluxCatalogHtml,
} from "../../registry/parseModeluxCatalogHtml";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
};

const MODELUX_CATALOG_BY_REGISTRY_CATEGORY = {
  "lighting.pendants": MODELUX_PENDANTS_CATALOG_URL,
  "lighting.floor_lamps": MODELUX_FLOOR_LAMPS_CATALOG_URL,
};

function resolveModeluxCatalogUrl(registryCategoryId) {
  const id = asString(registryCategoryId);
  return MODELUX_CATALOG_BY_REGISTRY_CATEGORY[id] || null;
}

/**
 * @returns {Promise<Array<{ productName: string, productUrl: string, imageUrl: string|null }>>}
 */
export async function fetchModeluxCatalogProducts({ registryCategoryId } = {}) {
  const resolvedRegistryCategory = asString(registryCategoryId) || null;
  const catalogUrl =
    resolveModeluxCatalogUrl(registryCategoryId) || MODELUX_PENDANTS_CATALOG_URL;
  const isFloorLampRoute = resolvedRegistryCategory === "lighting.floor_lamps";

  let httpStatus = 0;
  let products = [];

  try {
    const response = await fetch(catalogUrl, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      next: { revalidate: 3600 },
    });
    httpStatus = response.status;

    if (!response.ok) {
      throw new Error(`Modelux catalog fetch failed with status ${response.status}.`);
    }

    const html = await response.text();
    products = parseModeluxCatalogHtml(html, response.url || catalogUrl);
  } finally {
    if (isFloorLampRoute) {
      const imageCount = products.filter((row) => Boolean(row?.imageUrl)).length;
      const diagnostic = {
        registryCategory: resolvedRegistryCategory,
        catalogUrl,
        httpStatus,
        productCount: products.length,
        imageCount,
        firstTitles: products.slice(0, 5).map((row) => row.productName),
        firstImageUrls: products.slice(0, 5).map((row) => row.imageUrl || null),
      };
      console.log("[FLOOR-LAMP-CATALOG]", {
        registryCategory: diagnostic.registryCategory,
        catalogUrl: diagnostic.catalogUrl,
        httpStatus: diagnostic.httpStatus,
        productCount: diagnostic.productCount,
        imageCount: diagnostic.imageCount,
      });
      console.log("[FLOOR-LAMP-CATALOG] firstTitles:", diagnostic.firstTitles);
      console.log("[FLOOR-LAMP-CATALOG] firstImageUrls:", diagnostic.firstImageUrls);
    }
  }

  return products;
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableId(prefix, index, seed = "") {
  return `${prefix}-${index}-${asString(seed).slice(0, 48) || "item"}`;
}

/**
 * Synthetic internet stand-ins when catalog is unavailable.
 */
export function buildSyntheticMockResults(searchQuery, limit = 12) {
  const q = searchQuery?.primary || searchQuery?.ru || "";
  if (!q) return [];
  const category = searchQuery?.category || "Освещение";
  const tokens = q.split(/\s+/).slice(0, 4).join(" ");
  const templates = [
    { brand: "Analog Studio", score: 62 },
    { brand: "Reference Light", score: 58 },
  ];

  return templates.slice(0, Math.max(1, limit)).map((item, index) => ({
    id: stableId("mock", index, tokens),
    title: `${tokens} — визуальный аналог ${String.fromCharCode(65 + index)}`,
    brand: item.brand,
    model: "",
    imageUrl: null,
    sourceUrl: "",
    price: 0,
    visualMatchScore: item.score,
    providerMeta: { provider: "mock", synthetic: true },
  }));
}

/**
 * Catalog-first mock discovery (preserves pre-5J.3B behavior).
 */
export async function discoverMockRawResults(searchQuery, { limit = 12 } = {}) {
  try {
    const catalogRows = await fetchModeluxCatalogProducts({
      registryCategoryId: searchQuery?.registryCategoryId,
    });
    if (catalogRows.length) {
      return catalogRows.slice(0, limit).map((row, index) => ({
        id: stableId("mock-catalog", index, row.productUrl),
        title: row.productName,
        brand: inferBrandFromTitle(row.productName),
        model: "",
        imageUrl: row.imageUrl || null,
        sourceUrl: row.productUrl,
        price: 0,
        visualMatchScore: 0,
        providerMeta: { provider: "mock", source: "modelux_catalog" },
      }));
    }
  } catch (error) {
    console.warn("OSA: mock visual catalog fetch failed", error);
  }

  return buildSyntheticMockResults(searchQuery, limit);
}

function inferBrandFromTitle(title) {
  const text = asString(title);
  if (!text) return "—";
  if (/modelux|modelight/i.test(text)) return "MODELUX";
  const first = text.split(/\s+/)[0];
  return first && first.length <= 18 ? first : "—";
}
