import { searchVisualMemory } from "../../../../lib/memory/fingerprintMatcher";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = searchVisualMemory(body?.vision, {
      manufacturer_id: body?.manufacturer_id,
      limit: body?.limit,
    });

    if (!result.ok) {
      return Response.json(result, { status: 400 });
    }

    return Response.json({
      candidates: result.candidates,
    });
  } catch (error) {
    console.error("[osa/memory/search]", error);
    const message = error instanceof Error ? error.message : "Visual memory search failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
