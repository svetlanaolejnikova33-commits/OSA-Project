import {
  MODELUX_FLOOR_LAMPS_CATALOG_URL,
  MODELUX_PENDANTS_CATALOG_URL,
  MODELUX_WALL_SCONCES_CATALOG_URL,
  fetchRegistrySupplierCatalogProducts,
  resolveModeluxCatalogUrl,
} from "../../../lib/registry/fetchRegistryVisualCatalog";
import { parseModeluxCatalogHtml } from "../../../lib/registry/parseModeluxCatalogHtml";

export const dynamic = "force-dynamic";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
};

const CATEGORY_URLS = {
  "lighting.pendants": MODELUX_PENDANTS_CATALOG_URL,
  "lighting.floor_lamps": MODELUX_FLOOR_LAMPS_CATALOG_URL,
  "lighting.wall_sconces": MODELUX_WALL_SCONCES_CATALOG_URL,
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const registryCategoryId = (searchParams.get("registryCategoryId") || "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 24, 1), 48);

    const { products, path, error } = await fetchRegistrySupplierCatalogProducts({
      registryCategoryId: registryCategoryId || "lighting.pendants",
      limit,
    });

    const resolvedCategoryId = registryCategoryId || "lighting.pendants";

    if (products.length) {
      return Response.json({
        ok: true,
        registryCategoryId: resolvedCategoryId,
        catalogUrl: resolveModeluxCatalogUrl(resolvedCategoryId) || CATEGORY_URLS["lighting.pendants"],
        registryPath: path,
        products: products.map(({ productName, productUrl, imageUrl, sku }) => ({
          productName,
          productUrl,
          imageUrl: imageUrl || null,
          sku: sku || "",
        })),
        productCount: products.length,
      });
    }

    return Response.json(
      {
        ok: false,
        registryCategoryId: registryCategoryId || null,
        registryPath: path,
        error: error || "No registry catalog products found.",
        products: [],
        productCount: 0,
      },
      { status: products.length ? 200 : 502 },
    );
  } catch (error) {
    console.error("[registry/modelux-catalog]", error);
    const message = error instanceof Error ? error.message : "Modelux catalog fetch failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

// Legacy direct HTML fetch kept for diagnostics only (unused by GET handler).
export { parseModeluxCatalogHtml, FETCH_HEADERS };
