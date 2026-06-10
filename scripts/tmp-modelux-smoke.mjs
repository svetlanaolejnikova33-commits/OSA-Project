/**
 * PHASE DEMO-18.06 | STEP 3B-mini — Modelux Catalog Parser Smoke Test
 * One-off diagnostic script. Do not commit.
 */

const CANDIDATE_URLS = [
  "https://modelux.ru/catalog/podvesnoi-svetilnik",
  "https://modelux.ru/catalog/lustra",
  "https://modelux.ru/catalog/bra",
];

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
};

const SELECTORS_TRIED = [
  "a.product-item",
  ".product-item",
  ".product-item__title",
  ".product-item__articul",
  ".product-item__image-img",
  ".product-item__image[data-images]",
  "a[href*='/product/']",
  ".catalog-item",
  ".product-card",
];

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

function countSelectorHits(html, selector) {
  if (selector === "a.product-item") {
    return (html.match(/<a[^>]+class=["'][^"']*product-item[^"']*["']/gi) || []).length;
  }
  if (selector.startsWith(".")) {
    const cls = selector.slice(1).split(/[.[\]]/)[0];
    const re = new RegExp(`class=["'][^"']*\\b${cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    return (html.match(re) || []).length;
  }
  if (selector.includes("[href")) {
    return (html.match(/href=["'][^"']*\/product\/[^"']+["']/gi) || []).length;
  }
  return 0;
}

function parseModeluxProducts(html, baseUrl) {
  const products = [];
  const seen = new Set();
  const blockRe =
    /<a[^>]+class=["'][^"']*product-item[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = blockRe.exec(html)) !== null) {
    const block = match[0];
    const inner = match[1];

    const hrefMatch = block.match(/href=["']([^"']+)["']/i);
    const productUrl = absUrl(baseUrl, hrefMatch?.[1]);
    if (!productUrl || productUrl.endsWith("#") || seen.has(productUrl)) continue;

    const titleMatch = inner.match(
      /<span[^>]*class=["'][^"']*product-item__title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
    );
    const articulMatch = inner.match(
      /<span[^>]*class=["'][^"']*product-item__articul[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
    );

    const productName = titleMatch ? stripTags(titleMatch[1]) : null;
    const articleCandidate = articulMatch ? stripTags(articulMatch[1]) : null;

    const imgMatch = inner.match(/<img[^>]+>/i);
    let imageUrl = null;
    if (imgMatch) {
      const src = imgMatch[0].match(/\bsrc=["']([^"']+)["']/i)?.[1];
      imageUrl = absUrl(baseUrl, src);
      if (imageUrl?.includes("product-default")) imageUrl = null;
    }

    if (!imageUrl) {
      const dataImagesMatch = inner.match(
        /data-images=["']([^"']+)["']/i
      );
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
      productName: productName || "(no name)",
      productUrl,
      imageUrl: imageUrl || null,
      articleCandidate: articleCandidate || null,
    });
  }

  return products;
}

function analyzeHtmlSignals(html) {
  return {
    hasProductItemClass: /product-item/i.test(html),
    hasProductItemTitle: /product-item__title/i.test(html),
    hasProductItemArticul: /product-item__articul/i.test(html),
    hasProductLinks: /href=["'][^"']*\/product\/[^"']+["']/i.test(html),
    hasImgTags: /<img\b/i.test(html),
    hasImgSrc: /\bsrc=["']https?:\/\/[^"']+\/storage\//i.test(html),
    hasDataImages: /data-images=/i.test(html),
    hasPlaceholderOnly:
      /product-default/i.test(html) &&
      !/\bsrc=["']https?:\/\/[^"']+\/storage\//i.test(html),
    hasArticleMentions: /product-item__articul|арт[.\s]*икул/i.test(html),
    selectorHits: Object.fromEntries(
      SELECTORS_TRIED.map((s) => [s, countSelectorHits(html, s)])
    ),
  };
}

async function fetchUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    const html = await res.text();
    return { url, status: res.status, ok: res.ok, html, finalUrl: res.url, error: null };
  } catch (err) {
    return {
      url,
      status: null,
      ok: false,
      html: "",
      finalUrl: url,
      error: String(err?.message || err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function printFailureReport(result, signals) {
  console.log("\n--- FAILURE DIAGNOSTICS ---");
  console.log("HTTP status:", result.status ?? "N/A (fetch error)");
  if (result.error) console.log("Fetch error:", result.error);
  console.log("Final URL:", result.finalUrl);
  console.log("\nFirst 1000 chars of HTML:");
  console.log(result.html.slice(0, 1000));
  console.log("\nSelectors tried:");
  for (const s of SELECTORS_TRIED) {
    console.log(`  ${s} -> hits: ${signals.selectorHits[s] ?? 0}`);
  }
  console.log("\nHTML signals:");
  console.log(JSON.stringify(signals, null, 2));
  console.log("\nParsing blockers:");
  if (result.error) console.log("- Network/fetch failure");
  if (result.status && result.status >= 400) console.log("- Non-2xx HTTP status");
  if (!signals.hasProductItemClass) console.log("- No .product-item in HTML");
  if (!signals.hasProductLinks) console.log("- No /product/ links in HTML");
  if (!signals.hasImgSrc && !signals.hasDataImages)
    console.log("- No real image URLs (only placeholders or missing)");
  if (signals.hasPlaceholderOnly)
    console.log("- Only placeholder images, no /storage/ URLs");
}

async function main() {
  console.log("=== Modelux Catalog Parser Smoke Test ===\n");

  const urlResults = [];
  for (const url of CANDIDATE_URLS) {
    console.log(`Fetching: ${url}`);
    const result = await fetchUrl(url);
    const products = result.html ? parseModeluxProducts(result.html, result.finalUrl) : [];
    urlResults.push({ ...result, products });
    console.log(
      `  -> status ${result.status ?? "ERR"} | html ${result.html.length} | products ${products.length}`
    );
    if (result.error) console.log(`  -> error: ${result.error}`);
  }

  const ranked = urlResults
    .filter((r) => r.html)
    .map((r) => {
      const realProducts = r.products.filter(
        (p) =>
          p.productUrl.includes("/product/") &&
          p.productName !== "(no name)" &&
          !p.productUrl.endsWith("#")
      );
      const withImage = realProducts.filter((p) => p.imageUrl).length;
      const withUrl = realProducts.filter((p) => p.productUrl).length;
      const withArticle = realProducts.filter((p) => p.articleCandidate).length;
      const score =
        (r.ok ? 100 : 0) +
        realProducts.length * 10 +
        withImage * 5 +
        withArticle * 3;
      return { ...r, realProducts, withImage, withUrl, withArticle, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const realProducts = best?.realProducts?.filter((p) => p.productUrl.includes("/product/")) || [];

  if (!best || realProducts.length === 0) {
    const fallback = urlResults.find((r) => r.html) || urlResults[0];
    const signals = analyzeHtmlSignals(fallback?.html || "");
    console.log("\n=== RESULT: NO PARSEABLE PRODUCT CARDS ===");
    printFailureReport(fallback, signals);
    console.log("\n=== SUMMARY ===");
    console.log("Working URL: none with parseable product cards");
    console.log("Cards found: 0");
    console.log("Parser MVP ready: NO");
    return;
  }

  const signals = analyzeHtmlSignals(best.html);

  console.log("\n=== RESULT: PRODUCT CARDS FOUND ===");
  console.log("Working URL:", best.finalUrl);
  console.log("HTTP status:", best.status);
  console.log("Total real product cards:", realProducts.length);
  console.log("With imageUrl:", best.withImage);
  console.log("With productUrl:", best.withUrl);
  console.log("With articleCandidate:", best.withArticle);
  console.log("\nHTML signals:");
  console.log(JSON.stringify(signals, null, 2));
  console.log("\nFirst 5 candidates:");
  console.log(JSON.stringify(realProducts.slice(0, 5), null, 2));

  const mvpReady =
    best.ok &&
    realProducts.length >= 5 &&
    best.withImage >= 5 &&
    best.withUrl >= 5;

  console.log("\n=== URL COMPARISON ===");
  for (const r of urlResults) {
    const count = r.products.filter((p) => p.productUrl.includes("/product/")).length;
    console.log(
      `${r.url} -> status ${r.status ?? "ERR"}, products ${count}${r.error ? `, err: ${r.error}` : ""}`
    );
  }

  console.log("\n=== SUMMARY ===");
  console.log("Working URL:", best.finalUrl);
  console.log("Cards found:", realProducts.length);
  console.log(
    "Has imageUrl:",
    best.withImage > 0 ? `yes (${best.withImage}/${realProducts.length})` : "no"
  );
  console.log(
    "Has productUrl:",
    best.withUrl > 0 ? `yes (${best.withUrl}/${realProducts.length})` : "no"
  );
  console.log(
    "Has articleCandidate:",
    best.withArticle > 0
      ? `yes (${best.withArticle}/${realProducts.length})`
      : "partial — articul present only on some cards"
  );
  console.log("Parser MVP ready:", mvpReady ? "YES — proceed" : "PARTIAL — needs refinement");
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
