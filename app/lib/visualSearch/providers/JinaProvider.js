import { normalizeProviderResult } from "../VisualSearchProvider";
import { buildImageEmbedding } from "../imageSimilarity";

/** s.jina.ai = SERP text search (semantic mode fallback only). */
const JINA_SEARCH_URL = "https://s.jina.ai/";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stripBase64Payload(value) {
  const raw = asString(value);
  if (!raw) return "";
  const comma = raw.indexOf(",");
  return comma >= 0 ? raw.slice(comma + 1).trim() : raw;
}

function buildSearchQueryText(searchQuery, semanticDraft) {
  const primary = asString(searchQuery?.primary) || asString(searchQuery?.ru) || asString(searchQuery?.en);
  if (primary) {
    return `${primary} interior design product buy`;
  }

  const room =
    semanticDraft?.proAnalysis?.spaceType?.labelRu ||
    semanticDraft?.quickAnalysis?.spaceType?.labelRu ||
    "";
  const style =
    semanticDraft?.proAnalysis?.styleAnalysis?.labelRu ||
    semanticDraft?.quickAnalysis?.styleAnalysis?.labelRu ||
    "";

  return [style, room, searchQuery?.objectType || "светильник", "купить интерьер"].filter(Boolean).join(" ");
}

async function fetchJinaWebSearch(query, { limit = 10, apiKey }) {
  const response = await fetch(JINA_SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: Math.min(Math.max(limit, 1), 20),
      hl: "ru",
      gl: "ru",
    }),
    signal: AbortSignal.timeout(45000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      asString(payload?.message) ||
      asString(payload?.error) ||
      `Jina search failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.provider = "jina";
    throw error;
  }

  return payload;
}

function extractJinaResultItems(payload) {
  const candidates = [];

  const pushItem = (item, index) => {
    if (!item || typeof item !== "object") return;
    const title = asString(item.title) || asString(item.name) || asString(item.description);
    const sourceUrl = asString(item.url) || asString(item.link) || asString(item.sourceUrl);
    if (!title && !sourceUrl) return;

    candidates.push({
      id: asString(item.id) || `jina-${index}-${sourceUrl.slice(0, 32)}`,
      title: title || "Визуальный аналог",
      brand: inferBrandFromUrl(sourceUrl) || inferBrandFromTitle(title),
      model: "",
      imageUrl: asString(item.image) || asString(item.imageUrl) || asString(item.thumbnail) || null,
      sourceUrl,
      price: 0,
      visualMatchScore: Math.max(40, 92 - index * 6),
      providerMeta: {
        provider: "jina",
        mode: "serp",
        description: asString(item.description) || asString(item.content),
      },
    });
  };

  if (Array.isArray(payload?.data)) {
    payload.data.forEach(pushItem);
  }
  if (Array.isArray(payload?.results)) {
    payload.results.forEach(pushItem);
  }
  if (Array.isArray(payload)) {
    payload.forEach(pushItem);
  }

  return candidates;
}

function inferBrandFromTitle(title) {
  const text = asString(title);
  if (!text) return "—";
  const first = text.split(/\s+/)[0];
  return first && first.length <= 18 ? first : "—";
}

function inferBrandFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const segment = host.split(".")[0];
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : "";
  } catch {
    return "";
  }
}

/**
 * Jina adapter — image mode uses embeddings; semantic mode uses SERP fallback.
 */
export function createJinaProvider({ apiKey } = {}) {
  const key = asString(apiKey) || asString(process.env.JINA_API_KEY);

  return {
    id: "jina",
    capabilities: {
      imageSearch: true,
      textSearch: true,
      semanticDraftSearch: true,
    },

    async searchBySemanticDraft({ semanticDraft, searchQuery, limit = 12 }) {
      if (!key) {
        const error = new Error("JINA_API_KEY is not configured.");
        error.code = "MISSING_API_KEY";
        throw error;
      }

      const query = buildSearchQueryText(searchQuery, semanticDraft);
      const payload = await fetchJinaWebSearch(query, { limit, apiKey: key });
      return extractJinaResultItems(payload).slice(0, limit);
    },

    async searchByImage({ imageBase64, mimeType }) {
      if (!key) {
        const error = new Error("JINA_API_KEY is not configured.");
        error.code = "MISSING_API_KEY";
        throw error;
      }

      if (!stripBase64Payload(imageBase64)) {
        const error = new Error("imageBase64 is required for Jina image embedding search.");
        error.code = "MISSING_IMAGE";
        throw error;
      }

      const { embedding, dimensions } = await buildImageEmbedding({
        imageBase64,
        mimeType: mimeType || "image/jpeg",
        apiKey: key,
        task: "retrieval.query",
      });

      return {
        embedding,
        provider: "jina",
        dimensions,
      };
    },

    normalizeResult(raw, index = 0) {
      return normalizeProviderResult(raw, index);
    },
  };
}
