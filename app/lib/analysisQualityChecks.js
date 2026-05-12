import { getAnalysisTestScenarioByType } from "./analysisTestScenarios";
import { hasSemanticAnalysis, hasSemanticDraftForMode } from "./validateSemanticDraft";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function countMaterialGroups(semanticDraft) {
  const materialAnalysis = semanticDraft?.proAnalysis?.materialAnalysis || {};
  return Object.keys(materialAnalysis).filter((key) => asArray(materialAnalysis[key]).length > 0).length;
}

function hasLighting(semanticDraft) {
  const lighting = semanticDraft?.proAnalysis?.lightingAnalysis || {};
  return Boolean(
    asString(lighting.overallLightingMood) ||
      asArray(lighting.technicalNotes).length ||
      asArray(lighting.lightSources).length ||
      asArray(lighting.artificialLight).length
  );
}

function hasRoomType(semanticDraft) {
  const quick = semanticDraft?.quickAnalysis?.spaceType || {};
  const pro = semanticDraft?.proAnalysis?.spaceType || {};
  return Boolean(
    asString(quick.labelRu) ||
      asString(quick.value) ||
      asString(pro.labelRu) ||
      asString(pro.value)
  );
}

function countFunctionalZones(semanticDraft) {
  const proZones = asArray(semanticDraft?.proAnalysis?.functionalZones);
  const specZones = asArray(semanticDraft?.specAnalysis?.functionalZones);
  return Math.max(proZones.length, specZones.length);
}

function hasSpecGroups(semanticDraft, budgetDraft) {
  const normalized = asArray(budgetDraft?.normalizedSpecGroups);
  if (normalized.length) return true;
  return asArray(semanticDraft?.specAnalysis?.specificationGroups).length > 0;
}

function hasConceptDNA(semanticDraft) {
  const conceptDNA = semanticDraft?.styleConsistency?.conceptDNA || {};
  return Boolean(
    asString(conceptDNA.styleCore) ||
      asString(conceptDNA.atmosphereCore) ||
      asString(conceptDNA.colorCore) ||
      asString(conceptDNA.materialCore) ||
      asString(conceptDNA.compositionCore)
  );
}

function hasFallbackSceneGraph(semanticDraft) {
  return asArray(semanticDraft?.sceneGraph?.objects).some((object) => object?.source === "fallback");
}

function hasFallbackEditableObjects(semanticDraft) {
  return asArray(semanticDraft?.editableObjects).some((entry) => entry?.source === "fallback");
}

function countDesignMutations(semanticDraft) {
  return asArray(semanticDraft?.designMutations).length;
}

function hasMutationPromptTemplates(semanticDraft) {
  const mutations = asArray(semanticDraft?.designMutations);
  return mutations.length > 0 && mutations.every((mutation) => asString(mutation.promptTemplateRu));
}

function hasMutationPreserveDNA(semanticDraft) {
  return asArray(semanticDraft?.designMutations).some((mutation) => asArray(mutation.preserveDNA).length > 0);
}

function hasMutationChangeTargets(semanticDraft) {
  return asArray(semanticDraft?.designMutations).some((mutation) => asArray(mutation.changeTargets).length > 0);
}

function countGenerationPackages(semanticDraft) {
  return asArray(semanticDraft?.generationPackages).length;
}

function generationPackagesCheck(semanticDraft, predicate) {
  const packages = asArray(semanticDraft?.generationPackages);
  if (!packages.length) return true;
  return packages.every(predicate);
}

function buildCheck(id, labelRu, passed, detail = "") {
  return { id, labelRu, passed, detail };
}

