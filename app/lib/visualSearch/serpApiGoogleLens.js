/**
 * SerpApi Google Lens client (server-only).
 * Docs: https://serpapi.com/google-lens-api
 */

const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPublicHttpUrl(value) {
  const url = asString(value);
  return /^https?:\/\//i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);
}

/**
 * SerpApi Google Lens requires a publicly accessible image URL (no base64).
 * Dev fallback: OSA_DEV_LENS_IMAGE_URL in .env.local
 */
export function resolveGoogleLensImageUrl({ imagePublicUrl } = {}) {
  const direct = asString(imagePublicUrl);
  if (isPublicHttpUrl(direct)) {
    return { imageUrl: direct, usedDevPlaceholder: false };
  }

  const devPlaceholder = asString(process.env.OSA_DEV_LENS_IMAGE_URL);
  if (process.env.NODE_ENV === "development" && isPublicHttpUrl(devPlaceholder)) {
    return { imageUrl: devPlaceholder, usedDevPlaceholder: true };
  }

  const error = new Error(
    "Google Lens requires a public image URL. Set imagePublicUrl (https://…) or OSA_DEV_LENS_IMAGE_URL for local dev.",
  );
  error.code = "MISSING_PUBLIC_IMAGE_URL";
  error.provider = "google_lens";
  throw error;
}

/**
 * @returns {Promise<{ payload: object, httpStatus: number, requestUrl: string }>}
 */
export async function fetchSerpApiGoogleLens({
  imageUrl,
  apiKey,
  searchQuery,
  limit = 12,
  type = "products",
} = {}) {
  const key = asString(apiKey);
  if (!key || key === "PASTE_SERPAPI_KEY_HERE") {
    const error = new Error("SERPAPI_KEY is not configured.");
    error.code = "MISSING_API_KEY";
    error.provider = "google_lens";
    throw error;
  }

  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    api_key: key,
    type,
    hl: "ru",
  });

  const queryHint = asString(searchQuery?.primary) || asString(searchQuery?.ru);
  if (queryHint) {
    params.set("q", queryHint.slice(0, 120));
  }

  const requestUrl = `${SERPAPI_SEARCH_URL}?${params.toString().replace(/api_key=[^&]+/, "api_key=REDACTED")}`;

  const response = await fetch(`${SERPAPI_SEARCH_URL}?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      asString(payload?.error) ||
      asString(payload?.message) ||
      `SerpApi Google Lens failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.provider = "google_lens";
    throw error;
  }

  if (payload?.error) {
    const error = new Error(asString(payload.error));
    error.provider = "google_lens";
    throw error;
  }

  return {
    payload,
    httpStatus: response.status,
    requestUrl,
    limit,
  };
}

export function extractGoogleLensVisualMatches(payload, { limit = 12 } = {}) {
  const pools = [
    ...(Array.isArray(payload?.visual_matches) ? payload.visual_matches : []),
    ...(Array.isArray(payload?.products) ? payload.products : []),
  ];

  const seen = new Set();
  const results = [];

  for (const item of pools) {
    const sourceUrl = asString(item?.link) || asString(item?.product_link) || asString(item?.url);
    const imageUrl =
      asString(item?.image) ||
      asString(item?.thumbnail) ||
      asString(item?.thumbnail_url) ||
      null;
    const title =
      asString(item?.title) ||
      asString(item?.name) ||
      asString(item?.source) ||
      "Визуальный аналог";
    const dedupeKey = `${sourceUrl}|${imageUrl}|${title}`.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const position = Number(item?.position) || results.length + 1;
    const visualMatchScore = Math.max(35, 95 - (position - 1) * 5);

    results.push({
      id: `google-lens-${position}-${sourceUrl.slice(0, 24) || title.slice(0, 16)}`,
      title,
      brand: asString(item?.source) || inferBrandFromTitle(title),
      model: "",
      imageUrl,
      sourceUrl,
      price: parsePrice(item?.price),
      visualMatchScore,
      visualSimilarityPercent: visualMatchScore,
      sourceType: "internet",
      providerMeta: {
        provider: "google_lens",
        mode: "serpapi_google_lens",
        position,
        exactMatches: Boolean(item?.exact_matches),
      },
    });

    if (results.length >= limit) break;
  }

  return results;
}

function inferBrandFromTitle(title) {
  const text = asString(title);
  if (!text) return "—";
  const first = text.split(/\s+/)[0];
  return first && first.length <= 18 ? first : "—";
}

function parsePrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = asString(value).replace(/[^\d.,]/g, "").replace(",", ".");
  const num = Number(text);
  return Number.isFinite(num) ? num : 0;
}

export { SERPAPI_SEARCH_URL, isPublicHttpUrl };
