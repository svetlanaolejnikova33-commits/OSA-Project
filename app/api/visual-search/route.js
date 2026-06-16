import { PROVIDER_IDS } from "../../lib/visualSearch/VisualSearchProvider";
import { rankCatalogCandidatesByImageSimilarity } from "../../lib/visualSearch/imageSimilarity";
import {
  createVisualSearchProvider,
  getProviderFallbackChain,
  resolveProviderId,
} from "../../lib/visualSearch/providerRegistry";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stripBase64Payload(value) {
  const raw = asString(value);
  if (!raw) return "";
  const comma = raw.indexOf(",");
  return comma >= 0 ? raw.slice(comma + 1).trim() : raw;
}

function normalizeMode(value, imageBase64) {
  const mode = asString(value);
  if (mode === "image" || mode === "semantic") return mode;
  return stripBase64Payload(imageBase64) ? "image" : "semantic";
}

async function runProviderSearch(provider, ctx) {
  const {
    mode,
    semanticDraft,
    searchQuery,
    imageBase64,
    mimeType,
    imagePublicUrl,
    limit,
  } = ctx;

  if (mode === "image" && provider.id === PROVIDER_IDS.JINA) {
    return provider.searchByImage({
      imageBase64,
      mimeType: mimeType || "image/jpeg",
    });
  }

  if (mode === "image") {
    return provider.searchByImage({
      imageBase64,
      mimeType: mimeType || "image/jpeg",
      imagePublicUrl,
      semanticDraft,
      searchQuery,
      limit,
    });
  }

  return provider.searchBySemanticDraft({
    semanticDraft,
    searchQuery,
    limit,
  });
}

function isJinaEmbeddingResult(value) {
  return Boolean(value && typeof value === "object" && Array.isArray(value.embedding) && value.provider === "jina");
}

async function resolveProviderResults(provider, rawOutcome, ctx) {
  if (isJinaEmbeddingResult(rawOutcome)) {
    const rawResults = await rankCatalogCandidatesByImageSimilarity({
      sourceEmbedding: rawOutcome.embedding,
      embeddingDimensions: rawOutcome.dimensions,
      searchQuery: ctx.searchQuery,
      limit: ctx.limit,
      apiKey: process.env.JINA_API_KEY,
    });
    return rawResults.map((item, index) => provider.normalizeResult(item, index));
  }

  const rawResults = asArray(rawOutcome);
  return rawResults.map((item, index) => provider.normalizeResult(item, index));
}

export async function POST(request) {
  let providerId = PROVIDER_IDS.MOCK;
  let mode = "semantic";

  try {
    const body = await request.json();
    const semanticDraft = body?.semanticDraft;
    const searchQuery = body?.searchQuery;
    const imageBase64 = stripBase64Payload(body?.imageBase64);
    const imagePublicUrl = asString(body?.imagePublicUrl);
    const mimeType = asString(body?.mimeType) || "image/jpeg";
    const limit = Math.min(Math.max(Number(body?.limit) || 12, 1), 24);
    mode = normalizeMode(body?.mode, imageBase64);
    providerId = resolveProviderId(body?.provider);

    const chain = getProviderFallbackChain(providerId);
    const ctx = {
      mode,
      semanticDraft,
      searchQuery,
      imageBase64,
      mimeType,
      imagePublicUrl,
      limit,
    };

    let usedProvider = chain[0];
    let fallbackUsed = false;
    let results = [];
    let lastError = null;

    for (let index = 0; index < chain.length; index += 1) {
      const chainId = chain[index];
      const provider = createVisualSearchProvider(chainId);

      try {
        const rawOutcome = await runProviderSearch(provider, ctx);
        const nextResults = await resolveProviderResults(provider, rawOutcome, ctx);

        if (nextResults.length) {
          results = nextResults;
          usedProvider = provider.id;
          fallbackUsed = index > 0;
          break;
        }
      } catch (error) {
        lastError = error;
        console.warn(
          `[visual-search] provider ${chainId} failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    if (!results.length && lastError) {
      throw lastError;
    }

    return Response.json({
      ok: true,
      provider: usedProvider,
      requestedProvider: providerId,
      mode,
      fallbackUsed,
      results,
    });
  } catch (error) {
    console.error("[visual-search]", error);
    const message = error instanceof Error ? error.message : "Visual search failed.";
    const reason = error?.code || (error?.provider ? "provider_error" : "internal_error");

    return Response.json(
      {
        ok: false,
        provider: providerId,
        mode,
        reason,
        message,
        results: [],
      },
      { status: error?.status && Number.isFinite(error.status) ? error.status : 500 },
    );
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}
