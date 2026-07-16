import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import {
  buildBasicVisualFingerprint,
  buildRichVisualFingerprint,
} from "../buildRichVisualFingerprint";
import { VISION_JSON_ATTRIBUTE_KEYS } from "../visionJsonContract";
import {
  createEmptyExperience,
  mergeExperience,
  normalizeExperience,
} from "./experienceMemory";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function defaultStorePath() {
  const fromEnv = asString(process.env.OSA_VISUAL_MEMORY_PATH);
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data", "osa-visual-memory.json");
}

/**
 * Stable fingerprint object from Vision JSON attributes (not image embeddings).
 * Keeps basic attribute identity for backward-compatible memory records.
 */
export function buildVisualFingerprint(vision) {
  return buildBasicVisualFingerprint(vision);
}

export function fingerprintKey(fingerprint) {
  const fp = fingerprint && typeof fingerprint === "object" ? fingerprint : {};
  const parts = VISION_JSON_ATTRIBUTE_KEYS.map((key) => asString(fp[key]).toLowerCase());
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

function normalizeRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const vision = raw.vision && typeof raw.vision === "object" ? raw.vision : null;
  const fingerprint = raw.visual_fingerprint && typeof raw.visual_fingerprint === "object"
    ? raw.visual_fingerprint
    : buildVisualFingerprint(vision || {});

  const article = asString(raw.article);
  const manufacturerId = asString(raw.manufacturer_id);
  if (!article || !manufacturerId || !vision) return null;

  const rich =
    raw.rich_visual_fingerprint && typeof raw.rich_visual_fingerprint === "object"
      ? raw.rich_visual_fingerprint
      : buildRichVisualFingerprint(vision);

  return {
    id: asString(raw.id) || `${manufacturerId}:${article}:${fingerprintKey(fingerprint)}`,
    visual_fingerprint: fingerprint,
    rich_visual_fingerprint: rich,
    vision,
    manufacturer_id: manufacturerId,
    catalog_url: asString(raw.catalog_url),
    product_url: asString(raw.product_url),
    article,
    category: asString(raw.category) || asString(vision.category),
    confidence: asNumber(raw.confidence, asNumber(vision.confidence, 0)),
    match_type: asString(raw.match_type) || "ccn_live",
    last_verified_at: asString(raw.last_verified_at) || new Date().toISOString(),
    experience: normalizeExperience(raw.experience),
  };
}

/**
 * Persistent Visual Memory store — OSA experience only (not a catalog).
 */
export class VisualMemoryStore {
  /**
   * @param {{ filePath?: string, records?: object[] }} [options]
   */
  constructor(options = {}) {
    this.filePath = asString(options.filePath) || defaultStorePath();
    this._records = Array.isArray(options.records)
      ? options.records.map(normalizeRecord).filter(Boolean)
      : null;
  }

