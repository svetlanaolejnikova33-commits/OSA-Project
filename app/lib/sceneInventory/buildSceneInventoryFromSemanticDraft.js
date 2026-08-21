import { resolveRegistryCategoryFromSceneObjectType } from "../sceneObjectRegistryRouting.js";
import { getRegistryCategoryById } from "../supplierRegistry.js";
import { validateSceneInventory } from "./sceneInventoryContract.js";

function text(value) { return typeof value === "string" ? value.trim() : ""; }
function array(value) { return Array.isArray(value) ? value : []; }
function unique(values, limit = 12) { return [...new Set(values.flat(Infinity).map(text).filter(Boolean))].slice(0, limit); }
function haystack(...values) { return values.flat(Infinity).map(text).filter(Boolean).join(" ").toLowerCase(); }

const ORDER = Object.freeze({
  walls: 20, flooring: 30, ceiling: 40, doors: 50,
  ceiling_lighting: 60, wall_lighting: 61, floor_lighting: 62, integrated_lighting: 63,
  cabinet_furniture: 70, built_in_furniture: 71, upholstered_furniture: 72, additional_furniture: 73,
  textiles: 80, decor: 90,
});

function classify(object) {
  const value = haystack(object.type, object.labelRu, object.categoryId, object.supplierCategoryId);
  if (/wall|стен/.test(value)) return ["walls", "wall_finish"];
  if (/floor|пол|flooring/.test(value) && !/lamp|свет/.test(value)) return ["flooring", "floor_finish"];
  if (/ceiling|потол/.test(value) && !/lamp|light|свет|pendant|chandelier/.test(value)) return ["ceiling", "ceiling_finish"];
  if (/door|двер/.test(value)) return ["doors", "door"];
  if (/pendant|chandelier|ceiling_light|люстр|подвес/.test(value)) return ["ceiling_lighting", text(object.type) || "pendant"];
  if (/wall_lamp|wall_sconce|бра/.test(value)) return ["wall_lighting", text(object.type) || "wall_sconce"];
  if (/floor_lamp|торшер/.test(value)) return ["floor_lighting", text(object.type) || "floor_lamp"];
  if (/spotlight|recessed|track_light|встроенн.*свет|спот/.test(value)) return ["integrated_lighting", text(object.type) || "recessed_light"];
  if (/sofa|armchair|chair|bed|пуф|диван|кресл/.test(value)) return ["upholstered_furniture", text(object.type)];
  if (/built.?in|встроенн/.test(value)) return ["built_in_furniture", text(object.type)];
  if (/cabinet|wardrobe|kitchen|шкаф|кухн/.test(value)) return ["cabinet_furniture", text(object.type)];
  if (/table|console|shelf|стол|консол|полк/.test(value)) return ["additional_furniture", text(object.type)];
  if (/textile|curtain|rug|ков[её]р|штор/.test(value)) return ["textiles", text(object.type)];
  return ["decor", text(object.type) || "object"];
}

function matchingDetails(semanticDraft, object) {
  const identity = unique([object.type, object.labelRu]).map((value) => value.toLowerCase());
  const candidates = [
    ...array(semanticDraft?.proAnalysis?.lightingAnalysis?.artificialLight),
    ...array(semanticDraft?.proAnalysis?.furnitureAnalysis),
    ...array(semanticDraft?.proAnalysis?.textileAnalysis),
    ...array(semanticDraft?.proAnalysis?.decorAnalysis),
    ...array(semanticDraft?.proAnalysis?.objects),
  ];
  return candidates.filter((candidate) => {
    const candidateText = haystack(candidate?.type, candidate?.labelRu);
    return identity.some((token) => token.length > 2 && candidateText.includes(token));
  });
}

function inferForm(value) {
  if (/sphere|spherical|orb|шар|сфер/.test(value)) return "spherical";
  if (/round|circular|круг/.test(value)) return "round";
  if (/rectang|прямоугол/.test(value)) return "rectangular";
  if (/linear|линейн/.test(value)) return "linear";
  return "";
}

function inferMounting(value) {
  if (/pendant|chandelier|ceiling|подвес|люстр|потол/.test(value)) return ["ceiling", "suspended"];
  if (/wall|бра|стен/.test(value)) return ["wall"];
  if (/floor_lamp|торшер|наполь/.test(value)) return ["floor", "freestanding"];
  if (/built.?in|recessed|встроенн/.test(value)) return ["recessed"];
  return [];
}

function inferMustNot(category) {
  if (category === "ceiling_lighting") return ["floor-mounted lighting", "wall-mounted lighting"];
  if (category === "wall_lighting") return ["ceiling-mounted lighting", "floor-mounted lighting"];
  if (category === "floor_lighting") return ["ceiling-mounted lighting", "wall-mounted lighting"];
  return [];
}

