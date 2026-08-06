function required(value, name) {
  if (!value) throw new Error(`Visual embedding provider requires ${name}.`);
}

export function assertVisualEmbeddingProvider(provider) {
  required(provider, "provider");
  required(provider.provider_id, "provider_id");
  required(provider.model_id, "model_id");
  required(provider.model_version, "model_version");
  required(provider.embedCatalogImage, "embedCatalogImage");
  required(provider.embedQueryImage, "embedQueryImage");
  return provider;
}

export function assertEmbeddingVector(vector, expectedDimensions = null) {
  if (!Array.isArray(vector) || !vector.length || vector.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding must be a non-empty finite numeric vector.");
  }
  if (expectedDimensions && vector.length !== expectedDimensions) throw new Error("Embedding dimensions do not match the index.");
  return vector;
}
