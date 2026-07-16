/**
 * Structured live product extraction — never invents article or price.
 */

import { z } from "zod";
import { parseModeluxCatalogHtml } from "../../registry/parseModeluxCatalogHtml";

export const LiveProductExtractSchema = z.object({
  article: z.string().nullable(),
  title: z.string().nullable(),
  price: z.union([z.number(), z.string()]).nullable(),
  currency: z.string().nullable(),
  product_url: z.string().nullable(),
  image_url: z.string().nullable(),
  availability: z.string().nullable(),
  page_text: z.string().nullable(),
  specifications: z.record(z.string(), z.string()).nullable(),
});

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d.,]/g, "").replace(/\s+/g, "").replace(",", ".");
  // Russian prices often use spaces as thousands separators already stripped.
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length >= 3 && digits.length <= 8 && !cleaned.includes(".")) {
    const num = Number.parseInt(digits, 10);
    return Number.isFinite(num) ? num : null;
  }
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministic extraction from live HTML. Returns nulls when not visible.
 */
export function extractProductFromHtml(html, pageUrl = "") {
  const productBlockMatch =
    html.match(/<div[^>]*class=["'][^"']*product-info[^"']*["'][^>]*>[\s\S]{0,20000}/i) ||
    html.match(/<main[\s\S]{0,25000}/i);
  const productHtml = productBlockMatch ? productBlockMatch[0] : html;
  const text = stripTags(productHtml);
  const fullText = stripTags(html);

  const articleMatch =
    text.match(/\b(MD\.\d+\.\d+[A-Z]{0,4}|ML\.\d+\.\d+[A-Z]{0,4}|MS\.\d+\.\d+[A-Z]{0,4})\b/i) ||
    fullText.match(/\b(MD\.\d+\.\d+[A-Z]{0,4}|ML\.\d+\.\d+[A-Z]{0,4}|MS\.\d+\.\d+[A-Z]{0,4})\b/i);
  const titleMatch =
    html.match(/product-info__title[^>]*>([^<]+)/i) ||
    html.match(/<h1[^>]*>([^<]+)/i);
  const priceMatch =
    text.match(/Цена:\s*([\d\s]+)\s*₽/i) ||
    text.match(/([\d\s]{3,})\s*₽/);
  const imageMatch =
    html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    productHtml.match(/<img[^>]+src=["']([^"']+)["']/i);

  const article = articleMatch ? articleMatch[1].toUpperCase().replace(/\s+/g, "") : null;
  const normalizedArticle = article ? article.replace(/(\d)\s+([A-Z]+)$/i, "$1$2") : null;

  let title = titleMatch ? asString(titleMatch[1]) : null;
  if (!title && normalizedArticle) {
    // Fallback: first sentence/phrase that includes the visible article code.
    const around = text.match(
      new RegExp(`.{0,60}${normalizedArticle.replace(/\./g, "\\.")}.{0,40}`, "i"),
    );
    title = around ? asString(around[0]) : null;
  }

  const priceRaw = priceMatch ? priceMatch[1] : null;
  const price = parsePrice(priceRaw);
  const currency = price != null ? "RUB" : null;

  const availability = /нет в наличии|sold out/i.test(text)
    ? "out_of_stock"
    : /в наличии|available/i.test(text)
      ? "in_stock"
      : null;

  // Visible product evidence only — exclude site-wide navigation chrome.
  const page_text = text.slice(0, 6000) || null;

  return {
    article: normalizedArticle,
    title,
    price,
    currency,
    product_url: asString(pageUrl) || null,
    image_url: imageMatch ? asString(imageMatch[1]) : null,
    availability,
    page_text,
    specifications: {},
  };
}

/**
 * Collect catalog listing candidates from HTML (Modelux product-item cards).
 */
export function collectCatalogCandidates(html, baseUrl) {
  const parsed = parseModeluxCatalogHtml(html, baseUrl);
  return parsed.map((item) => ({
    title: item.productName,
    url: item.productUrl,
    image_url: item.imageUrl,
  }));
}

/**
 * Read full HTML from a Stagehand/Playwright-like page.
 */
export async function readPageHtml(page) {
  if (!page) return "";
  if (typeof page.evaluate === "function") {
    try {
      return await page.evaluate(() => document.documentElement.outerHTML);
    } catch {
      // fall through
    }
  }
  if (typeof page.content === "function") {
    try {
      return await page.content();
    } catch {
      return "";
    }
  }
  return "";
}

export function buildExtractInstruction(vision) {
  return [
    "Extract product details visible on this manufacturer product page only.",
    "If a field is not clearly visible, return null. Never invent article, price, or URL.",
    "Include a short page_text summary of visible construction features (shade, base, arm, side table, finish).",
    `Vision hints (for relevance only, do not invent): category=${vision?.category},`,
    `material=${vision?.material}, finish=${vision?.finish}, construction=${vision?.construction || ""}.`,
  ].join(" ");
}
