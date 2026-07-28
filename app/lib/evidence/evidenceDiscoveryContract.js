/**
 * Evidence Discovery — stable public contract.
 * Office / pipeline consume only this shape. Adapters stay internal.
 */

/** Provider-neutral source label when a concrete adapter is not attached. */
export const EVIDENCE_SOURCE_EXTERNAL = "external";

/**
 * @typedef {{
 *   title: string,
 *   page_url: string,
 *   image_url: string,
 *   domain: string,
 * }} EvidenceItem
 *
 * @typedef {{
 *   manufacturer_id: string,
 *   manufacturer_name: string,
 *   confidence: number,
 *   source: string,
 *   evidence: EvidenceItem[],
 * }} EvidenceCandidate
 *
 * @typedef {{
 *   status: "ok" | "empty" | "error",
 *   vision_ref: { category: string, confidence: number } | null,
 *   candidates: EvidenceCandidate[],
 *   reason?: string,
 * }} EvidenceDiscoveryResult
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @param {unknown} vision
 */
export function buildVisionRef(vision) {
  if (!vision || typeof vision !== "object") return null;
  return {
    category: asString(vision.category) || "unknown",
    confidence: Number(vision.confidence) || 0,
  };
}

/**
 * @param {Partial<EvidenceDiscoveryResult> & { status: EvidenceDiscoveryResult["status"] }} partial
 * @returns {EvidenceDiscoveryResult}
 */
export function buildEvidenceDiscoveryResult(partial) {
  const candidates = Array.isArray(partial.candidates) ? partial.candidates : [];
  return {
    status: partial.status,
    vision_ref: partial.vision_ref ?? null,
    candidates,
    ...(asString(partial.reason) ? { reason: asString(partial.reason) } : {}),
  };
}
