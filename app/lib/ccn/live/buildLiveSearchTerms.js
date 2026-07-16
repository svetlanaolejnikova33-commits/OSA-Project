/**
 * Build on-site search terms from Rich Vision JSON.
 * Never includes manufacturer article, price, or catalog URL.
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function unique(values, limit = 16) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = asString(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

const CATEGORY_TERMS = Object.freeze({
  "floor lamp": ["торшер", "напольный светильник", "floor lamp"],
  "pendant light": ["подвесной светильник", "pendant"],
  "wall lamp": ["бра", "настенный светильник", "wall lamp"],
  "table lamp": ["настольный светильник", "table lamp"],
});

/**
 * @param {import("../../visionJsonContract").VisionJson} vision
 * @returns {{
 *   primaryQuery: string,
 *   secondaryQueries: string[],
 *   tokens: string[],
 *   negativeTokens: string[],
 * }}
 */
export function buildLiveSearchTerms(vision) {
  const source = vision && typeof vision === "object" ? vision : {};
  const category = asString(source.category).toLowerCase();
  const categoryTerms = CATEGORY_TERMS[category] || [asString(source.category)].filter(Boolean);

  const tokens = unique([
    ...categoryTerms,
    asString(source.subtype),
    asString(source.construction),
    asString(source.silhouette),
    asString(source.material),
    asString(source.finish),
    ...asList(source.distinctive_features),
    ...asList(source.functional_elements),
    ...asList(source.search_constraints),
  ]);

  // Prefer Russian site vocabulary for Modelux-like catalogs.
  const localized = unique([
    ...categoryTerms,
    /aged brass|состарен/i.test(tokens.join(" ")) ? "латунь" : "",
    /brass|латун/i.test(tokens.join(" ")) ? "латунь" : "",
    /side table|столик|integrated/i.test(tokens.join(" ")) ? "столик" : "",
    /textile|абажур|shade/i.test(tokens.join(" ")) ? "абажур" : "",
    /articulated|swing|поворот/i.test(tokens.join(" ")) ? "поворотный" : "",
    asString(source.finish),
    asString(source.material),
  ]);

  const negativeTokens = unique([
    ...asList(source.negative_constraints),
    /floor/i.test(category) ? "подвесной" : "",
    /floor/i.test(category) ? "потолочный" : "",
    /pendant|ceiling/i.test(category) ? "торшер" : "",
  ]);

  const primaryQuery = localized.slice(0, 4).join(" ").trim() || tokens.slice(0, 4).join(" ");
  const secondaryQueries = unique([
    localized.slice(0, 3).join(" "),
    [...categoryTerms.slice(0, 1), ...localized.filter((t) => t === "столик" || t === "латунь")].join(" "),
    tokens.slice(0, 3).join(" "),
  ]).filter((q) => q && q !== primaryQuery);

  return {
    primaryQuery,
    secondaryQueries,
    tokens,
    negativeTokens,
  };
}
