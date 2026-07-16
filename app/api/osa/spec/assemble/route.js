import { assembleSpecification } from "../../../../lib/spec/specAssembler";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = assembleSpecification({
      vision: body?.vision,
      product: body?.product,
      manufacturer: body?.manufacturer,
      placement: body?.placement,
      gates: body?.gates,
      human_overrides: body?.human_overrides,
      memory: body?.memory,
      livePath: Boolean(body?.livePath),
      partial: Boolean(body?.partial),
    });

    return Response.json(result);
  } catch (error) {
    console.error("[osa/spec/assemble]", error);
    const message = error instanceof Error ? error.message : "Spec assembly failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
