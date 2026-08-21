import { createHash } from "node:crypto";

export const ENTITY_TYPES = Object.freeze(["product_model", "sellable_item", "configuration", "component", "collection"]);
export const RELATIONSHIP_TYPES = Object.freeze(["member_of", "variant_of", "configured_from", "component_of"]);

const IDENTITY_KEYS = ["entity_id", "manufacturer_id", "entity_type", "source_identity_key", "article", "title", "official_url", "registry_category_id", "procurement_eligible"];
const PROCUREMENT_KEYS = ["dimensions", "specifications", "material", "finish", "color", "mounting", "price", "currency", "availability"];
const PROVENANCE_KEYS = ["source_url", "source_type", "retrieved_at", "source_snapshot_id", "field_evidence", "field_confidence", "extraction_provider", "extraction_run_id", "content_hash", "validation_warnings"];

export function buildEntityId({ manufacturer_id, entity_type, source_identity_key }) {
  return createHash("sha256").update(`${manufacturer_id}\u001f${entity_type}\u001f${source_identity_key}`, "utf8").digest("hex");
}

const own = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);
const valueOrNull = (value) => value === undefined ? null : structuredClone(value);
const list = (value) => Array.isArray(value) ? [...new Set(value.filter((entry) => typeof entry === "string" && entry.length))] : [];
const configuredFrom = (value) => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  if (value.some((entry) => !entry || typeof entry !== "object" || Array.isArray(entry)
    || typeof entry.entity_id !== "string" || !entry.entity_id
    || !Number.isInteger(entry.quantity) || entry.quantity < 1
    || Object.keys(entry).some((key) => !["entity_id", "quantity"].includes(key)))) return null;
  return value.map(({ entity_id, quantity }) => ({ entity_id, quantity }))
    .sort((left, right) => left.entity_id.localeCompare(right.entity_id));
};
const relationTarget = (type, relation) => type === "configured_from" ? relation?.entity_id : relation;
const relationKey = (type, relation) => type === "configured_from"
  ? `${relation.entity_id}:${relation.quantity}`
  : relation;

export function normalizeProviderOutput(raw, { providerId, extractionRunId }) {
  const source = Array.isArray(raw) ? raw : raw?.entities;
  if (!Array.isArray(source)) throw new TypeError("Provider output must contain an entities array");
  const rejected_entities = [];
  const normalized_entities = [];

  source.forEach((candidate, index) => {
    if (!candidate || typeof candidate !== "object") {
      rejected_entities.push({ index, reason: "not_an_object", raw: candidate });
      return;
    }
    const identity = candidate.identity ?? {};
    const relationships = candidate.relationships ?? {};
    const media = candidate.media ?? {};
    const attributes = candidate.procurement_attributes ?? {};
    const provenance = candidate.provenance_quality ?? {};
    const normalizedConfiguredFrom = configuredFrom(relationships.configured_from);
    if (normalizedConfiguredFrom === null) {
      rejected_entities.push({ index, reason: "malformed_configured_from", raw: structuredClone(candidate) });
      return;
    }
    const entity = {
      identity: {
        entity_id: identity.entity_id ?? (identity.manufacturer_id && identity.entity_type && identity.source_identity_key
          ? buildEntityId(identity)
          : null),
        manufacturer_id: identity.manufacturer_id ?? null,
        entity_type: identity.entity_type ?? null,
        source_identity_key: identity.source_identity_key ?? null,
        article: valueOrNull(identity.article),
        title: identity.title ?? null,
        official_url: identity.official_url ?? null,
        registry_category_id: valueOrNull(identity.registry_category_id),
        procurement_eligible: identity.procurement_eligible ?? null,
      },
      relationships: {
        member_of: list(relationships.member_of),
        variant_of: list(relationships.variant_of),
        configured_from: normalizedConfiguredFrom,
        component_of: list(relationships.component_of),
      },
      media: {
        records: Array.isArray(media.records) ? structuredClone(media.records) : [],
        primary_image_id: valueOrNull(media.primary_image_id),
      },
      procurement_attributes: Object.fromEntries(PROCUREMENT_KEYS.map((key) => [key, valueOrNull(attributes[key])])),
      provenance_quality: {
        source_url: provenance.source_url ?? identity.official_url ?? null,
        source_type: provenance.source_type ?? null,
        retrieved_at: provenance.retrieved_at ?? null,
        source_snapshot_id: provenance.source_snapshot_id ?? null,
        field_evidence: provenance.field_evidence && typeof provenance.field_evidence === "object" ? structuredClone(provenance.field_evidence) : {},
        field_confidence: provenance.field_confidence && typeof provenance.field_confidence === "object" ? structuredClone(provenance.field_confidence) : {},
        extraction_provider: provenance.extraction_provider ?? providerId ?? null,
        extraction_run_id: provenance.extraction_run_id ?? extractionRunId ?? null,
        content_hash: provenance.content_hash ?? null,
        validation_warnings: Array.isArray(provenance.validation_warnings) ? [...provenance.validation_warnings] : [],
      },
    };
    normalized_entities.push(entity);
  });
  return { normalized_entities, rejected_entities };
}

