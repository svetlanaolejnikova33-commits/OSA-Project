import { buildOfficialCatalogIndexes } from "../../../app/lib/catalog/buildOfficialCatalogIndexes.js";
import { runInternalRegistryRetrieval } from "../../../app/lib/retrieval/internalRegistryRetrieval.js";
import { recallAtK } from "../../../app/lib/retrieval/retrievalMetrics.js";
import { validateRetrievalCandidates } from "../../../app/lib/ccn/validateRetrievalCandidates.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const vectors = new Map([
  ["https://acme.test/media/a.jpg", [1, 0, 0]],
  ["https://acme.test/media/b.jpg", [0, 1, 0]],
]);
const provider = {
  provider_id: "fixture-provider",
  model_id: "fixture-model",
  model_version: "1",
  embedCatalogImage: async ({ imageUrl }) => vectors.get(imageUrl),
  embedQueryImage: async () => [0.99, 0.01, 0],
};
const sourceAdapter = {
  fetchSnapshot: async () => ({
    manufacturer_id: "acme-lighting",
    source_snapshot_id: "acme-snapshot-1",
    products: [
      { article: "ACME-A", title: "A", productUrl: "https://acme.test/a", imageUrl: "https://acme.test/media/a.jpg" },
      { article: "ACME-B", title: "B", productUrl: "https://acme.test/b", imageUrl: "https://acme.test/media/b.jpg" },
    ],
  }),
};

const indexes = await buildOfficialCatalogIndexes({ sourceAdapter, embeddingProvider: provider });
assert(indexes.product_index.records.length === 2, "Product Index contains Registry-backed products");
assert(indexes.media_index.records.length === 2, "Media Index contains official images");
assert(indexes.embedding_store.records.length === 2, "Embedding Store contains versioned vectors");
assert(indexes.visual_index.dimensions === 3, "Visual Index records dimensions");

const hits = await runInternalRegistryRetrieval({ query: { imageBase64: "fixture" }, indexes, embeddingProvider: provider, topK: 2 });
assert(hits[0].article === "ACME-A", "ANN retrieval ranks by visual similarity");
assert(hits[0].similarity > hits[1].similarity, "similarity ordering is deterministic");

const validated = validateRetrievalCandidates({
  candidates: hits,
  vision: { fixture: true },
  navigator: ({ manufacturer_id }) => ({
    gate: { decision: "accept", match_confidence: 0.91, reason: "fixture" },
    product: { article: manufacturer_id === "acme-lighting" ? "ACME-A" : null },
  }),
});
assert(validated[0].ccn_g3.outcome === "accepted", "CCN/G3 accepts only the same retrieved article");
assert(validated[1].ccn_g3.outcome === "needs_human", "article mismatch cannot be accepted");
assert(recallAtK({ retrievedArticles: hits.map((hit) => hit.article) }).value === "unavailable_no_gold_set", "missing gold set is explicit");

let mismatchRejected = false;
try {
  await runInternalRegistryRetrieval({
    query: {}, indexes, topK: 1,
    embeddingProvider: { ...provider, model_version: "2" },
  });
} catch {
  mismatchRejected = true;
}
assert(mismatchRejected, "query/index model version mismatch is rejected");

console.log("Retrieval fixtures passed", {
  products: indexes.product_index.records.length,
  media: indexes.media_index.records.length,
  embeddings: indexes.embedding_store.records.length,
  dimensions: indexes.visual_index.dimensions,
  top_article: hits[0].article,
});
