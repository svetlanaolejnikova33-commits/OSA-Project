function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isModeluxBrand(brandName) {
  return /моделюкс|modelux/i.test(String(brandName || ""));
}

/**
 * On-demand product image/card URL enrichment (no local image storage).
 */
export async function enrichSkuMatchesWithProductMedia(skuMatches) {
  const items = asArray(skuMatches);
  if (!items.length) return [];

  const brandName = items.find((entry) => entry?.brandName)?.brandName || "МОДЕЛЮКС";
  if (!isModeluxBrand(brandName)) return items;

  try {
    const res = await fetch("/api/registry/resolve-product-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName,
        items: items.map((item) => ({
          article: item.article,
          productName: item.productName,
        })),
      }),
    });
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.items)) return items;

    const mediaByArticle = new Map(
      data.items.map((entry) => [String(entry.article || "").trim(), entry]),
    );

    return items.map((item) => {
      const media = mediaByArticle.get(String(item.article || "").trim());
      if (!media) return item;
      return {
        ...item,
        imageUrl: media.imageUrl || null,
        productUrl: media.productUrl || media.searchUrl || null,
        imageSource: media.imageSource || null,
        imageConfidence: Number.isFinite(media.imageConfidence) ? media.imageConfidence : 0,
        searchUrl: media.searchUrl || null,
      };
    });
  } catch (error) {
    console.warn("[OSA] product media enrich failed:", error);
    return items;
  }
}
