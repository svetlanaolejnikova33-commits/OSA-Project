/**
 * Live product search on an official manufacturer website (Local Stagehand).
 * Deterministic navigation + structured extraction. No mock product cards.
 */

import { evaluateGateG3 } from "../gateG3";
import { buildLiveSearchTerms } from "./buildLiveSearchTerms";
import {
  LiveProductExtractSchema,
  buildExtractInstruction,
  collectCatalogCandidates,
  extractProductFromHtml,
  parsePrice,
  readPageHtml,
} from "./extractLiveProduct";
import { assertRegistryDomain } from "./resolveLiveTarget";
import { scoreLiveCandidate } from "./scoreLiveCandidate";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const url = asString(item?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(item);
  }
  return out;
}

function listingScore(vision, terms, candidate) {
  const hay = `${candidate.title || ""} ${candidate.url || ""}`.toLowerCase();
  let score = 0;
  for (const token of terms.tokens.slice(0, 10)) {
    const t = token.toLowerCase();
    if (t.length >= 4 && hay.includes(t.slice(0, Math.min(6, t.length)))) score += 0.08;
  }
  if (/napolnyi|floor|торшер|floor.?lamp/.test(hay)) score += 0.15;
  if (/podves|pendant/.test(hay) && /floor|торшер/.test(`${vision.category} ${vision.mounting}`)) {
    score -= 0.4;
  }
  if (/bra|wall|sconce|настен/.test(hay) && /floor|торшер/.test(`${vision.category} ${vision.mounting}`)) {
    score -= 0.3;
  }
  return score;
}

async function gotoChecked(runtime, page, binding, url) {
  await runtime.goto(page, url);
  const current = typeof page.url === "function" ? page.url() : String(page.url || "");
  if (!current || !assertRegistryDomain(binding, current)) {
    const err = new Error("domain_mismatch");
    err.code = "domain_mismatch";
    throw err;
  }
  return current;
}

/**
 * @param {{
 *   stagehand: object,
 *   page: object,
 *   runtime: object,
 *   vision: object,
 *   binding: object,
 *   catalogUrl: string,
 *   navigatorTraceId: string,
 *   maxCatalogPages?: number,
 *   maxProductOpens?: number,
 * }} args
 */
