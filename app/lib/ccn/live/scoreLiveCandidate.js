/**
 * Score live product page evidence against Rich Vision JSON.
 * Style alone is never sufficient. Critical construction conflicts reduce confidence strongly.
 */

import { asConfidence } from "../../validateSemanticDraft";
import { fieldSimilarity } from "../matchEngine";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function haystackOf(...parts) {
  return parts
    .flatMap((part) => {
      if (part == null) return [];
      if (Array.isArray(part)) return part;
      if (typeof part === "object") return Object.values(part);
      return [part];
    })
    .map((item) => asString(item))
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/ё/g, "е");
}

function hasAny(haystack, patterns) {
  return patterns.some((pattern) => pattern.test(haystack));
}

/**
 * @param {import("../../visionJsonContract").VisionJson} vision
 * @param {{
 *   title?: string | null,
 *   article?: string | null,
 *   page_text?: string | null,
 *   specifications?: Record<string, string>,
 *   url?: string | null,
 * }} evidence
 */
export function scoreLiveCandidate(vision, evidence = {}) {
  const matched = [];
  const conflicting = [];
  const page = haystackOf(
    evidence.title,
    evidence.page_text,
    evidence.article,
    evidence.url,
    evidence.specifications,
  );
  const visionText = haystackOf(
    vision?.category,
    vision?.subtype,
    vision?.mounting,
    vision?.material,
    vision?.finish,
    vision?.style,
    vision?.shape,
    vision?.construction,
    vision?.silhouette,
    vision?.proportions,
    vision?.distinctive_features,
    vision?.functional_elements,
    vision?.decorative_details,
    vision?.search_constraints,
  );

  let score = 0.15; // base presence of a product page

  // Category / mounting (high weight) — prefer product title signals over chrome.
  const titleHay = haystackOf(evidence.title, evidence.url, evidence.article);
  const wantsFloor = /floor|торшер|напольн/.test(visionText);
  const wantsPendant = /pendant|подвес|потолоч|ceiling/.test(visionText);
  const pageFloor = /floor|торшер|напольн/.test(titleHay) || /floor|торшер|напольн/.test(page);
  const pagePendant =
    (/pendant|подвес|потолоч/.test(titleHay) && !pageFloor) ||
    (/pendant|подвес|потолоч/.test(page) && !/напольн|торшер|floor/.test(titleHay));

  if (wantsFloor && pageFloor) {
    score += 0.18;
    matched.push("floor lamp / напольный");
  } else if (wantsFloor && pagePendant) {
    score -= 0.35;
    conflicting.push("mounting: expected floor, found pendant/ceiling");
  }

  if (wantsPendant && pagePendant) {
    score += 0.18;
    matched.push("pendant / ceiling mount");
  } else if (wantsPendant && pageFloor && !pagePendant) {
    score -= 0.35;
    conflicting.push("mounting: expected pendant, found floor lamp");
  }

  // Material / finish
  const wantsBrass = /brass|латун/.test(visionText);
  const wantsAged = /aged|состарен|patina/.test(visionText);
  if (wantsBrass && /brass|латун/.test(page)) {
    score += 0.1;
    matched.push("brass / латунь");
  } else if (wantsBrass) {
    score -= 0.04;
  }
  if (wantsAged && /aged|состарен|латун/.test(page)) {
    score += 0.06;
    matched.push("aged brass character");
  }

  // Integrated side table (critical)
  const wantsTable = /side table|integrated table|столик/.test(visionText);
  const pageTable = /столик|side table|integrated table/.test(page);
  if (wantsTable && pageTable) {
    score += 0.16;
    matched.push("integrated side table");
  } else if (wantsTable && !pageTable) {
    score -= 0.28;
    conflicting.push("missing integrated side table");
  } else if (!wantsTable && pageTable) {
    score -= 0.12;
    conflicting.push("unexpected integrated side table");
  }

  // Articulated arm vs fixed stem (critical when evidence is explicit)
  const wantsArm = /articulated|swing|поворот|рычаг/.test(visionText);
  const wantsFixed = /fixed stem|rigid|жестк/.test(visionText) && !wantsArm;
  const pageArm = /articulated|swing|поворот|рычаг|регулир|наклон/.test(page);
  const pageFixedOnly = /fixed stem|жестк|нерегулир/.test(page) && !pageArm;
  if (wantsArm && pageArm) {
    score += 0.12;
    matched.push("articulated / adjustable arm");
  } else if (wantsArm && pageFixedOnly) {
    score -= 0.22;
    conflicting.push("articulated arm vs fixed stem");
  } else if (wantsArm && !pageArm) {
    // Incomplete page copy — soft penalty only; images may still show the arm.
    score -= 0.06;
  } else if (wantsFixed && pageArm) {
    score -= 0.18;
    conflicting.push("articulated arm vs fixed stem");
  }

  // Textile / tapered shade
  const wantsShade = /textile shade|tapered|абажур|тканев/.test(visionText);
  if (wantsShade && /абажур|textile|ткан|shade|конус/.test(page)) {
    score += 0.08;
    matched.push("textile / tapered shade");
  }

  // Base / silhouette
  const wantsStepped = /stepped|ornate|ступенчат|ornate stepped/.test(visionText);
  if (wantsStepped && /основан|stepped|кругл|массивн|ornate/.test(page)) {
    score += 0.06;
    matched.push("ornate / round base");
  }

  // Soft field similarities (style low weight)
  score += fieldSimilarity(vision?.style, evidence.title) * 0.03;
  score += fieldSimilarity(vision?.shape, evidence.title) * 0.03;
  score += fieldSimilarity(vision?.category, evidence.title) * 0.05;

  // Negative constraints — only against product title/url/article, not site nav chrome.
  const negatives = Array.isArray(vision?.negative_constraints) ? vision.negative_constraints : [];
  for (const negative of negatives) {
    const text = asString(negative).toLowerCase();
    if (!text) continue;
    if (/not wall-mounted|не настен/.test(text) && /бра|wall lamp|настенн/.test(titleHay)) {
      score -= 0.2;
      conflicting.push("negative: wall-mounted");
    }
    if (/not ceiling|не подвес|not pendant/.test(text) && pagePendant) {
      score -= 0.25;
      conflicting.push("negative: pendant/ceiling");
    }
  }

  const confidence = asConfidence(Math.max(0, Math.min(1, score)));
  let match_type = "none";
  if (confidence >= 0.9) match_type = "exact";
  else if (confidence >= 0.8) match_type = "strong_analog";
  else if (confidence >= 0.6) match_type = "weak_analog";

  // Style-only bump without construction evidence cannot reach strong.
  if (
    match_type !== "none" &&
    !matched.some((item) => /table|arm|floor|pendant|brass|shade|base/i.test(item))
  ) {
    match_type = confidence >= 0.6 ? "weak_analog" : "none";
  }

  return {
    match_confidence: confidence,
    match_type,
    matched_features: matched,
    conflicting_features: conflicting,
  };
}
