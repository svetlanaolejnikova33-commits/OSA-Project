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
    embedCatalogImage: (input) => embed(input, "retrieval.passage"),
    embedQueryImage: (input) => embed(input, "retrieval.query"),
  });
}
