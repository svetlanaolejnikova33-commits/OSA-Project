import { getRegistryParentCategory } from "./supplierRegistry";
import { SUPPLIER_SOURCES } from "./supplierSourcesRegistry";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function categoryLabelForGroup(group) {
  const parent = typeof group?.parentLabelRu === "string" ? group.parentLabelRu.trim() : "";
  const label = typeof group?.labelRu === "string" ? group.labelRu.trim() : "";
  if (parent && label) return `${parent} / ${label}`;
  return label || parent || "Категория";
}

function categoryIdsForGroup(registryCategoryId) {
  const id = typeof registryCategoryId === "string" ? registryCategoryId.trim() : "";
  if (!id) return [];
  const parent = getRegistryParentCategory(id);
  const ids = [id];
  if (parent?.id) ids.push(parent.id);
  return ids;
}

function brandMatchesCategory(brand, registryCategoryId) {
  const categoryIds = categoryIdsForGroup(registryCategoryId);
  if (!categoryIds.length) return false;
  const brandCategories = asArray(brand?.categoryIds);
  return categoryIds.some((categoryId) => brandCategories.includes(categoryId));
}

function confidenceLabel(score, matchCount) {
  if (matchCount >= 3 || score >= 0.85) return "high";
  if (matchCount >= 1 || score >= 0.55) return "medium";
  return "low";
}

function scoreBrandMatch(brand, registryCategoryId) {
  const categoryIds = categoryIdsForGroup(registryCategoryId);
  const brandCategories = asArray(brand?.categoryIds);
  if (!categoryIds.length || !brandCategories.length) return 0;
  if (brandCategories.includes(registryCategoryId)) return 0.95;
  const parentId = categoryIds[1];
  if (parentId && brandCategories.includes(parentId)) return 0.75;
  return 0;
}

function buildMatchedBrand(brand, score) {
  return {
    brandId: brand.id,
    brandName: brand.brandName,
    supplierId: brand.supplierId,
    supplierName: brand.supplierName,
    segment: brand.segment || "middle",
    confidence: confidenceLabel(score, 1),
  };
}

function flattenSupplierBrands(supplierSources) {
  const rows = [];
  for (const source of asArray(supplierSources)) {
    for (const entry of asArray(source?.brands)) {
      rows.push({
        ...entry,
        supplierId: source.id,
        supplierName: source.supplierName,
      });
    }
  }
  return rows;
}

function matchBrandsForGroup(registryCategoryId, supplierSources = SUPPLIER_SOURCES) {
  const brands = flattenSupplierBrands(supplierSources).filter((brand) => {
    if (!brandMatchesCategory(brand, registryCategoryId)) return false;
    return scoreBrandMatch(brand, registryCategoryId) > 0;
  });

  const ranked = brands
    .map((brand) => ({
      brand,
      score: scoreBrandMatch(brand, registryCategoryId),
    }))
    .sort((left, right) => right.score - left.score || left.brand.brandName.localeCompare(right.brand.brandName, "ru"));

  const matchedBrands = ranked.map(({ brand, score }) => buildMatchedBrand(brand, score));
  const supplierIds = new Set(matchedBrands.map((entry) => entry.supplierId).filter(Boolean));
  const topScore = ranked[0]?.score || 0;

  return {
    matchedBrands,
    supplierCount: supplierIds.size,
    confidence: confidenceLabel(topScore, matchedBrands.length),
  };
}

export function matchSpecGroupsToSuppliers({
  normalizedSpecGroups,
  supplierSources = SUPPLIER_SOURCES,
} = {}) {
  const groups = asArray(normalizedSpecGroups);
  const enrichedGroups = [];
  const matchedSupplierCandidates = [];

  for (const group of groups) {
    const registryCategoryId = typeof group?.registryCategoryId === "string" ? group.registryCategoryId : "";
    const match = matchBrandsForGroup(registryCategoryId, supplierSources);
    const supplierCandidates = {
      matchedBrands: match.matchedBrands,
      supplierCount: match.supplierCount,
      confidence: match.confidence,
    };
    const enriched = {
      ...group,
      supplierCandidates,
    };
    enrichedGroups.push(enriched);
    matchedSupplierCandidates.push({
      specGroupId: registryCategoryId,
      categoryLabel: categoryLabelForGroup(group),
      matchedBrands: match.matchedBrands.map((entry) => entry.brandName),
      confidence: match.confidence,
    });
  }

  return {
    normalizedSpecGroups: enrichedGroups,
    matchedSupplierCandidates,
  };
}
