import { runChiefCatalogNavigator } from "./chiefCatalogNavigator.js";

export function validateRetrievalCandidates({ candidates, vision, navigator = runChiefCatalogNavigator }) {
  return candidates.map((candidate) => {
    const ccn = navigator({ vision, manufacturer_id: candidate.manufacturer_id, catalog_url: candidate.product?.official_url });
    const ccnArticle = ccn.product?.article || null;
    const articleMatches = Boolean(ccnArticle && ccnArticle.toLowerCase() === candidate.article.toLowerCase());
    const accepted = ccn.gate?.decision === "accept" && articleMatches;
    return {
      ...candidate,
      ccn_g3: {
        decision: ccn.gate?.decision || "fail",
        match_confidence: ccn.gate?.match_confidence || 0,
        selected_article: ccnArticle,
        article_matches_retrieval: articleMatches,
        outcome: accepted ? "accepted" : "needs_human",
        reason: accepted
          ? "CCN/G3 accepted the same Registry article."
          : (!articleMatches ? "CCN/G3 did not confirm the same retrieved Registry article." : (ccn.gate?.reason || ccn.error || "CCN did not accept the candidate.")),
      },
    };
  });
}