function isUrl(value) {
  try { return Boolean(new URL(value).protocol.match(/^https?:$/)); } catch { return false; }
}

export function validateEntityShape(entity) {
  const errors = [];
  const identity = entity?.identity ?? {};
  for (const key of IDENTITY_KEYS) if (!own(identity, key)) errors.push(`missing_identity:${key}`);
  for (const key of RELATIONSHIP_TYPES) if (!Array.isArray(entity?.relationships?.[key])) errors.push(`invalid_relationship_array:${key}`);
  const componentRelations = entity?.relationships?.configured_from;
  if (Array.isArray(componentRelations)) {
    const seen = new Set();
    let previous = null;
    for (const relation of componentRelations) {
      if (!relation || typeof relation !== "object" || Array.isArray(relation)
        || typeof relation.entity_id !== "string" || !relation.entity_id
        || !Number.isInteger(relation.quantity) || relation.quantity < 1
        || Object.keys(relation).some((key) => !["entity_id", "quantity"].includes(key))) {
        errors.push("malformed_configured_from");
        continue;
      }
      if (seen.has(relation.entity_id)) errors.push("duplicate_configured_from_entity");
      seen.add(relation.entity_id);
      if (previous !== null && previous.localeCompare(relation.entity_id) > 0) errors.push("nondeterministic_configured_from_order");
      previous = relation.entity_id;
    }
  }
  for (const key of PROCUREMENT_KEYS) if (!own(entity?.procurement_attributes, key)) errors.push(`missing_procurement_attribute:${key}`);
  for (const key of PROVENANCE_KEYS) if (!own(entity?.provenance_quality, key)) errors.push(`missing_provenance:${key}`);
  if (!ENTITY_TYPES.includes(identity.entity_type)) errors.push("invalid_entity_type");
  for (const key of ["entity_id", "manufacturer_id", "source_identity_key", "title"]) if (typeof identity[key] !== "string" || !identity[key]) errors.push(`invalid_identity:${key}`);
  if (identity.article !== null && (typeof identity.article !== "string" || !identity.article)) errors.push("invalid_article");
  if (!isUrl(identity.official_url)) errors.push("invalid_official_url");
  if (typeof identity.procurement_eligible !== "boolean") errors.push("invalid_procurement_eligible");
  if (!Array.isArray(entity?.media?.records) || !own(entity?.media, "primary_image_id")) errors.push("invalid_media");
  if (!isUrl(entity?.provenance_quality?.source_url)) errors.push("invalid_source_url");
  for (const key of ["source_type", "retrieved_at", "source_snapshot_id", "extraction_provider", "extraction_run_id", "content_hash"]) {
    if (typeof entity?.provenance_quality?.[key] !== "string" || !entity.provenance_quality[key]) errors.push(`invalid_provenance:${key}`);
  }
  if (identity.entity_id !== buildEntityId(identity)) errors.push("nondeterministic_entity_id");
  return errors;
}

export function evaluateHardGate({ entities, gold, rejectedEntities = [], manufacturerSpecificLogic = false }) {
  const defects = [];
  const byId = new Map();
  for (const entity of entities) {
    const id = entity?.identity?.entity_id;
    for (const error of validateEntityShape(entity)) defects.push({ code: error, entity_id: id ?? null });
    if (byId.has(id)) defects.push({ code: "duplicate_identity", entity_id: id });
    byId.set(id, entity);
    for (const media of entity?.media?.records ?? []) {
      if (media.entity_id !== id) defects.push({ code: "cross_product_image", entity_id: id, media_id: media.media_id });
    }
    if (entity?.media?.primary_image_id && !(entity.media.records ?? []).some((record) => record.media_id === entity.media.primary_image_id && record.entity_id === id)) {
      defects.push({ code: "invalid_primary_image_association", entity_id: id });
    }
  }
  for (const entity of entities) {
    if (entity?.identity?.entity_type === "configuration" && entity.identity.procurement_eligible && !entity.relationships?.configured_from?.length) {
      defects.push({ code: "eligible_configuration_without_composition", entity_id: entity.identity.entity_id });
    }
    for (const type of RELATIONSHIP_TYPES) for (const relation of entity.relationships?.[type] ?? []) {
      const target = relationTarget(type, relation);
      if (!byId.has(target)) defects.push({ code: "broken_relationship", entity_id: entity.identity.entity_id, relationship: type, target });
    }
  }
  if (manufacturerSpecificLogic) defects.push({ code: "manufacturer_specific_repair_attempt", entity_id: null });

  const expected = new Map((gold?.entities ?? []).map((entity) => [entity.identity.entity_id, entity]));
  for (const [id, wanted] of expected) {
    const actual = byId.get(id);
    if (!actual) { defects.push({ code: wanted.identity.procurement_eligible ? "lost_sellable_unit" : "missing_gold_entity", entity_id: id }); continue; }
    for (const key of ["manufacturer_id", "entity_type", "source_identity_key", "official_url", "procurement_eligible"]) {
      if (actual.identity[key] !== wanted.identity[key]) defects.push({ code: `identity_mismatch:${key}`, entity_id: id });
    }
    if (wanted.identity.article !== null && actual.identity.article !== wanted.identity.article) defects.push({ code: "article_mismatch", entity_id: id });
    if (wanted.identity.article === null && actual.identity.article !== null) defects.push({ code: "invented_article", entity_id: id });
    if (!wanted.identity.procurement_eligible && actual.identity.procurement_eligible) defects.push({ code: "false_procurement_eligible", entity_id: id });
    for (const type of RELATIONSHIP_TYPES) {
      const actualTargets = actual.relationships[type].map((relation) => relationKey(type, relation)).sort();
      const wantedTargets = wanted.relationships[type].map((relation) => relationKey(type, relation)).sort();
      if (JSON.stringify(actualTargets) !== JSON.stringify(wantedTargets)) defects.push({ code: `relationship_mismatch:${type}`, entity_id: id });
    }
  }
  for (const id of byId.keys()) if (!expected.has(id)) defects.push({ code: "false_entity", entity_id: id });
  if (rejectedEntities.length) defects.push({ code: "rejected_entities_present", count: rejectedEntities.length });

  return { pass: defects.length === 0, defects };
}

