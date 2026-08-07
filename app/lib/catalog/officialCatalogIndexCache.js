import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import { resolve } from "path";

export const OFFICIAL_CATALOG_INDEX_CACHE_SCHEMA = "osa.official-catalog-index-cache.v1";
export const DEFAULT_OFFICIAL_CATALOG_INDEX_CACHE_DIR = resolve(process.cwd(), "cache", "osa", "official-catalog-indexes");

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildOfficialCatalogCacheIdentity({ source_snapshot, media_index, provider }) {
  const dimensions = Number(provider?.dimensions);
  if (!Number.isInteger(dimensions) || dimensions <= 0) throw new Error("Official Catalog cache requires provider dimensions.");
  const identity = Object.freeze({
    manufacturer_id: text(source_snapshot?.manufacturer_id).toLowerCase(),
    source_snapshot_id: text(source_snapshot?.source_snapshot_id),
    media: [...(media_index?.records || [])]
      .map((media) => ({ media_id: text(media.media_id), official_url: text(media.official_url) }))
      .sort((a, b) => a.media_id.localeCompare(b.media_id)),
    provider_id: text(provider?.provider_id),
    model_id: text(provider?.model_id),
    model_version: text(provider?.model_version),
    dimensions,
  });
  if (!identity.manufacturer_id || !identity.source_snapshot_id || !identity.media.length ||
      !identity.provider_id || !identity.model_id || !identity.model_version) {
    throw new Error("Official Catalog cache identity is incomplete.");
  }
  return identity;
}

export function hashOfficialCatalogCacheIdentity(identity) {
  return createHash("sha256").update(stableJson(identity)).digest("hex");
}

function validateCachedIndexes(artifact, identity, cacheKey) {
  if (artifact?.schema_version !== OFFICIAL_CATALOG_INDEX_CACHE_SCHEMA) return null;
  if (artifact?.cache_key !== cacheKey || stableJson(artifact?.identity) !== stableJson(identity)) return null;
  const indexes = artifact?.indexes;
  const embeddings = indexes?.embedding_store?.records;
  const vectors = indexes?.visual_index?.records;
  if (!Array.isArray(indexes?.product_index?.records) || !Array.isArray(indexes?.media_index?.records) ||
      !Array.isArray(embeddings) || !embeddings.length || !Array.isArray(vectors) || vectors.length !== embeddings.length) return null;
  if (indexes.visual_index.provider_id !== identity.provider_id || indexes.visual_index.model_id !== identity.model_id ||
      indexes.visual_index.model_version !== identity.model_version || indexes.visual_index.dimensions !== identity.dimensions) return null;
  if (embeddings.some((record) => record.dimensions !== identity.dimensions || !Array.isArray(record.vector) || record.vector.length !== identity.dimensions)) return null;
  const expectedMedia = new Set(identity.media.map((media) => `${media.media_id}\\u001f${media.official_url}`));
  const cachedMedia = new Set(indexes.media_index.records.map((media) => `${text(media.media_id)}\\u001f${text(media.official_url)}`));
  if (expectedMedia.size !== cachedMedia.size || [...expectedMedia].some((key) => !cachedMedia.has(key))) return null;
  return indexes;
}

export async function loadOfficialCatalogIndexCache({ identity, cacheDir = DEFAULT_OFFICIAL_CATALOG_INDEX_CACHE_DIR }) {
  const cacheKey = hashOfficialCatalogCacheIdentity(identity);
  const cachePath = resolve(cacheDir, `${cacheKey}.json`);
  const raw = await readFile(cachePath, "utf8").catch(() => "");
  if (!raw) return { hit: false, cache_key: cacheKey, cache_path: cachePath, indexes: null };
  const artifact = JSON.parse(raw);
  const indexes = validateCachedIndexes(artifact, identity, cacheKey);
  return { hit: Boolean(indexes), cache_key: cacheKey, cache_path: cachePath, indexes };
}

export async function saveOfficialCatalogIndexCache({ identity, indexes, cacheDir = DEFAULT_OFFICIAL_CATALOG_INDEX_CACHE_DIR }) {
  const cacheKey = hashOfficialCatalogCacheIdentity(identity);
  const cachePath = resolve(cacheDir, `${cacheKey}.json`);
  const temporaryPath = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
  await mkdir(cacheDir, { recursive: true });
  await writeFile(temporaryPath, JSON.stringify({
    schema_version: OFFICIAL_CATALOG_INDEX_CACHE_SCHEMA,
    cache_key: cacheKey,
    identity,
    indexes,
  }), "utf8");
  try {
    await rename(temporaryPath, cachePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    if (error?.code !== "EEXIST") throw error;
  }
  return { cache_key: cacheKey, cache_path: cachePath };
}
