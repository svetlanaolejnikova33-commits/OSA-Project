/**
 * Experience Memory — accumulated design experience attached to Visual Memory.
 * Remembers where similar objects were found; never overrides Vision.
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(Math.max(0, Math.min(1, num)) * 1000) / 1000;
}

export const EXPERIENCE_SUCCESS_GROWTH = 0.05;
export const EXPERIENCE_FAILURE_DECAY = 0.02;
export const EXPERIENCE_MANUFACTURER_SUCCESS = 0.08;
export const EXPERIENCE_MANUFACTURER_FAILURE = 0.03;
export const EXPERIENCE_INITIAL_GROWTH = 0.5;
export const EXPERIENCE_INITIAL_MANUFACTURER = 0.55;

/**
 * @returns {import("./experienceMemory").ExperienceMemory}
 */
export function createEmptyExperience() {
  return {
    seen_count: 0,
    successful_matches: 0,
    failed_matches: 0,
    manufacturers_seen: [],
    catalogs_seen: [],
    last_success_at: null,
    confidence_growth: EXPERIENCE_INITIAL_GROWTH,
  };
}

/**
 * @param {unknown} raw
 * @returns {import("./experienceMemory").ExperienceMemory}
 */
export function normalizeExperience(raw) {
  const empty = createEmptyExperience();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;

  const manufacturers = Array.isArray(raw.manufacturers_seen)
    ? raw.manufacturers_seen
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const manufacturer_id = asString(entry.manufacturer_id).toLowerCase();
          if (!manufacturer_id) return null;
          return {
            manufacturer_id,
            success_count: Math.max(0, Math.floor(asNumber(entry.success_count, 0))),
            last_seen: asString(entry.last_seen) || null,
            confidence: clamp01(asNumber(entry.confidence, EXPERIENCE_INITIAL_MANUFACTURER)),
          };
        })
        .filter(Boolean)
    : [];

  const catalogs = Array.isArray(raw.catalogs_seen)
    ? raw.catalogs_seen
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const catalog_url = asString(entry.catalog_url);
          if (!catalog_url) return null;
          return {
            catalog_url,
            success_count: Math.max(0, Math.floor(asNumber(entry.success_count, 0))),
            confidence: clamp01(asNumber(entry.confidence, EXPERIENCE_INITIAL_MANUFACTURER)),
          };
        })
        .filter(Boolean)
    : [];

  return {
    seen_count: Math.max(0, Math.floor(asNumber(raw.seen_count, 0))),
    successful_matches: Math.max(0, Math.floor(asNumber(raw.successful_matches, 0))),
    failed_matches: Math.max(0, Math.floor(asNumber(raw.failed_matches, 0))),
    manufacturers_seen: manufacturers,
    catalogs_seen: catalogs,
    last_success_at: asString(raw.last_success_at) || null,
    confidence_growth: clamp01(
      asNumber(raw.confidence_growth, EXPERIENCE_INITIAL_GROWTH),
    ),
  };
}

/**
 * Merge two experience objects without deleting manufacturers or catalogs.
 * @param {import("./experienceMemory").ExperienceMemory} left
 * @param {import("./experienceMemory").ExperienceMemory} right
 */
