import { normalizeProviderResult } from "../VisualSearchProvider";
import { discoverMockRawResults } from "./mockCatalog";

/**
 * Preserves legacy Modelux catalog + synthetic fallback behavior.
 */
export function createMockProvider() {
  return {
    id: "mock",
    capabilities: {
      imageSearch: false,
      textSearch: true,
      semanticDraftSearch: true,
    },

    async searchBySemanticDraft({ searchQuery, limit = 12 }) {
      return discoverMockRawResults(searchQuery, { limit });
    },

    async searchByImage({ searchQuery, limit = 12 }) {
      return discoverMockRawResults(searchQuery, { limit });
    },

    normalizeResult(raw, index = 0) {
      return normalizeProviderResult(raw, index);
    },
  };
}
