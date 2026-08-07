import { buildProductIndex, buildMediaIndex, stableId } from "./officialCatalogContracts.js";
import { assertVisualEmbeddingProvider } from "../embeddings/visualEmbeddingProvider.js";
import { buildVisualIndex } from "../retrieval/visualIndex.js";
import {
  buildOfficialCatalogCacheIdentity,
  loadOfficialCatalogIndexCache,
  saveOfficialCatalogIndexCache,
} from "./officialCatalogIndexCache.js";

function createColdBuildThrottle(provider, { wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)), now = Date.now } = {}) {
  const tokensPerMinute = Number(provider?.catalog_rate_limit?.tokens_per_minute);
  const estimatedTokens = Number(provider?.catalog_rate_limit?.estimated_tokens_per_image);
  const windowMs = Number(provider?.catalog_rate_limit?.window_ms) || 60_000;
  const requestsPerWindow = Math.max(1, Math.floor(tokensPerMinute / estimatedTokens));
  const minimumIntervalMs = Number.isFinite(tokensPerMinute) && Number.isFinite(estimatedTokens)
    ? Math.ceil(windowMs / requestsPerWindow)
    : 0;
  let lastRequestAt = null;
  let waitedMs = 0;
  return {
    minimum_interval_ms: minimumIntervalMs,
    async beforeRequest() {
      if (lastRequestAt !== null && minimumIntervalMs > 0) {
        const delayMs = Math.max(0, lastRequestAt + minimumIntervalMs - now());
        if (delayMs) { await wait(delayMs); waitedMs += delayMs; }
      }
      lastRequestAt = now();
    },
    queryNotBefore() {
      return lastRequestAt === null ? 0 : lastRequestAt + minimumIntervalMs;
    },
    waitedMs() { return waitedMs; },
  };
}

export async function buildOfficialCatalogIndexes({ sourceAdapter, embeddingProvider, cacheDir, throttleOptions } = {}) {
  const provider = assertVisualEmbeddingProvider(embeddingProvider);
  const startedAt = Date.now();
  const catalogStartedAt = Date.now();
  const snapshot = await sourceAdapter.fetchSnapshot();
  const catalogMs = Date.now() - catalogStartedAt;
  const indexingStartedAt = Date.now();
  const product_index = buildProductIndex(snapshot);
  const media_index = buildMediaIndex({ product_index, products: snapshot.products });
  const identity = buildOfficialCatalogCacheIdentity({ source_snapshot: snapshot, media_index, provider });
  const cached = await loadOfficialCatalogIndexCache({ identity, cacheDir });
  if (cached.hit) {
    return {
      source_snapshot: snapshot,
      ...cached.indexes,
      failures: [],
      cache: { status: "hit", cache_key: cached.cache_key, cache_path: cached.cache_path },
      query_not_before_ms: 0,
      performance: { catalog_ms: catalogMs, embedding_ms: 0, indexing_ms: Date.now() - indexingStartedAt, throttle_wait_ms: 0, total_ms: Date.now() - startedAt },
    };
  }
  const embedding_records = [];
  const failures = [];
  const throttle = createColdBuildThrottle(provider, throttleOptions);
  const embeddingStartedAt = Date.now();
  for (const media of media_index.records) {
    try {
      await throttle.beforeRequest();
      const vector = await provider.embedCatalogImage({ imageUrl: media.official_url });
      embedding_records.push(Object.freeze({
        embedding_id: stableId("embedding", media.media_id, provider.model_id, provider.model_version),
        media_id: media.media_id,
        product_id: media.product_id,
        manufacturer_id: media.manufacturer_id,
        article: media.article,
        provider_id: provider.provider_id,
        model_id: provider.model_id,
        model_version: provider.model_version,
        dimensions: vector.length,
        vector,
      }));
    } catch (error) {
      failures.push({ media_id: media.media_id, article: media.article, error: error instanceof Error ? error.message : String(error) });
    }
  }
  const embeddingMs = Date.now() - embeddingStartedAt;
  if (!embedding_records.length) throw new Error(`No catalog images could be embedded (${failures.length} failures).`);
  const embedding_store = Object.freeze({ schema_version: "osa.embedding-store.v1", records: embedding_records });
  const visual_index = buildVisualIndex({ embedding_records, provider });
  const persisted = { product_index, media_index, embedding_store, visual_index };
  const saved = await saveOfficialCatalogIndexCache({ identity, indexes: persisted, cacheDir });
  return {
    source_snapshot: snapshot,
    ...persisted,
    failures,
    cache: { status: "cold_build", cache_key: saved.cache_key, cache_path: saved.cache_path },
    query_not_before_ms: throttle.queryNotBefore(),
    performance: {
      catalog_ms: catalogMs,
      embedding_ms: embeddingMs,
      indexing_ms: Date.now() - indexingStartedAt - embeddingMs,
      throttle_wait_ms: throttle.waitedMs(),
      total_ms: Date.now() - startedAt,
    },
  };
}

export async function waitForOfficialCatalogQuerySlot(indexes, { wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)), now = Date.now } = {}) {
  const delayMs = Math.max(0, Number(indexes?.query_not_before_ms) - now());
  if (delayMs) await wait(delayMs);
  return delayMs;
}
