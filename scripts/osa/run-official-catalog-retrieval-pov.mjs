import { readFile } from "fs/promises";
import { resolve } from "path";
import { buildOfficialCatalogIndexes } from "../../app/lib/catalog/buildOfficialCatalogIndexes.js";
import { createJinaClipVisualEmbeddingAdapter } from "../../app/lib/embeddings/adapters/jinaClipVisualEmbeddingAdapter.js";
import { createModeluxOfficialCatalogAdapter } from "../../app/lib/registry/adapters/modeluxOfficialCatalogAdapter.js";
import { runInternalRegistryRetrieval } from "../../app/lib/retrieval/internalRegistryRetrieval.js";
import { recallAtK } from "../../app/lib/retrieval/retrievalMetrics.js";
import {
  assertLivePovConfiguration,
  createLivePovNavigator,
  validateLivePovRetrievalCandidates,
} from "../../app/lib/ccn/validateLivePovRetrievalCandidates.js";
import { POST as analyzeImage } from "../../app/api/analyze-image/route.js";
import { runChiefCatalogNavigatorLive } from "../../app/lib/ccn/live/ccnLiveAdapter.js";

async function loadLocalEnv() {
  const raw = await readFile(resolve(process.cwd(), ".env.local"), "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

await loadLocalEnv();
assertLivePovConfiguration();
const queryPath = process.argv[2];
if (!queryPath) throw new Error("Usage: node scripts/osa/run-official-catalog-retrieval-pov.mjs <query-image> [topK] [catalogLimit]");
if (!process.env.JINA_API_KEY) throw new Error("JINA_API_KEY is required for the real PoV.");
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required to derive Vision for CCN/G3.");

const topK = Number(process.argv[3]) || 5;
const catalogLimit = Number(process.argv[4]) || 12;
const imageBytes = await readFile(queryPath);
const imageBase64 = imageBytes.toString("base64");
const embeddingProvider = createJinaClipVisualEmbeddingAdapter();
const sourceAdapter = createModeluxOfficialCatalogAdapter({ limit: catalogLimit });
const indexes = await buildOfficialCatalogIndexes({ sourceAdapter, embeddingProvider });
const candidates = await runInternalRegistryRetrieval({
  query: { imageBase64, mimeType: "image/jpeg" },
  indexes,
  embeddingProvider,
  topK,
});

const response = await analyzeImage(new Request("http://localhost/api/analyze-image", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ imageBase64, mimeType: "image/jpeg", languageMode: "ru", analysisMode: "full" }),
}));
const analysis = await response.json();
if (!response.ok || !analysis.vision) throw new Error(`Image-derived Vision failed: ${analysis.error || response.status}`);
const liveNavigator = createLivePovNavigator({ navigator: runChiefCatalogNavigatorLive });
const validated = await validateLivePovRetrievalCandidates({
  candidates,
  vision: analysis.vision,
  liveNavigator,
});
const accepted = validated.find((candidate) => candidate.ccn_g3.outcome === "accepted") || null;

console.log(JSON.stringify({
  run_type: "independent_full_scene_real_query",
  query_inputs: { pixels_only: true, ocr_used: false, filename_used_as_signal: false, metadata_used: false },
  source: {
    manufacturer_id: indexes.source_snapshot.manufacturer_id,
    source_adapter_id: indexes.source_snapshot.source_adapter_id,
    source_path: indexes.source_snapshot.source_path,
    source_snapshot_id: indexes.source_snapshot.source_snapshot_id,
  },
  index_sizes: {
    products: indexes.product_index.records.length,
    media: indexes.media_index.records.length,
    embeddings: indexes.embedding_store.records.length,
    visual_vectors: indexes.visual_index.records.length,
    dimensions: indexes.visual_index.dimensions,
    embedding_failures: indexes.failures.length,
  },
  embedding_model: {
    provider_id: indexes.visual_index.provider_id,
    model_id: indexes.visual_index.model_id,
    model_version: indexes.visual_index.model_version,
  },
  top_k: validated.map((candidate) => ({
    rank: candidate.rank,
    similarity: Number(candidate.similarity.toFixed(6)),
    manufacturer_id: candidate.manufacturer_id,
    article: candidate.article,
    title: candidate.product?.title || null,
    official_url: candidate.product?.official_url || null,
    ccn_g3: candidate.ccn_g3,
  })),
  final_outcome: accepted ? { outcome: "accepted", article: accepted.article } : { outcome: "needs_human", reason: "No retrieval candidate was confirmed as the same article by CCN + G3." },
  recall_at_k: recallAtK({ retrievedArticles: candidates.map((candidate) => candidate.article), goldArticle: null }).value,
}, null, 2));
