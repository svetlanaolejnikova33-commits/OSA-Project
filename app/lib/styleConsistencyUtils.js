const IMPACT_AREAS = new Set(["style", "color", "material", "composition", "atmosphere", "budget"]);
const RISK_LEVELS = new Set(["low", "medium", "high"]);
const RISK_RANK = { low: 1, medium: 2, high: 3 };

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pickRisk(value, fallback = "medium") {
  const normalized = asString(value).toLowerCase();
  return RISK_LEVELS.has(normalized) ? normalized : fallback;
}

function pickImpactArea(value, fallback = "style") {
  const normalized = asString(value).toLowerCase();
  return IMPACT_AREAS.has(normalized) ? normalized : fallback;
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = asString(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function maxRisk(left, right) {
  return (RISK_RANK[pickRisk(left)] || 0) >= (RISK_RANK[pickRisk(right)] || 0) ? pickRisk(left) : pickRisk(right);
}

function emptyStyleConsistency() {
  return {
    conceptDNA: {
      styleCore: "",
      atmosphereCore: "",
      colorCore: "",
      materialCore: "",
      compositionCore: "",
      mustPreserve: [],
    },
    editImpactRules: [],
    flexibility: {
      allowIntentionalBreaks: true,
      mode: "advisory",
    },
  };
}

function collectMaterialHighlights(semanticDraft) {
  const pro = semanticDraft?.proAnalysis || {};
  const materials = [];
  const materialAnalysis = pro.materialAnalysis || {};
  for (const key of Object.keys(materialAnalysis)) {
    for (const item of asArray(materialAnalysis[key])) {
      const label = [item.possibleMaterial, item.finish, item.texture].filter(Boolean).join(" · ");
      if (label) materials.push(label);
    }
  }
  return uniqueStrings(materials).slice(0, 4);
}

function buildConceptDNAFromSemanticDraft(semanticDraft) {
  const quick = semanticDraft?.quickAnalysis || {};
  const pro = semanticDraft?.proAnalysis || {};
  const spec = semanticDraft?.specAnalysis || {};
  const colorDescription =
    pro.colorAnalysis?.interpretedPalette?.descriptionRu ||
    quick.colorAnalysis?.interpretedPalette?.descriptionRu ||
    quick.colorAnalysis?.colorLogicRu ||
    "";
  const mustPreserve = uniqueStrings([
    ...asArray(pro.designIntent?.whatMustBePreserved),
    ...asArray(spec.whatMustBePreserved),
    ...asArray(semanticDraft?.sceneGraph?.preservationRules).map((rule) => rule.ruleRu),
  ]).slice(0, 6);

  return {
    styleCore:
      pro.styleAnalysis?.labelRu ||
      quick.styleAnalysis?.labelRu ||
      pro.styleAnalysis?.primary ||
      quick.styleAnalysis?.primary ||
      "",
    atmosphereCore: pro.atmosphereRu || quick.atmosphereRu || "",
    colorCore: colorDescription,
    materialCore: collectMaterialHighlights(semanticDraft).join(" · "),
    compositionCore:
      pro.designIntent?.summaryRu ||
      quick.designIntent?.summaryRu ||
      pro.designIntent?.emotionalEffectRu ||
      "",
    mustPreserve,
  };
}

function inferImpactAreas(editableObject) {
  const areas = new Set();
  const label = asString(editableObject.labelRu).toLowerCase();
  if (editableObject.styleImpact === "high" || /стен|кирпич|диван|мебел|стил/i.test(label)) areas.add("style");
  if (/цвет|обив|текстил|штор|краск/i.test(label) || asArray(editableObject.editTypes).includes("change_color")) {
    areas.add("color");
  }
  if (/материал|фактур|паркет|камень|дерев/i.test(label) || asArray(editableObject.editTypes).includes("change_material")) {
    areas.add("material");
  }
  if (editableObject.styleImpact === "high" || /диван|стол|зона|композиц/i.test(label)) areas.add("composition");
  if (/свет|люстр|ламп|атмосфер/i.test(label) || asArray(editableObject.editTypes).includes("change_lighting")) {
    areas.add("atmosphere");
  }
  if (editableObject.budgetImpact === "high" || editableObject.futureReady?.budgetRelevant) areas.add("budget");
  if (!areas.size) areas.add("style");
  return [...areas];
}

function buildHeuristicRule(editableObject) {
  const label = asString(editableObject.labelRu) || "объект";
  const overallRisk = maxRisk(editableObject.styleImpact, editableObject.replacementRisk);
  const impactedAreas = inferImpactAreas(editableObject);
  return {
    targetType: asString(editableObject.type) || "object",
    targetId: asString(editableObject.id) || asString(editableObject.sourceObjectId),
    impactArea: impactedAreas[0] || "style",
    riskLevel: overallRisk,
    warningRu: `Правка «${label.toLowerCase()}» повлияет на ${impactedAreas.join(", ")} сцены и может сместить акцент композиции.`,
    preserveHintRu: `Стоит сохранить масштаб, положение и роль «${label.toLowerCase()}» в текущей композиции.`,
    intentionalChangeHintRu: `Если цель — изменить эффект, можно осознанно усилить контраст или фактуру, не ломая общую логику пространства.`,
  };
}

function buildEditImpactRulesFromEditableObjects(editableObjects, semanticDraft) {
  return asArray(editableObjects).flatMap((entry) => {
    const baseRule = buildHeuristicRule(entry);
    return inferImpactAreas(entry).map((impactArea) => ({
      ...baseRule,
      impactArea,
      riskLevel: impactArea === "composition" || impactArea === "style" ? maxRisk(baseRule.riskLevel, entry.styleImpact) : baseRule.riskLevel,
    }));
  });
}

function normalizeConceptDNA(raw, semanticDraft) {
  const source = raw && typeof raw === "object" ? raw : {};
  const fallback = buildConceptDNAFromSemanticDraft(semanticDraft);
  return {
    styleCore: asString(source.styleCore) || fallback.styleCore,
    atmosphereCore: asString(source.atmosphereCore) || fallback.atmosphereCore,
    colorCore: asString(source.colorCore) || fallback.colorCore,
    materialCore: asString(source.materialCore) || fallback.materialCore,
    compositionCore: asString(source.compositionCore) || fallback.compositionCore,
    mustPreserve: asArray(source.mustPreserve).map((value) => asString(value)).filter(Boolean).length
      ? uniqueStrings(source.mustPreserve)
      : fallback.mustPreserve,
  };
}

function normalizeEditImpactRule(raw, index) {
  return {
    targetType: asString(raw?.targetType) || "object",
    targetId: asString(raw?.targetId) || `impact_${index + 1}`,
    impactArea: pickImpactArea(raw?.impactArea),
    riskLevel: pickRisk(raw?.riskLevel),
    warningRu: asString(raw?.warningRu),
    preserveHintRu: asString(raw?.preserveHintRu),
    intentionalChangeHintRu: asString(raw?.intentionalChangeHintRu),
  };
}

export function normalizeStyleConsistency(raw, semanticDraft = null) {
  const source = raw && typeof raw === "object" ? raw : {};
  const draft = semanticDraft && typeof semanticDraft === "object" ? semanticDraft : {};
  const conceptDNA = normalizeConceptDNA(source.conceptDNA, draft);
  let editImpactRules = asArray(source.editImpactRules)
    .map((rule, index) => normalizeEditImpactRule(rule, index))
    .filter((rule) => rule.warningRu || rule.preserveHintRu || rule.intentionalChangeHintRu);

  if (!editImpactRules.length) {
    editImpactRules = buildEditImpactRulesFromEditableObjects(draft.editableObjects, draft);
  }

  const flexibilitySource = source.flexibility && typeof source.flexibility === "object" ? source.flexibility : {};
  return {
    conceptDNA,
    editImpactRules,
    flexibility: {
      allowIntentionalBreaks: flexibilitySource.allowIntentionalBreaks !== false,
      mode: asString(flexibilitySource.mode) || "advisory",
    },
  };
}

function matchesTarget(rule, editableObjectId, sourceObjectId) {
  const targetId = asString(rule?.targetId);
  if (!targetId) return false;
  return targetId === asString(editableObjectId) || targetId === asString(sourceObjectId);
}

export function getEditImpactForObject(styleConsistency, editableObjectId, sourceObjectId = "") {
  const rules = asArray(styleConsistency?.editImpactRules).filter((rule) =>
    matchesTarget(rule, editableObjectId, sourceObjectId)
  );
  if (!rules.length) return null;

  const impactedAreas = uniqueStrings(rules.map((rule) => rule.impactArea));
  const overallRisk = rules.reduce((acc, rule) => maxRisk(acc, rule.riskLevel), "low");
  const warningRu = rules.map((rule) => rule.warningRu).find(Boolean) || "";
  const preserveHintRu = rules.map((rule) => rule.preserveHintRu).find(Boolean) || "";
  const intentionalChangeHintRu = rules.map((rule) => rule.intentionalChangeHintRu).find(Boolean) || "";

  return {
    overallRisk,
    impactedAreas,
    warningRu,
    preserveHintRu,
    intentionalChangeHintRu,
  };
}

export function getConceptDNA(styleConsistency) {
  return normalizeStyleConsistency(styleConsistency).conceptDNA;
}

export function getPreservationHints(styleConsistency) {
  const conceptDNA = getConceptDNA(styleConsistency);
  return uniqueStrings([
    ...asArray(conceptDNA.mustPreserve),
    ...asArray(styleConsistency?.editImpactRules).map((rule) => rule.preserveHintRu),
  ]);
}

export function getIntentionalChangeHints(styleConsistency) {
  return uniqueStrings(asArray(styleConsistency?.editImpactRules).map((rule) => rule.intentionalChangeHintRu));
}

export function buildStyleConsistencyImpact(editableObject, styleConsistency) {
  const fromRules = getEditImpactForObject(styleConsistency, editableObject.id, editableObject.sourceObjectId);
  if (fromRules) return fromRules;
  const heuristicRule = buildHeuristicRule(editableObject);
  return {
    overallRisk: heuristicRule.riskLevel,
    impactedAreas: inferImpactAreas(editableObject),
    warningRu: heuristicRule.warningRu,
    preserveHintRu: heuristicRule.preserveHintRu,
    intentionalChangeHintRu: heuristicRule.intentionalChangeHintRu,
  };
}

export function attachStyleConsistencyImpactToEditableObjects(editableObjects, styleConsistency) {
  return asArray(editableObjects).map((entry) => ({
    ...entry,
    styleConsistencyImpact: buildStyleConsistencyImpact(entry, styleConsistency),
  }));
}

export function getConceptDNASummary(styleConsistency, editableObjects = []) {
  const conceptDNA = getConceptDNA(styleConsistency);
  const preservationCount = getPreservationHints(styleConsistency).length;
  const highImpactEditsCount = asArray(editableObjects).filter(
    (entry) => entry.styleConsistencyImpact?.overallRisk === "high" || entry.styleImpact === "high"
  ).length;

  return {
    style: conceptDNA.styleCore || "—",
    palette: conceptDNA.colorCore || "—",
    materials: conceptDNA.materialCore || "—",
    preservationCount,
    highImpactEditsCount,
  };
}
