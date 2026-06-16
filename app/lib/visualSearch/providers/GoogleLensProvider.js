import { normalizeProviderResult } from "../VisualSearchProvider";
import {
  extractGoogleLensVisualMatches,
  fetchSerpApiGoogleLens,
  resolveGoogleLensImageUrl,
} from "../serpApiGoogleLens";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function logGoogleLensDiagnostics({ httpStatus, resultCount, results, fallbackUsed, requestUrl, usedDevPlaceholder }) {
  const first = results?.[0];
  console.log("[visual-search][google_lens]", {
    provider: "google_lens",
    responseStatus: httpStatus,
    resultCount,
    firstTitle: asString(first?.title) || "",
    firstImageUrl: asString(first?.imageUrl) || "",
    fallbackUsed: Boolean(fallbackUsed),
    usedDevPlaceholder: Boolean(usedDevPlaceholder),
    requestUrl,
  });
}

/**
 * Google Lens via SerpApi — first real internet visual candidate source.
 * Requires public image URL (see resolveGoogleLensImageUrl).
 */
export function createGoogleLensProvider({ apiKey } = {}) {
  const key = asString(apiKey) || asString(process.env.SERPAPI_KEY);

  return {
    id: "google_lens",
    capabilities: {
      imageSearch: true,
      textSearch: false,
      semanticDraftSearch: false,
    },

    async searchBySemanticDraft({ searchQuery, limit = 12 }) {
      const error = new Error("Google Lens provider requires image mode with a public image URL.");
      error.code = "IMAGE_MODE_REQUIRED";
      error.provider = "google_lens";
      throw error;
    },

    async searchByImage({
      imageBase64,
      mimeType,
      imagePublicUrl = "",
      searchQuery,
      limit = 12,
    }) {
      const { imageUrl, usedDevPlaceholder } = resolveGoogleLensImageUrl({ imagePublicUrl });

      const { payload, httpStatus, requestUrl } = await fetchSerpApiGoogleLens({
        imageUrl,
        apiKey: key,
        searchQuery,
        limit,
        type: "products",
      });

      const results = extractGoogleLensVisualMatches(payload, { limit });

      if (!results.length) {
        const fallbackPayload = await fetchSerpApiGoogleLens({
          imageUrl,
          apiKey: key,
          searchQuery,
          limit,
          type: "visual_matches",
        });
        results.push(...extractGoogleLensVisualMatches(fallbackPayload.payload, { limit }));
        logGoogleLensDiagnostics({
          httpStatus: fallbackPayload.httpStatus,
          resultCount: results.length,
          results,
          fallbackUsed: false,
          requestUrl: fallbackPayload.requestUrl,
          usedDevPlaceholder,
        });
      } else {
        logGoogleLensDiagnostics({
          httpStatus,
          resultCount: results.length,
          results,
          fallbackUsed: false,
          requestUrl,
          usedDevPlaceholder,
        });
      }

      if (!results.length) {
        const error = new Error("Google Lens returned no visual matches.");
        error.code = "EMPTY_RESULTS";
        error.provider = "google_lens";
        throw error;
      }

      return results;
    },

    normalizeResult(raw, index = 0) {
      return normalizeProviderResult(raw, index);
    },
  };
}
