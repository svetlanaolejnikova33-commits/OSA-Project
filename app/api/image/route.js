import OpenAI from "openai";

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const body = await request.json();
    const prompt = safeString(body?.prompt);
    const rd = body?.resultData;

    if (!prompt) return Response.json({ error: "Prompt is required." }, { status: 400 });
    if (!rd || typeof rd !== "object") {
      return Response.json({ error: "resultData is required." }, { status: 400 });
    }

    const style = safeString(rd?.style);
    const mood = safeString(rd?.mood);
    const palette = rd?.palette || {};
    const paletteBase = safeString(palette?.base);
    const paletteAccent = safeString(palette?.accent);
    const paletteContrast = safeString(palette?.contrast);
    const materials = Array.isArray(rd?.materials) ? rd.materials.map((m) => safeString(String(m))).filter(Boolean) : [];
    const concept = rd?.concept || {};
    const planning = safeString(concept?.planning);
    const lighting = safeString(concept?.lighting);
    const conceptMaterials = safeString(concept?.materials);
    const accents = safeString(concept?.accents);
    const storage = safeString(concept?.storage);

    const promptUsed = [
      "Photorealistic interior render, premium design, natural materials, high detail, soft natural light.",
      "No text, no watermark, no logos.",
      `User brief: ${prompt}`,
      style ? `Style: ${style}` : "",
      mood ? `Mood: ${mood}` : "",
      paletteBase || paletteAccent || paletteContrast
        ? `Palette: base=${paletteBase || "—"}, accent=${paletteAccent || "—"}, contrast=${paletteContrast || "—"}`
        : "",
      materials.length ? `Key materials: ${materials.join(", ")}` : "",
      planning ? `Planning: ${planning}` : "",
      lighting ? `Lighting: ${lighting}` : "",
      conceptMaterials ? `Material strategy: ${conceptMaterials}` : "",
      accents ? `Accents: ${accents}` : "",
      storage ? `Storage: ${storage}` : "",
      "Camera: eye-level, 24–28mm, balanced composition, modern premium editorial look.",
    ]
      .filter(Boolean)
      .join("\n");

    const image = await openai.images.generate({
      model: "gpt-image-1",
      prompt: promptUsed,
      size: "1024x1024",
    });

    const imageBase64 = image?.data?.[0]?.b64_json;
    if (!imageBase64) {
      return Response.json({ error: "Image generation returned empty result." }, { status: 502 });
    }

    return Response.json({ imageBase64, promptUsed });
  } catch (error) {
    console.error("Image API error:", error);
    return Response.json({ error: "Failed to generate image." }, { status: 500 });
  }
}
