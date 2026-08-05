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

  let raw;
  try {
    raw = await fetchMatches({
      imagePublicUrl,
      searchQuery,
      limit: 12,
    });
  } catch (error) {
    return buildEvidenceDiscoveryResult({
      status: "error",
      vision_ref,
      candidates: [],
      reason:
        "Evidence Discovery provider failed: " +
        (error instanceof Error ? error.message : "unknown error"),
    });
  }

  if (!raw?.ok) {
    const reason = asString(raw?.reason) || "Evidence Discovery returned no matches.";
    const status =
      raw?.status === "empty"
        ? "empty"
        : raw?.status === "error"
          ? "error"
          : /not configured|failed|requires a public image|unavailable/i.test(reason)
            ? "error"
            : "empty";
    return buildEvidenceDiscoveryResult({
      status,
      vision_ref,
      candidates: [],
      reason,
    });
  }

  const candidates = normalizeEvidenceCandidates(raw.matches, {
    vision,
    limit,
    source: asString(raw?.source) || source,
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
