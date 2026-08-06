import { assertVisualEmbeddingProvider } from "../embeddings/visualEmbeddingProvider.js";
import { searchVisualIndex } from "./visualIndex.js";

export async function runInternalRegistryRetrieval({ query, indexes, embeddingProvider, topK = 5 }) {
  const provider = assertVisualEmbeddingProvider(embeddingProvider);
  const visual = indexes.visual_index;
  if (visual.provider_id !== provider.provider_id || visual.model_id !== provider.model_id || visual.model_version !== provider.model_version) {
    throw new Error("Query embedding provider/version does not match Visual Index.");
  }
  const queryVector = await provider.embedQueryImage(query);
  const products = new Map(indexes.product_index.records.map((record) => [record.product_id, record]));
  const media = new Map(indexes.media_index.records.map((record) => [record.media_id, record]));
  return searchVisualIndex(visual, queryVector, topK).map((hit, rank) => ({
    rank: rank + 1,
    similarity: hit.similarity,
    manufacturer_id: hit.manufacturer_id,
    article: hit.article,
    product: products.get(hit.product_id),
    media: media.get(hit.media_id),
    retrieval_provenance: { provider_id: hit.provider_id, model_id: hit.model_id, model_version: hit.model_version },
  }));
}
