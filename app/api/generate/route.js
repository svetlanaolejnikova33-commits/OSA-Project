import OpenAI from "openai";

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Ты профессиональный дизайнер интерьеров. Отвечай строго JSON без markdown и без пояснений. Пиши коротко, по делу, профессионально.",
        },
        {
          role: "user",
          content: `Сгенерируй концепцию интерьера по описанию: "${prompt}".

Верни строго JSON следующей структуры:
{
  "title": "",
  "style": "",
  "palette": {
    "base": "",
    "accent": "",
    "contrast": ""
  },
  "materials": [],
  "mood": "",
  "concept": {
    "planning": "",
    "lighting": "",
    "materials": "",
    "accents": "",
    "storage": ""
  }
}

Заполняй все поля. "materials" должен быть массивом строк.`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const result = {
      title: typeof parsed.title === "string" ? parsed.title : "",
      style: typeof parsed.style === "string" ? parsed.style : "",
      palette: {
        base: typeof parsed?.palette?.base === "string" ? parsed.palette.base : "",
        accent: typeof parsed?.palette?.accent === "string" ? parsed.palette.accent : "",
        contrast: typeof parsed?.palette?.contrast === "string" ? parsed.palette.contrast : "",
      },
      materials: Array.isArray(parsed.materials) ? parsed.materials.map((m) => String(m)) : [],
      mood: typeof parsed.mood === "string" ? parsed.mood : "",
      concept: {
        planning: typeof parsed?.concept?.planning === "string" ? parsed.concept.planning : "",
        lighting: typeof parsed?.concept?.lighting === "string" ? parsed.concept.lighting : "",
        materials: typeof parsed?.concept?.materials === "string" ? parsed.concept.materials : "",
        accents: typeof parsed?.concept?.accents === "string" ? parsed.concept.accents : "",
        storage: typeof parsed?.concept?.storage === "string" ? parsed.concept.storage : "",
      },
    };

    return Response.json(result);
  } catch (error) {
    console.error("Generate API error:", error);
    return Response.json({ error: "Failed to generate interior concept." }, { status: 500 });
  }
}
