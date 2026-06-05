import { getCategoryIdsForSheet, LIGHTING_SHEET_NAME } from "./categoryBridge";

const COLUMN_ALIASES = {
  id: ["id"],
  brand: ["бренд", "brand"],
  segment: ["сегмент", "segment"],
  website: ["сайт", "website"],
  catalog: ["каталоги", "catalog", "catalogs"],
  priceList: ["прайсы", "prices", "price"],
  bim: ["3d", "bim"],
  media: ["медиа", "media"],
  status: ["статус", "status"],
  country: ["страна бренда", "страна", "country"],
  dealer: ["дилер", "dealer"],
};

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildHeaderIndex(headerRow) {
  const index = {};
  for (let i = 0; i < headerRow.length; i += 1) {
    const cell = normalizeHeader(headerRow[i]);
    if (!cell) continue;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((alias) => cell === alias || cell.includes(alias))) {
        if (index[field] === undefined) index[field] = i;
      }
    }
  }
  return index;
}

function cell(row, index, field) {
  const i = index[field];
  if (i === undefined) return "";
  return typeof row[i] === "string" ? row[i].trim() : String(row[i] ?? "").trim();
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function slugifyBrand(brandName, rowIndex) {
  const latin = String(brandName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (latin.length >= 2) return latin;
  const cyrillic = String(brandName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "");
  return cyrillic || `row-${rowIndex}`;
}

function normalizeSegment(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "medium";
  if (value.includes("premium") || value.includes("премиум") || value.includes("luxury")) return "premium";
  if (value.includes("econom") || value.includes("эконом") || value.includes("budget")) return "economy";
  if (value.includes("medium") || value.includes("медиум") || value.includes("средн")) return "medium";
  return value;
}

function normalizeStatus(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "active";
  if (value === "inactive" || value === "неактив" || value === "архив") return "inactive";
  return "active";
}

function buildSourceLinks({ website, catalog, priceList, bim, media }) {
  return {
    collections: catalog || website || "",
    catalogPdf: catalog || "",
    priceList: priceList || "",
    mediaLibrary: media || "",
    technicalData: website || "",
    bim: bim || "",
    models3d: bim || "",
    api: "",
  };
}

/**
 * @param {string[][]} rows - raw sheet rows including header
 * @param {{ sheetName?: string }} options
 */
export function normalizeLightingSheetRows(rows, options = {}) {
  const sheetName = options.sheetName || LIGHTING_SHEET_NAME;
  const categoryIds = getCategoryIdsForSheet(sheetName);
  if (!Array.isArray(rows) || rows.length < 2) {
    return { manufacturers: [], skipped: 0 };
  }

  const headerIndex = buildHeaderIndex(rows[0]);
  const manufacturers = [];
  let skipped = 0;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) {
      skipped += 1;
      continue;
    }

    const brandName = cell(row, headerIndex, "brand");
    const website = cell(row, headerIndex, "website");
    const catalog = cell(row, headerIndex, "catalog");

    if (!brandName) {
      if (looksLikeUrl(website) || looksLikeUrl(catalog)) skipped += 1;
      continue;
    }

    if (brandName.startsWith("http")) {
      skipped += 1;
      continue;
    }

    const status = normalizeStatus(cell(row, headerIndex, "status"));
    if (status === "inactive") {
      skipped += 1;
      continue;
    }

    const runtimeId = slugifyBrand(brandName, rowIndex);
    const segment = normalizeSegment(cell(row, headerIndex, "segment"));
    const country = cell(row, headerIndex, "country");
    const dealer = cell(row, headerIndex, "dealer");
    const sourceLinks = buildSourceLinks({
      website,
      catalog,
      priceList: cell(row, headerIndex, "priceList"),
      bim: cell(row, headerIndex, "bim"),
      media: cell(row, headerIndex, "media"),
    });

    manufacturers.push({
      id: runtimeId,
      supplierName: brandName,
      brandName,
      country,
      website: website || sourceLinks.collections || "",
      segment,
      status,
      dealer,
      categoryIds,
      sourceLinks,
      sheetName,
      rowIndex: rowIndex + 1,
    });
  }

  return { manufacturers, skipped };
}
