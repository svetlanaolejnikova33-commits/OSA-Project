/**
 * Phase 5J.3D — smoke test for Jina image embedding similarity.
 * Usage: node scripts/test-jina-image-similarity.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");

function loadEnvLocal() {
  if (!process.env.JINA_API_KEY && fs.existsSync(ENV_LOCAL)) {
    const text = fs.readFileSync(ENV_LOCAL, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();
  const apiKey = (process.env.JINA_API_KEY || "").trim();
  if (!apiKey || apiKey === "PASTE_JINA_KEY_HERE") {
    console.log("hasKey: false");
    process.exitCode = 1;
    return;
  }

  const { buildImageEmbedding, compareEmbeddings, cosineSimilarity } = await import(
    "../app/lib/visualSearch/imageSimilarity.js"
  );
  const { JINA_EMBEDDING_MODEL } = await import("../app/lib/visualSearch/jinaEmbeddings.js");

  const tinyPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  console.log("embedding endpoint: https://api.jina.ai/v1/embeddings");
  console.log("embedding model:", JINA_EMBEDDING_MODEL);

  const source = await buildImageEmbedding({
    imageBase64: tinyPngBase64,
    mimeType: "image/png",
    apiKey,
    task: "retrieval.query",
  });

  console.log("source embedding dimensions:", source.dimensions);

  const candidate = await buildImageEmbedding({
    imageBase64: tinyPngBase64,
    mimeType: "image/png",
    apiKey,
    task: "retrieval.passage",
  });

  const scored = compareEmbeddings(source.embedding, [
    { candidate: { title: "test candidate A" }, embedding: candidate.embedding },
    { candidate: { title: "test candidate B" }, embedding: source.embedding },
  ]);

  console.log("cosineSimilarity self-test:", cosineSimilarity(source.embedding, source.embedding));
  console.log("ranked candidates:", scored.length);
  console.log(
    "top matches:",
    scored.map((row) => ({ title: row.candidate.title, similarity: row.visualSimilarityPercent })),
  );
}

main().catch((error) => {
  console.error("error:", error.message);
  process.exitCode = 1;
});
