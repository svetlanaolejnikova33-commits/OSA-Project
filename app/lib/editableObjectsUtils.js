import { getRegistryCategoryById, getRegistryParentCategory } from "./supplierRegistry";

const DEFAULT_CONFIDENCE = 0.5;
const LEVELS = new Set(["low", "medium", "high"]);
const EDIT_TYPES = new Set([
  "replace_object",
  "change_material",
  "change_color",
  "change_texture",
  "change_lighting",
  "change_textile",
  "remove_decor",
  "add_decor",
]);

const EDIT_TYPE_LABELS_RU = {
  replace_object: "замена объекта",
  change_material: "материал",
  change_color: "цвет",
  change_texture: "текстура",
  change_lighting: "свет",
  change_textile: "текстиль",
  remove_decor: "убрать декор",
  add_decor: "добавить декор",
};

const ACTION_LABELS_RU = {
  replace_object: "Заменить",
  change_material: "Изменить материал",
  change_color: "Изменить цвет",
  change_texture: "Изменить текстуру",
  change_lighting: "Изменить свет",
  change_textile: "Изменить текстиль",
  remove_decor: "Убрать декор",
  add_decor: "Добавить декор",
};

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

function pickLevel(value, fallback = "medium") {
  const normalized = asString(value).toLowerCase();
  return LEVELS.has(normalized) ? normalized : fallback;
}

function normalizeText(value) {
  return asString(value).toLowerCase().replace(/ё/g, "е");
}

function makeEditableId(index, rawId, sourceObjectId) {
  const explicit = asString(rawId);
  if (explicit) return explicit;
  const source = asString(sourceObjectId);
  if (source) return `editable_${source}`;
  return `editable_${index + 1}`;
}

function classifyObject(object) {
  const label = normalizeText(object.labelRu);
  const type = normalizeText(object.type);
  const categoryId = asString(object.categoryId || object.supplierCategoryId);
  const category = categoryId ? getRegistryCategoryById(categoryId) : null;
  const parent = categoryId ? getRegistryParentCategory(categoryId) : null;
  const categoryType = category?.type || parent?.type || "";
  const haystack = `${label} ${type} ${categoryId}`;

  return {
    isFurniture:
      categoryType === "furniture" ||
      /мебел|диван|кресл|стол|стул|шкаф|тумб|кроват|sofa|chair|table|wardrobe|bed/i.test(haystack),
    isTextile:
      categoryType === "textile" ||
      /текстил|штор|тюль|ковер|ковёр|подушк|покрывал|обивк|curtain|rug|textile|pillow/i.test(haystack),
    isLighting:
      categoryType === "lighting" ||
      /свет|люстр|бра|торшер|ламп|подвес|light|lamp|chandelier|sconce|pendant/i.test(haystack),
    isWall:
      categoryId.startsWith("wall_finish") ||
      /стен|обои|краск|панел|кирпич|wall|paint|wallpaper|brick/i.test(haystack),
    isFloor: categoryId.startsWith("floor_finish") || /пол|паркет|ламинат|floor|parquet|tile/i.test(haystack),
    isCeiling: categoryId.startsWith("ceiling") || /потолок|ceiling/i.test(haystack),
    isDecor:
      categoryType === "decor" ||
      /декор|зеркал|ваз|картин|скульптур|книг|mirror|vase|art|sculpture/i.test(haystack),
    isPlant: /растен|plant|green/i.test(haystack),
    isSmallDecor:
      /мелк|аксессуар|подушк|ваз|книг|small decor|accessory/i.test(haystack) ||
      pickLevel(object.visualWeight, "medium") === "low",
  };
}

function inferEditTypes(object) {
  const classes = classifyObject(object);
  const types = new Set();

  if (classes.isFurniture) {
    types.add("replace_object");
    types.add("change_material");
    types.add("change_color");
  }
  if (classes.isTextile) {
    types.add("change_textile");
    types.add("change_color");
    types.add("change_texture");
  }
  if (classes.isLighting) {
    types.add("replace_object");
    types.add("change_lighting");
  }
  if (classes.isWall) {
    types.add("change_color");
    types.add("change_material");
    types.add("add_decor");
  }
  if (classes.isFloor || classes.isCeiling) {
    types.add("change_material");
    if (classes.isWall) types.add("change_color");
  }
  if (classes.isDecor || classes.isPlant || classes.isSmallDecor) {
    types.add("replace_object");
    types.add("remove_decor");
    types.add("add_decor");
  }
  if (classes.isPlant || classes.isSmallDecor) {
    types.delete("change_material");
  }

  if (!types.size) {
    if (object.futureReady?.maskEditable) {
      types.add("replace_object");
      types.add("change_color");
    }
  }

  return [...types];
}