  _ensureLoaded() {
    if (this._records) return;
    try {
      if (!existsSync(this.filePath)) {
        this._records = [];
        return;
      }
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.records) ? parsed.records : [];
      this._records = list.map(normalizeRecord).filter(Boolean);
    } catch {
      this._records = [];
    }
  }

  _persist() {
    this._ensureLoaded();
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(
      this.filePath,
      JSON.stringify({ version: 1, records: this._records }, null, 2),
      "utf8",
    );
  }

  list() {
    this._ensureLoaded();
    return this._records.map((record) => ({
      ...record,
      vision: { ...record.vision },
      experience: normalizeExperience(record.experience),
    }));
  }

  clear() {
    this._records = [];
    this._persist();
  }

  /**
   * Find records sharing the same basic visual fingerprint identity.
   */
  findByFingerprint(fingerprint) {
    this._ensureLoaded();
    const key = fingerprintKey(fingerprint);
    return this._records.filter(
      (entry) => fingerprintKey(entry.visual_fingerprint) === key,
    );
  }

  /**
   * Propagate experience to every record with the same visual fingerprint.
   * Replaces with the caller-provided snapshot (already merged + updated).
   * Manufacturers are never deleted from that snapshot — only confidence changes.
   */
  syncExperienceForFingerprint(fingerprint, experience) {
    this._ensureLoaded();
    const key = fingerprintKey(fingerprint);
    const normalized = normalizeExperience(experience);
    let updated = 0;
    for (let i = 0; i < this._records.length; i += 1) {
      if (fingerprintKey(this._records[i].visual_fingerprint) !== key) continue;
      this._records[i] = {
        ...this._records[i],
        experience: normalized,
      };
      updated += 1;
    }
    if (updated > 0) this._persist();
    return updated;
  }

  /**
   * Patch experience on matching records (by fingerprint + optional article).
   * Never deletes records.
   */
  updateExperience(matcher, experience) {
    this._ensureLoaded();
    const next = normalizeExperience(experience);
    let updated = 0;
    for (let i = 0; i < this._records.length; i += 1) {
      const entry = this._records[i];
      if (matcher?.fingerprint) {
        if (fingerprintKey(entry.visual_fingerprint) !== fingerprintKey(matcher.fingerprint)) {
          continue;
        }
      }
      if (matcher?.article && entry.article !== asString(matcher.article)) continue;
      if (
        matcher?.manufacturer_id &&
        entry.manufacturer_id.toLowerCase() !== asString(matcher.manufacturer_id).toLowerCase()
      ) {
        continue;
      }
      this._records[i] = { ...entry, experience: next };
      updated += 1;
    }
    if (updated > 0) this._persist();
    return updated;
  }

  /**
   * Insert or update by manufacturer_id + article (+ fingerprint when present).
   * Preserves / merges experience; never deletes prior manufacturers from experience.
   */
  upsert(input) {
    this._ensureLoaded();
    const fingerprint = input?.visual_fingerprint || buildVisualFingerprint(input?.vision);
    const sameFingerprint = this.findByFingerprint(fingerprint);
    const priorExperience = sameFingerprint.reduce(
      (acc, entry) => mergeExperience(acc, entry.experience),
      createEmptyExperience(),
    );

    const record = normalizeRecord({
      ...input,
      visual_fingerprint: fingerprint,
      experience: mergeExperience(priorExperience, input?.experience),
      last_verified_at: input?.last_verified_at || new Date().toISOString(),
    });
    if (!record) {
      return { ok: false, error: "Invalid visual memory record.", record: null };
    }

    const index = this._records.findIndex(
      (entry) =>
        entry.manufacturer_id === record.manufacturer_id &&
        entry.article === record.article &&
        fingerprintKey(entry.visual_fingerprint) === fingerprintKey(record.visual_fingerprint),
    );

    if (index >= 0) {
      const previous = this._records[index];
      this._records[index] = {
        ...previous,
        ...record,
        id: previous.id,
        experience: mergeExperience(previous.experience, record.experience),
        last_verified_at: record.last_verified_at,
      };
    } else {
      this._records.push(record);
    }

    // Accumulate experience across all records sharing this visual fingerprint.
    this.syncExperienceForFingerprint(record.visual_fingerprint, record.experience);

    this._persist();
    const stored =
      this._records.find(
        (entry) =>
          entry.manufacturer_id === record.manufacturer_id &&
          entry.article === record.article &&
          fingerprintKey(entry.visual_fingerprint) === fingerprintKey(record.visual_fingerprint),
      ) || record;

    return { ok: true, error: null, record: { ...stored } };
  }
}

let defaultStore = null;

export function getVisualMemoryStore(options) {
  if (options?.filePath || options?.records) {
    return new VisualMemoryStore(options);
  }
  if (!defaultStore) defaultStore = new VisualMemoryStore();
  return defaultStore;
}

export function resetVisualMemoryStoreForTests(options = {}) {
  defaultStore = new VisualMemoryStore(options);
  return defaultStore;
}
