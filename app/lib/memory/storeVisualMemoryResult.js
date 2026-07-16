import { buildRichVisualFingerprint } from "../buildRichVisualFingerprint";
import {
  createEmptyExperience,
  mergeExperience,
  normalizeExperience,
  recordExperienceFailure,
  recordExperienceSuccess,
} from "./experienceMemory";
import { buildVisualFingerprint, fingerprintKey, getVisualMemoryStore } from "./visualMemoryStore";

/**
 * Persist a successful CCN / memory-verified result into Visual Memory + Experience.
 */
export function storeVisualMemoryResult(input, options = {}) {
  const store = options.store || getVisualMemoryStore();
  const vision = input?.vision && typeof input.vision === "object" ? input.vision : null;
  const product = input?.product && typeof input.product === "object" ? input.product : null;
  const manufacturer = input?.manufacturer && typeof input.manufacturer === "object" ? input.manufacturer : {};

  if (!vision || !product?.article) {
    return { ok: false, error: "vision and product.article are required.", record: null };
  }

  const manufacturerId = manufacturer.manufacturer_id || input?.manufacturer_id;
  const catalogUrl = manufacturer.catalog_url || product.catalog_url || "";
  const fingerprint = buildVisualFingerprint(vision);

  const prior = store
    .findByFingerprint(fingerprint)
    .reduce(
      (acc, entry) => mergeExperience(acc, entry.experience),
      createEmptyExperience(),
    );

  const experience = recordExperienceSuccess(prior, {
    manufacturer_id: manufacturerId,
    catalog_url: catalogUrl,
  });

  return store.upsert({
    visual_fingerprint: fingerprint,
    rich_visual_fingerprint: buildRichVisualFingerprint(vision),
    vision,
    manufacturer_id: manufacturerId,
    catalog_url: catalogUrl,
    product_url: product.url || "",
    article: product.article,
    category: vision.category || product.category || "",
    confidence: product.match_confidence ?? vision.confidence ?? 0,
    match_type: product.match_type || input?.match_type || "ccn_live",
    last_verified_at: new Date().toISOString(),
    experience,
  });
}

/**
 * Record a failed verification against remembered experience.
 * Never deletes manufacturers — only reduces confidence slightly.
 */
export function recordVisualMemoryFailure(input, options = {}) {
  const store = options.store || getVisualMemoryStore();
  const vision = input?.vision && typeof input.vision === "object" ? input.vision : null;
  if (!vision) {
    return { ok: false, error: "vision is required.", updated: 0 };
  }

  const fingerprint = buildVisualFingerprint(vision);
  const matches = store.findByFingerprint(fingerprint);
  if (!matches.length) {
    return { ok: true, error: null, updated: 0, experience: null };
  }

  const manufacturerId = input?.manufacturer_id || matches[0].manufacturer_id;
  const catalogUrl = input?.catalog_url || matches[0].catalog_url || "";

  let experience = matches.reduce(
    (acc, entry) => mergeExperience(acc, entry.experience),
    createEmptyExperience(),
  );
  experience = recordExperienceFailure(experience, {
    manufacturer_id: manufacturerId,
    catalog_url: catalogUrl,
  });

  const updated = store.syncExperienceForFingerprint(fingerprint, experience);
  return {
    ok: true,
    error: null,
    updated,
    experience: normalizeExperience(experience),
    fingerprint_key: fingerprintKey(fingerprint),
  };
}