function buildItem(semanticDraft, object, index) {
  const canonical = Boolean(object.morphology || object.appearance || object.installation || object.evidence);
  const details = canonical ? [] : matchingDetails(semanticDraft, object);
  const [legacyCategory, legacySubcategory] = classify(object);
  const registryCategory = text(object.supplierCategoryId) || text(object.categoryId) ||
    resolveRegistryCategoryFromSceneObjectType(object.type) || "";
  const registry = getRegistryCategoryById(registryCategory);
  const category = text(registry?.type) || legacyCategory;
  const subcategory = registryCategory || legacySubcategory;
  const sourceText = haystack(
    object.type, object.labelRu, object.materialGuess, object.colorGuess,
    details.map((item) => [item.type, item.labelRu, item.position, item.lightRole, item.style,
      item.materialGuess, item.finish, item.color, item.texture, item.pattern, item.visibleElements]),
  );
  const materials = unique([object.appearance?.materialsObserved, canonical ? [] : object.materialGuess]);
  const materialHypotheses = unique(object.appearance?.materialHypotheses);
  const colors = unique([object.appearance?.colors, object.colorGuess]);
  const textures = unique(object.appearance?.textures);
  const patterns = unique(object.appearance?.patterns);
  const finish = unique(object.appearance?.finishes);
  const mounting = unique([object.installation?.mounting, canonical ? [] : inferMounting(sourceText)]);
  const hardware = unique(details.flatMap((item) => array(item.visibleElements)).filter((feature) =>
    /canopy|cable|chain|arm|frame|base|креп|трос|цеп|каркас|основан/i.test(feature)), 8);
  const canonicalHardware = unique(object.installation?.visibleHardware);
  const components = unique(object.installation?.visibleComponents);
  const visualFeatures = unique([
    object.morphology?.characteristicFeatures,
    object.evidence?.visibleFeatures,
    canonical ? [] : text(object.labelRu),
    details.map((item) => item.visibleElements),
    details.map((item) => item.lightRole || item.designRole),
  ], 12);
  const form = text(object.morphology?.form) || inferForm(sourceText);
  const geometry = text(object.morphology?.geometry);
  const construction = unique([object.morphology?.construction, object.morphology?.composition]).join("; ");
  const quantity = Math.max(1, Number(object.quantity?.count) || 1);
  const grouping = text(object.quantity?.grouping) || "single";
  const must = unique([
    "category=" + category,
    "subcategory=" + subcategory,
    form && "form=" + form,
    object.morphology?.construction && "construction=" + object.morphology.construction,
    mounting.map((value) => "mounting=" + value),
    quantity > 1 && "quantity=" + quantity,
    grouping !== "single" && "grouping=" + grouping,
  ]);
  const should = unique([
    materials, materialHypotheses, colors, textures, patterns, finish,
    geometry, visualFeatures, canonicalHardware, components,
  ]);
  const relations = array(semanticDraft?.sceneGraph?.relationships)
    .filter((relation) => relation.fromObjectId === object.id || relation.toObjectId === object.id)
    .map((relation) => ({
      direction: relation.fromObjectId === object.id ? "outgoing" : "incoming",
      relation: text(relation.relation),
      target_node_id: relation.fromObjectId === object.id ? text(relation.toObjectId) : text(relation.fromObjectId),
      evidence: text(relation.evidence),
      confidence: Number(relation.confidence) || 0,
    }));
  return {
    inventory_item_id: `inventory:${text(object.id) || index + 1}`,
    source_object_id: text(object.id) || `object_${index + 1}`,
    source_node_id: text(object.id) || "node_" + (index + 1),
    node_kind: object.nodeKind === "surface" ? "surface" : "object",
    zone_id: text(object.zoneId),
    order: (ORDER[legacyCategory] || (registry?.type === "finish" ? 20 : 999)) * 100 + index,
    category, subcategory, form, geometry, construction, materials,
    material_hypotheses: materialHypotheses, colors, textures, patterns, finish,
    mounting, hardware: canonical ? canonicalHardware : hardware, components,
    visual_features: visualFeatures,
    must,
    should,
    must_not: unique([
      "different category than " + category,
      "attributes borrowed from other scene nodes",
      "hidden or unsupported attributes",
    ]),
    registry_category_id: registryCategory,
    quantity,
    quantity_unit: text(object.quantity?.unit) || "item",
    grouping,
    arrangement: text(object.quantity?.arrangement),
    relations,
    evidence: {
      region_description: text(object.evidence?.regionDescription),
      visible_features: unique(object.evidence?.visibleFeatures),
      confidence: Number(object.evidence?.confidence) || Number(object.confidence) || 0,
    },
    uncertainty: {
      unknown_fields: unique(object.uncertainty?.unknownFields),
      hypotheses: unique(object.uncertainty?.hypotheses),
    },
    confidence: Number(object.confidence) || 0,
    sku_relevant: Boolean(object.futureReady?.skuRelevant || registry?.skuRelevant),
    bim_relevant: Boolean(object.futureReady?.bimRelevant || registry?.bimRelevant),
    budget_relevant: Boolean(object.futureReady?.budgetRelevant || registry?.budgetRole),
  };
}

export function buildSceneInventoryFromSemanticDraft(semanticDraft) {
  if (!semanticDraft || typeof semanticDraft !== "object") return null;
  const quick = semanticDraft.quickAnalysis || {};
  const pro = semanticDraft.proAnalysis || {};
  const style = pro.styleAnalysis || quick.styleAnalysis || {};
  const color = pro.colorAnalysis || quick.colorAnalysis || {};
  return validateSceneInventory({
    version: "2.0",
    source: "CVO",
    scene_context: {
      space_type: text(pro.spaceType?.labelRu || pro.spaceType?.value || quick.spaceType?.labelRu || semanticDraft.sceneGraph?.spaceType),
      style: text(style.labelRu || style.primary),
      color_palette: unique([array(color.dominantColors), array(color.accentColors), color.paletteDescriptionRu]),
    },
    items: [
      ...array(semanticDraft.sceneGraph?.surfaces).map((surface) => ({ ...surface, nodeKind: "surface" })),
      ...array(semanticDraft.sceneGraph?.objects).map((object) => ({ ...object, nodeKind: "object" })),
    ].map((node, index) => buildItem(semanticDraft, node, index)),
    confidence: Number(semanticDraft.sceneGraph?.confidence) || 0,
  });
}
