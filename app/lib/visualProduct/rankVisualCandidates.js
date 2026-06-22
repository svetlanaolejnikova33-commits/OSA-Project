import { mapSpecToSupplierRegistry } from "../mapSpecToSupplierRegistry";
import { resolveSceneObjectTypeFromSceneGraph } from "../sceneObjectRegistryRouting";
import { buildVisualFingerprint, visualSimilarityScore } from "./visualFingerprint";

const VISUAL_CANDIDATE_LIMIT = 10;

const TYPE_WEIGHT = 35;
const STYLE_WEIGHT = 25;
const MATERIAL_WEIGHT = 15;
const COLOR_WEIGHT = 15;
const ROOM_WEIGHT = 10;
const FLOOR_LAMP_FEATURE_CAP = 45;
const WRONG_FIXTURE_PENALTY_CAP = 60;

const TYPE_SYNONYMS = {
  floor_lamp: [
    "торшер",
    "торшеры",
    "напольный светильник",
    "напольная лампа",
    "floor lamp",
    "floor lamps",
    "напольн",
    "napolnyi",
    "napolny",
  ],
  подвесной: ["подвес", "подвесн", "pendant", "podves"],
  люстра: ["люстр", "chandelier", "lustra", "ceiling light"],
  бра: ["бра", "sconce", "wall light", "настенн"],
};

const STYLE_SYNONYMS = {
  modern: ["modern", "современ", "contemporary", "актуальн"],
  minimal: ["minimal", "минимал", "лаконич", "clean"],
  classic: ["classic", "классик", "traditional", "неокласс"],
  scandi: ["scandi", "сканди", "nordic", "север"],
  loft: ["loft", "лофт", "industrial", "индустри"],
  artdeco: ["art deco", "арт-деко", "арт деко", "ар-деко", "deco"],
};

const FLOOR_LAMP_FEATURE_BOOSTS = [
  { tokens: ["торшер"], weight: 14, reason: "торшер в названии" },
  { tokens: ["напольный светильник", "напольн", "napolnyi", "napolny"], weight: 12, reason: "напольный светильник" },
  { tokens: ["floor lamp"], weight: 12, reason: "floor lamp" },
  { tokens: ["gold", "золот", "golden"], weight: 10, reason: "золотая отделка" },
  { tokens: ["brass", "латун", "бронз", "bronze"], weight: 10, reason: "латунь / brass" },
  { tokens: ["абажур", "shade", "lampshade"], weight: 9, reason: "абажур" },
  { tokens: ["ткан", "fabric", "textile", "linen", "бархат", "velvet"], weight: 8, reason: "тканевый абажур" },
  { tokens: ["столик", "tray", "table"], weight: 5, reason: "столик / tray" },
  { tokens: ["art deco", "арт-деко", "арт деко", "ар-деко"], weight: 8, reason: "арт-деко" },
  { tokens: ["современ", "contemporary", "modern"], weight: 6, reason: "современный стиль" },
  { tokens: ["warm", "тепл", "warm white"], weight: 4, reason: "тёплый свет" },
  { tokens: ["slim", "тонк", "узк", "vertical", "вертикал"], weight: 4, reason: "тонкая вертикальная форма" },
];

const WRONG_FIXTURE_PENALTIES = [
  { tokens: ["подвес", "pendant", "podves"], penalty: 45, reason: "подвесной (не торшер)" },
  { tokens: ["люстр", "chandelier", "lustre"], penalty: 45, reason: "люстра" },
  { tokens: ["потолоч", "ceiling mount", "ceiling lamp"], penalty: 40, reason: "потолочный" },
  { tokens: ["настен", "бра", "sconce", "wall light", "wall lamp"], penalty: 40, reason: "настенный / бра" },
  { tokens: ["треков", "track light", "track system"], penalty: 40, reason: "трековый" },
];

