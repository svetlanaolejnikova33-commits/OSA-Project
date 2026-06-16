/**
 * Image embedding similarity layer (Phase 5J.3D).
 */

import { discoverMockRawResults } from "./providers/mockCatalog";
import {
  fetchJinaEmbeddingVector,
  JINA_EMBEDDING_MODEL,
  resolveImageEmbeddingInput,
} from "./jinaEmbeddings";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Cosine similarity for L2-normalized or arbitrary vectors. Returns 0–1.
 */
export function cosineSimilarity(vectorA, vectorB) {
  const a = asArray(vectorA);
  const b = asArray(vectorB);
  if (!a.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (!normA || !normB) return 0;
  const cosine = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (cosine + 1) / 2));
}

/**
 * Build embedding vector for an image (base64 or URL).
 * @returns {Promise<{ embedding: number[], dimensions: number, model: string }>}
 */
export async function buildImageEmbedding({
  imageBase64 = "",
  mimeType = "image/jpeg",
  imageUrl = "",
  apiKey,
  task = "retrieval.query",
} = {}) {
  const resolved = await resolveImageEmbeddingInput({ imageBase64, mimeType, imageUrl });

  try {
    const embedding = await fetchJinaEmbeddingVector({ image: resolved.image }, { apiKey, task });
    return {
      embedding,
      dimensions: embedding.length,
      model: JINA_EMBEDDING_MODEL,
    };
  } catch (firstError) {
    if (!resolved.imageUrl) throw firstError;
    const fetched = await fetchImageBytesFromUrl(resolved.imageUrl);
    const embedding = await fetchJinaEmbeddingVector({ image: fetched.dataUri }, { apiKey, task });
    return {
      embedding,
      dimensions: embedding.length,
      model: JINA_EMBEDDING_MODEL,
    };
  }
}

/**
 * Score candidate embeddings against a source embedding.
 * @returns {Array<{ candidate: object, similarity: number, visualSimilarityPercent: number }>}
 */
export function compareEmbeddings(sourceEmbedding, candidatesWithEmbeddings) {
  return asArray(candidatesWithEmbeddings)
    .map((entry) => {
      const similarity = cosineSimilarity(sourceEmbedding, entry.embedding);
      return {
        candidate: entry.candidate,
        embedding: entry.embedding,
        similarity,
        visualSimilarityPercent: Math.round(similarity * 1000) / 10,
      };
    })
    .sort((left, right) => right.similarity - left.similarity);
}

const MAX_CANDIDATE_EMBEDS = 10;

/**
 * Validation mode: embed source image + catalog candidate images, rank by cosine similarity.
 */
export async function rankCatalogCandidatesByImageSimilarity({
  sourceEmbedding,
  embeddingDimensions = 0,
  searchQuery,
  limit = 8,
  apiKey,
}) {
  const catalogCandidates = await discoverMockRawResults(searchQuery, {
    limit: Math.max(limit * 2, 12),
  });

  const withImages = catalogCandidates.filter((row) => asString(row.imageUrl)).slice(0, MAX_CANDIDATE_EMBEDS);

  const embeddedCandidates = [];
  for (const candidate of withImages) {
    try {
      const { embedding } = await buildImageEmbedding({
        imageUrl: candidate.imageUrl,
        apiKey,
        task: "retrieval.passage",
      });
      embeddedCandidates.push({ candidate, embedding });
    } catch (error) {
      console.warn(
        "[visual-search][jina-embed] candidate embed skipped:",
        asString(candidate.title) || candidate.id,
        error instanceof Error ? error.message : error,
      );
    }
  }

  const scored = compareEmbeddings(
    sourceEmbedding,
    embeddedCandidates.map((entry) => ({
      candidate: entry.candidate,
      embedding: entry.embedding,
    })),
  );

  const top = scored.slice(0, limit);
  const topSimilarity = top[0]?.visualSimilarityPercent ?? 0;

  console.log("[visual-search][jina-embed]", {
    provider: "jina",
    embeddingModel: JINA_EMBEDDING_MODEL,
    embeddingDimensions: embeddingDimensions || sourceEmbedding?.length || 0,
    candidateCount: embeddedCandidates.length,
    catalogPool: withImages.length,
    topSimilarity,
    topMatches: top.slice(0, 3).map((item) => ({
      title: item.candidate?.title,
      similarity: item.visualSimilarityPercent,
      imageUrl: item.candidate?.imageUrl,
    })),
  });

  return top.map((item) => ({
    id: item.candidate.id,
    title: item.candidate.title,
    brand: item.candidate.brand,
    model: item.candidate.model || "",
    imageUrl: item.candidate.imageUrl,
    sourceUrl: item.candidate.sourceUrl,
    price: item.candidate.price || 0,
    visualMatchScore: item.visualSimilarityPercent,
    visualSimilarityPercent: item.visualSimilarityPercent,
    providerMeta: {
      provider: "jina",
      mode: "embedding",
      similarity: item.similarity,
      embeddingModel: JINA_EMBEDDING_MODEL,
    },
  }));
}
