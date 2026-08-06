import { buildProductIndex, buildMediaIndex, stableId } from "./officialCatalogContracts.js";
import { assertVisualEmbeddingProvider } from "../embeddings/visualEmbeddingProvider.js";
import { buildVisualIndex } from "../retrieval/visualIndex.js";

export async function buildOfficialCatalogIndexes({ sourceAdapter, embeddingProvider }) {
  const provider = assertVisualEmbeddingProvider(embeddingProvider);
  const snapshot = await sourceAdapter.fetchSnapshot();
  const product_index = buildProductIndex(snapshot);
  const media_index = buildMediaIndex({ product_index, products: snapshot.products });
  const embedding_records = [];
  const failures = [];
  for (const media of media_index.records) {
    try {
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
  if (!embedding_records.length) throw new Error(`No catalog images could be embedded (${failures.length} failures).`);
  const embedding_store = Object.freeze({ schema_version: "osa.embedding-store.v1", records: embedding_records });
  const visual_index = buildVisualIndex({ embedding_records, provider });
  return { source_snapshot: snapshot, product_index, media_index, embedding_store, visual_index, failures };
}
