/**
 * Evidence Discovery entry — Office/pipeline stable API.
 * Provider adapters are injected; no default commercial reverse-image provider.
 */

import {
  buildEvidenceDiscoveryResult,
  buildVisionRef,
  EVIDENCE_SOURCE_EXTERNAL,
} from "./evidenceDiscoveryContract";
import { normalizeEvidenceCandidates } from "./normalizeEvidenceCandidates";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @param {{
 *   vision?: object,
 *   imagePublicUrl?: string,
 *   limit?: number,
 *   source?: string,
 *   fetchMatches?: (args: {
 *     imagePublicUrl?: string,
 *     searchQuery?: string,
 *     limit?: number,
 *   }) => Promise<{ ok: boolean, matches?: object[], reason?: string }>,
 * }} input
 */
export async function runEvidenceDiscovery(input = {}) {
  const vision = input.vision && typeof input.vision === "object" ? input.vision : null;
  const vision_ref = buildVisionRef(vision);
  const imagePublicUrl = asString(input.imagePublicUrl);
  const limit = Number(input.limit) || 7;
  const source = asString(input.source) || EVIDENCE_SOURCE_EXTERNAL;
  const fetchMatches = input.fetchMatches;

  if (typeof fetchMatches !== "function") {
    return buildEvidenceDiscoveryResult({
      status: "error",
      vision_ref,
      candidates: [],
      reason: "No Evidence Discovery provider is configured.",
    });
  }

  const searchQuery = asString(vision?.category);

  const raw = await fetchMatches({
    imagePublicUrl,
    searchQuery,
    limit: 12,
  });

  if (!raw?.ok) {
    const reason = asString(raw?.reason) || "Evidence Discovery returned no matches.";
    const isError = /not configured|failed|requires a public image|unavailable/i.test(reason);
    return buildEvidenceDiscoveryResult({
      status: isError ? "error" : "empty",
      vision_ref,
      candidates: [],
      reason,
    });
  }

  const candidates = normalizeEvidenceCandidates(raw.matches, {
    vision,
    limit,
    source,
  });

  if (!candidates.length) {
    return buildEvidenceDiscoveryResult({
      status: "empty",
      vision_ref,
      candidates: [],
      reason:
        "Evidence matches found, but none mapped to a Registry manufacturer_id.",
    });
  }

  return buildEvidenceDiscoveryResult({
    status: "ok",
    vision_ref,
    candidates,
  });
}
