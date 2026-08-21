import { readFile } from "node:fs/promises";
import { runInternalRegistryRetrieval } from "../../../app/lib/retrieval/internalRegistryRetrieval.js";

const results = {};

async function check(name, callback) {
  try {
    results[name] = { pass: true, ...(await callback()) };
  } catch (error) {
    results[name] = {
      pass: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  process.stdout.write(JSON.stringify({ [name]: results[name] }) + "\n");
}

const indexes = {
  product_index: { records: [{ product_id: "p1", manufacturer_id: "m1", article: "A1" }] },
  media_index: { records: [{ media_id: "media1", product_id: "p1" }] },
  visual_index: {
    provider_id: "mock",
    model_id: "mock-model",
    model_version: "1",
    dimensions: 3,
    records: [{
      media_id: "media1",
      product_id: "p1",
      manufacturer_id: "m1",
      article: "A1",
      provider_id: "mock",
      model_id: "mock-model",
      model_version: "1",
      vector: [1, 0, 0],
    }],
  },
};

await check("image_query_regression", async () => {
  let imageCalls = 0;
  let briefCalls = 0;
  const provider = {
    provider_id: "mock",
    model_id: "mock-model",
    model_version: "1",
    dimensions: 3,
    embedCatalogImage: async () => [1, 0, 0],
    embedQueryImage: async () => { imageCalls += 1; return [1, 0, 0]; },
    embedRetrievalBrief: async () => { briefCalls += 1; return [1, 0, 0]; },
  };
  const candidates = await runInternalRegistryRetrieval({
    query: { imageBase64: "fixture", mimeType: "image/jpeg" },
    indexes,
    embeddingProvider: provider,
    topK: 1,
  });
  const provenance = candidates[0]?.retrieval_provenance;
  if (imageCalls !== 1 || briefCalls !== 0 || candidates.length !== 1 ||
      provenance?.query_type !== "image" || provenance?.inventory_item_id !== null) {
    throw new Error("Image-query regression assertions failed.");
  }
  return {
    embedQueryImage_calls: imageCalls,
    embedRetrievalBrief_calls: briefCalls,
    top_k: candidates.length,
    query_type: provenance.query_type,
    inventory_item_id: provenance.inventory_item_id,
  };
});

await check("retrieval_brief_regression", async () => {
  let imageCalls = 0;
  let briefCalls = 0;
  let semanticQueryPreserved = false;
  const brief = Object.freeze({
    inventory_item_id: "inventory:fixture-light",
    semantic_query: "Category: lighting. MUST: category=lighting",
  });
  const provider = {
    provider_id: "mock",
    model_id: "mock-model",
    model_version: "1",
    dimensions: 3,
    embedCatalogImage: async () => [1, 0, 0],
    embedQueryImage: async () => { imageCalls += 1; return [1, 0, 0]; },
    embedRetrievalBrief: async (input) => {
      briefCalls += 1;
      semanticQueryPreserved = input === brief && input.semantic_query === brief.semantic_query;
      return [1, 0, 0];
    },
  };
  const candidates = await runInternalRegistryRetrieval({
    query: { retrievalBrief: brief },
    indexes,
    embeddingProvider: provider,
    topK: 1,
  });
  const provenance = candidates[0]?.retrieval_provenance;
  if (briefCalls !== 1 || imageCalls !== 0 || !semanticQueryPreserved || candidates.length !== 1 ||
      provenance?.query_type !== "scene_inventory_retrieval_brief" ||
      provenance?.inventory_item_id !== brief.inventory_item_id) {
    throw new Error("Retrieval Brief regression assertions failed.");
  }
  return {
    embedRetrievalBrief_calls: briefCalls,
    embedQueryImage_calls: imageCalls,
    semantic_query_preserved: semanticQueryPreserved,
    top_k: candidates.length,
    query_type: provenance.query_type,
    inventory_item_id: provenance.inventory_item_id,
  };
});

await check("official_catalog_pov_wiring", async () => {
  const pov = await readFile("scripts/osa/run-official-catalog-retrieval-pov.mjs", "utf8");
  const adapter = await readFile("app/lib/embeddings/adapters/jinaClipVisualEmbeddingAdapter.js", "utf8");
  const cvoToInventory = /analyzeImage[\s\S]*analysis\.sceneInventory/.test(pov);
  const briefSelected = /selectLightingRetrievalBrief\(analysis\.sceneInventory\)/.test(pov);
  const retrievalUsesBrief = /runInternalRegistryRetrieval\(\{[\s\S]*query:\s*\{\s*retrievalBrief\s*\}/.test(pov);
  const semanticQueryReachesAdapter =
    /embedRetrievalBrief:\s*embedBrief/.test(adapter) && /brief\?\.semantic_query/.test(adapter);
  const misleadingPixelsOnly = /query_inputs:\s*\{\s*pixels_only:\s*true/.test(pov);
  if (!cvoToInventory || !briefSelected || !retrievalUsesBrief ||
      !semanticQueryReachesAdapter || misleadingPixelsOnly) {
    throw new Error(JSON.stringify({
      cvo_to_inventory: cvoToInventory,
      brief_selected: briefSelected,
      retrieval_uses_brief: retrievalUsesBrief,
      semantic_query_reaches_adapter: semanticQueryReachesAdapter,
      misleading_pixels_only_metadata_present: misleadingPixelsOnly,
    }));
  }
  return {
    source_input: "full_scene_image",
    retrieval_query: "retrieval_brief.semantic_query",
    semantic_query_reaches_adapter: true,
    misleading_pixels_only_metadata_present: false,
  };
});

if (!Object.values(results).every((result) => result.pass)) process.exitCode = 1;
