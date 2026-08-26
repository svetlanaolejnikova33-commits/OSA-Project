/**
 * Provider-neutral mapping from Firecrawl scrape payload to Contract v2 candidates.
 * Uses generic page metadata, URL structure, and linked PDF discovery only.
 * No gold access and no manufacturer-specific extraction rules.
 */

function hostnameManufacturerId(url) {
  try {
    const label = new URL(url).hostname.toLowerCase().split(".")[0];
    return label || null;
  } catch {
    return null;
  }
}

function pathIdentityKey(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
    return `url:${path}`;
  } catch {
    return null;
  }
}

function firstMarkdownH1(markdown) {
  if (typeof markdown !== "string") return null;
  const match = markdown.match(/^#\s+(.+?)\s*$/m);
  return match?.[1]?.trim() || null;
}

function discoverPdfLinks({ links, markdown }) {
  const found = new Set();
  if (Array.isArray(links)) {
    for (const link of links) {
      const href = typeof link === "string" ? link : link?.url ?? link?.href;
      if (typeof href === "string" && /\.pdf(?:\?|#|$)/i.test(href)) found.add(href);
    }
  }
  if (typeof markdown === "string") {
    for (const match of markdown.matchAll(/https?:\/\/[^\s<>\)"]+\.pdf(?:\?[^\s<>\)"]*)?/gi)) {
      found.add(match[0]);
    }
  }
  return [...found];
}

function emptyRelationships() {
  return { member_of: [], variant_of: [], configured_from: [], component_of: [] };
}

function emptyProcurementAttributes() {
  return {
    dimensions: null,
    specifications: null,
    material: null,
    finish: null,
    color: null,
    mounting: null,
    price: null,
    currency: null,
    availability: null,
  };
}

export function mapFirecrawlScrapeToEntities({
  source_url,
  firecrawl,
  extraction_run_id,
  provider_id = "firecrawl",
}) {
  if (!firecrawl?.success || !firecrawl?.data || typeof firecrawl.data !== "object") return [];

  const data = firecrawl.data;
  const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const official_url = metadata.sourceURL || metadata.url || metadata.ogUrl || source_url;
  const title = String(metadata.title || metadata.ogTitle || firstMarkdownH1(data.markdown) || "").trim();
  const manufacturer_id = hostnameManufacturerId(official_url);
  const source_identity_key = pathIdentityKey(official_url);

  if (!title || !official_url || !manufacturer_id || !source_identity_key) return [];

  const pdfs = discoverPdfLinks({ links: data.links, markdown: data.markdown });
  const field_evidence = {
    "identity.title": { source_url: official_url, locator: "firecrawl:metadata.title|markdown.h1" },
    "identity.official_url": { source_url: official_url, locator: "firecrawl:metadata.sourceURL|metadata.url" },
  };
  const field_confidence = {
    "identity.title": metadata.title || metadata.ogTitle ? 0.95 : 0.85,
    "identity.official_url": 1,
  };
  const validation_warnings = [
    "procurement_eligible_not_evidenced",
    "entity_type_default_primary_page",
    "content_hash_unverified",
  ];

  if (pdfs[0]) {
    field_evidence.technical_pdf = { source_url: pdfs[0], locator: "firecrawl:linked_pdf" };
    field_confidence.technical_pdf = 0.9;
  }

  return [{
    identity: {
      manufacturer_id,
      entity_type: "product_model",
      source_identity_key,
      article: null,
      title,
      official_url,
      registry_category_id: null,
      procurement_eligible: false,
    },
    relationships: emptyRelationships(),
    media: { records: [], primary_image_id: null },
    procurement_attributes: emptyProcurementAttributes(),
    provenance_quality: {
      source_url: official_url,
      source_type: "provider_scrape",
      retrieved_at: new Date().toISOString(),
      source_snapshot_id: metadata.scrapeId ? String(metadata.scrapeId) : `firecrawl:${extraction_run_id}`,
      field_evidence,
      field_confidence,
      extraction_provider: provider_id,
      extraction_run_id,
      content_hash: metadata.contentHash ? String(metadata.contentHash) : "unverified:provider_scrape",
      validation_warnings,
    },
  }];
}
