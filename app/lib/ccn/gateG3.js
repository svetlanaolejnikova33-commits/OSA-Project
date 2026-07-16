/**
 * Gate G3 — CCN match confidence (Tender #4).
 *
 * ≥ 0.80 → accept
 * 0.60–0.79 → human_pick
 * < 0.60 → fail
 *
 * Also force human_pick when top two candidates are close (ambiguous).
 */

export const G3_ACCEPT_MIN = 0.8;
export const G3_HUMAN_PICK_MIN = 0.6;
export const G3_AMBIGUITY_DELTA = 0.08;

/**
 * @param {{ match_confidence: number }[]} rankedCandidates
 * @returns {{
 *   decision: "accept" | "human_pick" | "fail",
 *   reason: string,
 *   match_confidence: number,
 *   product: object | null,
 *   candidates: object[],
 * }}
 */
export function evaluateGateG3(rankedCandidates) {
  const candidates = Array.isArray(rankedCandidates) ? rankedCandidates : [];
  const top = candidates[0] || null;
  const second = candidates[1] || null;
  const matchConfidence = Number(top?.match_confidence) || 0;

  if (!top || matchConfidence < G3_HUMAN_PICK_MIN) {
    return {
      decision: "fail",
      reason: "match_confidence below 0.60 or no candidates",
      match_confidence: matchConfidence,
      product: null,
      candidates,
    };
  }

  const ambiguous =
    second &&
    Number(second.match_confidence) >= G3_HUMAN_PICK_MIN &&
    matchConfidence - Number(second.match_confidence) <= G3_AMBIGUITY_DELTA;

  if (ambiguous) {
    return {
      decision: "human_pick",
      reason: "top candidates within ambiguity delta",
      match_confidence: matchConfidence,
      product: null,
      candidates,
    };
  }

  if (matchConfidence >= G3_ACCEPT_MIN) {
    return {
      decision: "accept",
      reason: "match_confidence >= 0.80",
      match_confidence: matchConfidence,
      product: top,
      candidates,
    };
  }

  return {
    decision: "human_pick",
    reason: "match_confidence between 0.60 and 0.79",
    match_confidence: matchConfidence,
    product: null,
    candidates,
  };
}
