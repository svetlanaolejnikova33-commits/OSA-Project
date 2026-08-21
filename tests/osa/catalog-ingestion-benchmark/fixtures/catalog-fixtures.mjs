import { buildEntityId } from "../benchmark-core.mjs";

const provenance = (url, key) => ({
  source_url: url, source_type: "official_product_page", retrieved_at: "2026-08-21T00:00:00.000Z",
  source_snapshot_id: "fixture-snapshot-v2", field_evidence: { identity: { source_url: url, locator: `fixture:${key}` } },
  field_confidence: { identity: 1 }, extraction_provider: "gold_manifest", extraction_run_id: "independent-gold-fixture-v2",
  content_hash: `fixture-content-${key}`, validation_warnings: [],
});
const attributes = (overrides = {}) => ({ dimensions: null, specifications: null, material: null, finish: null, color: null, mounting: null, price: null, currency: null, availability: null, ...overrides });
const relationships = (overrides = {}) => ({ member_of: [], variant_of: [], configured_from: [], component_of: [], ...overrides });

function entity({ manufacturer_id, entity_type, source_identity_key, article = null, title, official_url, registry_category_id, procurement_eligible, links, attrs, image }) {
  const identitySeed = { manufacturer_id, entity_type, source_identity_key };
  const entity_id = buildEntityId(identitySeed);
  const media_id = image ? `${entity_id}:primary` : null;
  return {
    identity: { entity_id, ...identitySeed, article, title, official_url, registry_category_id, procurement_eligible },
    relationships: relationships(links),
    media: { records: image ? [{ media_id, official_url: image, media_type: "image", entity_id, is_primary: true, source_url: official_url, content_hash: `${entity_id}:image-hash` }] : [], primary_image_id: media_id },
    procurement_attributes: attributes(attrs),
    provenance_quality: provenance(official_url, source_identity_key),
  };
}

const modeluxCollection = entity({ manufacturer_id: "modelux", entity_type: "collection", source_identity_key: "collection:fixture-modern", title: "Fixture Modern", official_url: "https://modelux.example/collections/fixture-modern", registry_category_id: "lighting", procurement_eligible: false });
const modeluxSku = entity({ manufacturer_id: "modelux", entity_type: "sellable_item", source_identity_key: "sku:MX-001", article: "MX-001", title: "Fixture Pendant", official_url: "https://modelux.example/products/mx-001", registry_category_id: "lighting.pendants", procurement_eligible: true, links: { member_of: [modeluxCollection.identity.entity_id] }, attrs: { dimensions: { diameter_mm: 400 }, material: ["glass", "metal"], finish: "chrome", color: ["clear", "silver"], mounting: "ceiling" }, image: "https://modelux.example/media/mx-001.jpg" });
const oprimeModel = entity({ manufacturer_id: "oprime", entity_type: "product_model", source_identity_key: "model:OP-M1", title: "Modular Sofa M1", official_url: "https://oprime.example/models/op-m1", registry_category_id: "furniture.seating", procurement_eligible: false, attrs: { material: "upholstery", color: "configurable" }, image: "https://oprime.example/media/op-m1.jpg" });
const oprimeConfiguration = entity({ manufacturer_id: "oprime", entity_type: "configuration", source_identity_key: "configuration:OP-M1-C1", title: "M1 two-module configuration", official_url: "https://oprime.example/configurations/op-m1-c1", registry_category_id: "furniture.seating", procurement_eligible: true, links: { variant_of: [oprimeModel.identity.entity_id] }, attrs: { dimensions: { width_mm: 2200 }, specifications: { required_components: 2 } }, image: "https://oprime.example/media/op-m1-c1.jpg" });
const oprimeComponent = entity({ manufacturer_id: "oprime", entity_type: "component", source_identity_key: "component:OP-M1-ARM-L", article: "OP-M1-ARM-L", title: "M1 left module", official_url: "https://oprime.example/components/op-m1-arm-l", registry_category_id: "furniture.modules", procurement_eligible: true, links: { component_of: [oprimeConfiguration.identity.entity_id] }, attrs: { dimensions: { width_mm: 1100 }, material: "upholstery" }, image: "https://oprime.example/media/op-m1-arm-l.jpg" });
oprimeConfiguration.relationships.configured_from = [{ entity_id: oprimeComponent.identity.entity_id, quantity: 1 }];