export function evaluateQuality({ entities, gold, hardGate }) {
  if (!hardGate?.pass) return { calculated: false, score: null, reason: "hard_gate_failed" };
  const expected = new Map(gold.entities.map((entity) => [entity.identity.entity_id, entity]));
  const actual = new Map(entities.map((entity) => [entity.identity.entity_id, entity]));
  const ratio = (hits, total) => total ? hits / total : 1;
  const discovery = ratio([...expected.keys()].filter((id) => actual.has(id)).length, expected.size);
  const eligibleGold = [...expected.values()].filter((entity) => entity.identity.procurement_eligible);
  const sellable = ratio(eligibleGold.filter((entity) => actual.has(entity.identity.entity_id)).length, eligibleGold.length);
  const relationships = [...expected.values()].flatMap((entity) => RELATIONSHIP_TYPES.flatMap((type) => entity.relationships[type].map((relation) => [entity.identity.entity_id, type, relationKey(type, relation)])));
  const relationship = ratio(relationships.filter(([id, type, expectedKey]) => actual.get(id)?.relationships[type].some((relation) => relationKey(type, relation) === expectedKey)).length, relationships.length);
  const mediaGold = [...expected.values()].filter((entity) => entity.media.primary_image_id);
  const media = ratio(mediaGold.filter((entity) => actual.get(entity.identity.entity_id)?.media.primary_image_id === entity.media.primary_image_id).length, mediaGold.length);
  const procurementFields = PROCUREMENT_KEYS.filter((key) => !["price", "currency", "availability"].includes(key));
  const attributePairs = [...expected.values()].flatMap((entity) => procurementFields.filter((key) => entity.procurement_attributes[key] !== null).map((key) => [entity.identity.entity_id, key]));
  const attributes = ratio(attributePairs.filter(([id, key]) => actual.get(id)?.procurement_attributes[key] !== null).length, attributePairs.length);
  const provenance = ratio([...actual.values()].filter((entity) => Object.keys(entity.provenance_quality.field_evidence).length > 0).length, actual.size);
  const identity = 1;
  const repeatability = gold.repeatability_identity_match ?? 1;
  const score = 20 * discovery + 15 * identity + 15 * relationship + 15 * sellable + 10 * media + 10 * attributes + 10 * provenance + 5 * repeatability;
  return {
    calculated: true,
    score: Number(score.toFixed(2)),
    pass: score >= 85 && discovery >= 0.9 && sellable >= 0.95 && relationship >= 0.95 && media >= 0.98 && repeatability === 1,
    metrics: { discovery, identity, relationship, sellable, media, attributes, provenance, repeatability },
  };
}

export function evaluateEconomics(input) {
  const total = Number(input.total_provider_cost);
  const divide = (count) => count > 0 ? total / count : null;
  return {
    total_provider_cost: total,
    calls: input.calls,
    pages: input.pages,
    latency_ms: input.latency_ms,
    retries: input.retries,
    trustworthy_discovered_entities: input.trustworthy_discovered_entities,
    trustworthy_procurement_relevant_entities: input.trustworthy_procurement_relevant_entities,
    procurement_eligible_entities: input.procurement_eligible_entities,
    cost_per_trustworthy_procurement_relevant_entity: divide(input.trustworthy_procurement_relevant_entities),
    cost_per_discovered_trustworthy_entity: divide(input.trustworthy_discovered_entities),
    cost_per_procurement_eligible_entity: divide(input.procurement_eligible_entities),
  };
}

export function createProviderResult({ provider_id, raw_response, metadata, usage, latency_ms, provider_cost }) {
  return { provider_id, raw_response, extraction_metadata: metadata, usage, latency_ms, provider_cost, normalized_entities: [], rejected_entities: [], validation_result: null };
}
