import { isLightingCategoryId } from "../../../lib/registry/categorySkuKeywords";
import { resolveSkuFromRegistry } from "../../../lib/registry/resolveSkuFromRegistry";

export async function POST(request) {
  try {
    const body = await request.json();
    const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";
    const brandName = typeof body?.brandName === "string" ? body.brandName.trim() : "";

    if (!categoryId || !brandName) {
      return Response.json(
        { ok: false, error: "categoryId and brandName are required." },
        { status: 400 },
      );
    }

    if (!isLightingCategoryId(categoryId)) {
      return Response.json(
        { ok: false, error: "MVP resolver supports lighting categories only." },
        { status: 400 },
      );
    }

    const result = await resolveSkuFromRegistry({
      categoryId,
      brandName,
      limit: 5,
    });

    if (!result.ok) {
      return Response.json(result, { status: result.error?.includes("not found") ? 404 : 502 });
    }

    return Response.json(result);
  } catch (error) {
    console.error("[registry/resolve-sku]", error);
    const message = error instanceof Error ? error.message : "SKU resolve failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
