import { validateSemanticDraft } from "../../../app/lib/validateSemanticDraft.js";
import { mapSemanticDraftToVisionJson } from "../../../app/lib/mapSemanticDraftToVisionJson.js";
import { validateVisionJson } from "../../../app/lib/visionJsonContract.js";
import { buildSceneInventoryFromSemanticDraft } from "../../../app/lib/sceneInventory/buildSceneInventoryFromSemanticDraft.js";
import { buildRetrievalBriefQueue } from "../../../app/lib/sceneInventory/buildRetrievalBrief.js";

function assert(value, message) { if (!value) throw new Error(message); }
function node(id, type, registry, options = {}) {
  const features = options.features || [];
  return {
    id, labelRu: options.label || type, type, categoryId: "", supplierCategoryId: registry,
    zoneId: "zone-main",
    position: { horizontal: "center", vertical: "middle", depth: "middle" },
    visualWeight: "medium", replacementRisk: "medium", editablePotential: "medium",
    budgetWeight: "medium", materialGuess: options.hypothesis || "", colorGuess: options.colors?.[0] || "",
    confidence: 0.94,
    quantity: {
      count: options.count || 1, unit: "item", grouping: options.grouping || "single",
      arrangement: options.arrangement || "",
    },
    morphology: {
      form: options.form || "", geometry: options.geometry || "",
      construction: options.construction || "", composition: options.composition || "",
      characteristicFeatures: features,
    },
    appearance: {
      materialsObserved: options.materials || [],
      materialHypotheses: options.hypothesis ? [options.hypothesis] : [],
      colors: options.colors || [], textures: options.textures || [],
      patterns: options.patterns || [], finishes: options.finishes || [],
    },
    installation: {
      mounting: options.mounting || [], visibleHardware: options.hardware || [],
      visibleComponents: options.components || [],
    },
    evidence: { regionDescription: options.region || "", visibleFeatures: features, confidence: 0.94 },
    uncertainty: { unknownFields: options.unknown || [], hypotheses: [] },
    futureReady: {
      maskEditable: options.sku !== false, bimRelevant: Boolean(options.bim),
      skuRelevant: options.sku !== false, budgetRelevant: options.budget !== false,
    },
  };
}

const surfaces = [
  node("surface-wall", "wall_finish", "wall_finish.paint", {
    form: "planar", geometry: "vertical plane", materials: ["painted finish"],
    colors: ["warm grey"], textures: ["smooth"], finishes: ["matte"],
    region: "rear wall", bim: true,
  }),
  node("surface-floor", "floor_finish", "floor_finish.porcelain_tile", {
    form: "planar", geometry: "horizontal plane", materials: ["porcelain tile"],
    colors: ["light stone"], textures: ["polished"], patterns: ["large-format veining"],
    region: "lower image plane", bim: true,
  }),
  node("surface-ceiling", "ceiling", "ceiling.painted_ceiling", {
    form: "planar", geometry: "overhead plane", materials: ["painted finish"],
    colors: ["white"], finishes: ["matte"], region: "upper image plane", bim: true,
  }),
];
const objects = [
  node("object-light", "pendant", "lighting.pendants", {
    count: 3, grouping: "group", arrangement: "vertical cluster at varied heights",
    form: "spherical", geometry: "three repeated rounded volumes",
    construction: "separate suspended elements", composition: "vertical grouped composition",
    features: ["three spherical elements", "varied suspension heights", "radial textured silhouettes"],
    materials: ["transparent faceted elements", "silver-coloured metal"],
    hypothesis: "crystal or cut glass", colors: ["transparent", "silver"],
    textures: ["faceted", "sparkling"], finishes: ["polished"], mounting: ["ceiling suspended"],
    hardware: ["round ceiling canopy", "three suspension cables"],
    components: ["three shades", "ceiling canopy", "suspension cables"],
    region: "upper centre above dining area", unknown: ["brand", "exact material"],
  }),
  node("object-table", "dining_table", "furniture.tables", {
    form: "rectangular", construction: "tabletop and supporting base",
    materials: ["wood veneer"], colors: ["dark brown"], textures: ["wood grain"],
    finishes: ["satin"], region: "centre of dining zone",
  }),
  node("object-chairs", "dining_chair", "furniture.chairs", {
    count: 6, grouping: "set", arrangement: "around dining table",
    form: "curved upholstered shell", construction: "upholstered shell on four legs",
    materials: ["upholstery textile", "dark metal"], colors: ["olive green", "black"],
    textures: ["soft woven upholstery"], region: "around dining table",
  }),
  node("object-curtains", "curtain", "textile.curtains", {
    count: 2, grouping: "pair", arrangement: "flanking window",
    form: "vertical pleated panels", materials: ["woven textile"], colors: ["warm grey"],
    textures: ["soft weave"], patterns: ["plain"], mounting: ["ceiling track"], region: "right wall opening",
  }),
  node("assembly-dining", "dining_group", "", {
    grouping: "assembly", composition: "table with surrounding chair set",
    features: ["coordinated dining group"], region: "central zone", sku: false,
  }),
];

