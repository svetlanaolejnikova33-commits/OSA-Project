const MODELUX_SITE = "https://modelux.ru";

function normalizeArticle(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function toAbsoluteUrl(href) {
  const raw = String(href || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${MODELUX_SITE}${raw}`;
  return `${MODELUX_SITE}/${raw}`;
}

function buildCatalogSearchUrl(article) {
  return `${MODELUX_SITE}/catalog/?search=${encodeURIComponent(normalizeArticle(article))}`;
}

function buildExternalSearchUrl(brandName, article) {
  const query = `${brandName || "MODELUX"} ${normalizeArticle(article)}`.trim();
  return `https://yandex.ru/search/?text=${encodeURIComponent(query)}`;
}

function isProductImageUrl(url) {
  const value = String(url || "").toLowerCase();
  if (!value) return false;
  if (/product-default|login-bg|e-katalog|build\/assets/i.test(value)) return false;
  return /\/storage\/|\/image\/public\//i.test(value);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleMatchesArticle(title, article) {
  const normalizedTitle = String(title || "").trim();
  const normalizedArticle = normalizeArticle(article);
  if (!normalizedTitle || !normalizedArticle) return false;
  if (normalizedTitle.includes(normalizedArticle)) return true;
  return normalizedTitle.replace(/\s+/g, "").includes(normalizedArticle.replace(/\s+/g, ""));
}

function extractImageFromBlock(block) {
  const imageMatches = [
    ...block.matchAll(/(?:src|data-src)="(https:\/\/modelux\.ru\/[^"]+)"/gi),
    ...block.matchAll(/(?:src|data-src)="(\/storage\/[^"]+)"/gi),
    ...block.matchAll(/(?:src|data-src)="(\/image\/[^"]+)"/gi),
  ]
    .map((entry) => toAbsoluteUrl(entry[1]))
    .filter(isProductImageUrl);
  return imageMatches[imageMatches.length - 1] || "";
}

/**
 * Parse modelux.ru catalog search HTML for exact article match.
 */
export function parseModeluxCatalogSearchHtml(html, article) {
  const needle = normalizeArticle(article);
  if (!needle || !html) return null;

  const titleRe = /product-item__title[^>]*>([^<]+)</gi;
  let match = titleRe.exec(html);

  while (match) {
    const title = match[1].trim();
    if (titleMatchesArticle(title, needle)) {
      const escapedTitle = escapeRegex(title);
      const cardRe = new RegExp(
        `<a\\b[^>]*href="([^"]*\\/product\\/[^"]+)"[\\s\\S]{0,5000}?product-item__title[^>]*>${escapedTitle}<`,
        "i",
      );
      const cardMatch = cardRe.exec(html);
      const block = cardMatch ? cardMatch[0] : html.slice(Math.max(0, match.index - 2500), match.index + 400);
      const productHref = cardMatch?.[1] || "";
      const imageUrl = extractImageFromBlock(block);
      const productUrl = productHref ? toAbsoluteUrl(productHref) : buildCatalogSearchUrl(needle);

      return {
        imageUrl: imageUrl || null,
        productUrl,
        imageSource: imageUrl ? "modelux_catalog_search" : "modelux_catalog_search_no_image",
        imageConfidence: imageUrl && productHref ? 0.88 : imageUrl ? 0.72 : 0.35,
        searchUrl: buildExternalSearchUrl("MODELUX", needle),
      };
    }

    match = titleRe.exec(html);
  }

  return null;
}

/**
 * On-demand product page media resolve for MODELUX (no catalog import).
 */
export async function resolveModeluxProductMedia({ article, productName, brandName = "MODELUX" } = {}) {
  const normalizedArticle = normalizeArticle(article);
  if (!normalizedArticle) {
    return {
      imageUrl: null,
      productUrl: MODELUX_SITE,
      imageSource: "missing_article",
      imageConfidence: 0,
      searchUrl: buildExternalSearchUrl(brandName, productName || ""),
    };
  }

  const searchUrl = buildCatalogSearchUrl(normalizedArticle);

  try {
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "OSA-ProductMedia-Resolver/1.0" },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        imageUrl: null,
        productUrl: searchUrl,
        imageSource: "modelux_catalog_search_failed",
        imageConfidence: 0.2,
        searchUrl: buildExternalSearchUrl(brandName, normalizedArticle),
      };
    }

    const html = await response.text();
    const parsed = parseModeluxCatalogSearchHtml(html, normalizedArticle);

    if (parsed) {
      return {
        ...parsed,
        searchUrl: parsed.searchUrl || buildExternalSearchUrl(brandName, normalizedArticle),
      };
    }

    return {
      imageUrl: null,
      productUrl: searchUrl,
      imageSource: "modelux_catalog_search_miss",
      imageConfidence: 0.25,
      searchUrl: buildExternalSearchUrl(brandName, normalizedArticle),
    };
  } catch {
    return {
      imageUrl: null,
      productUrl: searchUrl,
      imageSource: "modelux_catalog_search_error",
      imageConfidence: 0.15,
      searchUrl: buildExternalSearchUrl(brandName, normalizedArticle),
    };
  }
}
