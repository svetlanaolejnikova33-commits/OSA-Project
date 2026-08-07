import {
  JINA_EMBEDDING_MODEL,
  fetchJinaEmbeddingVector,
  resolveImageEmbeddingInput,
} from "../../visualSearch/jinaEmbeddings.js";
import { assertEmbeddingVector } from "../visualEmbeddingProvider.js";

export function createJinaClipVisualEmbeddingAdapter({ apiKey = process.env.JINA_API_KEY } = {}) {
  async function embed(input, task) {
    const image = await resolveImageEmbeddingInput(input);
    return assertEmbeddingVector(await fetchJinaEmbeddingVector({ image: image.image }, { apiKey, task }));
  }
  return Object.freeze({
    provider_id: "jina",
    model_id: JINA_EMBEDDING_MODEL,
    model_version: "api-2026-08",
    dimensions: 1024,
    catalog_rate_limit: Object.freeze({
      tokens_per_minute: 100_000,
      estimated_tokens_per_image: 36_000,
      window_ms: 60_000,
    }),
    embedCatalogImage: (input) => embed(input, "retrieval.query"),
    embedQueryImage: (input) => embed(input, "retrieval.query"),
  });
}
