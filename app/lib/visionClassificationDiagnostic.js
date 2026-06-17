/**
 * Phase 5J.4A — read-only vision / classification diagnostics.
 * Does not alter search, registry, or UI behavior.
 */

import { mapSpecToSupplierRegistry } from "./mapSpecToSupplierRegistry";
import { buildVisualSearchQuery } from "./visualProductDiscovery";
import { extractVisualQuery } from "./visualProduct/rankVisualCandidates";
import { hasLightingPendantsCategory } from "./registry/fetchVisualProductCandidates";

const DEBUG_TAG = "[OSA-VISION-DEBUG]";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asConfidence(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function pushObject(rows, { label, confidence, category, source }) {
  const normalizedLabel = asString(label);
  if (!normalizedLabel) return;
  rows.push({
    label: normalizedLabel,
    confidence: asConfidence(confidence),
    category: asString(category) || null,
    source,
  });
}

function collectDetectedObjects(semanticDraft) {
  const objects = [];
  const spec = semanticDraft?.specAnalysis || {};
  const pro = semanticDraft?.proAnalysis || {};

  for (const obj of asArray(semanticDraft?.sceneGraph?.objects)) {
    pushObject(objects, {
      label: obj?.labelRu || obj?.type || obj?.name,
      confidence: obj?.confidence,
      category: obj?.categoryId || obj?.supplierCategoryId || obj?.type,
      source: "sceneGraph.objects",
    });
  }

  for (const item of asArray(pro?.lightingAnalysis?.artificialLight)) {
    pushObject(objects, {
      label: item?.labelRu || item?.type || item?.fixtureType || item?.descriptionRu,
      confidence: item?.confidence,
      category: item?.fixtureType || item?.type,
      source: "proAnalysis.lightingAnalysis.artificialLight",
    });
  }

  for (const group of asArray(spec?.specificationGroups)) {
    for (const item of asArray(group?.items)) {
      pushObject(objects, {
        label: item?.name,
        confidence: item?.confidence,
        category: item?.category || group?.group,
        source: `specAnalysis.specificationGroups.${asString(group?.group) || "group"}`,
      });
    }
  }

  for (const item of asArray(spec?.productCategories)) {
    pushObject(objects, {
      label: item?.category,
      confidence: item?.confidence,
      category: item?.category,
      source: "specAnalysis.productCategories",
    });
  }

  for (const item of asArray(spec?.supplierCategories)) {
    pushObject(objects, {
      label: item?.category,
      confidence: item?.confidence,
      category: item?.category,
      source: "specAnalysis.supplierCategories",
    });
  }

  for (const item of asArray(semanticDraft?.editableObjects)) {
    pushObject(objects, {
      label: item?.labelRu || item?.name || item?.editType,
      confidence: item?.confidence,
      category: item?.categoryId || item?.supplierCategoryId,
      source: "editableObjects",
    });
  }

  return objects;
}

function resolveLightingCategory(semanticDraft) {
  const spec = semanticDraft?.specAnalysis || {};
  const { normalizedSpecGroups } = mapSpecToSupplierRegistry({ specAnalysis: spec });
  const lightingGroups = normalizedSpecGroups.filter((g) =>
    asString(g?.registryCategoryId).startsWith("lighting"),
  );

  if (!lightingGroups.length) {
    return {
      primary: null,
      all: [],
      hasPendantsFlag: hasLightingPendantsCategory(semanticDraft),
    };
  }

  const primary = lightingGroups[0];
  return {
    primary: {
      registryCategoryId: primary.registryCategoryId,
      labelRu: primary.labelRu,
      parentLabelRu: primary.parentLabelRu,
      sourceText: primary.sourceText,
    },
    all: lightingGroups.map((g) => ({
      registryCategoryId: g.registryCategoryId,
      labelRu: g.labelRu,
      parentLabelRu: g.parentLabelRu,
    })),
    hasPendantsFlag: hasLightingPendantsCategory(semanticDraft),
  };
}

function resolvePrimaryObject(detectedObjects) {
  const lightingObjects = detectedObjects.filter((obj) => {
    const haystack = `${obj.label} ${obj.category || ""}`.toLowerCase();
    return /свет|люстр|ламп|торшер|подвес|бра|light|lamp|chandelier|pendant|sconce|floor/i.test(
      haystack,
    );
  });

  const ranked = (lightingObjects.length ? lightingObjects : detectedObjects).slice();
  const hero =
    ranked.find((obj) => obj.source === "sceneGraph.objects") ||
    ranked.find((obj) => obj.source.startsWith("proAnalysis.lightingAnalysis")) ||
    ranked[0] ||
    null;

  return {
    hero,
    lightingObjectCount: lightingObjects.length,
    totalObjectCount: detectedObjects.length,
  };
}

function explainPendantsBias({ visualQuery, searchQuery, lightingCategory, detectedObjects }) {
  const reasons = [];

  if (!visualQuery?.types?.length) {
    reasons.push(
      'extractVisualQuery.detectTypes() не нашёл тип в TYPE_SYNONYMS (подвесной/люстра/бра); торшер не входит в словарь → fallback type="подвесной".',
    );
  } else if (visualQuery.types[0] === "подвесной") {
    reasons.push(`detectTypes() выбрал первый тип: "${visualQuery.types[0]}".`);
  }

  if (visualQuery?.type === "подвесной" && !visualQuery?.types?.includes("торшер")) {
    reasons.push('visualQuery.type по умолчанию "подвесной" (rankVisualCandidates.js).');
  }

  if (searchQuery?.objectType === "подвесной светильник") {
    reasons.push(
      'buildVisualSearchQuery() fallback objectType="подвесной светильник" когда visualQuery.type пуст.',
    );
  }

  if (/pendant light/i.test(searchQuery?.en || "")) {
    reasons.push('buildVisualSearchQuery() всегда добавляет "pendant light" в en-запрос.');
  }

  if (lightingCategory?.hasPendantsFlag) {
    reasons.push(
      "hasLightingPendantsCategory()=true → center-panel и mock-каталог используют lighting.pendants / Modelux pendant catalog.",
    );
  }

  if (lightingCategory?.primary?.registryCategoryId === "lighting.pendants") {
    reasons.push(
      `mapSpecToSupplierRegistry() назначил registryCategoryId="${lightingCategory.primary.registryCategoryId}" (${lightingCategory.primary.labelRu}).`,
    );
  } else if (lightingCategory?.primary?.registryCategoryId === "lighting.floor_lamps") {
    reasons.push(
      `mapSpecToSupplierRegistry() видит lighting.floor_lamps (${lightingCategory.primary.labelRu}), но visual-search query строится отдельно через extractVisualQuery (может расходиться).`,
    );
  }

  const corpusMentionsPendant = detectedObjects.some((obj) =>
    /подвес|pendant/i.test(`${obj.label} ${obj.category || ""}`),
  );
  const corpusMentionsFloorLamp = detectedObjects.some((obj) =>
    /торшер|напольн|floor lamp/i.test(`${obj.label} ${obj.category || ""}`),
  );

  if (corpusMentionsPendant && !corpusMentionsFloorLamp) {
    reasons.push("В распознанных объектах есть подвесной свет, торшер не упомянут.");
  }
  if (corpusMentionsFloorLamp && visualQuery?.type === "подвесной") {
    reasons.push(
      "Торшер упомянут в объектах, но extractVisualQuery не сопоставил его (нет синонимов торшер в TYPE_SYNONYMS).",
    );
  }

  return reasons;
}

/**
 * Build structured diagnostic snapshot (no side effects).
 */
export function buildVisionClassificationDiagnostic(semanticDraft) {
  const detectedObjects = collectDetectedObjects(semanticDraft);
  const lightingCategory = resolveLightingCategory(semanticDraft);
  const visualQuery = extractVisualQuery(semanticDraft);
  const searchQuery = buildVisualSearchQuery(semanticDraft, { languageMode: "ru" });
  const primaryObject = resolvePrimaryObject(detectedObjects);
  const specAnalysis = semanticDraft?.specAnalysis || null;

  const style =
    semanticDraft?.proAnalysis?.styleAnalysis?.labelRu ||
    semanticDraft?.quickAnalysis?.styleAnalysis?.labelRu ||
    semanticDraft?.proAnalysis?.styleAnalysis?.primary ||
    semanticDraft?.quickAnalysis?.styleAnalysis?.primary ||
    null;

  const materials = asArray(semanticDraft?.proAnalysis?.materialAnalysis?.dominant)
    .concat(asArray(semanticDraft?.quickAnalysis?.materialAnalysis?.dominant))
    .filter(Boolean);

  const keywords = uniqueStrings([
    ...asArray(visualQuery?.types),
    visualQuery?.type,
    ...asArray(visualQuery?.styles),
    ...asArray(visualQuery?.materials),
    ...asArray(visualQuery?.colors),
    visualQuery?.room,
    searchQuery?.objectType,
    lightingCategory?.primary?.labelRu,
    lightingCategory?.primary?.registryCategoryId,
  ]);

  const finalProductCategory = searchQuery?.category || visualQuery?.category || null;
  const finalSearchQuery = searchQuery?.primary || searchQuery?.ru || null;

  return {
    detectedObjects,
    lightingCategory,
    productCategory: finalProductCategory,
    style,
    materials,
    keywords,
    searchQuery,
    specAnalysis,
    visualQuery,
    primaryObject,
    pendantsBiasReasons: explainPendantsBias({
      visualQuery,
      searchQuery,
      lightingCategory,
      detectedObjects,
    }),
    FINAL_PRODUCT_CATEGORY: finalProductCategory,
    FINAL_SEARCH_QUERY: finalSearchQuery,
  };
}

function uniqueStrings(values) {
  return [...new Set(asArray(values).map((v) => asString(v)).filter(Boolean))];
}

/**
 * Emit Phase 5J.4A console diagnostics.
 */
export function logVisionClassificationDiagnostic(semanticDraft, { context = "visual-pipeline" } = {}) {
  if (!semanticDraft) {
    console.log(DEBUG_TAG, { context, error: "semanticDraft is empty" });
    return null;
  }

  const diagnostic = buildVisionClassificationDiagnostic(semanticDraft);

  console.log(DEBUG_TAG, {
    context,
    detectedObjects: diagnostic.detectedObjects,
    lightingCategory: diagnostic.lightingCategory,
    productCategory: diagnostic.productCategory,
    style: diagnostic.style,
    materials: diagnostic.materials,
    keywords: diagnostic.keywords,
    searchQuery: diagnostic.searchQuery,
    specAnalysis: diagnostic.specAnalysis,
  });

  for (const obj of diagnostic.detectedObjects) {
    console.log(DEBUG_TAG, "object", obj);
  }

  console.log(DEBUG_TAG, "FINAL_PRODUCT_CATEGORY", diagnostic.FINAL_PRODUCT_CATEGORY);
  console.log(DEBUG_TAG, "FINAL_SEARCH_QUERY", diagnostic.FINAL_SEARCH_QUERY);

  if (diagnostic.primaryObject?.hero) {
    console.log(DEBUG_TAG, "PRIMARY_OBJECT", diagnostic.primaryObject.hero);
  }

  if (diagnostic.pendantsBiasReasons.length) {
    console.log(DEBUG_TAG, "PENDANTS_BIAS_REASONS", diagnostic.pendantsBiasReasons);
  }

  return diagnostic;
}
