import { validateSemanticDraft } from "../../../app/lib/validateSemanticDraft.js";
import { mapSemanticDraftToVisionJson } from "../../../app/lib/mapSemanticDraftToVisionJson.js";
import { validateVisionJson } from "../../../app/lib/visionJsonContract.js";
import { buildSceneInventoryFromSemanticDraft } from "../../../app/lib/sceneInventory/buildSceneInventoryFromSemanticDraft.js";
import { selectLightingRetrievalBrief } from "../../../app/lib/sceneInventory/buildRetrievalBrief.js";
import { runInternalRegistryRetrieval } from "../../../app/lib/retrieval/internalRegistryRetrieval.js";
import { validateLivePovRetrievalCandidates } from "../../../app/lib/ccn/validateLivePovRetrievalCandidates.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const semanticDraft = validateSemanticDraft({
  quickAnalysis: {
    spaceType: { value: "dining_room", labelRu: "?????-????????", confidence: 0.96 },
    styleAnalysis: { primary: "contemporary", labelRu: "???????????", confidence: 0.91 },
    colorAnalysis: { dominantColors: ["warm grey", "walnut"], accentColors: ["olive green"] },
  },
  proAnalysis: {
    lightingAnalysis: {
      artificialLight: [{
        type: "pendant", labelRu: "????????????? ??????????? ??????", position: "??? ??????",
        lightRole: "focal dining light", temperatureEstimate: "warm", estimatedKelvin: "3000K", confidence: 0.97,
      }],
    },
    furnitureAnalysis: [
      { type: "dining_chair", labelRu: "????????? ????", position: "? ?????", style: "modern", materialGuess: "velvet", finish: "matte", color: "olive green", confidence: 0.95 },
      { type: "dining_table", labelRu: "????????? ????", position: "?????", style: "modern", materialGuess: "walnut wood", finish: "satin", color: "brown", confidence: 0.94 },
    ],
  },
  sceneGraph: {
    spaceType: "dining_room", confidence: 0.96,
    objects: [
      { id: "light-1", type: "pendant", labelRu: "????????????? ??????????? ??????", supplierCategoryId: "lighting.pendants", materialGuess: "crystal and chrome", colorGuess: "clear", confidence: 0.97, futureReady: { skuRelevant: true, budgetRelevant: true } },
      { id: "chair-1", type: "dining_chair", labelRu: "????????? ????", supplierCategoryId: "furniture.chairs", materialGuess: "velvet", colorGuess: "olive green", confidence: 0.95, futureReady: { skuRelevant: true, budgetRelevant: true } },
      { id: "table-1", type: "dining_table", labelRu: "????????? ????", supplierCategoryId: "furniture.tables", materialGuess: "walnut wood", colorGuess: "brown", confidence: 0.94, futureReady: { skuRelevant: true, budgetRelevant: true } },
    ],
  },
}, { languageMode: "ru", analysisMode: "full" });

const inventory = buildSceneInventoryFromSemanticDraft(semanticDraft);
assert(inventory.items.length >= 3, "full scene preserves multiple inventory objects");
const light = inventory.items.find((item) => item.source_object_id === "light-1");
assert(light, "lighting item is preserved");
assert(light.material_hypotheses.includes("crystal and chrome"), "lighting keeps its own material hypothesis");
assert(!light.materials.includes("velvet") && !light.colors.includes("olive green"), "lighting does not mix furniture features");

const primaryVision = mapSemanticDraftToVisionJson(semanticDraft);
assert(validateVisionJson(primaryVision).ok, "primary Vision remains contract-compatible");

const brief = selectLightingRetrievalBrief(inventory);
assert(brief?.inventory_item_id === light.inventory_item_id, "eligible lighting item creates the Retrieval Brief");
assert(brief.must.length && brief.should.length && brief.must_not.length, "Retrieval Brief has MUST/SHOULD/MUST_NOT");
assert(brief.semantic_query.includes("MUST:") && brief.semantic_query.includes("MUST NOT:"), "constraints participate in semantic query");

let briefEmbeddingCalls = 0;
let imageEmbeddingCalls = 0;
const provider = {
  provider_id: "fixture-provider", model_id: "fixture-clip", model_version: "1", dimensions: 3,
  embedCatalogImage: async () => [1, 0, 0],
  embedQueryImage: async () => { imageEmbeddingCalls += 1; return [0, 1, 0]; },
  embedRetrievalBrief: async (input) => {
    briefEmbeddingCalls += 1;
    assert(input === brief && input.semantic_query.includes("crystal and chrome"), "retrieval embeds the selected object brief");
    return [1, 0, 0];
  },
};
const indexes = {
  product_index: { records: [{ product_id: "p1", manufacturer_id: "modelux", article: "LIGHT-1", title: "Crystal pendant", official_url: "https://catalog.test/light-1" }] },
  media_index: { records: [{ media_id: "m1", product_id: "p1", official_url: "https://catalog.test/light-1.jpg" }] },
  visual_index: {
    provider_id: provider.provider_id, model_id: provider.model_id, model_version: provider.model_version, dimensions: 3,
    records: [{ media_id: "m1", product_id: "p1", manufacturer_id: "modelux", article: "LIGHT-1", provider_id: provider.provider_id, model_id: provider.model_id, model_version: provider.model_version, vector: [1, 0, 0] }],
  },
};
const candidates = await runInternalRegistryRetrieval({ query: { retrievalBrief: brief }, indexes, embeddingProvider: provider, topK: 1 });
assert(briefEmbeddingCalls === 1 && imageEmbeddingCalls === 0, "Retrieval Brief is the actual query signal");
assert(candidates[0].retrieval_provenance.query_type === "scene_inventory_retrieval_brief", "retrieval provenance records brief query");

const liveEnv = { OSA_CCN_LIVE: "1", OSA_CCN_BROWSER_ENV: "LOCAL" };
const validated = await validateLivePovRetrievalCandidates({
  candidates,
  vision: primaryVision,
  env: liveEnv,
  liveNavigator: async () => ({ gate: { decision: "accept", match_confidence: 0.94 }, product: { source: "CCN_LIVE", article: "LIGHT-1" } }),
});
assert(validated[0].ccn_g3.outcome === "accepted", "lighting vertical reaches Retrieval then CCN/G3 acceptance");

console.log("Scene Inventory vertical fixtures passed", JSON.stringify({ inventory, brief, top_article: candidates[0].article, ccn_g3: validated[0].ccn_g3 }, null, 2));
