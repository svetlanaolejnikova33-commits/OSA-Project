import OpenAI from "openai";

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Keys must match client `ATMOSPHERE_KEYS`. */
const ATMOSPHERE_SPECS = {
  architectural_white: `Atmosphere — ARCHITECTURAL WHITE:
High-key, gallery-like clarity. Cool-neutral to neutral white balance, generous reflected light, minimal decorative noise.
Palette: true whites, pale gray, chalky plaster, matte pale stone; sharp plane separation.
Contrast: medium-high through geometry and shadow, not through warm filters.
Mood: calm, precise, museum-adjacent editorial.
Materials: honed stone, matte paint, pale oak or bleached wood in restrained use, steel or aluminum accents.
Styling: sparse, object-driven, strong negative space.`,

  soft_nordic: `Atmosphere — SOFT NORDIC:
Soft overcast northern daylight, airy and legible — not honey-toned or sunset-washed.
Palette: balanced cool-warm neutrals (gray-beige, misty sage, soft clay) without orange shift.
Contrast: soft, low-to-medium; readable depth via layering not harsh beams.
Mood: quiet, breathable, domestic calm without "cozy amber" grading.
Materials: light oak with natural grain (not orange stain), wool, linen, matte ceramics, light concrete.
Styling: tactile but restrained; organic forms with clean lines.`,

  gallery_calm: `Atmosphere — GALLERY CALM:
Even, diffuse architectural editorial light — like a calm exhibition space.
Palette: restrained neutrals, stone gray, warm-gray only in material truth (not lighting cast).
Contrast: controlled; shadows soft-edged; no dramatic golden rim light.
Mood: contemplative, ordered, hushed.
Materials: large-format stone or terrazzo, fine plaster, dark bronze accents sparingly, glass.
Styling: fewer pieces, strong proportion; art-ready walls without busy pattern.`,

  quiet_contrast: `Atmosphere — QUIET CONTRAST:
Daylight with clear light/shadow discipline — charcoal depth against pale surfaces, still neutrally balanced.
Palette: off-white and graphite, deep espresso wood (natural, not red-orange), blackened steel.
Contrast: medium-high monochrome contrast; no colored gel effect.
Mood: assertive but silent, architectural confidence.
Materials: dark oak or smoked veneer, honed dark stone, matte black metal, crisp textiles.
Styling: graphic lines, bold massing of furniture blocks, minimal ornament.`,

  graphite_poetry: `Atmosphere — GRAPHITE POETRY:
Overcast or softly directional daylight; moody but color-neutral — steel-gray ambience without brown haze.
Palette: graphite, blue-gray, concrete, dusty blue textiles; avoid sepia or copper haze in shadows.
Contrast: rich tonal range in luminance, not in orange warmth.
Mood: poetic, urban, introspective.
Materials: raw concrete, zinc, slate, charcoal textiles, smoked glass.
Styling: sculptural forms, asymmetric balance, subtle industrial craft.`,

  silver_mist: `Atmosphere — SILVER MIST:
Cool diffuse daylight, slightly metallic clarity — fresh and weightless.
Palette: silver-beige, pearl gray, icy limestone, pale brushed metal highlights.
Contrast: medium; separation via material specularity and misty depth, not warm bounce.
Mood: ethereal, refined, contemporary.
Materials: brushed nickel or stainless, pale stone, sheer textiles, glass, pale ash wood cool-toned.
Styling: light layers, reflective planes, floating volumes.`,

  warm_editorial: `Atmosphere — WARM EDITORIAL:
Editorial warmth through MATERIALS (terracotta, walnut, brass patina) — NOT through sunset light or orange color grade.
Lighting: still neutral daylight or soft overcast; balanced whites in highlights.
Palette: controlled warm accents as objects/surfaces, not global yellow cast.
Contrast: polished editorial; depth from material juxtaposition.
Mood: sophisticated, magazine-feature calm.
Materials: rich wood with honest grain, natural leather, linen, stone with cool veins, brushed brass as accent only.
Styling: curated layers, art and books, tactile richness without amber fog.`,
};

const DEFAULT_ATMOSPHERE = "architectural_white";

const GLOBAL_LIGHTING_AND_COLOR = [
  "Global lighting and color discipline (mandatory):",
  "Prefer neutral daylight, soft overcast daylight, or balanced architectural editorial lighting.",
  "Keep whites balanced and neutrally graded; realistic neutral materials.",
  "Avoid yellow/orange color cast, heavy amber grading, golden-hour or sunset lighting tropes unless the user brief explicitly requires them.",
  "No stylized warm filter over the whole frame — separation of planes should read clean and architectural.",
].join("\n");

const CAMERA_BASE_PRIMARY = [
  "Camera: architectural interior photography — vary focal length and height across generations (approx full-frame feel 18–35mm);",
  "straight verticals, crisp focus, natural perspective correction, high-end editorial print quality.",
].join(" ");

const ALTERNATE_DIVERSITY = [
  "ALTERNATE VARIANT — must read as a clearly different design take (not a near-duplicate):",
  "Change camera: try a different angle (corner hero, elevation from doorway, along-axis, low seat-level, or slightly elevated architectural); change implied focal length vs previous.",
  "Change composition: furniture layout, circulation paths, negative space, and focal hierarchy.",
  "Change furniture silhouettes and proportions — do not repeat the same sofa/chair/table archetypes.",
  "Change spatial depth structure: foreground / midground / background layering and lead-in lines.",
  "Change light behavior (direction, softness of shadows, contrast) while respecting the global neutral color discipline above.",
].join("\n");

function resolveAtmosphereKey(raw) {
  const k = typeof raw === "string" ? raw.trim() : "";
  if (k && Object.prototype.hasOwnProperty.call(ATMOSPHERE_SPECS, k)) return k;
  return DEFAULT_ATMOSPHERE;
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
    const isAlternate = body?.isAlternate === true;
    const atmosphereKey = resolveAtmosphereKey(body?.atmosphere);

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

    const atmosphereBlock = ATMOSPHERE_SPECS[atmosphereKey];

    const promptUsed = [
      "Photorealistic interior render, premium design, high detail. Naturalistic architectural photography.",
      "No text, no watermark, no logos.",
      GLOBAL_LIGHTING_AND_COLOR,
      atmosphereBlock,
      isAlternate ? ALTERNATE_DIVERSITY : "",
      `User brief: ${prompt}`,
      style ? `Style: ${style}` : "",
      mood ? `Mood: ${mood}` : "",
      paletteBase || paletteAccent || paletteContrast
        ? `Palette: base=${paletteBase || "—"}, accent=${paletteAccent || "—"}, contrast=${paletteContrast || "—"}`
        : "",
      materials.length ? `Key materials: ${materials.join(", ")}` : "",
      planning ? `Planning: ${planning}` : "",
      lighting ? `Lighting (concept): ${lighting}` : "",
      conceptMaterials ? `Material strategy: ${conceptMaterials}` : "",
      accents ? `Accents: ${accents}` : "",
      storage ? `Storage: ${storage}` : "",
      CAMERA_BASE_PRIMARY,
      `Selected atmosphere mode: ${atmosphereKey}.`,
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
