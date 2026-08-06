import { assertEmbeddingVector } from "../embeddings/visualEmbeddingProvider.js";

function cosine(a, b) {
  let dot = 0, aa = 0, bb = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]; aa += a[index] ** 2; bb += b[index] ** 2;
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

export function buildVisualIndex({ embedding_records, provider }) {
  const records = Array.isArray(embedding_records) ? embedding_records : [];
  if (!records.length) throw new Error("Visual Index cannot be built without embeddings.");
  const dimensions = records[0].vector.length;
  records.forEach((record) => assertEmbeddingVector(record.vector, dimensions));
  return Object.freeze({
    schema_version: "osa.visual-index.v1",
    provider_id: provider.provider_id,
    model_id: provider.model_id,
    model_version: provider.model_version,
    dimensions,
    records,
  });
}

export function searchVisualIndex(index, queryVector, topK = 5) {
  assertEmbeddingVector(queryVector, index.dimensions);
  return index.records.map((record) => ({ ...record, similarity: cosine(queryVector, record.vector) }))
    .sort((a, b) => b.similarity - a.similarity || a.product_id.localeCompare(b.product_id))
    .slice(0, Math.max(1, topK));
}
