import { getConceptDNA } from "./styleConsistencyUtils";

const PACKAGE_MODES = new Set(["controlled_text_to_image", "future_image_to_image"]);
const PACKAGE_STATUSES = new Set(["draft", "ready", "generating", "completed", "failed", "archived"]);
const IMPACT_LEVELS = new Set(["low", "medium", "high"]);

const DEFAULT_NEGATIVE_PROMPT_RU = [
  "не менять ракурс",
  "не менять планировку",
  "не добавлять случайные предметы",
  "не менять назначение помещения",
  "не ломать стиль",
  "не пересобирать сцену заново",
].join("; ");

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function pickImpact(value, fallback = "medium") {
  const normalized = asString(value).toLowerCase();
  return IMPACT_LEVELS.has(normalized) ? normalized : fallback;
}

function pickMode(value) {
  const normalized = asString(value);
  return PACKAGE_MODES.has(normalized) ? normalized : "controlled_text_to_image";
}

function pickStatus(value) {
  const normalized = asString(value);
  return PACKAGE_STATUSES.has(normalized) ? normalized : "draft";
}

function uniqueStrings(values, limit = 12) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = asString(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function makePackageId(sourceMutationId) {
  const mutationId = asString(sourceMutationId) || "mutation";
  return `package_${mutationId}_${Date.now()}`;
}

function collectPreserveRules(mutation, semanticDraft) {
  const conceptDNA = getConceptDNA(semanticDraft?.styleConsistency);
  const sceneRules = asArray(semanticDraft?.sceneGraph?.preservationRules)
    .map((rule) => asString(rule?.ruleRu))
    .filter(Boolean);
  return uniqueStrings(
    [
      ...asArray(mutation?.preserveDNA),
      ...asArray(conceptDNA.mustPreserve),
      ...asArray(semanticDraft?.specAnalysis?.whatMustBePreserved),
      ...asArray(semanticDraft?.proAnalysis?.designIntent?.whatMustBePreserved),
      conceptDNA.compositionCore,
      conceptDNA.styleCore,
      conceptDNA.colorCore,
      conceptDNA.atmosphereCore,
      conceptDNA.materialCore,
      "композиция",
      "ракурс",
      "основные зоны",
      "масштаб объектов",
      ...sceneRules,
    ],
    16
  );
}

function collectChangeTargets(mutation) {
  return uniqueStrings(asArray(mutation?.changeTargets), 12);
}

function collectAffectedEditableObjects(mutation, semanticDraft) {
  const editableById = new Map(
    asArray(semanticDraft?.editableObjects).map((entry) => [asString(entry.id), entry.labelRu])
  );
  return uniqueStrings(
    asArray(mutation?.affectedEditableObjects).map((value) => editableById.get(value) || value),
    12
  );
}

function collectAffectedSpecGroups(mutation) {
  return uniqueStrings(asArray(mutation?.affectedSpecGroups), 12);
}

function collectConsistencyNotes(mutation, semanticDraft) {
  const conceptDNA = getConceptDNA(semanticDraft?.styleConsistency);
  const notes = [
    mutation?.noteRu,
    conceptDNA.styleCore ? `Стиль: ${conceptDNA.styleCore}` : "",
    conceptDNA.materialCore ? `Материалы: ${conceptDNA.materialCore}` : "",
    conceptDNA.atmosphereCore ? `Атмосфера: ${conceptDNA.atmosphereCore}` : "",
  ];
  for (const entry of asArray(semanticDraft?.editableObjects)) {
    const impact = entry?.styleConsistencyImpact;
    if (!impact?.warningRu) continue;
    notes.push(`${entry.labelRu}: ${impact.warningRu}`);
  }
  return uniqueStrings(notes, 8).join(" ");
}

function collectDoNotChangeTargets(mutation, semanticDraft) {
  const targeted = new Set(collectChangeTargets(mutation).map((value) => value.toLowerCase()));
  const protectedObjects = asArray(semanticDraft?.editableObjects)
    .filter((entry) => entry.editSafety === "low" || entry.replacementRisk === "high")
    .map((entry) => entry.labelRu)
    .filter(Boolean);
  const notes = [
  "геометрию помещения",
  "назначение помещения",
  "ракурс и масштаб",
  ...protectedObjects,
  ];
  if (!targeted.has("свет") && !targeted.has("lighting") && !targeted.has("освещение")) {
    notes.push("освещение, если оно не указано в целях изменения");
  }
  return uniqueStrings(notes, 10);
}

function buildPromptEnFromParts({ preserveRules, changeTargets, goalRu, styleCore, materialCore, constraints, doNotChange }) {
  return [
    "Create a new interior iteration based on the current concept.",
    preserveRules.length ? `Preserve: ${preserveRules.join(", ")}.` : "",
    changeTargets.length ? `Change: ${changeTargets.join(", ")}.` : "",
    goalRu ? `Goal: ${goalRu}.` : "",
    styleCore ? `Style: ${styleCore}.` : "",
    materialCore ? `Materials: ${materialCore}.` : "",
    constraints.length ? `Constraints: ${constraints.join("; ")}.` : "",
    doNotChange.length ? `Do not change: ${doNotChange.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildControlledPromptFromPackage(pkg, semanticDraft = null) {
  const draft = semanticDraft && typeof semanticDraft === "object" ? semanticDraft : {};
  const conceptDNA = getConceptDNA(draft.styleConsistency);
  const preserveRules = uniqueStrings(pkg?.preserveRules, 12);
  const changeTargets = uniqueStrings(pkg?.changeTargets, 12);
  const constraints = uniqueStrings(
    [
      ...preserveRules,
      asString(pkg?.consistencyNotesRu),
      asArray(pkg?.affectedEditableObjects).length
        ? `Затронутые editable objects: ${pkg.affectedEditableObjects.join(", ")}`
        : "",
    ],
    10
  );
  const doNotChange = collectDoNotChangeTargets(
    { changeTargets: pkg?.changeTargets, preserveDNA: pkg?.preserveRules },
    draft
  );

  const promptRu = [
    "Создай новую итерацию интерьера на основе текущей концепции.",
    preserveRules.length ? `Сохрани: ${preserveRules.join(", ")}.` : "",
    changeTargets.length ? `Измени: ${changeTargets.join(", ")}.` : "",
    asString(pkg?.goalRu) ? `Цель: ${asString(pkg.goalRu)}.` : "",
    conceptDNA.styleCore ? `Стиль: ${conceptDNA.styleCore}.` : "",
    conceptDNA.materialCore ? `Материалы: ${conceptDNA.materialCore}.` : "",
    constraints.length ? `Ограничения: ${constraints.join("; ")}.` : "",
    doNotChange.length ? `Не менять: ${doNotChange.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const promptEn = buildPromptEnFromParts({
    preserveRules,
    changeTargets,
    goalRu: asString(pkg?.goalRu),
    styleCore: conceptDNA.styleCore,
    materialCore: conceptDNA.materialCore,
    constraints,
    doNotChange,
  });

  return {
    promptRu,
    promptEn,
    negativePromptRu: asString(pkg?.negativePromptRu) || DEFAULT_NEGATIVE_PROMPT_RU,
  };
}

export function normalizeGenerationPackage(raw, semanticDraft = null) {
  if (!raw || typeof raw !== "object") return null;
  const sourceMutationId = asString(raw.sourceMutationId);
  if (!sourceMutationId) return null;

  const mutation = asArray(semanticDraft?.designMutations).find((entry) => entry.id === sourceMutationId) || null;
  const preserveRules = uniqueStrings(raw.preserveRules || mutation?.preserveDNA, 16);
  const changeTargets = uniqueStrings(raw.changeTargets || mutation?.changeTargets, 12);
  const affectedEditableObjects = uniqueStrings(
    raw.affectedEditableObjects || mutation?.affectedEditableObjects,
    12
  );
  const affectedSpecGroups = uniqueStrings(raw.affectedSpecGroups || mutation?.affectedSpecGroups, 12);

  const draftPackage = {
    id: asString(raw.id) || makePackageId(sourceMutationId),
    sourceMutationId,
    projectKey: asString(raw.projectKey),
    sourceImageId: asString(raw.sourceImageId),
    sourceAnalysisId: asString(raw.sourceAnalysisId),
    createdAt: asString(raw.createdAt) || new Date().toISOString(),
    mode: pickMode(raw.mode),
    status: pickStatus(raw.status),
    preserveRules,
    changeTargets,
    affectedEditableObjects,
    affectedSpecGroups,
    promptRu: asString(raw.promptRu),
    promptEn: asString(raw.promptEn),
    negativePromptRu: asString(raw.negativePromptRu) || DEFAULT_NEGATIVE_PROMPT_RU,
    consistencyNotesRu: asString(raw.consistencyNotesRu),
    expectedStyleImpact: pickImpact(raw.expectedStyleImpact || mutation?.styleImpact),
    expectedBudgetImpact: pickImpact(raw.expectedBudgetImpact || mutation?.budgetImpact),
    riskLevel: pickImpact(raw.riskLevel || mutation?.riskLevel),
    readyForGeneration: asBoolean(raw.readyForGeneration, false),
    requiresImageToImage: asBoolean(raw.requiresImageToImage, true),
    requiresMask: asBoolean(raw.requiresMask, false),
    requiresSku: asBoolean(raw.requiresSku, false),
    goalRu: asString(raw.goalRu || mutation?.goalRu),
    resultVisualId: asString(raw.resultVisualId),
    analyzedAfterRegeneration: asBoolean(raw.analyzedAfterRegeneration, false),
  };

  if (!draftPackage.promptRu || !draftPackage.promptEn) {
    const prompts = buildControlledPromptFromPackage(draftPackage, semanticDraft);
    draftPackage.promptRu = draftPackage.promptRu || prompts.promptRu;
    draftPackage.promptEn = draftPackage.promptEn || prompts.promptEn;
  }
  if (!draftPackage.consistencyNotesRu) {
    draftPackage.consistencyNotesRu = collectConsistencyNotes(mutation, semanticDraft);
  }

  return draftPackage;
}

export function normalizeGenerationPackages(raw, semanticDraft = null) {
  const byMutation = new Map();
  for (const entry of asArray(raw)) {
    const normalized = normalizeGenerationPackage(entry, semanticDraft);
    if (!normalized) continue;
    byMutation.set(normalized.sourceMutationId, normalized);
  }
  return [...byMutation.values()];
}

export function createGenerationPackageFromMutation(mutation, semanticDraft, context = {}) {
  const sourceMutationId = asString(mutation?.id);
  if (!sourceMutationId) return null;

  const preserveRules = collectPreserveRules(mutation, semanticDraft);
  const changeTargets = collectChangeTargets(mutation);
  const affectedEditableObjects = collectAffectedEditableObjects(mutation, semanticDraft);
  const affectedSpecGroups = collectAffectedSpecGroups(mutation);
  const affectedIds = new Set(asArray(mutation?.affectedEditableObjects).map((value) => asString(value)).filter(Boolean));
  const affectedLabels = new Set(affectedEditableObjects.map((value) => value.toLowerCase()));
  const requiresSku = asArray(semanticDraft?.editableObjects).some(
    (entry) =>
      (affectedIds.has(entry.id) || affectedLabels.has(asString(entry.labelRu).toLowerCase())) &&
      Boolean(entry.futureReady?.skuRelevant)
  );

  const basePackage = {
    id: makePackageId(sourceMutationId),
    sourceMutationId,
    projectKey: asString(context.projectKey),
    sourceImageId: asString(context.sourceImageId),
    sourceAnalysisId: asString(context.sourceAnalysisId),
    createdAt: new Date().toISOString(),
    mode: "controlled_text_to_image",
    status: "draft",
    preserveRules,
    changeTargets,
    affectedEditableObjects,
    affectedSpecGroups,
    promptRu: "",
    promptEn: "",
    negativePromptRu: DEFAULT_NEGATIVE_PROMPT_RU,
    consistencyNotesRu: collectConsistencyNotes(mutation, semanticDraft),
    expectedStyleImpact: pickImpact(mutation?.styleImpact),
    expectedBudgetImpact: pickImpact(mutation?.budgetImpact),
    riskLevel: pickImpact(mutation?.riskLevel),
    readyForGeneration: false,
    requiresImageToImage: true,
    requiresMask: false,
    requiresSku,
    goalRu: asString(mutation?.goalRu),
  };

  const prompts = buildControlledPromptFromPackage(basePackage, semanticDraft);
  const mergedPromptRu = uniqueStrings(
    [asString(mutation?.promptTemplateRu), prompts.promptRu, promptsFromMutation(mutation, semanticDraft)],
    6
  ).join(" ");

  return normalizeGenerationPackage(
    {
      ...basePackage,
      promptRu: mergedPromptRu,
      promptEn: prompts.promptEn,
      negativePromptRu: DEFAULT_NEGATIVE_PROMPT_RU,
    },
    semanticDraft
  );
}

function promptsFromMutation(mutation, semanticDraft) {
  const conceptDNA = getConceptDNA(semanticDraft?.styleConsistency);
  return uniqueStrings(
    [
      mutation?.promptTemplateRu,
      conceptDNA.compositionCore ? `Сохранить композицию: ${conceptDNA.compositionCore}` : "",
      conceptDNA.colorCore ? `Сохранить палитру: ${conceptDNA.colorCore}` : "",
    ],
    4
  ).join(" ");
}

export function getGenerationPackagesByMutation(semanticDraft, mutationId) {
  const id = asString(mutationId);
  if (!id) return [];
  return asArray(semanticDraft?.generationPackages).filter((entry) => entry.sourceMutationId === id);
}

export function getReadyGenerationPackages(semanticDraft) {
  return asArray(semanticDraft?.generationPackages).filter((entry) => entry.readyForGeneration);
}

export function getGenerationBridgeSummary(semanticDraft) {
  const packages = asArray(semanticDraft?.generationPackages);
  return {
    total: packages.length,
    draft: packages.filter((entry) => entry.status === "draft").length,
    requiresImageToImage: packages.filter((entry) => entry.requiresImageToImage).length,
    requiresMask: packages.filter((entry) => entry.requiresMask).length,
    ready: packages.filter((entry) => entry.readyForGeneration).length,
    completed: packages.filter((entry) => entry.status === "completed").length,
    generating: packages.filter((entry) => entry.status === "generating").length,
  };
}

export function evaluateGenerationPackageReadiness(pkg, context = {}) {
  const reasons = [];
  const sourceImageId = asString(pkg?.sourceImageId) || asString(context.sourceImageId);
  const sourceImageBase64 = asString(context.sourceImageBase64);
  if (!sourceImageId && !sourceImageBase64) reasons.push("нет исходного изображения");
  if (!asString(pkg?.promptRu) && !asString(pkg?.promptEn)) reasons.push("нет prompt");
  if (!asArray(pkg?.preserveRules).length) reasons.push("нет preserveRules");
  if (!asArray(pkg?.changeTargets).length) reasons.push("нет targets");
  if (pkg?.status === "generating") reasons.push("пакет уже генерируется");
  if (pkg?.status === "completed") reasons.push("итерация уже создана");
  return { ready: reasons.length === 0, reasons };
}

export function applyGenerationPackageReadiness(pkg, context = {}) {
  const normalized = pkg && typeof pkg === "object" ? { ...pkg } : null;
  if (!normalized) return null;
  const { ready, reasons } = evaluateGenerationPackageReadiness(normalized, context);
  normalized.readyForGeneration = ready;
  if (normalized.status !== "generating" && normalized.status !== "completed" && normalized.status !== "failed") {
    normalized.status = ready ? "ready" : "draft";
  }
  normalized.readinessReasons = reasons;
  return normalized;
}

export function buildControlledRegenerationPrompt(generationPackage, semanticDraft = null) {
  const pkg = generationPackage && typeof generationPackage === "object" ? generationPackage : {};
  const draft = semanticDraft && typeof semanticDraft === "object" ? semanticDraft : {};
  const conceptDNA = getConceptDNA(draft.styleConsistency);
  const preserve = uniqueStrings(
    [
      "camera angle",
      "room geometry",
      "furniture layout",
      "object scale",
      "main lighting direction",
      "functional zones",
      "composition",
      ...asArray(pkg.preserveRules),
    ],
    16
  );
  const changes = uniqueStrings(asArray(pkg.changeTargets), 12);
  const constraints = uniqueStrings(
    [
      conceptDNA.colorCore,
      conceptDNA.materialCore,
      asString(pkg.consistencyNotesRu),
      asString(pkg.negativePromptRu),
    ],
    8
  );

  return [
    "Use the provided image as the base scene.",
    preserve.length ? `Preserve: ${preserve.join(", ")}.` : "",
    changes.length ? `Apply only these changes: ${changes.join(", ")}.` : "",
    asString(pkg.goalRu) ? `Design goal: ${asString(pkg.goalRu)}.` : "",
    conceptDNA.styleCore || conceptDNA.atmosphereCore
      ? `Style DNA: ${[conceptDNA.styleCore, conceptDNA.atmosphereCore, conceptDNA.compositionCore].filter(Boolean).join("; ")}.`
      : "",
    constraints.length ? `Material / color constraints: ${constraints.join("; ")}.` : "",
    "Do not: change room type; change camera angle; rebuild the scene; add random furniture; remove important objects; alter unrelated areas; change proportions.",
    "No text, no watermark, no logos.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function upsertGenerationPackage(packages, nextPackage) {
  const list = asArray(packages);
  const id = asString(nextPackage?.id);
  const sourceMutationId = asString(nextPackage?.sourceMutationId);
  const rest = list.filter(
    (entry) => entry.id !== id && entry.sourceMutationId !== sourceMutationId
  );
  return [...rest, nextPackage];
}
