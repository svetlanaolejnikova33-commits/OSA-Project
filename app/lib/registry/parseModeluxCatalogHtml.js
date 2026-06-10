const MODELUX_SITE = "https://modelux.ru";

export const MODELUX_PENDANTS_CATALOG_URL = `${MODELUX_SITE}/catalog/podvesnoi-svetilnik`;

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function absUrl(base, href) {
  if (!href || href === "#") return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function isRealProductUrl(url) {
  return Boolean(url && /\/product\//i.test(url));
}

function isPlaceholderImage(url) {
  return /product-default/i.test(String(url || ""));
}

/**
 * Parse Modelux category catalog HTML into product cards.
 * @param {string} html
 * @param {string} [baseUrl]
 * @returns {Array<{ productName: string, productUrl: string, imageUrl: string|null }>}
 */
export function parseModeluxCatalogHtml(html, baseUrl = MODELUX_PENDANTS_CATALOG_URL) {
  const products = [];
  const seen = new Set();
  const blockRe = /<a[^>]+class=["'][^"']*product-item[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = blockRe.exec(html)) !== null) {
    const block = match[0];
    const inner = match[1];

    const hrefMatch = block.match(/href=["']([^"']+)["']/i);
    const productUrl = absUrl(baseUrl, hrefMatch?.[1]);
    if (!isRealProductUrl(productUrl) || seen.has(productUrl)) continue;

    const titleMatch = inner.match(
      /<span[^>]*class=["'][^"']*product-item__title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    );
    const productName = titleMatch ? stripTags(titleMatch[1]) : null;
    if (!productName) continue;

    const imgMatch = inner.match(/<img[^>]+>/i);
    let imageUrl = null;
    if (imgMatch) {
      const src = imgMatch[0].match(/\bsrc=["']([^"']+)["']/i)?.[1];
      imageUrl = absUrl(baseUrl, src);
      if (isPlaceholderImage(imageUrl)) imageUrl = null;
    }

    if (!imageUrl) {
      const dataImagesMatch = inner.match(/data-images=["']([^"']+)["']/i);
      if (dataImagesMatch) {
        try {
          const decoded = decodeHtmlEntities(dataImagesMatch[1]);
          const images = JSON.parse(decoded);
          if (Array.isArray(images) && images[0]) imageUrl = images[0];
        } catch {}
      }
    }

    seen.add(productUrl);
    products.push({
      productName,
      productUrl,
      imageUrl: imageUrl || null,
    });
  }

  return products;
}