export function mergeExperience(left, right) {
  const a = normalizeExperience(left);
  const b = normalizeExperience(right);
  const manufacturers = new Map();

  for (const entry of [...a.manufacturers_seen, ...b.manufacturers_seen]) {
    const prev = manufacturers.get(entry.manufacturer_id);
    if (!prev) {
      manufacturers.set(entry.manufacturer_id, { ...entry });
      continue;
    }
    manufacturers.set(entry.manufacturer_id, {
      manufacturer_id: entry.manufacturer_id,
      success_count: Math.max(prev.success_count, entry.success_count),
      last_seen:
        (prev.last_seen || "") >= (entry.last_seen || "")
          ? prev.last_seen
          : entry.last_seen,
      confidence: Math.max(prev.confidence, entry.confidence),
    });
  }

  const catalogs = new Map();
  for (const entry of [...a.catalogs_seen, ...b.catalogs_seen]) {
    const prev = catalogs.get(entry.catalog_url);
    if (!prev) {
      catalogs.set(entry.catalog_url, { ...entry });
      continue;
    }
    catalogs.set(entry.catalog_url, {
      catalog_url: entry.catalog_url,
      success_count: Math.max(prev.success_count, entry.success_count),
      confidence: Math.max(prev.confidence, entry.confidence),
    });
  }

  return {
    seen_count: Math.max(a.seen_count, b.seen_count),
    successful_matches: Math.max(a.successful_matches, b.successful_matches),
    failed_matches: Math.max(a.failed_matches, b.failed_matches),
    manufacturers_seen: [...manufacturers.values()],
    catalogs_seen: [...catalogs.values()],
    last_success_at:
      (a.last_success_at || "") >= (b.last_success_at || "")
        ? a.last_success_at
        : b.last_success_at,
    confidence_growth: Math.max(a.confidence_growth, b.confidence_growth),
  };
}

/**
 * Successful CCN / memory-verified match.
 * @param {import("./experienceMemory").ExperienceMemory | null | undefined} experience
 * @param {{ manufacturer_id?: string, catalog_url?: string, at?: string }} meta
 */
export function recordExperienceSuccess(experience, meta = {}) {
  const next = normalizeExperience(experience);
  const manufacturerId = asString(meta.manufacturer_id).toLowerCase();
  const catalogUrl = asString(meta.catalog_url);
  const at = asString(meta.at) || new Date().toISOString();

  next.seen_count += 1;
  next.successful_matches += 1;
  next.last_success_at = at;
  next.confidence_growth = clamp01(next.confidence_growth + EXPERIENCE_SUCCESS_GROWTH);

  if (manufacturerId) {
    const index = next.manufacturers_seen.findIndex(
      (entry) => entry.manufacturer_id === manufacturerId,
    );
    if (index >= 0) {
      const entry = next.manufacturers_seen[index];
      next.manufacturers_seen[index] = {
        ...entry,
        success_count: entry.success_count + 1,
        last_seen: at,
        confidence: clamp01(entry.confidence + EXPERIENCE_MANUFACTURER_SUCCESS),
      };
    } else {
      next.manufacturers_seen.push({
        manufacturer_id: manufacturerId,
        success_count: 1,
        last_seen: at,
        confidence: EXPERIENCE_INITIAL_MANUFACTURER,
      });
    }
  }

  if (catalogUrl) {
    const index = next.catalogs_seen.findIndex((entry) => entry.catalog_url === catalogUrl);
    if (index >= 0) {
      const entry = next.catalogs_seen[index];
      next.catalogs_seen[index] = {
        ...entry,
        success_count: entry.success_count + 1,
        confidence: clamp01(entry.confidence + EXPERIENCE_MANUFACTURER_SUCCESS),
      };
    } else {
      next.catalogs_seen.push({
        catalog_url: catalogUrl,
        success_count: 1,
        confidence: EXPERIENCE_INITIAL_MANUFACTURER,
      });
    }
  }

  return next;
}

/**
 * Failed verification — never deletes manufacturers; only slight confidence decay.
 * @param {import("./experienceMemory").ExperienceMemory | null | undefined} experience
 * @param {{ manufacturer_id?: string, catalog_url?: string }} meta
 */