const semanticDraft = validateSemanticDraft({
  quickAnalysis: {
    spaceType: { value: "kitchen_dining", labelRu: "Kitchen dining", confidence: 0.96 },
    styleAnalysis: { primary: "contemporary", labelRu: "Contemporary", confidence: 0.91 },
    colorAnalysis: { dominantColors: ["warm grey"], accentColors: ["olive green"] },
  },
  sceneGraph: {
    version: "2.0", spaceType: "kitchen_dining", coordinateSystem: "relative_2d", confidence: 0.95,
    zones: [{
      id: "zone-main", labelRu: "Dining zone", type: "dining", position: "center",
      role: "primary", relatedObjects: objects.map((item) => item.id), confidence: 0.96,
    }],
    surfaces, objects,
    relationships: [
      { fromObjectId: "object-light", toObjectId: "surface-ceiling", relation: "mounted_on", confidence: 0.98, evidence: "cables terminate at ceiling canopy" },
      { fromObjectId: "object-chairs", toObjectId: "assembly-dining", relation: "part_of", confidence: 0.99, evidence: "chairs surround table" },
      { fromObjectId: "object-table", toObjectId: "assembly-dining", relation: "part_of", confidence: 0.99, evidence: "table centres group" },
      { fromObjectId: "object-curtains", toObjectId: "surface-wall", relation: "attached_to", confidence: 0.9, evidence: "curtains follow wall opening" },
    ],
    preservationRules: [],
  },
}, { languageMode: "ru", analysisMode: "full" });

assert(semanticDraft.sceneGraph.surfaces.length === 3, "surface coverage");
assert(semanticDraft.sceneGraph.objects.length === 5, "object coverage");
assert(semanticDraft.sceneGraph.objects[0].quantity.count === 3, "grouping preserved");
assert(semanticDraft.sceneGraph.objects[0].morphology.form === "spherical", "morphology preserved");
assert(semanticDraft.sceneGraph.relationships.some((item) => item.relation === "part_of"), "part-whole preserved");
assert(semanticDraft.sceneGraph.relationships.some((item) => item.relation === "mounted_on"), "object-surface relation preserved");

const inventory = buildSceneInventoryFromSemanticDraft(semanticDraft);
assert(inventory.items.length === surfaces.length + objects.length, "Inventory complete relative to Graph");
const light = inventory.items.find((item) => item.source_node_id === "object-light");
assert(light.quantity === 3 && light.grouping === "group", "quantity projected");
assert(light.form === "spherical" && light.components.includes("three shades"), "morphology projected");
assert(light.relations.some((item) => item.target_node_id === "surface-ceiling"), "relations projected");
assert(!light.materials.includes("upholstery textile") && !light.colors.includes("olive green"), "no cross-object contamination");

const primaryVision = mapSemanticDraftToVisionJson(semanticDraft);
assert(validateVisionJson(primaryVision).ok, "primary Vision backward compatible");
const queue = buildRetrievalBriefQueue(inventory);
assert(queue.length === 7, "one brief per eligible node");
assert(queue.every((brief) => brief.must.length && brief.should.length && brief.must_not.length), "deterministic constraints");
assert(queue.every((brief) => brief.semantic_query.includes("MUST:")), "brief participates in semantic retrieval");
assert(queue.map((brief) => brief.source_node_id).join(",") === [
  "surface-wall", "surface-floor", "surface-ceiling", "object-light",
  "object-chairs", "object-table", "object-curtains",
].join(","), "stable canonical processing order");

console.log(JSON.stringify({ sceneGraph: semanticDraft.sceneGraph, sceneInventory: inventory, retrievalBriefQueue: queue }, null, 2));
