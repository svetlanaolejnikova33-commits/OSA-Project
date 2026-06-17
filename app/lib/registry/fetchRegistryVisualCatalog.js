/**
 * Registry-backed Modelux catalog access for visual discovery.
 * HTML catalog first, then Google Sheets → stock.xml fallback.
 */

import {
  MODELUX_FLOOR_LAMPS_CATALOG_URL,
  MODELUX_PENDANTS_CATALOG_URL,
  parseModeluxCatalogHtml,
} from "./parseModeluxCatalogHtml";
import { resolveSkuFromRegistry } from "./resolveSkuFromRegistry";
import { Agent, fetch as undiciFetch } from "undici";

export { MODELUX_FLOOR_LAMPS_CATALOG_URL, MODELUX_PENDANTS_CATALOG_URL };

const MODELUX_SITE = "https://modelux.ru";
export const MODELUX_WALL_SCONCES_CATALOG_URL = `${MODELUX_SITE}/catalog/bra`;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
};

const MODELUX_UNDICI_CONNECT_TIMEOUT_MS = 45000;
const MODELUX_UNDICI_HEADERS_TIMEOUT_MS = 60000;
const MODELUX_UNDICI_BODY_TIMEOUT_MS = 60000;
const MODELUX_FETCH_ABORT_TIMEOUT_MS = 60000;

const MODELUX_UNDICI_AGENT = new Agent({
  connectTimeout: MODELUX_UNDICI_CONNECT_TIMEOUT_MS,
  headersTimeout: MODELUX_UNDICI_HEADERS_TIMEOUT_MS,
  bodyTimeout: MODELUX_UNDICI_BODY_TIMEOUT_MS,
});

const MODELUX_CATALOG_BY_REGISTRY_CATEGORY = {
  "lighting.pendants": MODELUX_PENDANTS_CATALOG_URL,
  "lighting.floor_lamps": MODELUX_FLOOR_LAMPS_CATALOG_URL,
  "lighting.wall_sconces": MODELUX_WALL_SCONCES_CATALOG_URL,
};

const MODELUX_BRAND_CANDIDATES = ["MODELUX", "МОДЕЛЮКС", "Modelux", "Modelight"];

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveModeluxCatalogUrl(registryCategoryId) {
  const id = asString(registryCategoryId);
  return MODELUX_CATALOG_BY_REGISTRY_CATEGORY[id] || null;
}

async function fetchHtmlWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODELUX_FETCH_ABORT_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await undiciFetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: controller.signal,
      dispatcher: MODELUX_UNDICI_AGENT,
    });
    const html = await response.text();
    console.log("[REGISTRY-CATALOG] undici fetch", {
      url,
      elapsedMs: Date.now() - startedAt,
      httpStatus: response.status,
      connectTimeoutMs: MODELUX_UNDICI_CONNECT_TIMEOUT_MS,
    });
    return { response, html };
  } catch (error) {
    console.log("[REGISTRY-CATALOG] undici fetch failed", {
      url,
      elapsedMs: Date.now() - startedAt,
      connectTimeoutMs: MODELUX_UNDICI_CONNECT_TIMEOUT_MS,
      error: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error && error.cause ? String(error.cause?.message || error.cause) : null,
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @returns {Promise<Array<{ productName: string, productUrl: string, imageUrl: string|null, sku?: string, source: string }>>}
 */
export async function fetchModeluxHtmlCatalogProducts({ registryCategoryId, limit = 24 } = {}) {
  const resolvedRegistryCategory = asString(registryCategoryId) || null;
  const catalogUrl =
    resolveModeluxCatalogUrl(registryCategoryId) || MODELUX_PENDANTS_CATALOG_URL;

  const { response, html } = await fetchHtmlWithTimeout(catalogUrl);
  if (!response.ok) {
    throw new Error(`Modelux HTML catalog failed with status ${response.status}.`);
  }

  const products = parseModeluxCatalogHtml(html, response.url || catalogUrl).map((row) => ({
    ...row,
    sku: extractSkuFromProductName(row.productName),
    source: "modelux_html_catalog",
  }));

  console.log("[REGISTRY-CATALOG] html", {
    registryCategoryId: resolvedRegistryCategory,
    catalogUrl,
    httpStatus: response.status,
    productCount: products.length,
    first3: products.slice(0, 3).map((p) => ({ title: p.productName, sku: p.sku, imageUrl: p.imageUrl })),
  });

  return products.slice(0, limit);
}

function extractSkuFromProductName(productName) {
  const text = asString(productName);
  const match = text.match(/\b([A-Z]{1,4}\d{2,}[A-Z]{0,3})\b/i);
  return match?.[1]?.toUpperCase() || "";
}

/**
 * Google Sheets registry → manufacturer priceList (stock.xml).
 */
export async function fetchModeluxStockRegistryProducts({ registryCategoryId, limit = 24 } = {}) {
  const categoryId = asString(registryCategoryId);
  if (!categoryId) return [];

  let lastError = null;
  for (const brandName of MODELUX_BRAND_CANDIDATES) {
    try {
      const result = await resolveSkuFromRegistry({ categoryId, brandName, limit });
      if (!result.ok) {
        lastError = result.error;
        continue;
      }
      const items = Array.isArray(result.items) ? result.items : [];
      if (!items.length) continue;

      const products = items.map((item) => ({
        productName: item.productName,
        productUrl: `${MODELUX_SITE}/catalog/?search=${encodeURIComponent(item.article)}`,
        imageUrl: null,
        sku: item.article,
        price: item.unitPrice,
        source: "modelux_stock_xml",
      }));

      console.log("[REGISTRY-CATALOG] stock.xml", {
        registryCategoryId: categoryId,
        brandName: result.brandName,
        sourceUrl: result.sourceUrl,
        productCount: products.length,
        first3: products.slice(0, 3).map((p) => ({ title: p.productName, sku: p.sku })),
      });

      return products;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  if (lastError) {
    console.warn("[REGISTRY-CATALOG] stock.xml unavailable", { registryCategoryId: categoryId, error: lastError });
  }
  return [];
}

/**
 * Combined registry supplier catalog: HTML then stock.xml.
 */
export async function fetchRegistrySupplierCatalogProducts({ registryCategoryId, limit = 24 } = {}) {
  const input = { registryCategoryId, limit };
  let htmlError = null;

  try {
    const htmlProducts = await fetchModeluxHtmlCatalogProducts(input);
    if (htmlProducts.length) {
      return { products: htmlProducts, path: "modelux_html_catalog", error: null };
    }
  } catch (error) {
    htmlError = error instanceof Error ? error.message : String(error);
    console.warn("[REGISTRY-CATALOG] HTML path failed", { registryCategoryId, error: htmlError });
  }

  try {
    const stockProducts = await fetchModeluxStockRegistryProducts(input);
    if (stockProducts.length) {
      return { products: stockProducts, path: "modelux_stock_xml", error: htmlError };
    }
  } catch (error) {
    const stockError = error instanceof Error ? error.message : String(error);
    console.warn("[REGISTRY-CATALOG] stock.xml path failed", { registryCategoryId, error: stockError });
    return { products: [], path: "none", error: htmlError || stockError };
  }

  return { products: [], path: "none", error: htmlError };
}