function getPreservationNotes(sceneGraph, sourceObjectId) {
  return asArray(sceneGraph?.preservationRules)
    .filter((rule) => rule?.targetId === sourceObjectId)
    .map((rule) => asString(rule.ruleRu))
    .filter(Boolean);
}

function getDependencies(sceneGraph, sourceObjectId) {
  const labels = new Map(asArray(sceneGraph?.objects).map((object) => [object.id, object.labelRu]));
  const deps = new Set();
  for (const relationship of asArray(sceneGraph?.relationships)) {
    if (relationship.fromObjectId === sourceObjectId && relationship.toObjectId) {
      const label = labels.get(relationship.toObjectId);
      if (label) deps.add(label);
    }
    if (relationship.toObjectId === sourceObjectId && relationship.fromObjectId) {
      const label = labels.get(relationship.fromObjectId);
      if (label) deps.add(label);
    }
  }
  return [...deps];
}

function inferEditSafety(object, sceneGraph) {
  const classes = classifyObject(object);
  const visualWeight = pickLevel(object.visualWeight, "medium");
  const preservationNotes = getPreservationNotes(sceneGraph, object.id);

  if (preservationNotes.length && visualWeight === "high") return "low";
  if (classes.isWall || classes.isFloor || classes.isCeiling) return "medium";
  if (visualWeight === "high" && classes.isFurniture) return "medium";
  if (classes.isPlant || classes.isSmallDecor || visualWeight === "low") return "high";
  if (classes.isDecor || classes.isTextile) return "high";
  return "medium";
}

function inferReplacementRisk(object) {
  return pickLevel(object.replacementRisk, "medium");
}

function inferStyleImpact(object) {
  const visualWeight = pickLevel(object.visualWeight, "medium");
  const classes = classifyObject(object);
  if (visualWeight === "high" || classes.isFurniture || classes.isWall) return "high";
  if (classes.isLighting || classes.isTextile) return "medium";
  return "low";
}

function inferBudgetImpact(object) {
  const classes = classifyObject(object);
  const budgetWeight = pickLevel(object.budgetWeight, "medium");
  if (classes.isFurniture || classes.isLighting || budgetWeight === "high") return "high";
  if (classes.isTextile || classes.isDecor) return "medium";
  if (classes.isWall || classes.isFloor) return "medium";
  return "low";
}

function buildPromptHintRu(object, sceneGraph) {
  const label = asString(object.labelRu) || "объект";
  const classes = classifyObject(object);
  const zoneLabel =
    asArray(sceneGraph?.zones).find((zone) => zone.id === object.zoneId)?.labelRu || "сцены";

  if (classes.isFurniture) {
    return `Можно заменить ${label.toLowerCase()}, сохранив масштаб, положение и общую композицию зоны ${zoneLabel.toLowerCase()}.`;
  }
  if (classes.isTextile) {
    return `Можно изменить текстиль (${label.toLowerCase()}), не меняя геометрию помещения.`;
  }
  if (classes.isLighting) {
    return `Можно заменить или скорректировать свет (${label.toLowerCase()}), сохранив сцену и зону ${zoneLabel.toLowerCase()}.`;
  }
  if (classes.isWall) {
    return `Можно изменить цвет стены, сохранив освещение и контраст сцены.`;
  }
  if (classes.isFloor) {
    return `Можно изменить отделку пола, сохранив геометрию и композицию пространства.`;
  }
  if (classes.isDecor || classes.isPlant) {
    return `Можно заменить или убрать декор (${label.toLowerCase()}) без перестройки помещения.`;
  }
  return `Можно подготовить точечную правку для ${label.toLowerCase()}, сохранив общую композицию сцены.`;
}

function buildActionSuggestions(editableObject) {
  const label = asString(editableObject.labelRu) || "объект";
  return asArray(editableObject.editTypes).map((editType) => {
    const actionLabel = ACTION_LABELS_RU[editType] || editType;
    const actionLabelRu = editType === "replace_object" ? `${actionLabel} ${label.toLowerCase()}` : actionLabel;
    const requiresMask = Boolean(
      editableObject.futureReady?.maskEditable &&
        ["replace_object", "change_material", "change_color", "change_texture", "change_textile", "remove_decor", "add_decor"].includes(
          editType
        )
    );
    const requiresSku = Boolean(
      editableObject.futureReady?.skuRelevant &&
        ["replace_object", "change_material", "change_textile", "change_lighting"].includes(editType)
    );
    return {
      editableObjectId: editableObject.id,
      actionLabelRu,
      promptTemplateRu: `${actionLabelRu}. ${asString(editableObject.promptHintRu)}`,
      requiresMask,
      requiresSku,
    };
  });
}

