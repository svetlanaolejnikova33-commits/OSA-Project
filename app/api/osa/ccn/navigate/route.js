import { runChiefCatalogNavigator } from "../../../../lib/ccn/chiefCatalogNavigator";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = runChiefCatalogNavigator({
      vision: body?.vision,
      manufacturer_id: body?.manufacturer_id,
      catalog_url: body?.catalog_url,
    });

    const status =
      result.gate?.decision === "fail" && result.error && /validation|Unknown manufacturer/i.test(result.error)
        ? 400
        : 200;

    return Response.json(result, { status });
  } catch (error) {
    console.error("[osa/ccn/navigate]", error);
    const message = error instanceof Error ? error.message : "CCN navigation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