function recommendationForCheck(checkId) {
  const map = {
    quick: "Проверьте, что QUICK-слой вернул краткий разбор сцены.",
    pro: "Проверьте, что PRO-слой содержит материалы, зоны и свет.",
    spec: "Проверьте, что SPEC-слой содержит группы спецификации.",
    roomType: "Уточните тип помещения в quick/pro spaceType.",
    functionalZones: "Добавьте минимум две функциональные зоны в PRO или SPEC.",
    materials: "Проверьте materialAnalysis: нужно минимум три материальные группы.",
    lighting: "Проверьте lightingAnalysis и источники света.",
    sceneGraph: "Проверьте sceneGraph.objects и связи между объектами.",
    editableObjects: "Проверьте editableObjects и их связь с sceneGraph.",
    styleConsistency: "Проверьте styleConsistency.conceptDNA и advisory impact rules.",
    specGroups: "Создайте budgetDraft или проверьте specAnalysis.specificationGroups.",
    normalizedSpecGroups: "Создайте черновик сметы, чтобы появились normalizedSpecGroups.",
    designMutations: "Проверьте designMutations и fallback-эвристики.",
    designMutationsMin: "Нужно минимум три направления развития концепции.",
    mutationPrompts: "У каждой mutation должен быть promptTemplateRu.",
    mutationPreserveDNA: "У mutations должны быть preserveDNA.",
    mutationChangeTargets: "У mutations должны быть changeTargets.",
    generationPackagePrompt: "У generation package должен быть promptRu.",
    generationPackagePreserve: "У generation package должны быть preserveRules.",
    generationPackageTargets: "У generation package должны быть changeTargets.",
    generationPackageNegative: "У generation package должен быть negativePromptRu.",
  };
  return map[checkId] || "Повторите анализ и сравните результат со сценарием.";
}

