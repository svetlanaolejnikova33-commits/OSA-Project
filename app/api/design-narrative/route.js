import OpenAI from "openai";
import {
  buildDesignNarrativeSystemPrompt,
  getDesignNarrativeJsonSchema,
  isDesignNarrativeUsable,
  normalizeDesignNarrative,
  prepareSemanticDraftForNarrative,
} from "../../lib/designNarrativeSchema";
import { normalizeAnalysisMode } from "../../lib/validateSemanticDraft";

const NARRATIVE_MODEL = "gpt-4o-mini";

function normalizeLocale(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "en" ? "en" : "ru";
}

function normalizeTone(value) {
  const tone = typeof value === "string" ? value.trim().toLowerCase() : "";
  return tone || "professional_designer";
}

function extractJsonObject(raw) {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

async function requestDesignNarrative(openai, { semanticPayload, analysisMode, locale, tone }) {
  const systemPrompt = buildDesignNarrativeSystemPrompt(locale, tone);
  const userPrompt = `analysisMode="${analysisMode}".
Преобразуй semanticDraft ниже в дизайнерское описание интерьера для клиента.
Заполни все шесть разделов: styleIntent, roomPurpose, atmosphere, colorLogic, keyMaterials, preserve.
Используй русские заголовки разделов в поле title.

semanticDraft:
${JSON.stringify(semanticPayload)}`;

  const request = {
    model: NARRATIVE_MODEL,
    temperature: 0.35,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  try {
    return await openai.chat.completions.create({
      ...request,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "design_narrative",
          strict: true,
          schema: getDesignNarrativeJsonSchema(),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/json_schema|response_format|strict/i.test(message)) {
      throw error;
    }
    return openai.chat.completions.create({
      ...request,
      response_format: { type: "json_object" },
    });
  }
}

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY is not configured.", fallback: true }, { status: 503 });
    }

    const body = await request.json();
    const semanticDraft = body?.semanticDraft;
    const analysisMode = normalizeAnalysisMode(body?.analysisMode || semanticDraft?.analysisMode || "pro");
    const locale = normalizeLocale(body?.locale);
    const tone = normalizeTone(body?.tone);
    const semanticPayload = prepareSemanticDraftForNarrative(semanticDraft, analysisMode);

    if (!semanticPayload) {
      return Response.json({ error: "semanticDraft is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await requestDesignNarrative(openai, {
      semanticPayload,
      analysisMode,
      locale,
      tone,
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = extractJsonObject(raw);
    const narrative = normalizeDesignNarrative(parsed);

    if (!isDesignNarrativeUsable(narrative)) {
      return Response.json({ error: "Narrative response was empty.", fallback: true }, { status: 502 });
    }

    return Response.json({ narrative, source: "llm" });
  } catch (error) {
    console.error("[design-narrative]", error);
    const message = error instanceof Error ? error.message : "Design narrative rewrite failed.";
    return Response.json({ error: message, fallback: true }, { status: 500 });
  }
}