const MATERIAL_SYNONYMS = {
  metal: ["metal", "металл", "steel", "сталь", "алюмин", "alumin"],
  glass: ["glass", "стекл", "crystal", "хрустал"],
  wood: ["wood", "дерев", "дуб", "oak", "walnut", "орех"],
  stone: ["stone", "камень", "marble", "мрамор", "granite"],
  fabric: ["fabric", "ткан", "textile", "текстил", "linen", "лен"],
};

const COLOR_SYNONYMS = {
  gold: ["gold", "золот", "golden", "champagne"],
  black: ["black", "черн", "bk", "graphite", "графит", "темн"],
  white: ["white", "бел", "ivory", "слонов", "cream", "крем", "светл"],
  brass: ["brass", "латун", "bronze", "бронз"],
  silver: ["silver", "серебр", "chrome", "хром", "nickel", "никел", "bs"],
};

const ROOM_SYNONYMS = {
  living_room: ["living", "гостин", "lounge", "столов", "dining", "зал"],
  bedroom: ["bedroom", "спальн", "sleep"],
  kitchen: ["kitchen", "кухн", "кухон"],
};

const TYPE_REASON_LABELS = {
  floor_lamp: "торшер",
  подвесной: "подвесной светильник",
  люстра: "люстра",
  бра: "бра",
};

const STYLE_REASON_LABELS = {
  modern: "современный стиль",
  minimal: "минимализм",
  classic: "классический стиль",
  scandi: "скандинавский стиль",
  loft: "лофт-стиль",
  artdeco: "арт-деко",
};

const MATERIAL_REASON_LABELS = {
  metal: "металл",
  glass: "стекло",
  wood: "дерево",
  stone: "камень",
  fabric: "ткань",
};

const COLOR_REASON_LABELS = {
  gold: "золотая отделка",
  black: "тёмная палитра",
  white: "светлая палитра",
  brass: "латунь",
  silver: "серебряный металл",
};