export async function runLiveProductSearch(args) {
  const {
    stagehand,
    page,
    runtime,
    vision,
    binding,
    catalogUrl,
    navigatorTraceId,
    maxCatalogPages = 3,
    maxProductOpens = 40,
  } = args;

  const verifiedAt = new Date().toISOString();
  const terms = buildLiveSearchTerms(vision);

  // 1. Open catalog
  await gotoChecked(runtime, page, binding, catalogUrl);

  // 2. Collect listing candidates across catalog pages
  let listings = [];
  for (let pageNum = 1; pageNum <= maxCatalogPages; pageNum += 1) {
    const pageUrl =
      pageNum === 1
        ? catalogUrl
        : `${catalogUrl}${catalogUrl.includes("?") ? "&" : "?"}page=${pageNum}`;
    await gotoChecked(runtime, page, binding, pageUrl);
    const html = await readPageHtml(page);
    const found = collectCatalogCandidates(html, pageUrl);
    if (!found.length && pageNum > 1) break;
    listings = listings.concat(found);
  }

  // 3. Optional on-site search (never includes article)
  if (terms.primaryQuery) {
    try {
      const searchUrl = new URL("/search", binding.website || catalogUrl);
      searchUrl.searchParams.set("query", terms.primaryQuery);
      await gotoChecked(runtime, page, binding, searchUrl.toString());
      const searchHtml = await readPageHtml(page);
      listings = listings.concat(collectCatalogCandidates(searchHtml, searchUrl.toString()));
    } catch {
      // Search UI may be absent — catalog pagination remains the primary path.
    }
  }

  listings = uniqueByUrl(listings);
  if (!listings.length) {
    return noMatchResult({
      binding,
      catalogUrl,
      navigatorTraceId,
      verifiedAt,
      reason: "product_not_found",
      error: "product_not_found",
    });
  }

  const rankedListings = listings
    .map((item) => ({ ...item, listing_score: listingScore(vision, terms, item) }))
    .sort((a, b) => {
      if (b.listing_score !== a.listing_score) return b.listing_score - a.listing_score;
      // Stable diversity: later catalog pages often hold additional construction variants.
      return String(a.url).localeCompare(String(b.url));
    });

  const toOpen = rankedListings.slice(0, maxProductOpens);
  const scored = [];

  for (const listing of toOpen) {
    if (!assertRegistryDomain(binding, listing.url)) continue;

    await gotoChecked(runtime, page, binding, listing.url);
    const html = await readPageHtml(page);
    const extracted = extractProductFromHtml(html, listing.url);

    const evidence = {
      title: extracted.title || listing.title || null,
      article: extracted.article || null,
      price: extracted.price,
      currency: extracted.currency || null,
      url: extracted.product_url || listing.url,
      image_url: extracted.image_url || listing.image_url || null,
      availability: extracted.availability || null,
      page_text: extracted.page_text || null,
      specifications: extracted.specifications || {},
    };

    const scoredMatch = scoreLiveCandidate(vision, evidence);
    scored.push({
      ...evidence,
      ...scoredMatch,
      source: "CCN_LIVE",
      manufacturer_id: binding.manufacturer_id,
      navigator_trace_id: navigatorTraceId,
      verified_at: verifiedAt,
      _html: html,
    });
  }

  scored.sort((a, b) => {
    if (b.match_confidence !== a.match_confidence) return b.match_confidence - a.match_confidence;
    return String(a.article || "").localeCompare(String(b.article || ""));
  });

  // Structured Stagehand extract only for the strongest candidate(s).
  if (stagehand && typeof stagehand.extract === "function" && scored[0]?.url) {
    const topN = scored.slice(0, 2);
    for (let i = 0; i < topN.length; i += 1) {
      const candidate = topN[i];
      try {
        await gotoChecked(runtime, page, binding, candidate.url);
        const llmExtract = await stagehand.extract(
          buildExtractInstruction(vision),
          LiveProductExtractSchema,
          { timeout: runtime.policy?.timeoutMs },
        );
        const merged = mergeExtract(
          {
            article: candidate.article,
            title: candidate.title,
            price: candidate.price,
            currency: candidate.currency,
            product_url: candidate.url,
            image_url: candidate.image_url,
            availability: candidate.availability,
            page_text: candidate.page_text,
            specifications: candidate.specifications,
          },
          llmExtract,
          candidate.url,
        );
        const rescored = scoreLiveCandidate(vision, merged);
        scored[i] = {
          ...candidate,
          ...merged,
          ...rescored,
          url: merged.product_url || candidate.url,
          source: "CCN_LIVE",
          manufacturer_id: binding.manufacturer_id,
          navigator_trace_id: navigatorTraceId,
          verified_at: verifiedAt,
        };
        delete scored[i]._html;
      } catch {
        delete candidate._html;
      }
    }

    scored.sort((a, b) => {
      if (b.match_confidence !== a.match_confidence) return b.match_confidence - a.match_confidence;
      return String(a.article || "").localeCompare(String(b.article || ""));
    });
  }

  for (const item of scored) delete item._html;

  if (!scored.length) {
    return noMatchResult({
      binding,
      catalogUrl,
      navigatorTraceId,
      verifiedAt,
      reason: "extraction_failed",
      error: "extraction_failed",
    });
  }

  const gate = evaluateGateG3(
    scored.map((item) => ({
      ...item,
      match_confidence: item.match_confidence,
    })),
  );

  const top = scored[0];
  const ambiguous =
    gate.decision === "human_pick" && /ambiguity/i.test(gate.reason || "");

  if (top.match_type === "none" || gate.decision === "fail") {
    return {
      ok: false,
      error: ambiguous ? "candidate_ambiguous" : "product_not_found",
      reason: ambiguous ? "candidate_ambiguous" : "product_not_found",
      gate: {
        decision: "fail",
        reason: gate.reason || "no live match",
        match_confidence: top.match_confidence || 0,
      },
      vision,
      manufacturer: { ...binding, catalog_url: catalogUrl },
      product: toProductCard(top, scored, navigatorTraceId, verifiedAt, true),
    };
  }

  if (gate.decision === "human_pick") {
    return {
      ok: false,
      error: ambiguous ? "candidate_ambiguous" : null,
      reason: gate.reason,
      gate: {
        decision: "human_pick",
        reason: gate.reason,
        match_confidence: gate.match_confidence,
      },
      vision,
      manufacturer: { ...binding, catalog_url: catalogUrl },
      product: toProductCard(top, scored, navigatorTraceId, verifiedAt, false),
    };
  }

  return {
    ok: true,
    error: null,
    reason: "live_product_verified",
    gate: {
      decision: "accept",
      reason: gate.reason,
      match_confidence: top.match_confidence,
    },
    vision,
    manufacturer: { ...binding, catalog_url: catalogUrl },
    product: toProductCard(top, scored, navigatorTraceId, verifiedAt, false),
  };
}

