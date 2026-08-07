import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildOfficialCatalogIndexes,
  waitForOfficialCatalogQuerySlot,
} from "../../../app/lib/catalog/buildOfficialCatalogIndexes.js";
import { runInternalRegistryRetrieval } from "../../../app/lib/retrieval/internalRegistryRetrieval.js";
import {
  buildOfficialCatalogCacheIdentity,
  hashOfficialCatalogCacheIdentity,
} from "../../../app/lib/catalog/officialCatalogIndexCache.js";
import { buildModeluxCatalogSnapshotId } from "../../../app/lib/registry/adapters/modeluxOfficialCatalogAdapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cacheDir = await mkdtemp(join(tmpdir(), "osa-index-cache-fixture-"));
try {
  const vectors = new Map([
    ["https://acme.test/media/a.jpg", [1, 0, 0]],
    ["https://acme.test/media/b.jpg", [0, 1, 0]],
  ]);
  let catalogEmbeddingCalls = 0;
  let queryEmbeddingCalls = 0;
  let snapshotFetches = 0;
  let fakeNow = 0;
  const throttleWaits = [];
  const provider = {
    provider_id: "fixture-provider",
    model_id: "fixture-model",
    model_version: "1",
    dimensions: 3,
    catalog_rate_limit: { tokens_per_minute: 2, estimated_tokens_per_image: 1, window_ms: 100 },
    embedCatalogImage: async ({ imageUrl }) => { catalogEmbeddingCalls += 1; return vectors.get(imageUrl); },
    embedQueryImage: async () => { queryEmbeddingCalls += 1; return [0.99, 0.01, 0]; },
  };
  const sourceAdapter = {
    fetchSnapshot: async () => {
      snapshotFetches += 1;
      return {
        manufacturer_id: "acme-lighting",
        source_snapshot_id: "content-sha256-unchanged",
        products: [
          { article: "ACME-A", title: "A", productUrl: "https://acme.test/a", imageUrl: "https://acme.test/media/a.jpg" },
          { article: "ACME-B", title: "B", productUrl: "https://acme.test/b", imageUrl: "https://acme.test/media/b.jpg" },
        ],
      };
    },
  };
  const throttleOptions = {
    now: () => fakeNow,
    wait: async (milliseconds) => { throttleWaits.push(milliseconds); fakeNow += milliseconds; },
  };

  const identityInput = {
    source_snapshot: { manufacturer_id: "acme-lighting", source_snapshot_id: "content-sha256-unchanged" },
    media_index: {
      records: [
        { media_id: "media-a", official_url: "https://acme.test/media/a.jpg" },
        { media_id: "media-b", official_url: "https://acme.test/media/b.jpg" },
      ],
    },
    provider,
  };
  const snapshotProducts = [
    { sku: "A", productUrl: "https://acme.test/a", imageUrl: "https://acme.test/a.jpg", title: "A" },
    { sku: "B", productUrl: "https://acme.test/b", imageUrl: "https://acme.test/b.jpg", title: "B" },
  ];
  assert(
    buildModeluxCatalogSnapshotId(snapshotProducts) === buildModeluxCatalogSnapshotId([...snapshotProducts].reverse()),
    "content-derived snapshot ID is stable across fetch ordering",
  );
  const identity = buildOfficialCatalogCacheIdentity(identityInput);
  const identityKey = hashOfficialCatalogCacheIdentity(identity);
  const changedKey = (change) => hashOfficialCatalogCacheIdentity(buildOfficialCatalogCacheIdentity({
    ...identityInput,
    ...change,
  }));
  assert(changedKey({ source_snapshot: { ...identityInput.source_snapshot, manufacturer_id: "other" } }) !== identityKey, "manufacturer_id invalidates cache");
  assert(changedKey({ source_snapshot: { ...identityInput.source_snapshot, source_snapshot_id: "changed" } }) !== identityKey, "snapshot content version invalidates cache");
  assert(changedKey({ media_index: { records: [{ media_id: "media-a", official_url: "https://acme.test/media/changed.jpg" }] } }) !== identityKey, "media_id/image URL invalidates cache");
  assert(changedKey({ provider: { ...provider, provider_id: "other" } }) !== identityKey, "provider_id invalidates cache");
  assert(changedKey({ provider: { ...provider, model_id: "other" } }) !== identityKey, "model_id invalidates cache");
  assert(changedKey({ provider: { ...provider, model_version: "2" } }) !== identityKey, "model_version invalidates cache");
  assert(changedKey({ provider: { ...provider, dimensions: 4 } }) !== identityKey, "dimensions invalidates cache");

  const cold = await buildOfficialCatalogIndexes({ sourceAdapter, embeddingProvider: provider, cacheDir, throttleOptions });
  assert(cold.cache.status === "cold_build", "first build must be cold");
  assert(catalogEmbeddingCalls === 2, "cold build embeds both catalog images");
  assert(throttleWaits.length === 1 && throttleWaits[0] === 50, "cold build throttles requests using TPM budget");

  const cached = await buildOfficialCatalogIndexes({ sourceAdapter, embeddingProvider: provider, cacheDir, throttleOptions });
  assert(cached.cache.status === "hit", "same content-derived snapshot must hit cache");
  assert(snapshotFetches === 2, "catalog may be refetched to verify snapshot identity");
  assert(catalogEmbeddingCalls === 2, "second query preparation must not call embedCatalogImage");

  const queryWaitMs = await waitForOfficialCatalogQuerySlot(cached, throttleOptions);
  queryEmbeddingCalls = 0;
  const hits = await runInternalRegistryRetrieval({
    query: { imageBase64: "fixture" },
    indexes: cached,
    embeddingProvider: provider,
    topK: 2,
  });
  assert(queryWaitMs === 0, "cache hit requires no cold-build query wait");
  assert(queryEmbeddingCalls === 1, "retrieval calls embedQueryImage exactly once");
  assert(hits[0].article === "ACME-A", "cached Visual Index serves retrieval");

  console.log("Official Catalog index cache fixtures passed", {
    cold_cache_status: cold.cache.status,
    second_cache_status: cached.cache.status,
    snapshot_fetches: snapshotFetches,
    cache_identity_fields_verified: 7,
    catalog_embedding_calls_after_second_query: catalogEmbeddingCalls,
    query_embedding_calls: queryEmbeddingCalls,
    cold_build_throttle_waits_ms: throttleWaits,
    dimensions: cached.visual_index.dimensions,
  });
} finally {
  await rm(cacheDir, { recursive: true, force: true });
}
