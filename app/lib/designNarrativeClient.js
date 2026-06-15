import {
  buildNarrativeRequestKey,
  isDesignNarrativeUsable,
  mapDesignNarrativeToSections,
  normalizeDesignNarrative,
} from "./designNarrativeSchema";

export { buildNarrativeRequestKey, mapDesignNarrativeToSections };

/**
 * @returns {Promise<{ ok: boolean, source: "llm" | "fallback", narrative?: object, sections?: Array, error?: string }>}
 */
export async function fetchDesignNarrative({
  semanticDraft,
  analysisMode = "pro",
  locale = "ru",
  tone = "professional_designer",
  signal,
} = {}) {
  if (!semanticDraft) {
    return { ok: false, source: "fallback", error: "missing_semantic_draft" };
  }

  try {
    const response = await fetch("/api/design-narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        semanticDraft,
        analysisMode,
        locale,
        tone,
      }),
      signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.fallback) {
      return {
        ok: false,
        source: "fallback",
        error: typeof payload?.error === "string" ? payload.error : `http_${response.status}`,
      };
    }

    const narrative = normalizeDesignNarrative(payload?.narrative);
    if (!isDesignNarrativeUsable(narrative)) {
      return { ok: false, source: "fallback", error: "empty_narrative" };
    }

    return {
      ok: true,
      source: "llm",
      narrative,
      sections: mapDesignNarrativeToSections(narrative),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, source: "fallback", error: "aborted" };
    }
    const message = error instanceof Error ? error.message : "design_narrative_request_failed";
    return { ok: false, source: "fallback", error: message };
  }
}