const ROOM_REASON_LABELS = {
  living_room: "гостиная / столовая",
  bedroom: "спальня",
  kitchen: "кухня",
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value) {
  return asString(value).toLowerCase().replace(/\s+/g, " ");
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function textMatchesAny(text, synonyms) {
  const haystack = normalizeText(text);
  if (!haystack) return false;
  return synonyms.some((token) => haystack.includes(normalizeText(token)));
}

function collectMaterialStrings(materialAnalysis) {
  const rows = [];
  if (!materialAnalysis || typeof materialAnalysis !== "object") return rows;

  for (const [bucket, items] of Object.entries(materialAnalysis)) {
    rows.push(bucket);
    for (const item of asArray(items)) {
      rows.push(
        item?.materialGuess,
        item?.finish,
        item?.nameRu,
        item?.labelRu,
        item?.type,
        item?.tone,
      );
    }
  }
  return rows.filter(Boolean);
}

function collectLightingStrings(semanticDraft) {
  const rows = [];
  const pro = semanticDraft?.proAnalysis || {};
  const spec = semanticDraft?.specAnalysis || {};

  for (const item of asArray(pro.lightingAnalysis?.artificialLight)) {
    rows.push(item?.type, item?.labelRu, item?.descriptionRu, item?.fixtureType);
  }

  for (const group of asArray(spec.specificationGroups)) {
    if (!normalizeText(group?.group).includes("освещ")) continue;
    for (const item of asArray(group?.items)) {
      rows.push(item?.name, item?.category, item?.note, item?.materialGuess);
    }
  }

  for (const obj of asArray(semanticDraft?.sceneGraph?.objects)) {
    const categoryId = asString(obj?.categoryId || obj?.supplierCategoryId);
    if (!categoryId.startsWith("lighting")) continue;
    rows.push(obj?.type, obj?.labelRu, obj?.materialGuess, categoryId);
  }

  return rows.filter(Boolean);
}

function detectTypes(corpus) {
  const text = normalizeText(corpus.join(" "));
  const detected = [];

  for (const [type, synonyms] of Object.entries(TYPE_SYNONYMS)) {
    if (textMatchesAny(text, synonyms)) detected.push(type);
  }

  if (!detected.length && /lighting\.floor_lamps/i.test(text)) {
    detected.push("floor_lamp");
  }

  if (!detected.length && /lighting\.pendants|подвес/i.test(text)) {
    detected.push("подвесной");
  }

  return uniqueList(detected);
}

function detectTokens(corpus, synonymMap) {
  const text = normalizeText(corpus.join(" "));
  return Object.entries(synonymMap)
    .filter(([, synonyms]) => textMatchesAny(text, synonyms))
    .map(([token]) => token);
}

function detectRoom(corpus) {
  const text = normalizeText(corpus.join(" "));
  for (const [room, synonyms] of Object.entries(ROOM_SYNONYMS)) {
    if (textMatchesAny(text, synonyms)) return room;
  }
  return null;
}

/**
 * Build visual query from semantic draft analysis signals.
 * @param {object|null|undefined} semanticDraft
 */
export function extractVisualQuery(semanticDraft) {
  const pro = semanticDraft?.proAnalysis || {};
  const quick = semanticDraft?.quickAnalysis || {};
  const spec = semanticDraft?.specAnalysis || {};

  const corpus = uniqueList([
    pro.spaceType?.value,
    pro.spaceType?.labelRu,
    quick.spaceType?.value,
    quick.spaceType?.labelRu,
    pro.styleAnalysis?.primary,
    pro.styleAnalysis?.labelRu,
    quick.styleAnalysis?.primary,
    quick.styleAnalysis?.labelRu,
    ...asArray(pro.styleAnalysis?.secondary),
    ...asArray(quick.styleAnalysis?.secondary),
    pro.atmosphereRu,
    quick.atmosphereRu,
    pro.colorAnalysis?.colorLogicRu,
    quick.colorAnalysis?.colorLogicRu,
    pro.colorAnalysis?.interpretedPalette?.descriptionRu,
    quick.colorAnalysis?.interpretedPalette?.descriptionRu,
    ...asArray(pro.colorAnalysis?.dominant),
    ...asArray(pro.colorAnalysis?.accents),
    ...asArray(quick.colorAnalysis?.dominant),
    ...asArray(quick.colorAnalysis?.accents),
    ...collectMaterialStrings(pro.materialAnalysis),
    ...collectLightingStrings(semanticDraft),
    ...asArray(spec.productCategories).map((item) => `${item?.category} ${item?.reason}`),
    ...asArray(spec.supplierCategories).map((item) => `${item?.category} ${item?.reason}`),
  ]);

  const { normalizedSpecGroups } = mapSpecToSupplierRegistry({ specAnalysis: spec });
  for (const group of normalizedSpecGroups) {
    if (group?.registryCategoryId?.startsWith("lighting")) {
      corpus.push(group.labelRu, group.registryCategoryId, group.sourceText);
    }
    for (const item of asArray(group?.items)) {
      corpus.push(item?.name, item?.category, item?.note, item?.materialGuess);
    }
  }

  const sceneObjectType = resolveSceneObjectTypeFromSceneGraph(semanticDraft);
  const detectedTypes = detectTypes(corpus);
  const types = sceneObjectType
    ? uniqueList([sceneObjectType, ...detectedTypes])
    : detectedTypes;
  const styles = uniqueList(detectTokens(corpus, STYLE_SYNONYMS));
  const materials = uniqueList(detectTokens(corpus, MATERIAL_SYNONYMS));
  const colors = uniqueList(detectTokens(corpus, COLOR_SYNONYMS));
  const room = detectRoom(corpus);

  return {
    type: sceneObjectType || types[0] || null,
    types,
    styles,
    materials,
    colors,
    room,
    category: sceneObjectType || types[0] || null,
  };
}

function isFloorLampQuery(visualQuery) {
  const types = visualQuery?.types?.length
    ? visualQuery.types
    : visualQuery?.type
      ? [visualQuery.type]
      : [];
  return types.includes("floor_lamp");
}

function urlTokens(value) {
  const raw = asString(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return normalizeText(`${url.pathname} ${url.search}`.replace(/[/_-]+/g, " "));
  } catch {
    return normalizeText(raw.replace(/[/_-]+/g, " "));
  }
}

function extractCandidateSku(candidate) {
  const productName = asString(candidate?.productName);
  const trailingCode = productName.match(/\b([A-Z]{1,4}\d{2,}[A-Z]{0,3})\b/i)?.[1];
  if (trailingCode) return trailingCode.toUpperCase();

  const urlSlug = asString(candidate?.productUrl).match(/\/product\/([^/?#]+)/i)?.[1];
  if (urlSlug) return urlSlug.split("-").filter(Boolean).slice(-2).join("-").toUpperCase();

  return "";
}

function enrichCandidateSignals(candidate) {
  const productName = asString(candidate?.productName);
  const text = normalizeText(productName);
  const signals = [
    text,
    normalizeText(candidate?.imageAlt),
    normalizeText(candidate?.metadata),
    urlTokens(candidate?.productUrl),
    urlTokens(candidate?.imageUrl),
  ];

  const finishMatch = productName.match(/(?:PL\s+)?([A-Z]{2})\s*$/i);
  const finish = finishMatch?.[1]?.toLowerCase() || "";
  if (finish === "bk") signals.push("black темная палитра");
  if (finish === "bs") signals.push("silver серебро metal металл brushed steel");
  if (finish === "gd" || finish === "go") signals.push("gold золото brass латунь warm");
  if (finish === "wh" || finish === "wt") signals.push("white белая светлая палитра");

  if (/подвес|pendant|podves/i.test(productName)) {
    signals.push("подвесной pendant light");
  }
  if (/торшер|напольн|floor lamp|napolny/i.test(productName)) {
    signals.push("торшер напольный светильник floor lamp");
  }
  if (/абажур|shade|ткан|fabric/i.test(productName)) {
    signals.push("абажур shade fabric ткань textile");
  }
  if (/латун|brass|gold|золот/i.test(productName)) {
    signals.push("brass латунь gold золото");
  }
  if (/modelight|modelux|model/i.test(productName)) {
    signals.push("modern contemporary metal металл");
  }
  if (/glass|стекл/i.test(productName)) {
    signals.push("glass стекло");
  }

  return normalizeText(signals.filter(Boolean).join(" "));
}

function candidateSearchText(candidate) {
  return enrichCandidateSignals(candidate);
}

function scoreTypeMatch(visualQuery, candidateText) {
  const queryTypes = visualQuery.types?.length
    ? visualQuery.types
    : visualQuery.type
      ? [visualQuery.type]
      : [];
  for (const type of queryTypes) {
    const synonyms = TYPE_SYNONYMS[type] || [];
    if (textMatchesAny(candidateText, synonyms)) {
      return { points: TYPE_WEIGHT, reason: TYPE_REASON_LABELS[type] || type };
    }
  }
  return { points: 0, reason: null };
}

function scoreDimensionMatch(queryValues, synonymMap, reasonLabels, weight, candidateText) {
  if (!queryValues.length) {
    return { points: 0, reasons: [] };
  }

  const matched = queryValues.filter((token) =>
    textMatchesAny(candidateText, synonymMap[token] || []),
  );

  if (!matched.length) {
    return { points: 0, reasons: [] };
  }

  const points = Math.round((matched.length / queryValues.length) * weight);
  const reasons = matched.map((token) => reasonLabels[token] || token);

  return { points, reasons };
}

function scoreRoomMatch(visualQuery, candidateText) {
  if (!visualQuery.room) return { points: 0, reason: null };

  const roomSynonyms = ROOM_SYNONYMS[visualQuery.room] || [];
  const roomMatches = textMatchesAny(candidateText, roomSynonyms);

  const pendantRoomFit =
    visualQuery.type === "подвесной" &&
    ["living_room", "kitchen"].includes(visualQuery.room) &&
    textMatchesAny(candidateText, ["подвес", "pendant", "светильник", "люстр"]);

  if (roomMatches || pendantRoomFit) {
    return {
      points: ROOM_WEIGHT,
      reason: ROOM_REASON_LABELS[visualQuery.room] || visualQuery.room,
    };
  }

  return { points: 0, reason: null };
}

function scoreFloorLampFeatureBoosts(candidateText) {
  const reasons = [];
  let points = 0;

  for (const boost of FLOOR_LAMP_FEATURE_BOOSTS) {
    if (!textMatchesAny(candidateText, boost.tokens)) continue;
    points += boost.weight;
    reasons.push(boost.reason);
  }

  return {
    points: Math.min(points, FLOOR_LAMP_FEATURE_CAP),
    reasons: uniqueList(reasons),
  };
}

function scoreWrongFixturePenalties(visualQuery, candidateText) {
  if (!isFloorLampQuery(visualQuery)) {
    return { points: 0, reasons: [] };
  }

  const reasons = [];
  let penalty = 0;

  for (const rule of WRONG_FIXTURE_PENALTIES) {
    if (!textMatchesAny(candidateText, rule.tokens)) continue;
    penalty += rule.penalty;
    reasons.push(rule.reason);
  }

  if (!penalty) {
    return { points: 0, reasons: [] };
  }

  const hasFloorSignal = textMatchesAny(candidateText, TYPE_SYNONYMS.floor_lamp);
  const cappedPenalty = Math.min(penalty, WRONG_FIXTURE_PENALTY_CAP);

  if (!hasFloorSignal) {
    return {
      points: -100,
      reasons: uniqueList([...reasons, "исключён: не торшер"]),
    };
  }

  return { points: -cappedPenalty, reasons: uniqueList(reasons) };
}

function scoreCandidate(fingerprint, candidate) {
  const { score, matchedFields } = visualSimilarityScore(fingerprint, candidate);

  return {
    visualMatchScore: score,
    visualMatchReasons: matchedFields,
    sku: extractCandidateSku(candidate),
  };
}

function compareCandidates(left, right) {
  if (right.visualMatchScore !== left.visualMatchScore) {
    return right.visualMatchScore - left.visualMatchScore;
  }

  const leftHasImage = Boolean(left.imageUrl);
  const rightHasImage = Boolean(right.imageUrl);
  if (rightHasImage !== leftHasImage) {
    return rightHasImage ? 1 : -1;
  }

  return String(left.productName || "").localeCompare(String(right.productName || ""), "ru");
}

/**
 * Rank Modelux visual candidates using semantic draft signals.
 * @param {object|null|undefined} semanticDraft
 * @param {Array<{ productName: string, productUrl: string, imageUrl?: string|null }>} visualProductCandidates
 */
export function rankVisualCandidates(semanticDraft, visualProductCandidates) {
  const candidates = asArray(visualProductCandidates);
  if (!candidates.length) return [];

  const fingerprint = buildVisualFingerprint(semanticDraft);

  if (process.env.NODE_ENV === "development") {
    console.log("[VISUAL-FINGERPRINT]", JSON.stringify(fingerprint));
  }

  return candidates
    .map((candidate) => {
      const scored = scoreCandidate(fingerprint, candidate);
      return {
        productName: candidate.productName,
        imageUrl: candidate.imageUrl || null,
        productUrl: candidate.productUrl,
        sku: scored.sku || extractCandidateSku(candidate),
        visualMatchScore: scored.visualMatchScore,
        visualMatchReasons: scored.visualMatchReasons,
      };
    })
    .sort(compareCandidates)
    .slice(0, VISUAL_CANDIDATE_LIMIT);
}
