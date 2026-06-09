import { isLightingCategoryId } from "./categorySkuKeywords";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isModeluxBrand(brandName) {
  return /моделюкс|modelux/i.test(String(brandName || ""));
}

function findModeluxLightingGroup(normalizedSpecGroups) {
  for (const group of asArray(normalizedSpecGroups)) {
    const categoryId =
      typeof group?.registryCategoryId === "string" ? group.registryCategoryId.trim() : "";
    if (!isLightingCategoryId(categoryId)) continue;

    const matched = asArray(group?.supplierCandidates?.matchedBrands).find((brand) =>
      isModeluxBrand(brand?.brandName),
    );
    if (matched) {
      return { categoryId, brandName: matched.brandName };
    }
  }
  return null;
}

/**
 * On-demand SKU shortlist for budget draft (max 5 items, not persisted separately).
 */
export async function fetchSkuMatchesForBudgetDraft(payload) {
  const target = findModeluxLightingGroup(payload?.normalizedSpecGroups);
  if (!target) return [];

  try {
    const res = await fetch("/api/registry/resolve-sku", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: target.categoryId,
        brandName: target.brandName,
      }),
    });
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.items) || !data.items.length) return [];

    return data.items.map((item) => ({
      brandName: data.brandName || target.brandName,
      categoryId: data.categoryId || target.categoryId,
      sourceUrl: data.sourceUrl || "",
      sourceType: data.sourceType || "xml",
      article: item.article,
      productName: item.productName,
      unitPrice: item.unitPrice,
      stock: item.stock || "",
      resolvedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("[OSA] SKU resolve failed:", error);
    return [];
  }
}
