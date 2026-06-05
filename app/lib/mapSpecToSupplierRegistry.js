import {
  getAllRegistryCategoriesFlat,
  getRegistryCategoryById,
  getRegistryParentCategory,
  UNKNOWN_REGISTRY_CATEGORY_ID,
} from "./supplierRegistry";

const EXPLICIT_SYNONYMS = {
  "furniture.sofas": ["диван", "диваны", "sofa", "sectional", "couch"],
  "furniture.armchairs": ["кресло", "кресла", "armchair", "lounge chair"],
  "furniture.beds": ["кровать", "кровати", "bed"],
  "furniture.tables": ["стол", "столы", "table", "coffee table", "dining table"],
  "furniture.chairs": ["стул", "стулья", "chair", "dining chair"],
  "furniture.nightstands": ["тумба", "тумбы", "nightstand", "bedside table"],
  "furniture.wardrobes": ["шкаф", "шкафы", "wardrobe", "closet"],
  "furniture.kitchens": ["кухня", "кухни", "kitchen"],
  "furniture.storage_systems": ["система хранения", "системы хранения", "storage system"],
  "lighting.pendants": ["подвесной", "подвесные", "подвесной свет", "подвесные светильники", "pendant", "pendant light"],
  "lighting.chandeliers": ["люстра", "люстры", "chandelier"],
  "lighting.wall_sconces": ["бра", "sconce", "wall sconce"],
  "lighting.floor_lamps": ["торшер", "торшеры", "floor lamp"],
  "lighting.table_lamps": ["настольная лампа", "настольные лампы", "table lamp"],
  "lighting.track_systems": ["трековая система", "трековые системы", "track light", "track system"],
  "lighting.recessed_lights": ["встроенный светильник", "встроенные светильники", "recessed light", "downlight"],
  "lighting.hidden_led": ["скрытая led", "скрытая подсветка", "hidden led", "led strip"],
  "textile.curtains": ["штора", "шторы", "curtain", "drape"],
  "textile.tulle": ["тюль", "tulle"],
  "textile.rugs": ["ковер", "ковры", "ковёр", "ковры", "rug", "carpet rug"],
  "textile.bedspreads": ["покрывало", "покрывала", "bedspread"],
  "textile.decorative_pillows": ["декоративная подушка", "декоративные подушки", "throw pillow"],
  "textile.upholstery_fabrics": ["обивочная ткань", "обивочные ткани", "upholstery fabric"],
  "textile.textile_panels": ["текстильная панель", "текстильные панели", "textile panel"],
  "floor_finish.porcelain_tile": ["керамогранит", "porcelain", "porcelain tile"],
  "floor_finish.parquet": ["паркет", "parquet"],
  "floor_finish.engineered_board": ["инженерная доска", "engineered board", "engineered wood"],
  "floor_finish.laminate": ["ламинат", "laminate"],
  "floor_finish.microcement": ["микроцемент", "microcement"],
  "floor_finish.concrete": ["бетонный пол", "concrete floor", "concrete"],
  "floor_finish.carpet": ["ковролин", "wall to wall carpet"],
  "wall_finish.wall_panels": ["стеновая панель", "стеновые панели", "wall panel"],
  "wall_finish.brick": ["кирпич", "brick"],
  "wall_finish.stone": ["камень", "stone wall", "stone"],
  "wall_finish.tile": ["плитка", "wall tile", "tile"],
  "wall_finish.mural": ["фреска", "роспись", "mural"],
  "ceiling.painted_ceiling": ["окрашенный потолок", "painted ceiling"],
  "ceiling.stretch_ceiling": ["натяжной потолок", "stretch ceiling"],
  "ceiling.drywall": ["гипсокартон", "drywall", "gypsum board"],
  "ceiling.beams": ["балка", "балки", "beam"],
  "ceiling.moldings_cornices": ["молдинг", "молдинги", "карниз", "карнизы", "cornice", "molding"],
  "ceiling.coffers": ["кессон", "кессоны", "coffer"],
  "ceiling.concrete_ceiling": ["бетонный потолок", "concrete ceiling"],
  "decor.paintings": ["картина", "картины", "painting", "artwork"],
  "decor.mirrors": ["зеркало", "зеркала", "mirror"],
  "decor.vases": ["ваза", "вазы", "vase"],
  "decor.plants": ["растение", "растения", "plant"],
  "decor.sculpture": ["скульптура", "sculpture"],
  "decor.books_accessories": ["книги", "аксессуары", "books", "accessories"],
  "sanitary.sinks": ["раковина", "раковины", "sink", "washbasin"],
  "sanitary.faucets": ["смеситель", "смесители", "faucet", "mixer tap"],
  "sanitary.bathtubs": ["ванна", "ванны", "bathtub"],
  "sanitary.shower_systems": ["душевая система", "душевая", "shower system", "shower"],
  "sanitary.toilets": ["унитаз", "инсталляция", "toilet", "wc"],
  "sanitary.towel_warmers": ["полотенцесушитель", "towel warmer"],
  "appliance.refrigerators": ["холодильник", "refrigerator", "fridge"],
  "appliance.ovens": ["духовой шкаф", "духовка", "oven"],
  "appliance.cooktops": ["варочная панель", "cooktop", "hob"],
  "appliance.hoods": ["вытяжка", "hood", "extractor"],
  "appliance.dishwashers": ["посудомоечная машина", "dishwasher"],
  "appliance.washing_machines": ["стиральная машина", "washing machine"],
  floor_finish: ["отделка пола", "пол", "floor finish", "flooring"],
  wall_finish: [
    "отделка стен",
    "стены",
    "стена",
    "стен",
    "wall finish",
    "настенное покрытие",
    "покрытие стен",
  ],
  "wall_finish.paint": [
    "краска для стен",
    "краска стен",
    "настенная краска",
    "покраска стен",
    "краска",
    "paint",
  ],
  "wall_finish.wallpaper": ["обои", "wallpaper", "настенные обои"],
  "wall_finish.decorative_plaster": ["декоративная штукатурка", "штукатурка стен"],
  ceiling: ["потолок", "потолочные системы", "ceiling"],
  furniture: ["мебель", "furniture"],
  lighting: ["освещение", "свет", "lighting", "light fixture"],
  textile: ["текстиль", "textile", "textiles"],
  decor: ["декор", "decor"],
  sanitary: ["сантехника", "sanitary", "plumbing"],
  appliance: ["техника", "бытовая техника", "appliance", "appliances"],
  doors_partitions: ["двери", "перегородки", "door", "partition"],
  storage: ["хранение", "storage"],
  windows_curtains: ["окна", "окно", "window", "windows"],
  [UNKNOWN_REGISTRY_CATEGORY_ID]: ["прочее", "other", "unknown"],
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я\s/-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function buildAliasIndex() {
  const entries = [];
  for (const row of getAllRegistryCategoriesFlat()) {
    const aliases = new Set([
      normalizeText(row.labelRu),
      normalizeText(row.labelEn),
      ...tokenize(row.labelRu),
      ...tokenize(row.labelEn),
    ]);
    const explicit = EXPLICIT_SYNONYMS[row.id];
    if (Array.isArray(explicit)) {
      for (const alias of explicit) {
        aliases.add(normalizeText(alias));
        for (const token of tokenize(alias)) aliases.add(token);
      }
    }
    entries.push({
      id: row.id,
      aliases: [...aliases].filter(Boolean),
      isChild: Boolean(row.parentId),
    });
  }
  return entries;
}

const ALIAS_INDEX = buildAliasIndex();

const GENERIC_ALIAS_TOKENS = new Set(["wall", "finish", "floor", "стен", "пол"]);

function hasWallFinishContext(text) {
  return /(?:^|\s)(?:стен|стены|стена|wall finish|отделка стен|обои|настенн|краска для стен|покрытие стен|настенное покрытие)/.test(
    text
  );
}

function hasFloorFinishContext(text) {
  return /(?:^|\s)(?:пол|пола|полы|floor finish|отделка пола|flooring|ковролин|паркет|ламинат)/.test(text);
}

function isExcludedCategoryForContext(categoryId, text) {
  const id = typeof categoryId === "string" ? categoryId : "";
  if (hasWallFinishContext(text) && id.startsWith("floor_finish")) return true;
  if (hasFloorFinishContext(text) && id.startsWith("wall_finish")) return true;
  return false;
}

function scoreAliasMatch(text, alias) {
  if (!text || !alias) return 0;
  if (text === alias) return 1;
  if (text.includes(alias) || alias.includes(text)) {
    if (GENERIC_ALIAS_TOKENS.has(alias)) return 0.45;
    return alias.length >= 4 ? 0.9 : 0.75;
  }
  const textTokens = tokenize(text);
  const aliasTokens = tokenize(alias);
  if (!textTokens.length || !aliasTokens.length) return 0;
  const overlap = aliasTokens.filter((token) => textTokens.includes(token)).length;
  if (!overlap) return 0;
  return Math.min(0.85, 0.55 + overlap / aliasTokens.length * 0.3);
}

function matchRegistryCategory(sourceText, contextText = "") {
  const haystack = normalizeText([sourceText, contextText].filter(Boolean).join(" "));
  if (!haystack) return null;

  let best = null;
  for (const entry of ALIAS_INDEX) {
    if (isExcludedCategoryForContext(entry.id, haystack)) continue;
    for (const alias of entry.aliases) {
      const score = scoreAliasMatch(haystack, alias);
      if (!score) continue;
      const weighted = score + (entry.isChild ? 0.05 : 0);
      if (!best || weighted > best.weighted) {
        best = { id: entry.id, confidence: Number(score.toFixed(2)), weighted };
      }
    }
  }
  return best;
}

function createNormalizedGroup(registryCategoryId, sourceText, confidence, item = null) {
  const node = getRegistryCategoryById(registryCategoryId);
  const parent = getRegistryParentCategory(registryCategoryId);
  const resolved = node || getRegistryCategoryById(UNKNOWN_REGISTRY_CATEGORY_ID);
  const resolvedParent = parent || (resolved?.parentId ? getRegistryCategoryById(resolved.parentId) : null);

  return {
    registryCategoryId: resolved?.id || UNKNOWN_REGISTRY_CATEGORY_ID,
    labelRu: resolved?.labelRu || "Неопределённая категория",
    parentLabelRu: resolvedParent?.labelRu || null,
    type: resolved?.type || "construction",
    budgetRole: resolved?.budgetRole || "minor",
    bimRelevant: Boolean(resolved?.bimRelevant),
    skuRelevant: Boolean(resolved?.skuRelevant),
    confidence: Number.isFinite(confidence) ? confidence : 0.4,
    sourceText: typeof sourceText === "string" ? sourceText.trim() : "",
    items: item ? [item] : [],
  };
}

function mergeGroups(target, incoming) {
  target.confidence = Math.max(target.confidence || 0, incoming.confidence || 0);
  if (incoming.sourceText && !target.sourceText) target.sourceText = incoming.sourceText;
  if (incoming.items?.length) {
    const seen = new Set(
      asArray(target.items).map((item) => JSON.stringify(item))
    );
    for (const item of incoming.items) {
      const key = JSON.stringify(item);
      if (seen.has(key)) continue;
      seen.add(key);
      target.items.push(item);
    }
  }
}

function collectSpecificationSources(specificationGroups) {
  const sources = [];
  for (const group of asArray(specificationGroups)) {
    const groupLabel = typeof group?.group === "string" ? group.group : "";
    if (groupLabel) {
      sources.push({ text: groupLabel, context: groupLabel, item: null });
    }
    for (const item of asArray(group?.items)) {
      const parts = [item?.name, item?.category, item?.note, item?.materialGuess, item?.finish]
        .filter((value) => typeof value === "string" && value.trim())
        .join(" ");
      if (!parts) continue;
      sources.push({
        text: parts,
        context: [groupLabel, item?.category].filter(Boolean).join(" "),
        item,
      });
    }
  }
  return sources;
}

function collectCategorySources(categories) {
  const sources = [];
  for (const row of asArray(categories)) {
    const text = typeof row?.category === "string" ? row.category : "";
    const reason = typeof row?.reason === "string" ? row.reason : "";
    if (!text && !reason) continue;
    sources.push({
      text: [text, reason].filter(Boolean).join(" "),
      context: text,
      item: row,
    });
  }
  return sources;
}

export function mapSpecToSupplierRegistry(input = {}) {
  const specAnalysis = input?.specAnalysis || input || {};
  const specificationGroups = asArray(input?.specificationGroups ?? specAnalysis?.specificationGroups);
  const productCategories = asArray(input?.productCategories ?? specAnalysis?.productCategories);
  const supplierCategories = asArray(input?.supplierCategories ?? specAnalysis?.supplierCategories);

  const sources = [
    ...collectSpecificationSources(specificationGroups),
    ...collectCategorySources(productCategories),
    ...collectCategorySources(supplierCategories),
  ];

  const grouped = new Map();
  for (const source of sources) {
    const match = matchRegistryCategory(source.text, source.context);
    const registryCategoryId = match?.id || UNKNOWN_REGISTRY_CATEGORY_ID;
    const normalized = createNormalizedGroup(
      registryCategoryId,
      source.text,
      match?.confidence || 0.4,
      source.item
    );
    const existing = grouped.get(normalized.registryCategoryId);
    if (!existing) {
      grouped.set(normalized.registryCategoryId, normalized);
      continue;
    }
    mergeGroups(existing, normalized);
  }

  let normalizedSpecGroups = [...grouped.values()].sort((left, right) => {
    const parentCompare = String(left.parentLabelRu || left.labelRu || "").localeCompare(
      String(right.parentLabelRu || right.labelRu || ""),
      "ru"
    );
    if (parentCompare !== 0) return parentCompare;
    return String(left.labelRu || "").localeCompare(String(right.labelRu || ""), "ru");
  });

  if (!normalizedSpecGroups.length && sources.length) {
    const unknownGroups = new Map();
    for (const source of sources) {
      const sourceText = typeof source.text === "string" ? source.text.trim() : "";
      if (!sourceText) continue;
      const key = normalizeText(sourceText);
      if (!key || unknownGroups.has(key)) continue;
      unknownGroups.set(
        key,
        createNormalizedGroup(UNKNOWN_REGISTRY_CATEGORY_ID, sourceText, 0.4, source.item)
      );
    }
    normalizedSpecGroups = [...unknownGroups.values()];
  }

  return { normalizedSpecGroups };
}
