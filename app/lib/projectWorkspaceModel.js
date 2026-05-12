import { hasSemanticAnalysis } from "./validateSemanticDraft";

const MATERIAL_GROUP_LABELS_RU = {
  floor: "Пол",
  walls: "Стены",
  ceiling: "Потолок",
  furniture: "Мебель",
  textiles: "Текстиль",
  metal: "Металл",
  stone: "Камень",
  glass: "Стекло",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

export function getProjectSnapshot(semanticDraft) {
  const quick = semanticDraft?.quickAnalysis || {};
  const pro = semanticDraft?.proAnalysis || {};
  const completed = asArray(semanticDraft?.completedAnalysisModes);
  const roomName = quick.spaceType?.labelRu || pro.spaceType?.labelRu || quick.spaceType?.value || "";
  const style =
    quick.styleAnalysis?.labelRu ||
    pro.styleAnalysis?.labelRu ||
    quick.styleAnalysis?.primary ||
    pro.styleAnalysis?.primary ||
    "";
  let status = "Ожидает анализа";
  if (hasSemanticAnalysis(semanticDraft)) {
    status = completed.length ? `Готово: ${completed.join(" · ").toUpperCase()}` : "Семантический анализ готов";
  }
  return { roomName, style, status };
}

export function getSidebarPalette(semanticDraft) {
  const colorAnalysis =
    semanticDraft?.quickAnalysis?.colorAnalysis || semanticDraft?.proAnalysis?.colorAnalysis || {};
  const extracted = colorAnalysis?.extractedPalette || {};
  const dominant = asArray(extracted.dominant).length ? extracted.dominant : asArray(colorAnalysis?.dominant);
  const accents = asArray(extracted.accents).length ? extracted.accents : asArray(colorAnalysis?.accents);
  return {
    dominant: dominant.slice(0, 6),
    accents: accents.slice(0, 4),
    source: extracted.source === "extracted" ? "extracted" : "vision",
  };
}

export function getMaterialHighlights(semanticDraft, limit = 8) {
  const pro = semanticDraft?.proAnalysis || {};
  const materials = [];
  const materialAnalysis = pro.materialAnalysis || {};
  for (const key of Object.keys(MATERIAL_GROUP_LABELS_RU)) {
    for (const item of asArray(materialAnalysis[key])) {
      const label = [MATERIAL_GROUP_LABELS_RU[key], item.possibleMaterial, item.finish, item.texture]
        .filter(Boolean)
        .join(" · ");
      if (label) materials.push(label);
    }
  }
  for (const item of asArray(pro.furnitureAnalysis)) {
    const label = [item.labelRu || item.type, item.materialGuess, item.finish].filter(Boolean).join(" · ");
    if (label) materials.push(label);
  }
  for (const item of asArray(pro.floorAnalysis)) {
    const label = ["Пол", item.finish, item.materialGuess, item.tone].filter(Boolean).join(" · ");
    if (label) materials.push(label);
  }
  for (const item of asArray(pro.wallAnalysis)) {
    const label = [item.zone ? `Стена: ${item.zone}` : "Стена", item.finish, item.texture, item.color]
      .filter(Boolean)
      .join(" · ");
    if (label) materials.push(label);
  }
  return uniqueStrings(materials, limit);
}

export function getBudgetCategories(semanticDraft, budgetDraft = null, limit = 8) {
  const normalized = asArray(budgetDraft?.normalizedSpecGroups);
  if (normalized.length) {
    return uniqueStrings(
      normalized.map((entry) => {
        const parent = typeof entry?.parentLabelRu === "string" ? entry.parentLabelRu.trim() : "";
        const label = typeof entry?.labelRu === "string" ? entry.labelRu.trim() : "";
        if (parent && label) return `${parent} / ${label}`;
        return label || parent;
      }),
      limit
    );
  }

  const spec = semanticDraft?.specAnalysis || {};
  const fromSuppliers = asArray(spec.supplierCategories).map((item) => item.category).filter(Boolean);
  const fromProducts = asArray(spec.productCategories).map((item) => item.category).filter(Boolean);
  const fromGroups = asArray(spec.specificationGroups).map((group) => group.group).filter(Boolean);
  return uniqueStrings([...fromSuppliers, ...fromProducts, ...fromGroups], limit);
}

export function getProjectProgressSteps(semanticDraft) {
  const completed = new Set(asArray(semanticDraft?.completedAnalysisModes));
  const spec = semanticDraft?.specAnalysis || {};
  const pipelines = semanticDraft?.pipelines || {};
  const analyzed = hasSemanticAnalysis(semanticDraft);
  return [
    { id: "vision", label: "Vision", done: analyzed },
    { id: "pro", label: "PRO", done: completed.has("pro") || Boolean(semanticDraft?.proAnalysis?.functionalZones?.length) },
    { id: "spec", label: "SPEC", done: completed.has("spec") || Boolean(spec.specificationGroups?.length) },
    { id: "bim", label: "BIM", done: Boolean(pipelines?.bimGraph?.ready) },
    { id: "budget", label: "Budget", done: asArray(spec.productCategories).length > 0 },
    { id: "sku", label: "SKU", done: asArray(spec.specificationGroups).length > 0 },
  ];
}

export function getAnalysisModeStates(semanticDraft) {
  const completed = new Set(asArray(semanticDraft?.completedAnalysisModes));
  return {
    quick: completed.has("quick"),
    pro: completed.has("pro"),
    spec: completed.has("spec"),
  };
}

export function getSupplierIntelligence(semanticDraft, budgetDraft) {
  const groups = asArray(budgetDraft?.normalizedSpecGroups);
  const brandNames = new Set();
  let matchedCategoryCount = 0;

  for (const group of groups) {
    const matchedBrands = asArray(group?.supplierCandidates?.matchedBrands);
    if (matchedBrands.length) matchedCategoryCount += 1;
    for (const brand of matchedBrands) {
      const name = typeof brand?.brandName === "string" ? brand.brandName.trim() : "";
      if (name) brandNames.add(name);
    }
  }

  const spec = semanticDraft?.specAnalysis || {};
  const hasSpec = Boolean(asArray(spec.specificationGroups).length || asArray(spec.productCategories).length);
  const hasSupplier = matchedCategoryCount > 0;
  const hasSku = groups.some((group) => asArray(group?.items).length > 0);
  const hasBudget = Boolean(budgetDraft);

  return {
    categoryCount: groups.length,
    matchedBrandCount: brandNames.size,
    readiness: [
      { id: "vision", label: "Vision", done: hasSemanticAnalysis(semanticDraft) },
      { id: "spec", label: "SPEC", done: hasSpec },
      { id: "supplier", label: "Supplier", done: hasSupplier },
      { id: "sku", label: "SKU", done: hasSku },
      { id: "budget", label: "Budget", done: hasBudget },
    ],
  };
}
