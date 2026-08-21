import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ENTITY_TYPES, buildEntityId, createProviderResult, evaluateEconomics, evaluateHardGate, evaluateQuality, normalizeProviderOutput, validateEntityShape } from "./benchmark-core.mjs";
import { combinedGold, genericMultiplicityGold, genericMultiplicityRaw, modeluxGold, oprimeGold, oprimeMultiplicityGold, rawProviderFixture } from "./fixtures/catalog-fixtures.mjs";
import { createFirecrawlFixtureResult } from "./providers/firecrawl.mjs";
import { createContextDevFixtureResult } from "./providers/context-dev.mjs";

const clone = (value) => structuredClone(value);
const normalized = normalizeProviderOutput(rawProviderFixture(), { providerId: "offline-fixture", extractionRunId: "fixture-run" });
assert.equal(normalized.rejected_entities.length, 0);
assert.equal(normalized.normalized_entities.length, 5);
for (const entity of normalized.normalized_entities) assert.deepEqual(validateEntityShape(entity), []);
assert.deepEqual(new Set(normalized.normalized_entities.map((entity) => entity.identity.entity_type)), new Set(ENTITY_TYPES));
assert.equal(normalized.normalized_entities.find((entity) => entity.identity.entity_type === "product_model").identity.article, null);

const hardPass = evaluateHardGate({ entities: normalized.normalized_entities, gold: combinedGold });
assert.equal(hardPass.pass, true, JSON.stringify(hardPass.defects));
const qualityPass = evaluateQuality({ entities: normalized.normalized_entities, gold: combinedGold, hardGate: hardPass });
assert.equal(qualityPass.calculated, true);
assert.equal(qualityPass.pass, true);
assert.equal(qualityPass.score, 100);

function expectFailure(name, mutate, expectedCode, options = {}) {
  const entities = clone(normalized.normalized_entities);
  mutate(entities);
  const result = evaluateHardGate({ entities, gold: combinedGold, ...options });
  assert.equal(result.pass, false, `${name} must fail`);
  assert(result.defects.some((defect) => defect.code === expectedCode), `${name}: expected ${expectedCode}, got ${result.defects.map((d) => d.code)}`);
  assert.equal(evaluateQuality({ entities, gold: combinedGold, hardGate: result }).calculated, false, `${name}: quality must not compensate hard gate`);
}

expectFailure("invented SKU", (entities) => { entities.find((e) => e.identity.entity_type === "product_model").identity.article = "INVENTED"; }, "invented_article");
expectFailure("duplicate identity", (entities) => { entities.push(clone(entities[0])); }, "duplicate_identity");
expectFailure("wrong entity type", (entities) => { entities[0].identity.entity_type = "sellable_item"; }, "nondeterministic_entity_id");
expectFailure("cross-product image", (entities) => { const owner = entities.find((e) => e.media.records.length); owner.media.records[0].entity_id = entities.find((e) => e.identity.entity_id !== owner.identity.entity_id).identity.entity_id; }, "cross_product_image");
expectFailure("broken relationship", (entities) => { entities[0].relationships.member_of = ["missing-entity"]; }, "broken_relationship");
expectFailure("incomplete configuration eligible", (entities) => { const config = entities.find((e) => e.identity.entity_type === "configuration"); config.relationships.configured_from = []; }, "relationship_mismatch:configured_from");
expectFailure("manufacturer-specific repair", () => {}, "manufacturer_specific_repair_attempt", { manufacturerSpecificLogic: true });

const genericNormalized = normalizeProviderOutput(genericMultiplicityRaw(), { providerId: "offline-fixture", extractionRunId: "generic-multiplicity" });
assert.equal(genericNormalized.rejected_entities.length, 0);
const genericConfiguration = genericNormalized.normalized_entities.find((entity) => entity.identity.entity_type === "configuration");
assert.deepEqual(genericConfiguration.relationships.configured_from.map((relation) => relation.quantity).sort(), [1, 1, 2]);
assert.equal(genericConfiguration.relationships.configured_from.find((relation) => relation.quantity === 2).quantity, 2);
const genericHardPass = evaluateHardGate({ entities: genericNormalized.normalized_entities, gold: genericMultiplicityGold });
assert.equal(genericHardPass.pass, true, JSON.stringify(genericHardPass.defects));
assert.equal(evaluateQuality({ entities: genericNormalized.normalized_entities, gold: genericMultiplicityGold, hardGate: genericHardPass }).pass, true);

function expectNormalizerRejection(name, quantity) {
  const raw = genericMultiplicityRaw();
  const config = raw.entities.find((entity) => entity.identity.entity_type === "configuration");
  config.relationships.configured_from[0].quantity = quantity;
  const result = normalizeProviderOutput(raw, { providerId: "offline-fixture", extractionRunId: name });
  assert.equal(result.rejected_entities.length, 1, `${name}: malformed relationship must be rejected`);
  assert.equal(result.rejected_entities[0].reason, "malformed_configured_from");
}
expectNormalizerRejection("quantity zero", 0);
expectNormalizerRejection("quantity negative", -1);
expectNormalizerRejection("quantity non-integer", 1.5);

const duplicateRelations = clone(genericNormalized.normalized_entities);
const duplicateConfig = duplicateRelations.find((entity) => entity.identity.entity_type === "configuration");
duplicateConfig.relationships.configured_from.push(clone(duplicateConfig.relationships.configured_from[0]));
assert(validateEntityShape(duplicateConfig).includes("duplicate_configured_from_entity"));

