function placeholderSourceLinks() {
  return {
    collections: "https://example.com/collections",
    catalogPdf: "https://example.com/catalog.pdf",
    priceList: "https://example.com/pricelist",
    mediaLibrary: "https://example.com/media",
    technicalData: "https://example.com/technical",
    bim: "https://example.com/bim",
    models3d: "https://example.com/3d-models",
    api: "https://example.com/api",
  };
}

function placeholderUpdatePolicy(notes = "") {
  return {
    updateFrequency: "quarterly",
    hasArchive: true,
    archiveStrategy: "versioned-collections",
    notes: notes || "Demo placeholder policy. No live supplier sync.",
  };
}

function brand({
  id,
  brandName,
  categoryIds,
  segment,
  status = "active",
  notes = "",
}) {
  return {
    id,
    brandName,
    categoryIds,
    segment,
    sourceLinks: placeholderSourceLinks(),
    updatePolicy: placeholderUpdatePolicy(notes),
    status,
  };
}

function supplier({ id, supplierName, country, website, brands }) {
  return {
    id,
    supplierName,
    country,
    website,
    brands,
  };
}

export const SUPPLIER_SOURCES = [
  supplier({
    id: "flos",
    supplierName: "FLOS",
    country: "Italy",
    website: "https://example.com/flos",
    brands: [
      brand({
        id: "flos",
        brandName: "FLOS",
        categoryIds: ["lighting", "lighting.pendants", "lighting.chandeliers", "lighting.wall_sconces"],
        segment: "luxury",
      }),
    ],
  }),
  supplier({
    id: "vitra",
    supplierName: "Vitra",
    country: "Switzerland",
    website: "https://example.com/vitra",
    brands: [
      brand({
        id: "vitra",
        brandName: "Vitra",
        categoryIds: ["furniture", "furniture.chairs", "furniture.tables", "furniture.storage_systems"],
        segment: "premium",
      }),
    ],
  }),
  supplier({
    id: "minotti",
    supplierName: "Minotti",
    country: "Italy",
    website: "https://example.com/minotti",
    brands: [
      brand({
        id: "minotti",
        brandName: "Minotti",
        categoryIds: ["furniture", "furniture.sofas", "furniture.armchairs", "furniture.tables"],
        segment: "luxury",
      }),
    ],
  }),
  supplier({
    id: "porcelanosa",
    supplierName: "Porcelanosa",
    country: "Spain",
    website: "https://example.com/porcelanosa",
    brands: [
      brand({
        id: "porcelanosa",
        brandName: "Porcelanosa",
        categoryIds: [
          "wall_finish",
          "wall_finish.tile",
          "wall_finish.stone",
          "floor_finish",
          "floor_finish.porcelain_tile",
          "sanitary",
          "sanitary.sinks",
          "sanitary.bathtubs",
        ],
        segment: "premium",
      }),
    ],
  }),
  supplier({
    id: "grohe",
    supplierName: "Grohe",
    country: "Germany",
    website: "https://example.com/grohe",
    brands: [
      brand({
        id: "grohe",
        brandName: "Grohe",
        categoryIds: ["sanitary", "sanitary.faucets", "sanitary.shower_systems", "sanitary.sinks"],
        segment: "premium",
      }),
    ],
  }),
  supplier({
    id: "artemide",
    supplierName: "Artemide",
    country: "Italy",
    website: "https://example.com/artemide",
    brands: [
      brand({
        id: "artemide",
        brandName: "Artemide",
        categoryIds: ["lighting", "lighting.pendants", "lighting.table_lamps", "lighting.floor_lamps"],
        segment: "premium",
      }),
    ],
  }),
  supplier({
    id: "vibia",
    supplierName: "Vibia",
    country: "Spain",
    website: "https://example.com/vibia",
    brands: [
      brand({
        id: "vibia",
        brandName: "Vibia",
        categoryIds: ["lighting", "lighting.pendants", "lighting.wall_sconces", "lighting.hidden_led"],
        segment: "premium",
      }),
    ],
  }),
  supplier({
    id: "bb_italia",
    supplierName: "B&B Italia",
    country: "Italy",
    website: "https://example.com/bb-italia",
    brands: [
      brand({
        id: "bb_italia",
        brandName: "B&B Italia",
        categoryIds: ["furniture", "furniture.sofas", "furniture.armchairs", "furniture.beds"],
        segment: "luxury",
      }),
    ],
  }),
  supplier({
    id: "flexform",
    supplierName: "Flexform",
    country: "Italy",
    website: "https://example.com/flexform",
    brands: [
      brand({
        id: "flexform",
        brandName: "Flexform",
        categoryIds: ["furniture", "furniture.sofas", "furniture.armchairs", "textile.upholstery_fabrics"],
        segment: "luxury",
      }),
    ],
  }),
  supplier({
    id: "atlas_concorde",
    supplierName: "Atlas Concorde",
    country: "Italy",
    website: "https://example.com/atlas-concorde",
    brands: [
      brand({
        id: "atlas_concorde",
        brandName: "Atlas Concorde",
        categoryIds: [
          "floor_finish",
          "floor_finish.porcelain_tile",
          "wall_finish",
          "wall_finish.tile",
          "wall_finish.stone",
        ],
        segment: "premium",
      }),
    ],
  }),
];

export function getAllSupplierBrands() {
  const rows = [];
  for (const source of SUPPLIER_SOURCES) {
    for (const entry of source.brands || []) {
      rows.push({
        ...entry,
        supplierId: source.id,
        supplierName: source.supplierName,
        country: source.country,
        website: source.website,
      });
    }
  }
  return rows;
}