export function runAnalysisQualityChecks(semanticDraft, scenarioType, budgetDraft = null) {
  const scenario = getAnalysisTestScenarioByType(scenarioType);
  const expected = scenario?.expectedChecks || {};
  const passedChecks = [];
  const failedChecks = [];
  const warnings = [];
  const recommendations = [];

  const checks = [
    buildCheck(
      "quick",
      "QUICK анализ",
      hasSemanticDraftForMode(semanticDraft, "quick"),
      "quickAnalysis"
    ),
    buildCheck(
      "pro",
      "PRO анализ",
      hasSemanticDraftForMode(semanticDraft, "pro"),
      "proAnalysis"
    ),
    buildCheck(
      "spec",
      "SPEC анализ",
      hasSemanticDraftForMode(semanticDraft, "spec"),
      "specAnalysis"
    ),
    buildCheck("roomType", "Тип помещения", hasRoomType(semanticDraft)),
    buildCheck(
      "functionalZones",
      `Функциональные зоны (мин. ${expected.functionalZonesMin || 2})`,
      countFunctionalZones(semanticDraft) >= (expected.functionalZonesMin || 2),
      `найдено: ${countFunctionalZones(semanticDraft)}`
    ),
    buildCheck(
      "materials",
      `Материальные группы (мин. ${expected.materialGroupsMin || 3})`,
      countMaterialGroups(semanticDraft) >= (expected.materialGroupsMin || 3),
      `найдено: ${countMaterialGroups(semanticDraft)}`
    ),
    buildCheck("lighting", "Освещение", hasLighting(semanticDraft)),
    buildCheck(
      "sceneGraph",
      "Scene graph",
      asArray(semanticDraft?.sceneGraph?.objects).length > 0,
      `objects: ${asArray(semanticDraft?.sceneGraph?.objects).length}`
    ),
    buildCheck(
      "editableObjects",
      "Editable objects",
      asArray(semanticDraft?.editableObjects).length > 0,
      `items: ${asArray(semanticDraft?.editableObjects).length}`
    ),
    buildCheck("styleConsistency", "Style consistency", hasConceptDNA(semanticDraft)),
    buildCheck(
      "specGroups",
      "SPEC groups",
      hasSpecGroups(semanticDraft, budgetDraft),
      budgetDraft ? "budgetDraft/spec" : "specAnalysis"
    ),
    buildCheck(
      "designMutations",
      "Design mutations",
      countDesignMutations(semanticDraft) > 0,
      `mutations: ${countDesignMutations(semanticDraft)}`
    ),
    buildCheck(
      "designMutationsMin",
      "Design mutations (мин. 3)",
      countDesignMutations(semanticDraft) >= 3,
      `mutations: ${countDesignMutations(semanticDraft)}`
    ),
    buildCheck(
      "mutationPrompts",
      "Mutation prompt templates",
      hasMutationPromptTemplates(semanticDraft),
      "promptTemplateRu"
    ),
    buildCheck("mutationPreserveDNA", "Mutation preserveDNA", hasMutationPreserveDNA(semanticDraft)),
    buildCheck("mutationChangeTargets", "Mutation changeTargets", hasMutationChangeTargets(semanticDraft)),
    buildCheck(
      "generationPackagePrompt",
      "Generation package promptRu",
      generationPackagesCheck(semanticDraft, (entry) => asString(entry.promptRu)),
      `packages: ${countGenerationPackages(semanticDraft)}`
    ),
    buildCheck(
      "generationPackagePreserve",
      "Generation package preserveRules",
      generationPackagesCheck(semanticDraft, (entry) => asArray(entry.preserveRules).length > 0),
      `packages: ${countGenerationPackages(semanticDraft)}`
    ),
    buildCheck(
      "generationPackageTargets",
      "Generation package changeTargets",
      generationPackagesCheck(semanticDraft, (entry) => asArray(entry.changeTargets).length > 0),
      `packages: ${countGenerationPackages(semanticDraft)}`
    ),
    buildCheck(
      "generationPackageNegative",
      "Generation package negativePromptRu",
      generationPackagesCheck(semanticDraft, (entry) => asString(entry.negativePromptRu)),
      `packages: ${countGenerationPackages(semanticDraft)}`
    ),
  ];

  const normalizedSpecGroupsCheck = buildCheck(
    "normalizedSpecGroups",
    "Normalized spec groups",
    asArray(budgetDraft?.normalizedSpecGroups).length > 0,
    `groups: ${asArray(budgetDraft?.normalizedSpecGroups).length}`
  );

  for (const check of checks) {
    if (check.passed) passedChecks.push(check);
    else failedChecks.push(check);
  }

  if (!hasSemanticAnalysis(semanticDraft)) {
    warnings.push("Семантический анализ неполный или отсутствует.");
  }
  if (scenario && !hasRoomType(semanticDraft)) {
    warnings.push(`Сценарий «${scenario.labelRu}» ожидает определённый roomType.`);
  }
  if (countDesignMutations(semanticDraft) > 0 && !countGenerationPackages(semanticDraft)) {
    warnings.push("Есть designMutations, но generationPackages ещё не подготовлены.");
  }
  const completedUnanalyzedPackages = asArray(semanticDraft?.generationPackages).filter(
    (entry) => entry?.status === "completed" && entry?.resultVisualId && entry?.analyzedAfterRegeneration !== true
  );
  if (completedUnanalyzedPackages.length) {
    warnings.push("Новая controlled-итерация создана, но ещё не проанализирована.");
  }
  if (!budgetDraft) {
    warnings.push("Budget draft не создан: проверка normalizedSpecGroups будет неполной.");
    warnings.push("Создайте черновик сметы для проверки normalizedSpecGroups.");
  } else if (!normalizedSpecGroupsCheck.passed) {
    failedChecks.push(normalizedSpecGroupsCheck);
  } else {
    passedChecks.push(normalizedSpecGroupsCheck);
  }

  if (hasFallbackSceneGraph(semanticDraft)) {
    recommendations.push("Fallback построил sceneGraph из PRO/SPEC.");
  }
  if (hasFallbackEditableObjects(semanticDraft)) {
    recommendations.push("EditableObjects достроены из sceneGraph.");
  }

  for (const failed of failedChecks) {
    recommendations.push(recommendationForCheck(failed.id));
  }

  const scoredChecks = budgetDraft ? [...checks, normalizedSpecGroupsCheck] : checks;
  const score = scoredChecks.length ? Math.round((passedChecks.length / scoredChecks.length) * 100) : 0;

  return {
    scenarioType: scenario?.type || scenarioType || "",
    scenarioLabelRu: scenario?.labelRu || "",
    score,
    passedChecks,
    failedChecks,
    warnings: [...new Set(warnings)],
    recommendations: [...new Set(recommendations)],
  };
}