export function recordExperienceFailure(experience, meta = {}) {
  const next = normalizeExperience(experience);
  const manufacturerId = asString(meta.manufacturer_id).toLowerCase();
  const catalogUrl = asString(meta.catalog_url);

  next.failed_matches += 1;
  next.confidence_growth = clamp01(next.confidence_growth - EXPERIENCE_FAILURE_DECAY);

  if (manufacturerId) {
    const index = next.manufacturers_seen.findIndex(
      (entry) => entry.manufacturer_id === manufacturerId,
    );
    if (index >= 0) {
      const entry = next.manufacturers_seen[index];
      next.manufacturers_seen[index] = {
        ...entry,
        confidence: clamp01(entry.confidence - EXPERIENCE_MANUFACTURER_FAILURE),
      };
    } else {
      // Keep manufacturer present at low confidence — never invent deletion.
      next.manufacturers_seen.push({
        manufacturer_id: manufacturerId,
        success_count: 0,
        last_seen: null,
        confidence: clamp01(EXPERIENCE_INITIAL_MANUFACTURER - EXPERIENCE_MANUFACTURER_FAILURE),
      });
    }
  }

  if (catalogUrl) {
    const index = next.catalogs_seen.findIndex((entry) => entry.catalog_url === catalogUrl);
    if (index >= 0) {
      const entry = next.catalogs_seen[index];
      next.catalogs_seen[index] = {
        ...entry,
        confidence: clamp01(entry.confidence - EXPERIENCE_MANUFACTURER_FAILURE),
      };
    }
  }

  return next;
}

function richFingerprintSimilarity(left, right) {
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return 0;
  const keys = [
    "category",
    "subtype",
    "mounting",
    "construction",
    "silhouette",
    "finish",
    "material",
    "style",
    "shape",
    "proportions",
  ];
  let hit = 0;
  let total = 0;
  for (const key of keys) {
    const a = asString(left[key]).toLowerCase();
    const b = asString(right[key]).toLowerCase();
    if (!a && !b) continue;
    total += 1;
    if (a && b && (a === b || a.includes(b) || b.includes(a))) hit += 1;
  }

  const listKeys = ["distinctive_features", "functional_elements"];
  for (const key of listKeys) {
    const a = Array.isArray(left[key]) ? left[key].map((v) => asString(v).toLowerCase()).filter(Boolean) : [];
    const b = new Set(
      (Array.isArray(right[key]) ? right[key] : []).map((v) => asString(v).toLowerCase()).filter(Boolean),
    );
    if (!a.length && !b.size) continue;
    total += 1;
    if (!a.length || !b.size) continue;
    const overlap = a.filter((token) => b.has(token)).length;
    if (overlap / Math.max(a.length, b.size) >= 0.4) hit += 1;
  }

  return total > 0 ? hit / total : 0;
}

/**
 * Score a manufacturer entry for recommendation ranking.
 */
function manufacturerExperienceScore(entry, experience, fingerprintWeight = 1) {
  const success = asNumber(entry.success_count, 0);
  const confidence = clamp01(entry.confidence);
  const growth = clamp01(experience?.confidence_growth ?? EXPERIENCE_INITIAL_GROWTH);
  // Weighted: success history dominates, confidence second, growth third.
  return clamp01(
    fingerprintWeight *
      (0.45 * Math.min(1, success / 5) + 0.35 * confidence + 0.2 * growth),
  );
}

/**
 * Recommend manufacturers from accumulated experience for a rich visual fingerprint.
 * Returns weighted candidates — never a single forced manufacturer.
 *
 * @param {object} richFingerprint
 * @param {{ store?: { list: () => object[] }, minSimilarity?: number }} [options]
 * @returns {{ manufacturer_id: string, score: number }[]}
 */
export function recommendManufacturersByExperience(richFingerprint, options = {}) {
  const store = options.store;
  if (!store || typeof store.list !== "function") return [];

  const minSimilarity = Number.isFinite(Number(options.minSimilarity))
    ? Number(options.minSimilarity)
    : 0.55;

  const aggregated = new Map();

  for (const record of store.list()) {
    const fp = record.rich_visual_fingerprint || {};
    const similarity = richFingerprintSimilarity(richFingerprint, fp);
    if (similarity < minSimilarity) continue;

    const experience = normalizeExperience(record.experience);
    for (const entry of experience.manufacturers_seen) {
      const score = manufacturerExperienceScore(entry, experience, similarity);
      const prev = aggregated.get(entry.manufacturer_id);
      if (!prev || score > prev.score) {
        aggregated.set(entry.manufacturer_id, {
          manufacturer_id: entry.manufacturer_id,
          score: Math.round(score * 1000) / 1000,
        });
      }
    }
  }

  return [...aggregated.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.manufacturer_id.localeCompare(b.manufacturer_id);
  });
}