function mergeExtract(deterministic, llm, fallbackUrl) {
  const llmPrice = parsePrice(llm?.price);
  return {
    article: asString(deterministic?.article) || asString(llm?.article) || null,
    title: asString(deterministic?.title) || asString(llm?.title) || null,
    price: deterministic?.price != null ? deterministic.price : llmPrice,
    currency:
      asString(deterministic?.currency) ||
      asString(llm?.currency) ||
      (deterministic?.price != null || llmPrice != null ? "RUB" : null) ||
      null,
    product_url:
      asString(deterministic?.product_url) ||
      asString(llm?.product_url) ||
      asString(fallbackUrl) ||
      null,
    image_url: asString(deterministic?.image_url) || asString(llm?.image_url) || null,
    availability: asString(deterministic?.availability) || asString(llm?.availability) || null,
    page_text: [deterministic?.page_text, llm?.page_text].filter(Boolean).join(" ").slice(0, 8000) || null,
    specifications: {
      ...(llm?.specifications && typeof llm.specifications === "object" ? llm.specifications : {}),
      ...(deterministic?.specifications || {}),
    },
  };
}

function toProductCard(top, scored, navigatorTraceId, verifiedAt, forceNone) {
  const matchType = forceNone ? "none" : top.match_type;
  return {
    source: "CCN_LIVE",
    manufacturer_id: top.manufacturer_id || null,
    article: matchType === "none" ? null : top.article || null,
    title: top.title || null,
    price: matchType === "none" ? null : top.price ?? null,
    currency: matchType === "none" ? null : top.currency || null,
    url: top.url || null,
    image_url: top.image_url || null,
    specifications: top.specifications || {},
    availability: top.availability || null,
    match_confidence: top.match_confidence || 0,
    match_type: matchType,
    matched_features: top.matched_features || [],
    conflicting_features: top.conflicting_features || [],
    navigator_trace_id: navigatorTraceId,
    verified_at: verifiedAt,
    candidates: scored.map((item) => ({
      article: item.article,
      title: item.title,
      price: item.price,
      currency: item.currency,
      url: item.url,
      image_url: item.image_url,
      specifications: item.specifications || {},
      match_confidence: item.match_confidence,
      match_type: item.match_type,
      matched_features: item.matched_features,
      conflicting_features: item.conflicting_features,
    })),
  };
}

function noMatchResult({ binding, catalogUrl, navigatorTraceId, verifiedAt, reason, error }) {
  return {
    ok: false,
    error,
    reason,
    gate: {
      decision: "fail",
      reason,
      match_confidence: 0,
    },
    vision: null,
    manufacturer: binding ? { ...binding, catalog_url: catalogUrl } : null,
    product: {
      source: "CCN_LIVE",
      manufacturer_id: binding?.manufacturer_id || null,
      article: null,
      title: null,
      price: null,
      currency: null,
      url: null,
      image_url: null,
      specifications: {},
      availability: null,
      match_confidence: 0,
      match_type: "none",
      matched_features: [],
      conflicting_features: [],
      navigator_trace_id: navigatorTraceId,
      verified_at: verifiedAt,
      candidates: [],
    },
  };
}
