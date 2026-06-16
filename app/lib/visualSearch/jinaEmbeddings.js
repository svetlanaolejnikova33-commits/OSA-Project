/**
 * Jina multimodal embeddings API (server-only).
 * https://api.jina.ai/v1/embeddings
 */

const JINA_EMBEDDINGS_URL = "https://api.jina.ai/v1/embeddings";
/** Multimodal image vectors — jina-clip-v2 (v4 requires ≥784px images). */
export const JINA_EMBEDDING_MODEL = "jina-clip-v2";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stripBase64Payload(value) {
  const raw = asString(value);
  if (!raw) return "";
  const comma = raw.indexOf(",");
  return comma >= 0 ? raw.slice(comma + 1).trim() : raw;
}

function toDataUri(imageBase64, mimeType = "image/jpeg") {
  const payload = stripBase64Payload(imageBase64);
  if (!payload) return "";
  const mime = asString(mimeType) || "image/jpeg";
  return `data:${mime};base64,${payload}`;
}

async function fetchImageBytesFromUrl(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      Accept: "image/*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Image fetch failed (${response.status}) for ${imageUrl}`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { dataUri: `data:${mimeType};base64,${buffer.toString("base64")}`, mimeType };
}

/**
 * @param {object} input — string text or { image: dataUri|url }
 * @returns {Promise<number[]>}
 */
export async function fetchJinaEmbeddingVector(input, { apiKey, task = "retrieval.passage" } = {}) {
  const key = asString(apiKey);
  if (!key) {
    const error = new Error("JINA_API_KEY is not configured.");
    error.code = "MISSING_API_KEY";
    throw error;
  }

  const response = await fetch(JINA_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: JINA_EMBEDDING_MODEL,
      input: [input],
      task,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      asString(payload?.message) ||
      asString(payload?.error) ||
      `Jina embeddings failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const embedding = payload?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || !embedding.length) {
    throw new Error("Jina embeddings response did not include a vector.");
  }

  return embedding;
}

export async function resolveImageEmbeddingInput({ imageBase64, mimeType, imageUrl }) {
  if (stripBase64Payload(imageBase64)) {
    return { image: toDataUri(imageBase64, mimeType) };
  }

  const url = asString(imageUrl);
  if (!url) {
    throw new Error("Image input requires imageBase64 or imageUrl.");
  }

  return { image: url, imageUrl: url };
}

export { stripBase64Payload, toDataUri, fetchImageBytesFromUrl };