function normalizeEditableEntry(raw, index, sceneGraph, objectById) {
  const sourceObjectId = asString(raw?.sourceObjectId);
  const sourceObject = sourceObjectId ? objectById.get(sourceObjectId) : null;
  if (!sourceObject) return null;

  const editTypes = asArray(raw?.editTypes)
    .map((value) => asString(value))
    .filter((value) => EDIT_TYPES.has(value));
  const resolvedEditTypes = editTypes.length ? editTypes : inferEditTypes(sourceObject);

  const entry = {
    id: makeEditableId(index, raw?.id, sourceObjectId),
    sourceObjectId,
    labelRu: asString(raw?.labelRu) || sourceObject.labelRu,
    type: asString(raw?.type) || sourceObject.type,
    categoryId: asString(raw?.categoryId) || sourceObject.categoryId,
    supplierCategoryId: asString(raw?.supplierCategoryId) || sourceObject.supplierCategoryId,
    zoneId: asString(raw?.zoneId) || sourceObject.zoneId,
    editTypes: resolvedEditTypes,
    editSafety: pickLevel(raw?.editSafety, inferEditSafety(sourceObject, sceneGraph)),
    replacementRisk: pickLevel(raw?.replacementRisk, inferReplacementRisk(sourceObject)),
    styleImpact: pickLevel(raw?.styleImpact, inferStyleImpact(sourceObject)),
    budgetImpact: pickLevel(raw?.budgetImpact, inferBudgetImpact(sourceObject)),
    preservationNotes: asArray(raw?.preservationNotes).map((value) => asString(value)).filter(Boolean),
    dependencies: asArray(raw?.dependencies).map((value) => asString(value)).filter(Boolean),
    promptHintRu: asString(raw?.promptHintRu) || buildPromptHintRu(sourceObject, sceneGraph),
    futureReady: {
      maskEditable: Boolean(raw?.futureReady?.maskEditable ?? sourceObject.futureReady?.maskEditable),
      skuRelevant: Boolean(raw?.futureReady?.skuRelevant ?? sourceObject.futureReady?.skuRelevant),
      budgetRelevant: Boolean(raw?.futureReady?.budgetRelevant ?? sourceObject.futureReady?.budgetRelevant),
      bimRelevant: Boolean(raw?.futureReady?.bimRelevant ?? sourceObject.futureReady?.bimRelevant),
    },
    confidence: asNumber(raw?.confidence, sourceObject.confidence),
  };

  if (!entry.preservationNotes.length) {
    entry.preservationNotes = getPreservationNotes(sceneGraph, sourceObjectId);
  }
  if (!entry.dependencies.length) {
    entry.dependencies = getDependencies(sceneGraph, sourceObjectId);
  }

  if (asString(raw?.source)) entry.source = asString(raw.source);
  if (asString(raw?.sourceField)) entry.sourceField = asString(raw.sourceField);
  if (asString(raw?.sourceText)) entry.sourceText = asString(raw.sourceText);

  return entry;
}

function isLargeSceneObject(object) {
  return pickLevel(object.visualWeight, "medium") !== "low";
}

function selectEditableSceneObjects(sceneGraph) {
  const graph = sceneGraph && typeof sceneGraph === "object" ? sceneGraph : { objects: [] };
  const objects = asArray(graph.objects);
  const preferred = objects.filter(
    (object) =>
      object.futureReady?.maskEditable ||
      pickLevel(object.editablePotential, "medium") !== "low" ||
      isLargeSceneObject(object)
  );
  return preferred.length ? preferred : objects;
}

function buildEditableEntryFromSceneObject(object, index, sceneGraph, objectById) {
  const sourceMeta =
    object.source === "fallback"
      ? {
          source: "fallback",
          sourceField: asString(object.sourceField) || "sceneGraph.objects",
          sourceText: asString(object.sourceText) || object.labelRu,
        }
      : {};

  return normalizeEditableEntry(
    {
      sourceObjectId: object.id,
      labelRu: object.labelRu,
      type: object.type,
      categoryId: object.categoryId,
      supplierCategoryId: object.supplierCategoryId,
      zoneId: object.zoneId,
      editTypes: inferEditTypes(object),
      editSafety: inferEditSafety(object, sceneGraph),
      replacementRisk: inferReplacementRisk(object),
      styleImpact: inferStyleImpact(object),
      budgetImpact: inferBudgetImpact(object),
      promptHintRu: buildPromptHintRu(object, sceneGraph),
      futureReady: object.futureReady,
      confidence: object.confidence,
      preservationNotes: getPreservationNotes(sceneGraph, object.id),
      dependencies: getDependencies(sceneGraph, object.id),
      ...sourceMeta,
    },
    index,
    sceneGraph,
    objectById
  );
}

