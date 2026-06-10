import {
  MODELUX_PENDANTS_CATALOG_URL,
  parseModeluxCatalogHtml,
} from "../../../lib/registry/parseModeluxCatalogHtml";

export const dynamic = "force-dynamic";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
};

export async function GET() {
  try {
    const response = await fetch(MODELUX_PENDANTS_CATALOG_URL, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return Response.json(
        { ok: false, error: `Modelux catalog fetch failed with status ${response.status}.` },
        { status: 502 },
      );
    }

    const html = await response.text();
    const products = parseModeluxCatalogHtml(html, response.url || MODELUX_PENDANTS_CATALOG_URL);

    return Response.json({
      ok: true,
      catalogUrl: response.url || MODELUX_PENDANTS_CATALOG_URL,
      products,
      productCount: products.length,
    });
  } catch (error) {
    console.error("[registry/modelux-catalog]", error);
    const message = error instanceof Error ? error.message : "Modelux catalog fetch failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
