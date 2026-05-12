import { getConceptDNA } from "./styleConsistencyUtils";

const MUTATION_TYPES = new Set([
  "style_shift",
  "budget_optimization",
  "premium_upgrade",
  "material_swap",
  "color_shift",
  "lighting_upgrade",
  "softening",
  "brutalization",
  "minimal_cleanup",
  "decor_enrichment",
]);

const IMPACT_LEVELS = new Set(["low", "medium", "high"]);
const DEFAULT_CONFIDENCE = 0.62;

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

function pickImpact(value, fallback = "medium") {
  const normalized = asString(value).toLowerCase();
  return IMPACT_LEVELS.has(normalized) ? normalized : fallback;
}

function pickMutationType(value, fallback = "style_shift") {
  const normalized = asString(value);
  return MUTATION_TYPES.has(normalized) ? normalized : fallback;
}

function makeMutationId(index, rawId) {
  const explicit = asString(rawId);
  if (explicit) return explicit;
  return `mutation_${index + 1}`;
}

function uniqueStrings(values, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const normalized = asString(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function collectMaterialIntelligence(semanticDraft) {
  const pro = semanticDraft?.proAnalysis || {};
  const materialAnalysis = pro.materialAnalysis && typeof pro.materialAnalysis === "object" ? pro.materialAnalysis : {};
  const highlights = [];
  for (const [bucket, items] of Object.entries(materialAnalysis)) {
    for (const item of asArray(items)) {
      const label =
        typeof item === "string"
          ? item
          : asString(item?.possibleMaterial || item?.materialFamily || item?.materialGuess || item?.texture);
      if (label) highlights.push(label);
    }
    if (bucket) highlights.push(bucket);
  }
  for (const item of asArray(pro.textileAnalysis)) {
    if (item?.materialGuess) highlights.push(item.materialGuess);
    if (item?.labelRu) highlights.push(item.labelRu);
  }
  for (const item of asArray(pro.floorAnalysis)) {
    if (item?.materialGuess) highlights.push(item.materialGuess);
    if (item?.finish) highlights.push(item.finish);
  }
  for (const item of asArray(pro.wallAnalysis)) {
    if (item?.finish) highlights.push(item.finish);
    if (item?.texture) highlights.push(item.texture);
  }
  const conceptDNA = getConceptDNA(semanticDraft?.styleConsistency);
  if (conceptDNA.materialCore) highlights.push(conceptDNA.materialCore);
  return uniqueStrings(highlights, 12);
}

function collectPreserveDNA(semanticDraft) {
  const conceptDNA = getConceptDNA(semanticDraft?.styleConsistency);
  const preserved = [
    ...asArray(semanticDraft?.styleConsistency?.mustPreserve),
    ...asArray(semanticDraft?.specAnalysis?.whatMustBePreserved),
    ...asArray(semanticDraft?.proAnalysis?.designIntent?.whatMustBePreserved),
    conceptDNA.compositionCore,
    conceptDNA.styleCore,
    conceptDNA.colorCore,
    conceptDNA.atmosphereCore,
    conceptDNA.materialCore,
    "композиция",
    "ракурс",
    "планировка",
  ];
  return uniqueStrings(preserved, 8);
}

function collectEditableTargets(semanticDraft, matcher) {
  return asArray(semanticDraft?.editableObjects)
    .filter((entry) => matcher(entry))
    .map((entry) => asString(entry.id) || asString(entry.labelRu))
    .filter(Boolean);
}

function collectSpecGroupNames(semanticDraft, matcher) {
  return asArray(semanticDraft?.specAnalysis?.specificationGroups)
    .filter((group) => matcher(group))
    .map((group) => asString(group.group))
    .filter(Boolean);
}

function buildMutationTemplate({
  id,
  labelRu,
  mutationType,
  goalRu,
  preserveDNA,
  changeTargets,
  affectedEditableObjects,
  affectedSpecGroups,
  styleImpact,
  budgetImpact,
  riskLevel,
  promptTemplateRu,
  noteRu,
  confidence,
}) {
  return {
    id,
    labelRu,
    mutationType,
    goalRu,
    preserveDNA: uniqueStrings(preserveDNA, 8),
    changeTargets: uniqueStrings(changeTargets, 8),
    affectedEditableObjects: uniqueStrings(affectedEditableObjects, 12),
    affectedSpecGroups: uniqueStrings(affectedSpecGroups, 12),
    styleImpact: pickImpact(styleImpact),
    budgetImpact: pickImpact(budgetImpact),
    riskLevel: pickImpact(riskLevel),
    promptTemplateRu,
    noteRu,
    confidence: asNumber(confidence),
  };
}

function normalizeMutationEntry(raw, index, semanticDraft) {
  if (!raw || typeof raw !== "object") return null;
  const labelRu = asString(raw.labelRu);
  const goalRu = asString(raw.goalRu);
  const promptTemplateRu = asString(raw.promptTemplateRu);
  if (!labelRu || !goalRu || !promptTemplateRu) return null;

  return buildMutationTemplate({
    id: makeMutationId(index, raw.id),
    labelRu,
    mutationType: pickMutationType(raw.mutationType),
    goalRu,
    preserveDNA: asArray(raw.preserveDNA).map((value) => asString(value)).filter(Boolean),
    changeTargets: asArray(raw.changeTargets).map((value) => asString(value)).filter(Boolean),
    affectedEditableObjects: asArray(raw.affectedEditableObjects).map((value) => asString(value)).filter(Boolean),
    affectedSpecGroups: asArray(raw.affectedSpecGroups).map((value) => asString(value)).filter(Boolean),
    styleImpact: raw.styleImpact,
    budgetImpact: raw.budgetImpact,
    riskLevel: raw.riskLevel,
    promptTemplateRu,
    noteRu: asString(raw.noteRu),
    confidence: raw.confidence,
  });
}

function deriveHeuristicMutations(semanticDraft) {
  const preserveDNA = collectPreserveDNA(semanticDraft);
  const materials = collectMaterialIntelligence(semanticDraft);
  const textileTargets = collectEditableTargets(semanticDraft, (entry) =>
    /текстил|штор|ковер|ковёр|textile|curtain|rug/i.test(`${entry.labelRu} ${entry.type}`)
  );
  const lightingTargets = collectEditableTargets(semanticDraft, (entry) =>
    /свет|light|lamp|люстр|бра/i.test(`${entry.labelRu} ${entry.type}`)
  );
  const decorTargets = collectEditableTargets(semanticDraft, (entry) =>
    /декор|decor|mirror|зеркал|plant|растен/i.test(`${entry.labelRu} ${entry.type}`)
  );
  const furnitureTargets = collectEditableTargets(semanticDraft, (entry) =>
    /мебел|диван|кресл|стол|кроват|furniture|sofa|chair|table|bed/i.test(`${entry.labelRu} ${entry.type}`)
  );
  const specTextile = collectSpecGroupNames(semanticDraft, (group) => /текстил|декор|свет|мебел/i.test(group.group));
  const supplierCategories = asArray(semanticDraft?.specAnalysis?.supplierCategories)
    .map((item) => asString(item.category))
    .filter(Boolean);

  return [
    buildMutationTemplate({
      id: "mutation_premium_upgrade",
      labelRu: "Сохранить композицию, усилить премиальность",
      mutationType: "premium_upgrade",
      goalRu: "Усилить ощущение дорогого интерьера через материалы, свет и текстиль без смены планировки.",
      preserveDNA,
      changeTargets: ["текстиль", "свет", "декор", "фурнитура", "материалы"],
      affectedEditableObjects: [...textileTargets, ...lightingTargets, ...decorTargets].slice(0, 8),
      affectedSpecGroups: specTextile,
      styleImpact: "high",
      budgetImpact: "high",
      riskLevel: "medium",
      promptTemplateRu:
        "Сохрани композицию, ракурс, расположение мебели и основную палитру. Усиль премиальность за счёт более глубокого текстиля, качественного света и выразительных деталей, не меняя планировку.",
      noteRu: "Фокус на тактильности, свете и деталях без перестройки сцены.",
      confidence: 0.68,
    }),
    buildMutationTemplate({
      id: "mutation_warm_shift",
      labelRu: "Сделать интерьер теплее",
      mutationType: "color_shift",
      goalRu: "Сместить палитру и материалы в более тёплое восприятие, сохранив характер пространства.",
      preserveDNA,
      changeTargets: ["палитра", "текстиль", "свет", "отделка"],
      affectedEditableObjects: [...textileTargets, ...furnitureTargets].slice(0, 8),
      affectedSpecGroups: collectSpecGroupNames(semanticDraft, (group) => /текстил|стен|пол/i.test(group.group)),
      styleImpact: "medium",
      budgetImpact: "medium",
      riskLevel: "low",
      promptTemplateRu:
        "Сохрани композицию и основные объекты. Сделай интерьер теплее через палитру, текстиль и свет, не меняя планировку и ключевые пропорции.",
      noteRu: materials.length ? `Опора на текущие материалы: ${materials.slice(0, 3).join(", ")}.` : "",
      confidence: 0.66,
    }),
    buildMutationTemplate({
      id: "mutation_budget_optimization",
      labelRu: "Упростить смету без потери характера",
      mutationType: "budget_optimization",
      goalRu: "Снизить бюджетное давление за счёт замен и упрощений в второстепенных категориях.",
      preserveDNA,
      changeTargets: ["декор", "текстиль", "фурнитура", "второстепенные материалы"],
      affectedEditableObjects: [...decorTargets, ...textileTargets].slice(0, 8),
      affectedSpecGroups: [
        ...collectSpecGroupNames(semanticDraft, (group) => /декор|текстил|прочее/i.test(group.group)),
        ...supplierCategories.slice(0, 4),
      ],
      styleImpact: "low",
      budgetImpact: "high",
      riskLevel: "low",
      promptTemplateRu:
        "Сохрани композицию, основную мебель и ключевую палитру. Упрости смету через более рациональные материалы и декор во второстепенных зонах, не теряя характер интерьера.",
      noteRu: "Подходит для подготовки бюджетной версии концепции.",
      confidence: 0.64,
    }),
    buildMutationTemplate({
      id: "mutation_textile_decor_refresh",
      labelRu: "Освежить текстиль и декор",
      mutationType: "decor_enrichment",
      goalRu: "Обновить мягкие слои и акценты, не затрагивая архитектуру и крупную мебель.",
      preserveDNA,
      changeTargets: ["текстиль", "декор", "аксессуары"],
      affectedEditableObjects: [...textileTargets, ...decorTargets].slice(0, 8),
      affectedSpecGroups: collectSpecGroupNames(semanticDraft, (group) => /текстил|декор/i.test(group.group)),
      styleImpact: "medium",
      budgetImpact: "medium",
      riskLevel: "low",
      promptTemplateRu:
        "Сохрани планировку, крупную мебель и основную палитру. Освежи текстиль и декор, чтобы интерьер выглядел актуальнее без смены композиции.",
      noteRu: "Безопасная итерация для быстрого обновления впечатления.",
      confidence: 0.67,
    }),
    buildMutationTemplate({
      id: "mutation_contrast_boost",
      labelRu: "Усилить контраст",
      mutationType: "style_shift",
      goalRu: "Сделать сцену выразительнее за счёт контраста материалов, света и цветовых акцентов.",
      preserveDNA,
      changeTargets: ["контраст", "свет", "акценты", "декор"],
      affectedEditableObjects: [...lightingTargets, ...decorTargets, ...furnitureTargets].slice(0, 8),
      affectedSpecGroups: collectSpecGroupNames(semanticDraft, (group) => /освещ|декор|стен/i.test(group.group)),
      styleImpact: "high",
      budgetImpact: "medium",
      riskLevel: "medium",
      promptTemplateRu:
        "Сохрани композицию и расположение ключевых объектов. Усиль контраст через свет, акцентные материалы и декор, не меняя планировку.",
      noteRu: "Итерация для более драматичного восприятия.",
      confidence: 0.63,
    }),
    buildMutationTemplate({
      id: "mutation_softening",
      labelRu: "Смягчить атмосферу",
      mutationType: "softening",
      goalRu: "Снизить визуальную жёсткость и сделать пространство спокойнее и мягче.",
      preserveDNA,
      changeTargets: ["текстиль", "свет", "палитра", "декор"],
      affectedEditableObjects: [...textileTargets, ...lightingTargets].slice(0, 8),
      affectedSpecGroups: collectSpecGroupNames(semanticDraft, (group) => /текстил|освещ|декор/i.test(group.group)),
      styleImpact: "medium",
      budgetImpact: "low",
      riskLevel: "low",
      promptTemplateRu:
        "Сохрани композицию и основные объекты. Смягчи атмосферу через текстиль, рассеянный свет и более спокойные цветовые переходы.",
      noteRu: "Подходит для спокойной, более гостеприимной версии.",
      confidence: 0.65,
    }),
    buildMutationTemplate({
      id: "mutation_minimal_cleanup",
      labelRu: "Сделать версию более лаконичной",
      mutationType: "minimal_cleanup",
      goalRu: "Убрать визуальный шум и усилить чистоту композиции без смены базовой идеи.",
      preserveDNA,
      changeTargets: ["декор", "текстиль", "мелкие акценты", "второстепенные объекты"],
      affectedEditableObjects: decorTargets.slice(0, 8),
      affectedSpecGroups: collectSpecGroupNames(semanticDraft, (group) => /декор|текстил|прочее/i.test(group.group)),
      styleImpact: "medium",
      budgetImpact: "low",
      riskLevel: "low",
      promptTemplateRu:
        "Сохрани архитектуру, крупную мебель и основную палитру. Сделай интерьер лаконичнее, убрав лишний декор и визуальный шум без изменения планировки.",
      noteRu: "Итерация для более минималистичной версии концепции.",
      confidence: 0.64,
    }),
  ];
}

export function normalizeDesignMutations(raw, semanticDraft = null) {
  const normalized = asArray(raw)
    .map((entry, index) => normalizeMutationEntry(entry, index, semanticDraft))
    .filter(Boolean)
    .slice(0, 12);
  if (normalized.length) return normalized;
  return deriveDesignMutations(semanticDraft);
}

export function deriveDesignMutations(semanticDraft) {
  if (!semanticDraft || typeof semanticDraft !== "object") return [];
  return deriveHeuristicMutations(semanticDraft);
}

export function getLowRiskMutations(designMutations) {
  return asArray(designMutations).filter((mutation) => mutation.riskLevel === "low");
}

export function getBudgetMutations(designMutations) {
  return asArray(designMutations).filter((mutation) => mutation.mutationType === "budget_optimization");
}

export function getPremiumMutations(designMutations) {
  return asArray(designMutations).filter((mutation) => mutation.mutationType === "premium_upgrade");
}

export function getMutationPrompt(mutation, semanticDraft = null) {
  const entry = mutation && typeof mutation === "object" ? mutation : null;
  if (!entry) return "";
  const draft = semanticDraft && typeof semanticDraft === "object" ? semanticDraft : {};
  const room =
    asString(draft.quickAnalysis?.spaceType?.labelRu) ||
    asString(draft.proAnalysis?.spaceType?.labelRu) ||
    asString(draft.quickAnalysis?.spaceType?.value);
  const atmosphere =
    asString(draft.quickAnalysis?.atmosphereRu) ||
    asString(draft.proAnalysis?.atmosphereRu) ||
    asString(getConceptDNA(draft.styleConsistency).atmosphereCore);
  const preserve = entry.preserveDNA.length ? `Сохранить: ${entry.preserveDNA.join(", ")}.` : "";
  const change = entry.changeTargets.length ? `Изменить: ${entry.changeTargets.join(", ")}.` : "";
  const context = [room ? `Помещение: ${room}.` : "", atmosphere ? `Атмосфера: ${atmosphere}.` : ""]
    .filter(Boolean)
    .join(" ");
  return [context, entry.promptTemplateRu, preserve, change, entry.noteRu].filter(Boolean).join(" ");
}

export function getDesignMutationsSummary(designMutations) {
  const items = asArray(designMutations);
  return {
    total: items.length,
    lowRisk: getLowRiskMutations(items).length,
    premium: getPremiumMutations(items).length,
    budgetOptimization: getBudgetMutations(items).length,
  };
}

export function attachBudgetContextToMutations(designMutations, budgetDraft = null) {
  const normalizedGroups = asArray(budgetDraft?.normalizedSpecGroups);
  if (!normalizedGroups.length) return asArray(designMutations);

  return asArray(designMutations).map((mutation) => {
    if (mutation.mutationType !== "budget_optimization") return mutation;
    const relatedGroups = normalizedGroups
      .filter((group) => {
        const label = `${group.labelRu || ""} ${group.parentLabelRu || ""}`.toLowerCase();
        return mutation.affectedSpecGroups.some((target) => label.includes(String(target).toLowerCase()));
      })
      .map((group) => asString(group.labelRu) || asString(group.registryCategoryId))
      .filter(Boolean);
    const potentialItems = normalizedGroups
      .flatMap((group) => asArray(group.items))
      .map((item) => asString(item?.name || item?.category))
      .filter(Boolean);

    return {
      ...mutation,
      affectedSpecGroups: uniqueStrings([...mutation.affectedSpecGroups, ...relatedGroups], 12),
      noteRu: uniqueStrings([mutation.noteRu, ...potentialItems.slice(0, 3)], 4).join(" · "),
    };
  });
}
