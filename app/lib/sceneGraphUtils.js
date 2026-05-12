import { getRegistryCategoryById, getRegistryParentCategory } from "./supplierRegistry";

const UNKNOWN_ZONE_ID = "unknown_zone";
const DEFAULT_CONFIDENCE = 0.5;
const FALLBACK_CONFIDENCE = 0.55;

const ZONE_POSITIONS = new Set(["left", "right", "center", "top", "bottom", "back", "front", "unknown"]);
const ZONE_ROLES = new Set(["primary", "secondary", "decorative", "circulation", "service"]);
const HORIZONTAL_POSITIONS = new Set(["left", "center", "right", "full", "unknown"]);
const VERTICAL_POSITIONS = new Set(["top", "middle", "bottom", "full", "unknown"]);
const DEPTH_POSITIONS = new Set(["front", "middle", "back", "unknown"]);
const LEVELS = new Set(["low", "medium", "high"]);
const RELATIONS = new Set([
  "above",
  "below",
  "next_to",
  "on_top_of",
  "behind",
  "in_front_of",
  "aligned_with",
  "grouped_with",
  "lights",
  "supports",
  "frames",
  "anchors",
]);
const IMPORTANCE_LEVELS = new Set(["low", "medium", "high"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value, fallback = DEFAULT_CONFIDENCE) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : fallback;
}

