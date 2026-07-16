/**
 * Mock manufacturer catalog cards for Phase #3 CCN (no live browsing).
 * Attributes align with Vision JSON fields for deterministic matching.
 */

/** @typedef {{
 *   article: string,
 *   title: string,
 *   price: number,
 *   currency: string,
 *   url: string,
 *   specifications: Record<string, string>,
 *   category: string,
 *   mounting: string,
 *   material: string,
 *   finish: string,
 *   style: string,
 *   shape: string,
 * }} MockProductCard */

/** @type {Record<string, MockProductCard[]>} */
export const MOCK_CATALOG_BY_MANUFACTURER = Object.freeze({
  flos: Object.freeze([
    Object.freeze({
      article: "FLOS-AIM-AB",
      title: "Aim Pendant — Aged Brass",
      price: 890,
      currency: "EUR",
      url: "https://example.com/flos/aim-aged-brass",
      specifications: Object.freeze({
        diameter_mm: "170",
        lamp: "LED",
        ip: "20",
      }),
      category: "pendant light",
      mounting: "ceiling",
      material: "brass",
      finish: "aged brass",
      style: "modern",
      shape: "cylindrical",
    }),
    Object.freeze({
      article: "FLOS-STRING-AB",
      title: "String Light Pendant — Aged Brass Cylinder",
      price: 910,
      currency: "EUR",
      url: "https://example.com/flos/string-aged-brass",
      specifications: Object.freeze({
        diameter_mm: "160",
        lamp: "LED",
        ip: "20",
      }),
      category: "pendant light",
      mounting: "ceiling",
      material: "brass",
      finish: "aged brass",
      style: "modern",
      shape: "cylindrical",
    }),
    Object.freeze({
      article: "FLOS-IC-C-W1",
      title: "IC Lights Wall C/W1 — Chrome",
      price: 420,
      currency: "EUR",
      url: "https://example.com/flos/ic-wall-chrome",
      specifications: Object.freeze({
        diameter_mm: "200",
        lamp: "G9",
        ip: "20",
      }),
      category: "wall light",
      mounting: "wall",
      material: "metal",
      finish: "chrome",
      style: "modern",
      shape: "spherical",
    }),
    Object.freeze({
      article: "FLOS-GLO-BALL-F",
      title: "Glo-Ball Floor — Opal Glass",
      price: 760,
      currency: "EUR",
      url: "https://example.com/flos/glo-ball-floor",
      specifications: Object.freeze({
        height_mm: "1700",
        lamp: "E27",
        ip: "20",
      }),
      category: "floor lamp",
      mounting: "floor",
      material: "glass",
      finish: "opal white",
      style: "minimal",
      shape: "spherical",
    }),
  ]),

  modelux: Object.freeze([
    Object.freeze({
      article: "MD.8024.01FL",
      title: "Modelux Modemodern Floor Lamp — Aged Brass",
      price: 45900,
      currency: "RUB",
      url: "https://modelux.ru/catalog/product/md-8024-01fl",
      specifications: Object.freeze({
        height_mm: "1650",
        shade: "fabric",
        lamp: "E27",
      }),
      category: "floor lamp",
      mounting: "floor",
      material: "brass",
      finish: "aged brass",
      style: "modern",
      shape: "cylindrical",
    }),
    Object.freeze({
      article: "MD.6102.AB",
      title: "Modelux Pendant Cylinder — Aged Brass",
      price: 28700,
      currency: "RUB",
      url: "https://modelux.ru/catalog/product/md-6102-ab",
      specifications: Object.freeze({
        diameter_mm: "120",
        lamp: "LED",
        ip: "20",
      }),
      category: "pendant light",
      mounting: "ceiling",
      material: "brass",
      finish: "aged brass",
      style: "modern",
      shape: "cylindrical",
    }),
    Object.freeze({
      article: "MD.4401.BK",
      title: "Modelux Wall Sconce — Matte Black",
      price: 15400,
      currency: "RUB",
      url: "https://modelux.ru/catalog/product/md-4401-bk",
      specifications: Object.freeze({
        width_mm: "280",
        lamp: "LED",
        ip: "20",
      }),
      category: "wall light",
      mounting: "wall",
      material: "metal",
      finish: "matte black",
      style: "contemporary",
      shape: "linear",
    }),
  ]),

  artemide: Object.freeze([
    Object.freeze({
      article: "ART-NH-PENDANT-BR",
      title: "nh Pendant — Brushed Brass",
      price: 510,
      currency: "EUR",
      url: "https://example.com/artemide/nh-pendant-brass",
      specifications: Object.freeze({
        diameter_mm: "350",
        lamp: "E27",
        ip: "20",
      }),
      category: "pendant light",
      mounting: "ceiling",
      material: "brass",
      finish: "brushed brass",
      style: "modern",
      shape: "spherical",
    }),
    Object.freeze({
      article: "ART-TOLOMEO-TAVOLO",
      title: "Tolomeo Tavolo — Aluminum",
      price: 390,
      currency: "EUR",
      url: "https://example.com/artemide/tolomeo-tavolo",
      specifications: Object.freeze({
        reach_mm: "720",
        lamp: "E27",
        ip: "20",
      }),
      category: "table lamp",
      mounting: "table",
      material: "aluminum",
      finish: "satin aluminum",
      style: "technical",
      shape: "articulated",
    }),
    Object.freeze({
      article: "ART-GODDESS-PENDANT",
      title: "Goddess Pendant — Aged Brass Cylinder",
      price: 680,
      currency: "EUR",
      url: "https://example.com/artemide/goddess-pendant-aged-brass",
      specifications: Object.freeze({
        height_mm: "280",
        lamp: "LED",
        ip: "20",
      }),
      category: "pendant light",
      mounting: "ceiling",
      material: "brass",
      finish: "aged brass",
      style: "modern",
      shape: "cylindrical",
    }),
  ]),
});

/**
 * @param {string} manufacturerId
 * @returns {MockProductCard[]}
 */
export function getMockCatalogProducts(manufacturerId) {
  const id = typeof manufacturerId === "string" ? manufacturerId.trim().toLowerCase() : "";
  const products = MOCK_CATALOG_BY_MANUFACTURER[id];
  return products ? products.map((product) => ({ ...product, specifications: { ...product.specifications } })) : [];
}
