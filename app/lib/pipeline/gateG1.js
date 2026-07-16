/**
 * Gate G1 — CVO confidence (Tender #4).
 *
 * ≥ 0.85 → pass
 * 0.70–0.84 → pass_flag
 * < 0.70 → block (H1)
 */

export const G1_PASS_MIN = 0.85;
export const G1_FLAG_MIN = 0.7;

/**
 * @param {{ confidence?: number } | null | undefined} vision
 */
export function runGateG1(vision) {
  const confidence = Number(vision?.confidence);
  const cvoConfidence = Number.isFinite(confidence) ? confidence : 0;

  if (cvoConfidence >= G1_PASS_MIN) {
    return {
      decision: "pass",
      reason: "cvo_confidence >= 0.85",
      cvo_confidence: cvoConfidence,
      hitl: null,
    };
  }

  if (cvoConfidence >= G1_FLAG_MIN) {
    return {
      decision: "pass_flag",
      reason: "cvo_confidence between 0.70 and 0.84",
      cvo_confidence: cvoConfidence,
      hitl: null,
      flags: ["designer_review_suggested"],
    };
  }

  return {
    decision: "block",
    reason: "cvo_confidence below 0.70",
    cvo_confidence: cvoConfidence,
    hitl: "H1",
  };
}