export function deriveEditableObjectsFromSceneGraph(sceneGraph, semanticDraft = null) {
  const graph = sceneGraph && typeof sceneGraph === "object" ? sceneGraph : { objects: [] };
  const objects = selectEditableSceneObjects(graph);
  const objectById = new Map(objects.map((item) => [item.id, item]));

  return objects
    .map((object, index) => buildEditableEntryFromSceneObject(object, index, graph, objectById))
    .filter(Boolean);
}

export function stabilizeEditableObjects(editableObjects, sceneGraph, semanticDraft = null) {
  const graph = sceneGraph && typeof sceneGraph === "object" ? sceneGraph : { objects: [] };
  const items = asArray(editableObjects);
  const coveredIds = new Set(items.map((entry) => asString(entry.sourceObjectId)).filter(Boolean));
  const objectById = new Map(asArray(graph.objects).map((object) => [object.id, object]));
  const next = [...items];

  for (const object of selectEditableSceneObjects(graph)) {
    if (!isLargeSceneObject(object) && !object.futureReady?.maskEditable) continue;
    if (coveredIds.has(object.id)) continue;
    const entry = buildEditableEntryFromSceneObject(object, next.length, graph, objectById);
    if (!entry) continue;
    next.push(entry);
    coveredIds.add(object.id);
  }

  if (!next.length) {
    return deriveEditableObjectsFromSceneGraph(graph, semanticDraft);
  }

  return next;
}

export function normalizeEditableObjects(raw, sceneGraph) {
  const graph = sceneGraph && typeof sceneGraph === "object" ? sceneGraph : { objects: [] };
  const objectById = new Map(asArray(graph.objects).map((object) => [object.id, object]));
  return asArray(raw)
    .map((entry, index) => normalizeEditableEntry(entry, index, graph, objectById))
    .filter(Boolean);
}

export function getEditableObjectsByType(editableObjects, editType) {
  const type = asString(editType);
  if (!type) return [];
  return asArray(editableObjects).filter((entry) => asArray(entry.editTypes).includes(type));
}

export function getHighSafetyEdits(editableObjects) {
  return asArray(editableObjects).filter((entry) => entry.editSafety === "high");
}

export function getRiskyEdits(editableObjects) {
  return asArray(editableObjects).filter(
    (entry) => entry.editSafety === "low" || entry.replacementRisk === "high"
  );
}

export function buildEditableActionSuggestions(editableObjects) {
  return asArray(editableObjects).flatMap((entry) => buildActionSuggestions(entry));
}

export function getEditableObjectsSummary(editableObjects) {
  const items = asArray(editableObjects);
  return {
    total: items.length,
    highSafety: getHighSafetyEdits(items).length,
    risky: getRiskyEdits(items).length,
  };
}

export function formatEditTypesRu(editTypes) {
  return asArray(editTypes)
    .map((type) => EDIT_TYPE_LABELS_RU[type] || type)
    .filter(Boolean)
    .join(", ");
}

function editableMatchesSpecGroup(editableObject, group) {
  const registryCategoryId = asString(group?.registryCategoryId);
  const categoryIds = [asString(editableObject.categoryId), asString(editableObject.supplierCategoryId)].filter(Boolean);
  if (registryCategoryId && categoryIds.includes(registryCategoryId)) return true;
  const parent = registryCategoryId ? getRegistryParentCategory(registryCategoryId) : null;
  if (parent?.id && categoryIds.includes(parent.id)) return true;

  const objectLabel = normalizeText(editableObject.labelRu);
  const groupLabel = normalizeText(group.labelRu);
  const parentLabel = normalizeText(group.parentLabelRu);
  if (!objectLabel) return false;
  if (groupLabel && (objectLabel.includes(groupLabel) || groupLabel.includes(objectLabel))) return true;
  if (parentLabel && objectLabel.includes(parentLabel)) return true;
  return false;
}

export function attachRelatedEditableObjectsToSpecGroups(normalizedSpecGroups, editableObjects) {
  const groups = asArray(normalizedSpecGroups);
  const items = asArray(editableObjects);
  return groups.map((group) => {
    const relatedEditableObjects = items
      .filter((entry) => editableMatchesSpecGroup(entry, group))
      .map((entry) => ({
        labelRu: entry.labelRu,
        editableObjectId: entry.id,
        styleConsistencyImpact: entry.styleConsistencyImpact || null,
      }))
      .filter((entry) => entry.labelRu);
    return {
      ...group,
      relatedEditableObjects,
    };
  });
}
