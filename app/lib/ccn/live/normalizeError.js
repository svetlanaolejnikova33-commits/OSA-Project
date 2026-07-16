/**
 * Normalize Stagehand/Playwright failures into CCN live reason codes.
 * Never expose raw vendor error strings to API consumers.
 */

export const CCN_LIVE_ERROR_CODES = Object.freeze([
  "browser_launch_failed",
  "navigation_timeout",
  "catalog_not_reached",
  "domain_mismatch",
  "product_not_found",
  "candidate_ambiguous",
  "extraction_failed",
  "blocked_or_captcha",
  "model_not_configured",
  "not_configured",
  "live_failed",
]);

/**
 * @param {unknown} error
 * @returns {typeof CCN_LIVE_ERROR_CODES[number]}
 */
export function normalizeCcnLiveError(error) {
  if (error && typeof error === "object" && error.code === "CCN_LIVE_NOT_CONFIGURED") {
    const missing = Array.isArray(error.missing) ? error.missing.join(" ") : "";
    if (/STAGEHAND_MODEL|API_KEY|MODEL/i.test(`${error.message || ""} ${missing}`)) {
      return "model_not_configured";
    }
    return "not_configured";
  }

  const explicit = asString(error?.code || error?.message);
  if (CCN_LIVE_ERROR_CODES.includes(explicit)) return explicit;

  const message = String(error?.message || error || "").toLowerCase();

  if (/model_not_configured|stagehand_model|api key|api_key/.test(message)) {
    return "model_not_configured";
  }
  if (/domain_mismatch/.test(message)) {
    return "domain_mismatch";
  }
  if (/candidate_ambiguous|ambiguity/.test(message)) {
    return "candidate_ambiguous";
  }
  if (/captcha|cloudflare|access denied|blocked|forbidden|challenge/.test(message)) {
    return "blocked_or_captcha";
  }
  if (/timeout|timed out|navigation\.timeout|net::err_timed_out/.test(message)) {
    return "navigation_timeout";
  }
  if (/launch|chromium|chrome|browser.*fail|executable|spawn/.test(message)) {
    return "browser_launch_failed";
  }
  if (/goto|navigate|net::|dns|connection|refused|catalog_not_reached/.test(message)) {
    return "catalog_not_reached";
  }
  if (/extract|schema|zod|parse|extraction_failed/.test(message)) {
    return "extraction_failed";
  }
  if (/product_not_found|no product|not found/.test(message)) {
    return "product_not_found";
  }

  return "live_failed";
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}
