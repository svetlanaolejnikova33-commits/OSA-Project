import OpenAI from "openai";
import { mapSemanticDraftToVisionJson } from "../../lib/mapSemanticDraftToVisionJson";
import {
  extractJsonObject,
  getSemanticDraftJsonSchema,
  normalizeVisionRequestMode,
  validateSemanticDraft,
} from "../../lib/validateSemanticDraft";
import { validateVisionJson } from "../../lib/visionJsonContract";

const VISION_MODEL = "gpt-4o";

function buildSystemPrompt(languageMode) {
  const isRu = languageMode !== "en";
  const unconfirmed = isRu ? "визуально не подтверждено" : "visually unconfirmed";

  return `You analyze an existing interior photograph only. You do not redesign, replace, or generate alternatives.
You speak as an interior designer, specifier, and procurement assistant.
Do not use generic AI moodboard wording.
Do not invent exact materials without visual confirmation. If uncertain, write "${unconfirmed}".
Return ONLY valid JSON. No markdown. No prose.

analysisMode must be "full".
languageMode must be "${isRu ? "ru" : "en"}".

Return one semanticDraft with quickAnalysis, proAnalysis, specAnalysis, sceneGraph, editableObjects, styleConsistency, designMutations, and pipelines.

quickAnalysis:
- short creative summary only
- spaceType, styleAnalysis, atmosphereRu
- colorAnalysis.interpretedPalette with descriptionRu and optional color names
- do not invent precise hex swatches; color swatches are extracted separately from pixels
- brief designIntent with summaryRu and emotionalEffectRu

proAnalysis:
- professional interior designer analysis
- functional zones, lighting, materials, furniture, textiles, finishes, decor, atmosphereRu, designIntent
- no SKU priorities, supplier categories, replacement candidates, or specification groups
- colorAnalysis.interpretedPalette describes practical color logic in Russian

specAnalysis:
- specification-ready breakdown for future SKU, budget, and BIM
- functionalZones, supplierCategories, specificationGroups with multiple visible groups
- productCategories, replacementCandidates, procurementNotes, whatMustBePreserved
- specificationGroups must cover all visible categories, not one hero object
- use groups such as Отделка пола, Отделка стен, Потолок, Мебель, Освещение, Текстиль, Декор, Хранение, Сантехника, Техника, Двери / перегородки, Окна / шторы, Прочее
- each specificationGroups entry must include group, priority, budgetWeight, and items with name, category, visible, quantityEstimate, replacementRisk, skuReadiness, note

pipelines must stay empty graph shells with ready=false.

sceneGraph:
- describe the scene as an interior designer and spatial analyst
- include only visible or logically obvious elements; do not invent hidden objects
- if exact placement is unclear, use unknown
- zones must describe functional areas with position, role, and relatedObjects
- objects must describe visible scene elements with zoneId, relative position, visualWeight, replacementRisk, editablePotential, budgetWeight, materialGuess, colorGuess, categoryId, supplierCategoryId, and futureReady flags
- relationships must be practical and useful for future replacement, masking, budgeting, and BIM linking
- examples: sofa grouped_with coffee table; pendant lights dining zone; rug anchors lounge zone; curtains frame window; bed grouped_with nightstands; kitchen cabinets aligned_with wall
- allowed relations include above, below, next_to, on_top_of, behind, in_front_of, aligned_with, grouped_with, lights, supports, frames, anchors
- preservationRules must capture what should stay stable in future edits

editableObjects:
- return only realistic future edit candidates linked to sceneGraph.objects through sourceObjectId
- do not invent objects that are not in sceneGraph
- describe only practical future edits, not everything in the scene
- respect preservationRules and lower editSafety for compositionally important elements
- include editTypes, editSafety, replacementRisk, styleImpact, budgetImpact, preservationNotes, dependencies, promptHintRu, futureReady, and confidence

styleConsistency:
- describe concept DNA: style, atmosphere, color, materials, composition, and mustPreserve
- create advisory editImpactRules for editableObjects through targetId
- never forbid edits; explain consequences softly
- use language such as "изменит восприятие", "усилит", "ослабит", "сместит акцент"
- when an intentional change is possible, explain how to do it consciously
- do not use words like "нельзя", "запрещено", "ошибка"

designMutations:
- propose 5-7 meaningful concept development directions, not chaotic redesign
- each mutation must have a clear goal, preserveDNA, changeTargets, styleImpact, budgetImpact, riskLevel, promptTemplateRu, and noteRu
- use editableObjects, styleConsistency, material logic from proAnalysis, specAnalysis, and budget-relevant categories
- do not suggest regenerating the whole interior or replacing the entire scene
- write as an interior designer proposing concept iterations, not image generation
- mutationType must be one of: style_shift, budget_optimization, premium_upgrade, material_swap, color_shift, lighting_upgrade, softening, brutalization, minimal_cleanup, decor_enrichment
- promptTemplateRu must describe what to preserve and what to change without asking to regenerate the image

Use Russian professional interior terminology and real interior scenarios.
List multiple visible objects and zones, not one hero object.`;
}

function stripBase64Payload(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  const comma = raw.indexOf(",");
  return comma >= 0 ? raw.slice(comma + 1).trim() : raw;
}

function normalizeMimeType(value) {
  const mime = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") return mime;
  return "image/jpeg";
}

function normalizeLanguageMode(value) {
  const mode = typeof value === "string" ? value.trim().toLowerCase() : "";
  return mode === "en" ? "en" : "ru";
}

async function requestVisionAnalysis(openai, imageBase64, mimeType, languageMode) {
  const request = {
    model: VISION_MODEL,
    temperature: 0.15,
    messages: [
      { role: "system", content: buildSystemPrompt(languageMode) },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this interior scene. analysisMode="full". languageMode="${languageMode}". Return ONLY valid JSON matching semanticDraft with quickAnalysis, proAnalysis, specAnalysis, sceneGraph, editableObjects, styleConsistency, designMutations, and pipelines.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  };

  try {
    return await openai.chat.completions.create({
      ...request,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "semantic_draft",
          strict: true,
          schema: getSemanticDraftJsonSchema("full"),
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
      return Response.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const body = await request.json();
    const imageBase64 = stripBase64Payload(body?.imageBase64);
    const mimeType = normalizeMimeType(body?.mimeType);
    const languageMode = normalizeLanguageMode(body?.languageMode);
    const requestMode = normalizeVisionRequestMode(body?.analysisMode);
    const extractedPalette =
      body?.extractedPalette && typeof body.extractedPalette === "object" ? body.extractedPalette : null;

    if (!imageBase64) {
      return Response.json({ error: "imageBase64 is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await requestVisionAnalysis(openai, imageBase64, mimeType, languageMode);
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = extractJsonObject(raw);
    const semanticDraft = validateSemanticDraft(parsed, {
      languageMode,
      analysisMode: requestMode,
      extractedPalette,
    });

    const visionCandidate = mapSemanticDraftToVisionJson(semanticDraft);
    const visionValidation = validateVisionJson(visionCandidate);

    if (!visionValidation.ok) {
      return Response.json({
        semanticDraft,
        vision: null,
        error: "Vision JSON validation failed.",
        visionErrors: visionValidation.errors,
      });
    }

    return Response.json({
      semanticDraft,
      vision: visionValidation.vision,
    });
  } catch (error) {
    console.error("[analyze-image]", error);
    const message = error instanceof Error ? error.message : "Vision analysis failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
