import { createHash } from "crypto";
import { fetchModeluxHtmlCatalogProducts } from "../fetchRegistryVisualCatalog.js";
import { getOfficialSourceBinding } from "../manufacturerRegistry.js";

function extractOfficialArticle(product) {
  const existing = typeof product?.sku === "string" ? product.sku.trim() : "";
  if (existing) return existing;
  const title = typeof product?.productName === "string" ? product.productName : "";
  return title.match(/\b(?:MDL|ML|MS)\.[A-Z0-9.]+(?:\s+[A-Z]{1,4}(?:-[A-Z]{1,4})?)?/i)?.[0]?.trim().toUpperCase() || "";
}

export function createModeluxOfficialCatalogAdapter({ registryCategoryId = "lighting.pendants", limit = 24 } = {}) {
  return Object.freeze({
    adapter_id: "modelux-official-catalog-v1",
    async fetchSnapshot() {
      const binding = getOfficialSourceBinding("modelux");
      if (!binding) throw new Error("Modelux is not registered.");
      const liveProducts = await fetchModeluxHtmlCatalogProducts({ registryCategoryId, limit });
      const products = liveProducts
        .map((product) => ({ ...product, sku: extractOfficialArticle(product) }))
        .filter((product) => product.sku && product.productUrl && product.imageUrl);
      if (!products.length) throw new Error("Live Official Catalog returned no indexable real products.");
      const digest = createHash("sha256").update(JSON.stringify(products)).digest("hex").slice(0, 16);
      return {
        manufacturer_id: binding.manufacturer_id,
        source_snapshot_id: `modelux-live-html-${digest}`,
        source_adapter_id: "modelux-official-catalog-v1",
        source_path: "modelux_html_catalog",
        products,
      };
    },
  });
}