function pickEnum(value, allowed, fallback) {
  const normalized = asString(value).toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function makeId(prefix, index, rawId) {
  const explicit = asString(rawId);
  if (explicit) return explicit;
  return `${prefix}_${index + 1}`;
}

function normalizeText(value) {
  return asString(value).toLowerCase().replace(/ё/g, "е");
}

function emptySceneGraph() {
  return {
    version: "1.0",
    spaceType: "",
    coordinateSystem: "relative_2d",
    confidence: DEFAULT_CONFIDENCE,
    zones: [],
    objects: [],
    relationships: [],
    preservationRules: [],
  };
}

function inferFutureReady(object) {
  const type = normalizeText(object.type);
  const categoryId = asString(object.categoryId || object.supplierCategoryId);
  const category = categoryId ? getRegistryCategoryById(categoryId) : null;
  const parent = categoryId ? getRegistryParentCategory(categoryId) : null;
  const categoryType = category?.type || parent?.type || "";
  const visualWeight = pickEnum(object.visualWeight, LEVELS, "medium");

  const skuTypes = new Set(["furniture", "lighting", "textile", "decor", "appliance", "sanitary"]);
  const bimTypes = new Set(["finish", "construction"]);
  const maskTypes = new Set(["furniture", "lighting", "textile", "decor"]);

  const skuRelevant = skuTypes.has(categoryType) || /мебел|свет|текстил|декор|сантех|техник|lamp|sofa|chair|table|rug|curtain/i.test(
    `${object.labelRu} ${object.type}`
  );
  const bimRelevant =
    bimTypes.has(categoryType) ||
    /стен|пол|потол|двер|окн|wall|floor|ceiling|door|window/i.test(`${object.labelRu} ${object.type}`);
  const maskEditable =
    (maskTypes.has(categoryType) || skuRelevant) && visualWeight !== "low";
  const budgetRelevant = Boolean(categoryId) || skuRelevant || bimRelevant;

  return {
    maskEditable,
    bimRelevant,
    skuRelevant,
    budgetRelevant,
  };
}

function withSourceMetadata(entry, raw) {
  const source = asString(raw?.source);
  if (source) entry.source = source;
  const sourceField = asString(raw?.sourceField);
  if (sourceField) entry.sourceField = sourceField;
  const sourceText = asString(raw?.sourceText);
  if (sourceText) entry.sourceText = sourceText;
  return entry;
}

function normalizeZone(raw, index) {
  return withSourceMetadata(
    {
      id: makeId("zone", index, raw?.id),
      labelRu: asString(raw?.labelRu) || `Зона ${index + 1}`,
      type: asString(raw?.type) || "zone",
      position: pickEnum(raw?.position, ZONE_POSITIONS, "unknown"),
      role: pickEnum(raw?.role, ZONE_ROLES, "secondary"),
      relatedObjects: asArray(raw?.relatedObjects).map((value) => asString(value)).filter(Boolean),
      confidence: asNumber(raw?.confidence),
    },
    raw
  );
}

function normalizeObject(raw, index, zoneIds) {
  const zoneId = asString(raw?.zoneId);
  const normalizedZoneId = zoneIds.has(zoneId) ? zoneId : UNKNOWN_ZONE_ID;
  const object = {
    id: makeId("object", index, raw?.id),
    labelRu: asString(raw?.labelRu) || `Объект ${index + 1}`,
    type: asString(raw?.type) || "object",
    categoryId: asString(raw?.categoryId),
    supplierCategoryId: asString(raw?.supplierCategoryId),
    zoneId: normalizedZoneId,
    position: {
      horizontal: pickEnum(raw?.position?.horizontal, HORIZONTAL_POSITIONS, "unknown"),
      vertical: pickEnum(raw?.position?.vertical, VERTICAL_POSITIONS, "unknown"),
      depth: pickEnum(raw?.position?.depth, DEPTH_POSITIONS, "unknown"),
    },
    visualWeight: pickEnum(raw.visualWeight, LEVELS, "medium"),
    replacementRisk: pickEnum(raw.replacementRisk, LEVELS, "medium"),
    editablePotential: pickEnum(raw.editablePotential, LEVELS, "medium"),
    budgetWeight: pickEnum(raw.budgetWeight, LEVELS, "medium"),
    materialGuess: asString(raw?.materialGuess),
    colorGuess: asString(raw?.colorGuess),
    confidence: asNumber(raw?.confidence),
    futureReady: {
      maskEditable: Boolean(raw?.futureReady?.maskEditable),
      bimRelevant: Boolean(raw?.futureReady?.bimRelevant),
      skuRelevant: Boolean(raw?.futureReady?.skuRelevant),
      budgetRelevant: Boolean(raw?.futureReady?.budgetRelevant),
    },
  };

  const inferred = inferFutureReady(object);
  object.futureReady = {
    maskEditable: raw?.futureReady?.maskEditable ?? inferred.maskEditable,
    bimRelevant: raw?.futureReady?.bimRelevant ?? inferred.bimRelevant,
    skuRelevant: raw?.futureReady?.skuRelevant ?? inferred.skuRelevant,
    budgetRelevant: raw?.futureReady?.budgetRelevant ?? inferred.budgetRelevant,
  };

  return withSourceMetadata(object, raw);
}

function normalizeRelationship(raw, objectIds, zoneIds) {
  const fromObjectId = asString(raw?.fromObjectId);
  const toObjectId = asString(raw?.toObjectId);
  if (!fromObjectId || !toObjectId) return null;
  if (!objectIds.has(fromObjectId) && !zoneIds.has(fromObjectId)) return null;
  if (!objectIds.has(toObjectId) && !zoneIds.has(toObjectId)) return null;
  return {
    fromObjectId,
    toObjectId,
    relation: pickEnum(raw?.relation, RELATIONS, "grouped_with"),
    confidence: asNumber(raw?.confidence),
  };
}

function normalizePreservationRule(raw, index, objectIds, zoneIds) {
  const targetId = asString(raw?.targetId);
  if (!targetId || (!objectIds.has(targetId) && !zoneIds.has(targetId))) return null;
  return {
    targetId,
    ruleRu: asString(raw?.ruleRu) || `Сохранить ${targetId}`,
    importance: pickEnum(raw?.importance, IMPORTANCE_LEVELS, "medium"),
  };
}

function fallbackSourceMeta(sourceField, sourceText) {
  return {
    source: "fallback",
    sourceField,
    sourceText: asString(sourceText),
  };
}

function inferFallbackFutureReady(type, labelRu) {
  const haystack = normalizeText(`${type} ${labelRu}`);
  const skuRelevant = /мебел|свет|текстил|декор|furniture|light|textile|decor|lamp|sofa|chair|table|rug|curtain/i.test(
    haystack
  );
  const bimRelevant = /стен|пол|потол|двер|окн|wall|floor|ceiling|door|window|finish|surface/i.test(haystack);
  return {
    skuRelevant,
    bimRelevant,
    budgetRelevant: true,
    maskEditable: skuRelevant || bimRelevant,
  };
}

function pushFallbackObject(target, seen, payload) {
  const labelRu = asString(payload.labelRu);
  const dedupeKey = normalizeText(labelRu || payload.type);
  if (!dedupeKey || seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  target.push({
    id: `fallback_object_${target.length + 1}`,
    labelRu: labelRu || payload.type || `Объект ${target.length + 1}`,
    type: asString(payload.type) || "object",
    categoryId: asString(payload.categoryId),
    supplierCategoryId: asString(payload.supplierCategoryId),
    zoneId: UNKNOWN_ZONE_ID,
    position: { horizontal: "unknown", vertical: "unknown", depth: "unknown" },
    visualWeight: "medium",
    replacementRisk: "medium",
    editablePotential: "medium",
    budgetWeight: "medium",
    materialGuess: asString(payload.materialGuess),
    colorGuess: asString(payload.colorGuess),
    confidence: FALLBACK_CONFIDENCE,
    futureReady: payload.futureReady || inferFallbackFutureReady(payload.type, labelRu),
    ...fallbackSourceMeta(payload.sourceField, labelRu || payload.type),
  });
}

function buildFallbackSceneGraphObjects(semanticDraft) {
  const pro = semanticDraft?.proAnalysis || {};
  const spec = semanticDraft?.specAnalysis || {};
  const objects = [];
  const seen = new Set();

  for (const item of asArray(pro.furnitureAnalysis)) {
    pushFallbackObject(objects, seen, {
      labelRu: item.labelRu,
      type: asString(item.type) || "furniture",
      materialGuess: item.materialGuess,
      colorGuess: item.color,
      sourceField: "proAnalysis.furnitureAnalysis",
    });
  }

  for (const item of asArray(pro.lightingAnalysis?.artificialLight)) {
    pushFallbackObject(objects, seen, {
      labelRu: item.labelRu,
      type: asString(item.type) || "lighting",
      sourceField: "proAnalysis.lightingAnalysis.artificialLight",
    });
  }

  for (const note of asArray(pro.lightingAnalysis?.technicalNotes)) {
    pushFallbackObject(objects, seen, {
      labelRu: note,
      type: "lighting",
      sourceField: "proAnalysis.lightingAnalysis.technicalNotes",
    });
  }

  for (const item of asArray(pro.textileAnalysis)) {
    pushFallbackObject(objects, seen, {
      labelRu: item.labelRu,
      type: asString(item.type) || "textile",
      materialGuess: item.materialGuess,
      sourceField: "proAnalysis.textileAnalysis",
    });
  }

  for (const item of asArray(pro.decorAnalysis)) {
    pushFallbackObject(objects, seen, {
      labelRu: item.labelRu,
      type: asString(item.type) || "decor",
      sourceField: "proAnalysis.decorAnalysis",
    });
  }

  const materialAnalysis = pro.materialAnalysis && typeof pro.materialAnalysis === "object" ? pro.materialAnalysis : {};
  for (const [bucketKey, bucketItems] of Object.entries(materialAnalysis)) {
    for (const item of asArray(bucketItems)) {
      const labelRu =
        typeof item === "string"
          ? item
          : asString(item?.possibleMaterial || item?.materialFamily || item?.materialGuess || item?.texture);
      pushFallbackObject(objects, seen, {
        labelRu,
        type: "finish",
        materialGuess: typeof item === "object" ? asString(item?.possibleMaterial || item?.materialFamily) : labelRu,
        sourceField: `proAnalysis.materialAnalysis.${bucketKey}`,
      });
    }
  }

  for (const item of asArray(pro.wallAnalysis)) {
    const labelRu = [item.zone, item.finish, item.texture].filter(Boolean).join(" · ");
    pushFallbackObject(objects, seen, {
      labelRu: labelRu || "Отделка стен",
      type: "wall_finish",
      materialGuess: item.finish,
      colorGuess: item.color,
      sourceField: "proAnalysis.wallAnalysis",
    });
  }

  for (const item of asArray(pro.floorAnalysis)) {
    const labelRu = [item.finish, item.materialGuess, item.tone].filter(Boolean).join(" · ");
    pushFallbackObject(objects, seen, {
      labelRu: labelRu || "Отделка пола",
      type: "floor_finish",
      materialGuess: item.materialGuess || item.finish,
      sourceField: "proAnalysis.floorAnalysis",
    });
  }

  const ceiling = pro.ceilingAnalysis && typeof pro.ceilingAnalysis === "object" ? pro.ceilingAnalysis : {};
  if (asString(ceiling.labelRu) || asString(ceiling.type)) {
    pushFallbackObject(objects, seen, {
      labelRu: asString(ceiling.labelRu) || asString(ceiling.type),
      type: "ceiling",
      sourceField: "proAnalysis.ceilingAnalysis",
    });
  }

  for (const group of asArray(spec.specificationGroups)) {
    for (const item of asArray(group?.items)) {
      pushFallbackObject(objects, seen, {
        labelRu: item.name,
        type: asString(item.category) || "object",
        materialGuess: item.materialGuess,
        sourceField: "specAnalysis.specificationGroups",
      });
    }
  }

  for (const item of asArray(spec.potentialBudgetItems)) {
    pushFallbackObject(objects, seen, {
      labelRu: asString(item?.labelRu || item?.name || item?.target),
      type: asString(item?.category) || "object",
      sourceField: "specAnalysis.potentialBudgetItems",
    });
  }

  return objects;
}

function buildFallbackSceneGraphZones(semanticDraft) {
  const proZones = asArray(semanticDraft?.proAnalysis?.functionalZones);
  const specZones = asArray(semanticDraft?.specAnalysis?.functionalZones);
  const sourceZones = proZones.length ? proZones : specZones;
  if (!sourceZones.length) {
    return [
      {
        id: "fallback_zone_main",
        labelRu: "Основная зона сцены",
        type: "zone",
        position: "unknown",
        role: "primary",
        relatedObjects: [],
        confidence: FALLBACK_CONFIDENCE,
        ...fallbackSourceMeta("proAnalysis.functionalZones", "Основная зона сцены"),
      },
    ];
  }

  return sourceZones.map((zone, index) => ({
    id: makeId("zone", index, zone.type || zone.id),
    labelRu: asString(zone.labelRu) || `Зона ${index + 1}`,
    type: asString(zone.type) || "zone",
    position: pickEnum(zone.position, ZONE_POSITIONS, "unknown"),
    role: pickEnum(zone.importance, ZONE_ROLES, "secondary"),
    relatedObjects: asArray(zone.visibleElements).map((value) => asString(value)).filter(Boolean),
    confidence: asNumber(zone.confidence, FALLBACK_CONFIDENCE),
    ...fallbackSourceMeta("proAnalysis.functionalZones", zone.labelRu),
  }));
}

function hasMeaningfulZones(zones) {
  return asArray(zones).some((zone) => zone.id !== UNKNOWN_ZONE_ID);
}

export function normalizeSceneGraph(raw, semanticDraft = null) {
  const source = raw && typeof raw === "object" ? raw : {};
  let zones = asArray(source.zones).map((zone, index) => normalizeZone(zone, index));
  if (!hasMeaningfulZones(zones) && semanticDraft) {
    zones = buildFallbackSceneGraphZones(semanticDraft).map((zone, index) => normalizeZone(zone, index));
  }

  const zoneIds = new Set(zones.map((zone) => zone.id));
  zoneIds.add(UNKNOWN_ZONE_ID);

  if (!zones.some((zone) => zone.id === UNKNOWN_ZONE_ID)) {
    zones.push({
      id: UNKNOWN_ZONE_ID,
      labelRu: "Неопределённая зона",
      type: "unknown",
      position: "unknown",
      role: "secondary",
      relatedObjects: [],
      confidence: DEFAULT_CONFIDENCE,
    });
  }

  let rawObjects = asArray(source.objects);
  if (!rawObjects.length && semanticDraft) {
    rawObjects = buildFallbackSceneGraphObjects(semanticDraft);
  }

  const objects = rawObjects.map((object, index) => normalizeObject(object, index, zoneIds));
  const objectIds = new Set(objects.map((object) => object.id));

  const relationships = asArray(source.relationships)
    .map((relationship) => normalizeRelationship(relationship, objectIds, zoneIds))
    .filter(Boolean);

  const preservationRules = asArray(source.preservationRules)
    .map((rule, index) => normalizePreservationRule(rule, index, objectIds, zoneIds))
    .filter(Boolean);

  const spaceType =
    asString(source.spaceType) ||
    asString(semanticDraft?.quickAnalysis?.spaceType?.labelRu) ||
    asString(semanticDraft?.proAnalysis?.spaceType?.labelRu) ||
    asString(semanticDraft?.quickAnalysis?.spaceType?.value) ||
    "";

  return {
    version: asString(source.version) || "1.0",
    spaceType,
    coordinateSystem: asString(source.coordinateSystem) || "relative_2d",
    confidence: asNumber(source.confidence),
    zones,
    objects,
    relationships,
    preservationRules,
  };
}

export function getObjectsByZone(sceneGraph, zoneId) {
  const id = asString(zoneId);
  if (!id) return [];
  return asArray(sceneGraph?.objects).filter((object) => object.zoneId === id);
}

export function getEditableObjects(sceneGraph) {
  return asArray(sceneGraph?.objects).filter(
    (object) =>
      object.editablePotential === "high" ||
      object.editablePotential === "medium" ||
      object.futureReady?.maskEditable
  );
}

export function getBudgetRelevantObjects(sceneGraph) {
  return asArray(sceneGraph?.objects).filter(
    (object) =>
      object.budgetWeight === "high" ||
      object.budgetWeight === "medium" ||
      object.futureReady?.budgetRelevant
  );
}

export function getPreservationRules(sceneGraph) {
  return asArray(sceneGraph?.preservationRules);
}

export function getSceneGraphSummary(sceneGraph) {
  const graph = sceneGraph && typeof sceneGraph === "object" ? sceneGraph : emptySceneGraph();
  const zones = asArray(graph.zones).filter((zone) => zone.id !== UNKNOWN_ZONE_ID);
  const objects = asArray(graph.objects);
  return {
    zoneCount: zones.length,
    objectCount: objects.length,
    editableCount: getEditableObjects(graph).length,
    budgetRelevantCount: getBudgetRelevantObjects(graph).length,
    relationshipCount: asArray(graph.relationships).length,
    preservationRuleCount: asArray(graph.preservationRules).length,
  };
}

function objectMatchesSpecGroup(object, group) {
  const registryCategoryId = asString(group?.registryCategoryId);
  const categoryIds = [asString(object.categoryId), asString(object.supplierCategoryId)].filter(Boolean);
  if (registryCategoryId && categoryIds.includes(registryCategoryId)) return true;
  const parent = registryCategoryId ? getRegistryParentCategory(registryCategoryId) : null;
  if (parent?.id && categoryIds.includes(parent.id)) return true;

  const objectLabel = normalizeText(object.labelRu);
  const groupLabel = normalizeText(group.labelRu);
  const parentLabel = normalizeText(group.parentLabelRu);
  if (!objectLabel) return false;
  if (groupLabel && (objectLabel.includes(groupLabel) || groupLabel.includes(objectLabel))) return true;
  if (parentLabel && objectLabel.includes(parentLabel)) return true;
  return false;
}

export function attachRelatedSceneObjectsToSpecGroups(normalizedSpecGroups, sceneGraph) {
  const groups = asArray(normalizedSpecGroups);
  const objects = asArray(sceneGraph?.objects);
  return groups.map((group) => {
    const relatedSceneObjects = objects
      .filter((object) => objectMatchesSpecGroup(object, group))
      .map((object) => object.labelRu)
      .filter(Boolean);
    return {
      ...group,
      relatedSceneObjects,
    };
  });
}
