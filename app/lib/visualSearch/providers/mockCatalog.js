/**
 * Server-safe Modelux catalog fetch (shared by MockProvider and API route pattern).
 */

import {
  fetchRegistrySupplierCatalogProducts,
  resolveModeluxCatalogUrl,
  MODELUX_PENDANTS_CATALOG_URL,
} from "../../registry/fetchRegistryVisualCatalog";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableId(prefix, index, seed = "") {
  return `${prefix}-${index}-${asString(seed).slice(0, 48) || "item"}`;
}

/**
 * @returns {Promise<Array<{ productName: string, productUrl: string, imageUrl: string|null }>>}
 */
export async function fetchModeluxCatalogProducts({ registryCategoryId } = {}) {
  const resolvedRegistryCategory = asString(registryCategoryId) || null;
  const isFloorLampRoute = resolvedRegistryCategory === "lighting.floor_lamps";

  const { products, path, error } = await fetchRegistrySupplierCatalogProducts({
    registryCategoryId,
    limit: 24,
  });

  if (isFloorLampRoute) {
    const imageCount = products.filter((row) => Boolean(row?.imageUrl)).length;
    console.log("[FLOOR-LAMP-CATALOG]", {
      registryCategory: resolvedRegistryCategory,
      catalogUrl: resolveModeluxCatalogUrl(registryCategoryId) || MODELUX_PENDANTS_CATALOG_URL,
      registryPath: path,
      productCount: products.length,
      imageCount,
      error: error || null,
      firstTitles: products.slice(0, 5).map((row) => row.productName),
    });
  }

  return products.map(({ productName, productUrl, imageUrl }) => ({
    productName,
    productUrl,
    imageUrl: imageUrl || null,
  }));
}

/**
 * Synthetic internet stand-ins — only when registry returns zero products.
 */
export function buildSyntheticMockResults(searchQuery, limit = 12) {
  const q = searchQuery?.primary || searchQuery?.ru || "";
  if (!q) return [];
  const tokens = q.split(/\s+/).slice(0, 4).join(" ");
  const templates = [
    { brand: "Analog Studio", score: 62 },
    { brand: "Reference Light", score: 58 },
  ];

  console.warn("[REGISTRY-CATALOG] synthetic fallback engaged", {
    registryCategoryId: searchQuery?.registryCategoryId || null,
    query: tokens,
  });

  return templates.slice(0, Math.max(1, limit)).map((item, index) => ({
    id: stableId("mock", index, tokens),
    title: `${tokens} — визуальный аналог ${String.fromCharCode(65 + index)}`,
    brand: item.brand,
    model: "",
    imageUrl: null,
    sourceUrl: "",
    price: 0,
    visualMatchScore: item.score,
    providerMeta: { provider: "mock", synthetic: true, source: "synthetic_fallback" },
  }));
}

function mapRegistryRowsToMockResults(catalogRows, limit) {
  return catalogRows.slice(0, limit).map((row, index) => ({
    id: stableId("mock-catalog", index, row.productUrl),
    title: row.productName,
    brand: inferBrandFromTitle(row.productName),
    model: asString(row.sku) || "",
    imageUrl: row.imageUrl || null,
    sourceUrl: row.productUrl,
    price: Number(row.price) || 0,
    visualMatchScore: 0,
    providerMeta: {
      provider: "mock",
      synthetic: false,
      source: row.source || "modelux_registry_catalog",
    },
  }));
}

/**
 * Registry-first mock discovery.
 */
export async function discoverMockRawResults(searchQuery, { limit = 12 } = {}) {
  const registryCategoryId = searchQuery?.registryCategoryId || null;

  console.log("[REGISTRY-CATALOG] discoverMockRawResults input", {
    registryCategoryId,
    limit,
    query: searchQuery?.primary || searchQuery?.ru || "",
  });

  const { products, path, error } = await fetchRegistrySupplierCatalogProducts({
    registryCategoryId,
    limit,
  });

  if (products.length) {
    const mapped = mapRegistryRowsToMockResults(products, limit);
    console.log("[REGISTRY-CATALOG] discoverMockRawResults output", {
      count: mapped.length,
      path,
      first3: mapped.slice(0, 3).map((r) => ({ brand: r.brand, title: r.title, sku: r.model })),
    });
    return mapped;
  }

  console.warn("[REGISTRY-CATALOG] discoverMockRawResults registry empty", {
    registryCategoryId,
    path,
    error,
  });

  return buildSyntheticMockResults(searchQuery, limit);
}

function inferBrandFromTitle(title) {
  const text = asString(title);
  if (!text) return "—";
  if (/modelux|modelight|modemodern/i.test(text)) return "MODELUX";
  const first = text.split(/\s+/)[0];
  return first && first.length <= 18 ? first : "—";
}
