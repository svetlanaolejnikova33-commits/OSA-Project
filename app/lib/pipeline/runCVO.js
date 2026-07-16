import { POST as analyzeImagePost } from "../../api/analyze-image/route";
import { validateVisionJson } from "../visionJsonContract";

/**
 * CVO step for the OSA pipeline.
 * Reuses Phase #2 analyze-image when an image is provided.
 * When Vision JSON is already present, validates only (no second CVO).
 *
 * @param {{
 *   vision?: unknown,
 *   imageBase64?: string,
 *   mimeType?: string,
 *   languageMode?: string,
 *   analysisMode?: string,
 *   extractedPalette?: object | null,
 * }} input
 */
export async function runCVO(input) {
  if (input?.vision != null) {
    const validation = validateVisionJson(input.vision);
    if (!validation.ok || !validation.vision) {
      return {
        ok: false,
        vision: null,
        semanticDraft: null,
        cvo_confidence: 0,
        error: "Vision JSON validation failed.",
        visionErrors: validation.errors,
      };
    }

    return {
      ok: true,
      vision: validation.vision,
      semanticDraft: null,
      cvo_confidence: validation.vision.confidence,
      error: null,
      visionErrors: [],
    };
  }

  const imageBase64 = typeof input?.imageBase64 === "string" ? input.imageBase64.trim() : "";
  if (!imageBase64) {
    return {
      ok: false,
      vision: null,
      semanticDraft: null,
      cvo_confidence: 0,
      error: "vision or imageBase64 is required.",
      visionErrors: [],
    };
  }

  const request = new Request("http://osa.local/api/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      mimeType: input?.mimeType,
      languageMode: input?.languageMode || "ru",
      analysisMode: input?.analysisMode || "full",
      extractedPalette: input?.extractedPalette ?? null,
    }),
  });

  const response = await analyzeImagePost(request);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      vision: null,
      semanticDraft: payload?.semanticDraft ?? null,
      cvo_confidence: 0,
      error: typeof payload?.error === "string" ? payload.error : "CVO analysis failed.",
      visionErrors: Array.isArray(payload?.visionErrors) ? payload.visionErrors : [],
    };
  }

  if (!payload?.vision) {
    return {
      ok: false,
      vision: null,
      semanticDraft: payload?.semanticDraft ?? null,
      cvo_confidence: 0,
      error: typeof payload?.error === "string" ? payload.error : "Vision JSON validation failed.",
      visionErrors: Array.isArray(payload?.visionErrors) ? payload.visionErrors : [],
    };
  }

  return {
    ok: true,
    vision: payload.vision,
    semanticDraft: payload.semanticDraft ?? null,
    cvo_confidence: Number(payload.vision.confidence) || 0,
    error: null,
    visionErrors: [],
  };
}
