import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { VISION_JSON_ATTRIBUTE_KEYS } from "../visionJsonContract";

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
 */
export function buildVisualFingerprint(vision) {
  const source = vision && typeof vision === "object" ? vision : {};
  const fingerprint = {};
  for (const key of VISION_JSON_ATTRIBUTE_KEYS) {
    fingerprint[key] = asString(source[key]).toLowerCase();
  }
  return fingerprint;
}

export function fingerprintKey(fingerprint) {
  const fp = fingerprint && typeof fingerprint === "object" ? fingerprint : {};
  const parts = VISION_JSON_ATTRIBUTE_KEYS.map((key) => asString(fp[key]));
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

  return {
    id: asString(raw.id) || `${manufacturerId}:${article}:${fingerprintKey(fingerprint)}`,
    visual_fingerprint: fingerprint,
    vision,
    manufacturer_id: manufacturerId,
    catalog_url: asString(raw.catalog_url),
    product_url: asString(raw.product_url),
    article,
    category: asString(raw.category) || asString(vision.category),
    confidence: asNumber(raw.confidence, asNumber(vision.confidence, 0)),
    match_type: asString(raw.match_type) || "ccn_live",
    last_verified_at: asString(raw.last_verified_at) || new Date().toISOString(),
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
    return this._records.map((record) => ({ ...record, vision: { ...record.vision } }));
  }

  clear() {
    this._records = [];
    this._persist();
  }

  /**
   * Insert or update by manufacturer_id + article (+ fingerprint when present).
   */
  upsert(input) {
    this._ensureLoaded();
    const record = normalizeRecord({
      ...input,
      visual_fingerprint: input?.visual_fingerprint || buildVisualFingerprint(input?.vision),
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
      this._records[index] = {
        ...this._records[index],
        ...record,
        id: this._records[index].id,
        last_verified_at: record.last_verified_at,
      };
    } else {
      this._records.push(record);
    }

    this._persist();
    return { ok: true, error: null, record: { ...record } };
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
