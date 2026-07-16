import { storeVisualMemoryResult } from "../../../../lib/memory/storeVisualMemoryResult";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = storeVisualMemoryResult({
      vision: body?.vision,
      product: body?.product,
      manufacturer: body?.manufacturer || {
        manufacturer_id: body?.manufacturer_id,
        catalog_url: body?.catalog_url,
      },
      manufacturer_id: body?.manufacturer_id,
      match_type: body?.match_type,
    });

    if (!result.ok) {
      return Response.json(result, { status: 400 });
    }

    return Response.json({
      ok: true,
      record: result.record,
    });
  } catch (error) {
    console.error("[osa/memory/store]", error);
    const message = error instanceof Error ? error.message : "Visual memory store failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
