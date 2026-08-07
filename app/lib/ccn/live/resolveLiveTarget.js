/**
 * Resolve Live CCN manufacturer + catalog target.
 * Stagehand must not invent manufacturers outside the OSA Registry.
 */

import {
  getOfficialSourceBinding,
  isOfficialManufacturerUrl,
  resolveOfficialCatalogUrl,
} from "../../registry/manufacturerRegistry.js";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function visionCategoryHint(vision) {
  const text = [
    vision?.category,
    vision?.subtype,
    vision?.mounting,
    ...(Array.isArray(vision?.search_constraints) ? vision.search_constraints : []),
  ]
    .map(asString)
    .join(" ")
    .toLowerCase();

  if (/floor|торшер|напольн/.test(text)) return "floor";
  if (/wall|sconce|бра|настен/.test(text)) return "wall";
  if (/table|настольн|desk/.test(text)) return "table";
  if (/pendant|подвес|потолоч|ceiling/.test(text)) return "pendant";
  return "unknown";
}

/**
 * Pick category-appropriate catalog URL from registry knowledge (not invented domains).
 */
export function resolveCatalogUrlForVision(binding, vision) {
  if (!binding) return "";
  return resolveOfficialCatalogUrl(binding, visionCategoryHint(vision));
}



/**
 * Confirm live page stays on the registry manufacturer domain.
 */
export function assertRegistryDomain(binding, url) {
  return isOfficialManufacturerUrl(binding, url);
}

/**
 * @param {{
 *   manufacturer_id?: string,
 *   catalog_url?: string,
 *   vision?: object,
 *   experience_candidates?: { manufacturer_id: string, score?: number }[],
 *   memory_candidates?: { manufacturer_id?: string }[],
 * }} input
 */
export function resolveLiveSearchTarget(input = {}) {
  const explicitId = asString(input.manufacturer_id).toLowerCase();
  const experience = Array.isArray(input.experience_candidates) ? input.experience_candidates : [];
  const memory = Array.isArray(input.memory_candidates) ? input.memory_candidates : [];

  let manufacturerId = explicitId;
  let source = "explicit";

  if (!manufacturerId && experience.length) {
    manufacturerId = asString(experience[0]?.manufacturer_id).toLowerCase();
    source = "experience";
  }

  if (!manufacturerId && memory.length) {
    manufacturerId = asString(memory[0]?.manufacturer_id).toLowerCase();
    source = "memory";
  }

  if (!manufacturerId) {
    return {
      ok: false,
      error: "catalog_not_reached",
      reason: "No manufacturer_id from explicit input, experience, or memory.",
      binding: null,
      catalog_url: "",
      source: null,
    };
  }

  const binding = getOfficialSourceBinding(manufacturerId);
  if (!binding) {
    return {
      ok: false,
      error: "catalog_not_reached",
      reason: `manufacturer_id not in OSA Registry: ${manufacturerId}`,
      binding: null,
      catalog_url: "",
      source,
    };
  }

  const catalogOverride = asString(input.catalog_url);
  const catalog_url =
    catalogOverride || resolveCatalogUrlForVision(binding, input.vision) || binding.catalog_url;

  return {
    ok: true,
    error: null,
    reason: null,
    binding: { ...binding, catalog_url },
    catalog_url,
    source,
  };
}
