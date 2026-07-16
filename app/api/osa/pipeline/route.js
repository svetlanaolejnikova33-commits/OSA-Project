import { runOsaPipeline } from "../../../lib/pipeline/osaPipeline";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await runOsaPipeline({
      vision: body?.vision,
      imageBase64: body?.imageBase64,
      mimeType: body?.mimeType,
      languageMode: body?.languageMode,
      analysisMode: body?.analysisMode,
      extractedPalette: body?.extractedPalette,
      manufacturer_id: body?.manufacturer_id,
      catalog_url: body?.catalog_url,
      placement: body?.placement,
      human_overrides: body?.human_overrides,
    });

    return Response.json(result);
  } catch (error) {
    console.error("[osa/pipeline]", error);
    const message = error instanceof Error ? error.message : "OSA pipeline failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
