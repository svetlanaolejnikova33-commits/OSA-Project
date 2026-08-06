/**
 * Map provider-neutral visual matches → Registry manufacturer candidates.
 */

import {
  getOfficialSourceBinding,
  resolveManufacturerByDomain,
  resolveManufacturerFromText,
} from "../registry/manufacturerRegistry";
import { EVIDENCE_SOURCE_EXTERNAL } from "./evidenceDiscoveryContract";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeToken(value) {
  return asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveIdFromDomain(domain) {
  return resolveManufacturerByDomain(domain)?.manufacturer_id || "";
}

function resolveIdFromBrandText(brandRaw, title) {
  return resolveManufacturerFromText(`${brandRaw} ${title}`)?.manufacturer_id || "";
}
function categoryBonus(visionCategory, categoryIds) {
  const cat = normalizeToken(visionCategory);
  if (!cat || !Array.isArray(categoryIds) || !categoryIds.length) return 0;
  const joined = categoryIds.map(normalizeToken).join(" ");
  if (cat.includes("floor") && joined.includes("floor")) return 0.08;
  if (cat.includes("pendant") && joined.includes("pendant")) return 0.08;
  if (cat.includes("light") && joined.includes("lighting")) return 0.05;
  return 0;
}

/**
 * @param {Array<{
 *   title?: string,
 *   page_url?: string,
 *   image_url?: string,
 *   domain?: string,
 *   brand_raw?: string,
 *   position?: number,
 * }>} matches
 * @param {{ vision?: object, limit?: number, source?: string }} [options]
 */
export function normalizeEvidenceCandidates(matches, options = {}) {
  const limit = Math.min(7, Math.max(1, Number(options.limit) || 7));
  const source = asString(options.source) || EVIDENCE_SOURCE_EXTERNAL;
  const visionCategory = asString(options.vision?.category);
  const list = Array.isArray(matches) ? matches : [];

  /** @type {Map<string, { manufacturer_id: string, manufacturer_name: string, hits: number, bestPosition: number, evidence: object[], categoryIds: string[] }>} */
  const byId = new Map();

  for (const raw of list) {
    const title = asString(raw.title);
    const page_url = asString(raw.page_url);
    const image_url = asString(raw.image_url);
    const domain = asString(raw.domain) || hostnameFromUrl(page_url);
    const brand_raw = asString(raw.brand_raw);
    const position = Number(raw.position) || 99;

    if (!isHttpUrl(page_url) || !domain) continue;
    const manufacturerId =
      resolveIdFromDomain(domain) || resolveIdFromBrandText(brand_raw, title);
    if (!manufacturerId) continue;

    const binding = getOfficialSourceBinding(manufacturerId);
    if (!binding) continue;

    const evidenceItem = {
      title: title || binding.brandName,
      page_url,
      image_url,
      domain,
    };

    const existing = byId.get(binding.manufacturer_id);
    if (existing) {
      existing.hits += 1;
      existing.bestPosition = Math.min(existing.bestPosition, position);
      if (existing.evidence.length < 5) existing.evidence.push(evidenceItem);
    } else {
      byId.set(binding.manufacturer_id, {
        manufacturer_id: binding.manufacturer_id,
        manufacturer_name: binding.brandName || binding.manufacturer_id,
        hits: 1,
        bestPosition: position,
        evidence: [evidenceItem],
        categoryIds: Array.isArray(binding.categoryIds) ? binding.categoryIds : [],
      });
    }
  }

  const ranked = [...byId.values()]
    .map((entry) => {
      const freq = Math.min(1, entry.hits / 4);
      const positionScore = Math.max(0, 1 - (entry.bestPosition - 1) * 0.08);
      const bonus = categoryBonus(visionCategory, entry.categoryIds);
      const confidence = Math.max(
        0.15,
        Math.min(0.95, Number((0.35 * freq + 0.5 * positionScore + bonus).toFixed(2))),
      );
      return {
        manufacturer_id: entry.manufacturer_id,
        manufacturer_name: entry.manufacturer_name,
        confidence,
        source,
        evidence: entry.evidence,
      };
    })
    .sort((a, b) => b.confidence - a.confidence || a.manufacturer_id.localeCompare(b.manufacturer_id))
    .slice(0, limit);

  return ranked;
}
