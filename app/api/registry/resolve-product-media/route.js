import { resolveModeluxProductMedia } from "../../../lib/registry/resolveModeluxProductMedia";

function isModeluxBrand(brandName) {
  return /моделюкс|modelux/i.test(String(brandName || ""));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const brandName = typeof body?.brandName === "string" ? body.brandName.trim() : "";
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return Response.json({ ok: false, error: "items array is required." }, { status: 400 });
    }

    if (!isModeluxBrand(brandName)) {
      return Response.json(
        { ok: false, error: "MVP product media resolver supports MODELUX only." },
        { status: 400 },
      );
    }

    const limit = Math.min(items.length, 5);
    const slice = items.slice(0, limit);

    const enriched = await Promise.all(
      slice.map(async (item) => {
        const article = typeof item?.article === "string" ? item.article.trim() : "";
        const productName = typeof item?.productName === "string" ? item.productName.trim() : "";
        const media = await resolveModeluxProductMedia({ article, productName, brandName });
        return {
          article,
          productName,
          ...media,
        };
      }),
    );

    return Response.json({
      ok: true,
      brandName,
      items: enriched,
      enrichedCount: enriched.filter((entry) => Boolean(entry.imageUrl)).length,
    });
  } catch (error) {
    console.error("[registry/resolve-product-media]", error);
    const message = error instanceof Error ? error.message : "Product media resolve failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
