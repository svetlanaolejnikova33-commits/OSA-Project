import { runChiefCatalogNavigator } from "../../../app/lib/ccn/chiefCatalogNavigator.js";
import { resolveManufacturerCatalog } from "../../../app/lib/ccn/resolveManufacturerCatalog.js";
import {
  assertRegistryDomain,
  resolveCatalogUrlForVision,
} from "../../../app/lib/ccn/live/resolveLiveTarget.js";
import { normalizeEvidenceCandidates } from "../../../app/lib/evidence/normalizeEvidenceCandidates.js";
import { resolveModeluxCatalogUrl } from "../../../app/lib/registry/fetchRegistryVisualCatalog.js";
import { setRegistryCache } from "../../../app/lib/registry/registryCache.js";
import {
  getOfficialSourceBinding,
  normalizeManufacturerRegistryRecord,
  resolveManufacturer,
  resolveManufacturerByDomain,
  resolveManufacturerFromText,
  resolveOfficialCatalogUrl,
} from "../../../app/lib/registry/manufacturerRegistry.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const byId = resolveManufacturer("modelux");
assert(byId?.manufacturer_id === "modelux", "id: Modelux Registry row");
assert(byId.website === "https://modelux.ru", "id: official website");
assert(byId.allowed_domains.includes("modelux.ru"), "id: allowed official domain");

const byAlias = resolveManufacturer("Моделюкс");
assert(byAlias?.manufacturer_id === "modelux", "alias: Registry resolution");
assert(resolveManufacturerFromText("Подвесной светильник Modelight")?.manufacturer_id === "modelux", "text alias");

const byDomain = resolveManufacturerByDomain("https://www.modelux.ru/catalog/item");
assert(byDomain?.manufacturer_id === "modelux", "domain: Registry resolution");
assert(resolveManufacturerByDomain("https://example.com/flos") === null, "placeholder is not official");

const pendantUrl = resolveOfficialCatalogUrl(byId, "lighting.pendants");
const floorUrl = resolveOfficialCatalogUrl(byId, "floor");
assert(pendantUrl === "https://modelux.ru/catalog/podvesnoi-svetilnik", "category: pendant binding");
assert(floorUrl === "https://modelux.ru/catalog/napolnyi-svetilnik", "category: floor binding");
assert(resolveModeluxCatalogUrl("lighting.pendants") === pendantUrl, "adapter reads Registry binding");
assert(
  resolveCatalogUrlForVision(byId, { category: "floor lamp", mounting: "floor" }) === floorUrl,
  "CCN live reads category binding",
);
assert(assertRegistryDomain(byId, "https://cdn.modelux.ru/product/1"), "CCN accepts official subdomain");
assert(!assertRegistryDomain(byId, "https://marketplace.example/product/1"), "CCN rejects foreign domain");

const ccnBinding = resolveManufacturerCatalog("modelux");
assert(ccnBinding?.catalog_url === byId.catalog_url, "CCN façade shares binding");

const evidence = normalizeEvidenceCandidates([
  {
    title: "Modelux pendant",
    page_url: "https://modelux.ru/catalog/product/md-6102-ab",
    image_url: "https://modelux.ru/storage/md-6102-ab.jpg",
    domain: "modelux.ru",
    brand_raw: "Modelux",
    position: 1,
  },
]);
assert(evidence.length === 1, "Evidence: Registry candidate");
assert(evidence[0].manufacturer_id === "modelux", "Evidence: same manufacturer_id");

const ccn = runChiefCatalogNavigator({
  manufacturer_id: evidence[0].manufacturer_id,
  vision: {
    category: "pendant light",
    mounting: "ceiling",
    material: "brass",
    finish: "aged brass",
    style: "modern",
    shape: "cylindrical",
    confidence: 0.93,
  },
});
assert(ccn.ok === true, "Evidence → Registry → CCN");
assert(ccn.product?.article === "MD.6102.AB", "CCN official product fixture");

const runtimeBinding = normalizeManufacturerRegistryRecord({
  id: "acme-lighting",
  brandName: "Acme Lighting",
  website: "https://acme-lighting.test",
  categoryIds: ["lighting"],
  sourceLinks: {
    collections: "https://acme-lighting.test/catalog",
    priceList: "https://acme-lighting.test/stock.xml",
    categoryCatalogs: {
      pendant: "https://acme-lighting.test/catalog/pendants",
    },
  },
});
assert(runtimeBinding?.manufacturer_id === "acme_lighting", "generic row: normalized id");
assert(runtimeBinding.sources.price_list.endsWith("stock.xml"), "runtime price-list source");
assert(
  resolveOfficialCatalogUrl(runtimeBinding, "pendant") === "https://acme-lighting.test/catalog/pendants",
  "generic row: category catalog without brand branch",
);
setRegistryCache({
  manufacturers: [{
    id: "acme-lighting",
    brandName: "Acme Lighting",
    website: "https://acme-lighting.test",
    categoryIds: ["lighting"],
    sourceLinks: {
      collections: "https://acme-lighting.test/catalog",
      priceList: "https://acme-lighting.test/stock.xml",
    },
  }],
});
assert(resolveManufacturer("acme-lighting")?.manufacturer_id === "acme_lighting", "runtime row is Registry-readable");

const unknown = getOfficialSourceBinding("manufacturer-not-registered");
assert(unknown === null, "unknown manufacturer returns null");

console.log(JSON.stringify({
  ok: true,
  cases: {
    by_id: byId.manufacturer_id,
    by_alias: byAlias.manufacturer_id,
    by_domain: byDomain.manufacturer_id,
    placeholder_official: false,
    pendant_catalog: pendantUrl,
    floor_catalog: floorUrl,
    evidence_candidate: evidence[0].manufacturer_id,
    ccn_article: ccn.product.article,
    runtime_price_list: runtimeBinding.sources.price_list,
    generic_catalog: resolveOfficialCatalogUrl(runtimeBinding, "pendant"),
    unknown,
  },
}, null, 2));
