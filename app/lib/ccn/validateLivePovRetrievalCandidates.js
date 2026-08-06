export const LIVE_POV_CONFIGURATION_ERROR = "live_pov_requires_live_ccn";

export function assertLivePovConfiguration(env = process.env) {
  if (env?.OSA_CCN_LIVE !== "1" || env?.OSA_CCN_BROWSER_ENV !== "LOCAL") {
    const error = new Error(LIVE_POV_CONFIGURATION_ERROR);
    error.code = LIVE_POV_CONFIGURATION_ERROR;
    throw error;
  }
}

export function createLivePovNavigator({ navigator, env = process.env } = {}) {
  if (typeof navigator !== "function") throw new Error("Live PoV requires an explicit live navigator.");
  return async ({ vision, manufacturer_id, catalog_url }) => {
    assertLivePovConfiguration(env);
    return navigator({ vision, manufacturer_id, catalog_url });
  };
}

export async function validateLivePovRetrievalCandidates({ candidates, vision, liveNavigator, env = process.env }) {
  assertLivePovConfiguration(env);
  if (typeof liveNavigator !== "function") {
    const error = new Error(LIVE_POV_CONFIGURATION_ERROR);
    error.code = LIVE_POV_CONFIGURATION_ERROR;
    throw error;
  }

  const validated = [];
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const ccn = await liveNavigator({
      vision,
      manufacturer_id: candidate.manufacturer_id,
      catalog_url: candidate.product?.official_url,
    });
    const liveSource = ccn?.product?.source === "CCN_LIVE";
    const selectedArticle = ccn?.product?.article || null;
    const articleMatches = Boolean(
      selectedArticle && selectedArticle.toLowerCase() === String(candidate.article || "").toLowerCase(),
    );
    const accepted = liveSource && ccn?.gate?.decision === "accept" && articleMatches;
    validated.push({
      ...candidate,
      ccn_g3: {
        decision: liveSource ? (ccn?.gate?.decision || "fail") : "fail",
        match_confidence: liveSource ? (ccn?.gate?.match_confidence || 0) : 0,
        source: ccn?.product?.source || null,
        selected_article: selectedArticle,
        article_matches_retrieval: articleMatches,
        outcome: accepted ? "accepted" : "needs_human",
        reason: accepted
          ? "Live CCN/G3 accepted the same Registry article."
          : (!liveSource
              ? LIVE_POV_CONFIGURATION_ERROR
              : (!articleMatches
                  ? "Live CCN/G3 did not confirm the same retrieved Registry article."
                  : (ccn?.gate?.reason || ccn?.error || "Live CCN did not accept the candidate."))),
      },
    });
  }
  return validated;
}