const brokenComponent = clone(genericNormalized.normalized_entities);
brokenComponent.find((entity) => entity.identity.entity_type === "configuration").relationships.configured_from[0].entity_id = "missing-component";
assert(evaluateHardGate({ entities: brokenComponent, gold: genericMultiplicityGold }).defects.some((defect) => defect.code === "broken_relationship"));

const lostQuantity = clone(genericNormalized.normalized_entities);
lostQuantity.find((entity) => entity.identity.entity_type === "configuration").relationships.configured_from.find((relation) => relation.quantity === 2).quantity = 1;
const lostQuantityGate = evaluateHardGate({ entities: lostQuantity, gold: genericMultiplicityGold });
assert(lostQuantityGate.defects.some((defect) => defect.code === "relationship_mismatch:configured_from"));
assert.equal(evaluateQuality({ entities: lostQuantity, gold: genericMultiplicityGold, hardGate: lostQuantityGate }).calculated, false);

const incompleteEligible = clone(genericNormalized.normalized_entities);
incompleteEligible.find((entity) => entity.identity.entity_type === "configuration").relationships.configured_from = [];
assert(evaluateHardGate({ entities: incompleteEligible, gold: genericMultiplicityGold }).defects.some((defect) => defect.code === "eligible_configuration_without_composition"));

const opaqueRaw = genericMultiplicityRaw();
const opaqueConfig = opaqueRaw.entities.find((entity) => entity.identity.entity_type === "configuration");
opaqueConfig.identity.source_identity_key = "opaque:COMPONENT-A-COMPONENT-B-COMPONENT-B-COMPONENT-C";
opaqueConfig.identity.entity_id = buildEntityId(opaqueConfig.identity);
opaqueConfig.relationships.configured_from = [];
const opaqueNormalized = normalizeProviderOutput(opaqueRaw, { providerId: "offline-fixture", extractionRunId: "opaque-code" });
assert.deepEqual(opaqueNormalized.normalized_entities.find((entity) => entity.identity.entity_type === "configuration").relationships.configured_from, []);

const oprimeNormalized = normalizeProviderOutput({ entities: clone(oprimeMultiplicityGold.entities) }, { providerId: "offline-fixture", extractionRunId: "gold-representation" });
const oprimeConfig = oprimeNormalized.normalized_entities.find((entity) => entity.identity.entity_type === "configuration");
assert.equal(oprimeConfig.identity.article, null);
assert.equal(oprimeConfig.relationships.configured_from.find((relation) => relation.quantity === 2).quantity, 2);
assert.equal(evaluateHardGate({ entities: oprimeNormalized.normalized_entities, gold: oprimeMultiplicityGold }).pass, true);

const identityInput = { manufacturer_id: "modelux", entity_type: "sellable_item", source_identity_key: "sku:MX-001" };
assert.equal(buildEntityId(identityInput), buildEntityId(identityInput));
assert.notEqual(buildEntityId(identityInput), buildEntityId({ ...identityInput, entity_type: "product_model" }));

const economics = evaluateEconomics({
  total_provider_cost: 12, calls: 2, pages: 24, latency_ms: 1500, retries: 0,
  trustworthy_discovered_entities: 6, trustworthy_procurement_relevant_entities: 4, procurement_eligible_entities: 3,
});
assert.equal(economics.cost_per_trustworthy_procurement_relevant_entity, 3);
assert.equal(economics.cost_per_discovered_trustworthy_entity, 2);
assert.equal(economics.cost_per_procurement_eligible_entity, 4);

for (const result of [
  createFirecrawlFixtureResult({ raw_response: {}, metadata: {}, usage: { pages: 0 }, latency_ms: 0, provider_cost: 0 }),
  createContextDevFixtureResult({ raw_response: {}, metadata: {}, usage: { pages: 0 }, latency_ms: 0, provider_cost: 0 }),
]) {
  assert.deepEqual(Object.keys(result), Object.keys(createProviderResult({ provider_id: result.provider_id, raw_response: {}, metadata: {}, usage: { pages: 0 }, latency_ms: 0, provider_cost: 0 })));
  assert.equal(result.normalized_entities.length, 0);
}

const schemaPath = fileURLToPath(new URL("./catalog-entity-v2.schema.json", import.meta.url));
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
assert.equal(schema.title, "Benchmark Catalog Entity Contract v2");
assert.deepEqual(schema.properties.identity.properties.entity_type.enum, ENTITY_TYPES);
assert.equal(schema.properties.relationships.properties.configured_from.$ref, "#/$defs/componentRelations");
assert.equal(schema.$defs.componentRelations.items.properties.quantity.minimum, 1);
assert.equal(schema.$defs.componentRelations.items.properties.quantity.type, "integer");
assert.equal(schema.properties.identity.properties.article.type.includes("null"), true);
assert.equal(modeluxGold.live_gold_ready, false);
assert.equal(oprimeGold.live_gold_ready, false);

console.log(JSON.stringify({
  ok: true, contract: "v2", pass_entities: normalized.normalized_entities.length,
  entity_types: ENTITY_TYPES, hard_gate: "PASS", quality_score: qualityPass.score,
  fail_cases: 14, multiplicity_preserved: true, normalizer_inference: false,
  oprime_gold_representation: true, economics, provider_boundary: ["firecrawl", "context.dev"],
  external_api_calls: 0, live_gold_ready: false,
}, null, 2));