export const modeluxGold = { manifest_version: "catalog-entity-v2", catalog_id: "modelux-fixture", role: "simple_sku_truth", live_gold_ready: false, preparation_note: "Structural fixture only; live gold must be collected independently from provider output.", repeatability_identity_match: 1, entities: [modeluxCollection, modeluxSku] };
export const oprimeGold = { manifest_version: "catalog-entity-v2", catalog_id: "oprime-fixture", role: "configurable_hierarchy_stress_test", live_gold_ready: false, preparation_note: "Structural fixture only; no unverified O'PRIME facts are asserted.", repeatability_identity_match: 1, entities: [oprimeModel, oprimeConfiguration, oprimeComponent] };
export const combinedGold = { manifest_version: "catalog-entity-v2", live_gold_ready: false, repeatability_identity_match: 1, entities: [...modeluxGold.entities, ...oprimeGold.entities] };
export const rawProviderFixture = () => ({ entities: structuredClone(combinedGold.entities) });

const mercuryUrl = "https://oprime.ru/modeli/mercury";
const mercuryPdf = "https://oprime.ru/api/files/Catalog/image/ModelLinePage/mercury/%D0%A2%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B5_%D0%BE%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5_%D0%BD%D0%B0_mercury.pdf";
const mercuryModel = entity({ manufacturer_id: "oprime", entity_type: "product_model", source_identity_key: "model:mercury", title: "\u041c\u0415\u0420\u041a\u0423\u0420\u0418", official_url: mercuryUrl, registry_category_id: "furniture.seating", procurement_eligible: false });
const mercuryLeft = entity({ manufacturer_id: "oprime", entity_type: "component", source_identity_key: "component:\u041042\u041b", title: "\u041042\u041b", official_url: mercuryPdf, registry_category_id: "furniture.modules", procurement_eligible: false });
const mercurySeat = entity({ manufacturer_id: "oprime", entity_type: "component", source_identity_key: "component:\u04221\u0421", title: "\u04221\u0421", official_url: mercuryPdf, registry_category_id: "furniture.modules", procurement_eligible: false });
const mercuryRight = entity({ manufacturer_id: "oprime", entity_type: "component", source_identity_key: "component:\u041042\u041f", title: "\u041042\u041f", official_url: mercuryPdf, registry_category_id: "furniture.modules", procurement_eligible: false });
const mercuryConfiguration = entity({ manufacturer_id: "oprime", entity_type: "configuration", source_identity_key: "configuration:\u041042\u041b-\u04221\u0421-\u04221\u0421-\u041042\u041f", title: "\u041042\u041b-\u04221\u0421-\u04221\u0421-\u041042\u041f", official_url: mercuryUrl, registry_category_id: "furniture.seating", procurement_eligible: true, links: { variant_of: [mercuryModel.identity.entity_id], configured_from: [
  { entity_id: mercuryLeft.identity.entity_id, quantity: 1 },
  { entity_id: mercurySeat.identity.entity_id, quantity: 2 },
  { entity_id: mercuryRight.identity.entity_id, quantity: 1 },
] } });
export const oprimeMultiplicityGold = { manifest_version: "catalog-entity-v2", catalog_id: "oprime-mercury-multiplicity-fixture", role: "gold_specific_representation_only", live_gold_ready: false, repeatability_identity_match: 1, entities: [mercuryModel, mercuryLeft, mercurySeat, mercuryRight, mercuryConfiguration] };

const genericA = entity({ manufacturer_id: "fixture-manufacturer", entity_type: "component", source_identity_key: "component:A", title: "COMPONENT-A", official_url: "https://catalog.fixture/components/a", registry_category_id: "fixture.components", procurement_eligible: false });
const genericB = entity({ manufacturer_id: "fixture-manufacturer", entity_type: "component", source_identity_key: "component:B", title: "COMPONENT-B", official_url: "https://catalog.fixture/components/b", registry_category_id: "fixture.components", procurement_eligible: false });
const genericC = entity({ manufacturer_id: "fixture-manufacturer", entity_type: "component", source_identity_key: "component:C", title: "COMPONENT-C", official_url: "https://catalog.fixture/components/c", registry_category_id: "fixture.components", procurement_eligible: false });
const genericConfiguration = entity({ manufacturer_id: "fixture-manufacturer", entity_type: "configuration", source_identity_key: "configuration:CFG-1", title: "CFG-1", official_url: "https://catalog.fixture/configurations/cfg-1", registry_category_id: "fixture.configurations", procurement_eligible: true, links: { configured_from: [
  { entity_id: genericA.identity.entity_id, quantity: 1 },
  { entity_id: genericB.identity.entity_id, quantity: 2 },
  { entity_id: genericC.identity.entity_id, quantity: 1 },
] } });
export const genericMultiplicityGold = { manifest_version: "catalog-entity-v2", catalog_id: "generic-multiplicity-fixture", role: "universal_relationship_fixture", live_gold_ready: false, repeatability_identity_match: 1, entities: [genericA, genericB, genericC, genericConfiguration] };
export const genericMultiplicityRaw = () => ({ entities: structuredClone(genericMultiplicityGold.entities) });
