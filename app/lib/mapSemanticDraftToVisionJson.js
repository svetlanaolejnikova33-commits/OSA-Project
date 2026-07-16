import { asConfidence } from "./validateSemanticDraft";
import { resolvePrimarySceneObject } from "./visualProduct/visualFingerprint";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return "";
}

function humanizeType(value) {
  return asString(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values, limit = 12) {
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

function collectHaystack(...parts) {
  return parts
    .flatMap((part) => {
      if (part == null) return [];
      if (Array.isArray(part)) return part;
      if (typeof part === "object") {
        return Object.values(part).flatMap((value) =>
          typeof value === "string" ? [value] : Array.isArray(value) ? value : [],
        );
      }
      return [part];
    })
    .map((item) => asString(item))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function collectMaterialFinish(semanticDraft, primaryObject) {
  const pro = semanticDraft?.proAnalysis || {};
  const materialAnalysis = pro.materialAnalysis;
  let material = "";
  let finish = "";
  const combinations = [];

  if (materialAnalysis && typeof materialAnalysis === "object") {
    for (const items of Object.values(materialAnalysis)) {
      for (const item of asArray(items)) {
        if (!item || typeof item !== "object") continue;
        const mat = firstNonEmpty(item.possibleMaterial, item.materialFamily, item.materialGuess);
        const fin = firstNonEmpty(item.finish, item.texture, item.tone);
        if (!material && mat) material = mat;
        if (!finish && fin) finish = fin;
        if (mat && fin) combinations.push(`${mat} / ${fin}`);
        else if (mat) combinations.push(mat);
      }
    }
  }

  for (const item of asArray(pro.furnitureAnalysis)) {
    if (!item || typeof item !== "object") continue;
    if (!material) material = firstNonEmpty(item.materialGuess);
    if (!finish) finish = firstNonEmpty(item.finish, item.color);
    const mat = firstNonEmpty(item.materialGuess);
    const fin = firstNonEmpty(item.finish, item.color);
    if (mat && fin) combinations.push(`${mat} / ${fin}`);
  }

  if (primaryObject) {
    if (!material) material = firstNonEmpty(primaryObject.materialGuess);
    if (!finish) finish = firstNonEmpty(primaryObject.colorGuess);
    if (primaryObject.materialGuess && primaryObject.colorGuess) {
      combinations.push(`${primaryObject.materialGuess} / ${primaryObject.colorGuess}`);
    }
  }

  return {
    material,
    finish,
    material_combinations: uniqueStrings(combinations, 8),
  };
}

function inferMounting(primaryObject, lightingAnalysis) {
  const lights = asArray(lightingAnalysis?.artificialLight);
  const haystack = [
    primaryObject?.type,
    primaryObject?.labelRu,
    primaryObject?.position?.vertical,
    primaryObject?.categoryId,
    ...lights.map((light) => [light?.type, light?.labelRu, light?.position, light?.lightRole].join(" ")),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/pendant|ceiling|подвес|потолоч|люстр|chandelier/.test(haystack)) return "ceiling";
  if (/wall|sconce|бра|настен/.test(haystack)) return "wall";
  if (/floor|торшер|напольн|freestanding|напольн/.test(haystack)) return "floor";
  if (/table|desk|настольн/.test(haystack)) return "table";
  if (/recessed|встроен/.test(haystack)) return "ceiling";

  const vertical = asString(primaryObject?.position?.vertical).toLowerCase();
  if (vertical.includes("high") || vertical.includes("верх")) return "ceiling";
  if (vertical.includes("low") || vertical.includes("низ")) return "floor";

  return firstNonEmpty(lights[0]?.position, primaryObject?.position?.vertical, "unknown");
}

function inferCategory(semanticDraft, primaryObject) {
  const lights = asArray(semanticDraft?.proAnalysis?.lightingAnalysis?.artificialLight);
  const furniture = asArray(semanticDraft?.proAnalysis?.furnitureAnalysis);

  return firstNonEmpty(
    primaryObject?.labelRu,
    humanizeType(primaryObject?.type),
    humanizeType(primaryObject?.categoryId),
    lights[0]?.labelRu,
    humanizeType(lights[0]?.type),
    furniture[0]?.labelRu,
    humanizeType(furniture[0]?.type),
    "unknown",
  );
}

function inferShape(semanticDraft, primaryObject) {
  const style =
    semanticDraft?.proAnalysis?.styleAnalysis || semanticDraft?.quickAnalysis?.styleAnalysis || {};

  return firstNonEmpty(
    style.formLanguageRu,
    style.spatialCharacterRu,
    humanizeType(primaryObject?.visualWeight),
    "unknown",
  );
}

function inferConfidence(semanticDraft, primaryObject) {
  const values = [
    primaryObject?.confidence,
    semanticDraft?.sceneGraph?.confidence,
    semanticDraft?.proAnalysis?.styleAnalysis?.confidence,
    semanticDraft?.quickAnalysis?.styleAnalysis?.confidence,
  ];

  const finite = values.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);

  if (!finite.length) return asConfidence(0.5);
  const avg = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  return asConfidence(avg);
}

function inferSubtype(category, mounting, haystack) {
  if (/floor lamp|торшер|floor_lamp/.test(haystack) || mounting === "floor") {
    if (/reading|чтени|swing|arm|бра/.test(haystack)) return "floor reading lamp";
    return "freestanding floor lamp";
  }
  if (/pendant|подвес/.test(haystack) || mounting === "ceiling") return "pendant light";
  if (/wall|sconce|бра|настен/.test(haystack) || mounting === "wall") return "wall lamp";
  if (/table|настольн/.test(haystack) || mounting === "table") return "table lamp";
  return firstNonEmpty(humanizeType(category), undefined);
}

function inferConstruction(haystack) {
  const parts = [];
  if (/articulated|swing|шарнир|поворот|arm/.test(haystack)) parts.push("articulated horizontal arm");
  if (/straight|vertical stem|прямой|стойк/.test(haystack)) parts.push("straight vertical stem");
  if (/fixed stem|жестк/.test(haystack) && !/articulated|swing/.test(haystack)) {
    parts.push("fixed stem");
  }
  if (/asymmetr|асимметр/.test(haystack)) parts.push("asymmetrical construction");
  else if (/centered|осевой|симметр/.test(haystack)) parts.push("centered construction");
  return parts.length ? parts.join("; ") : undefined;
}

function inferSilhouette(haystack, shape) {
  if (/tapered.*shade|конусн.*абажур|textile shade|тканев.*абажур/.test(haystack)) {
    return "tapered textile shade on vertical stem";
  }
  if (/glass globe|стекл.*шар|glo-ball/.test(haystack)) return "glass globe silhouette";
  if (/cylindrical|цилиндр/.test(haystack)) return "cylindrical silhouette";
  return asString(shape) || undefined;
}

function inferProportions(haystack) {
  if (/tall|высок|slender|стройк/.test(haystack)) return "tall slender vertical proportions";
  if (/compact|компакт/.test(haystack)) return "compact proportions";
  if (/wide|широкий|broad base/.test(haystack)) return "broad base proportions";
  return undefined;
}

function collectDistinctiveFeatures(haystack) {
  const features = [];
  if (/integrated.*(table|side)|боков.*(стол|столик)|side table|кругл.*столик/.test(haystack)) {
    features.push("integrated circular side table");
  }
  if (/stepped.*base|ступенчат.*основан|ornate.*base|декор.*основан/.test(haystack)) {
    features.push("ornate stepped round base");
  }
  if (/flat disc|плоск.*диск/.test(haystack)) features.push("flat disc base");
  if (/articulated|swing arm|поворотн.*рычаг/.test(haystack)) {
    features.push("articulated swing arm");
  }
  if (/tapered.*shade|конусн.*абажур/.test(haystack)) features.push("tapered textile shade");
  if (/glass globe|стекл.*шар/.test(haystack)) features.push("glass globe diffuser");
  if (/aged brass|состаренн.*латун|patina/.test(haystack)) features.push("aged brass finish");
  if (/polished brass|полированн.*латун/.test(haystack)) features.push("polished brass finish");
  return uniqueStrings(features, 10);
}

function collectFunctionalElements(haystack) {
  const items = [];
  if (/side table|боков.*стол|integrated table|столик/.test(haystack)) {
    items.push("integrated side table");
  }
  if (/reading|чтени|task light/.test(haystack)) items.push("reading / task light");
  if (/dimmer|диммер/.test(haystack)) items.push("dimmer control");
  if (/adjustable|регулир|swing|поворот/.test(haystack)) items.push("adjustable arm");
  if (/shade|абажур/.test(haystack)) items.push("lamp shade");
  return uniqueStrings(items, 8);
}

function collectDecorativeDetails(haystack) {
  const items = [];
  if (/stepped|ступенчат/.test(haystack)) items.push("stepped base rings");
  if (/ornate|декор|лепнин|relief/.test(haystack)) items.push("ornate base detailing");
  if (/textile|ткан|linen|лён/.test(haystack)) items.push("textile shade");
  if (/brushed|сатин|brushed/.test(haystack)) items.push("brushed metal surface");
  return uniqueStrings(items, 8);
}

function collectColorPalette(semanticDraft, primaryObject) {
  const pro = semanticDraft?.proAnalysis || {};
  const quick = semanticDraft?.quickAnalysis || {};
  const values = [];
  const pushPalette = (palette) => {
    for (const entry of asArray(palette?.dominant)) {
      values.push(entry?.name || entry?.labelRu || entry?.hex);
    }
    for (const entry of asArray(palette?.accents)) {
      values.push(entry?.name || entry?.labelRu || entry?.hex);
    }
  };
  pushPalette(pro.colorAnalysis?.interpretedPalette);
  pushPalette(quick.colorAnalysis?.interpretedPalette);
  values.push(primaryObject?.colorGuess);
  return uniqueStrings(values, 8);
}

function inferNegativeConstraints(haystack, mounting) {
  const negatives = [];
  if (mounting === "floor") {
    negatives.push("not wall-mounted");
    negatives.push("not ceiling pendant");
  }
  if (mounting === "ceiling") {
    negatives.push("not freestanding floor lamp");
    negatives.push("not wall sconce");
  }
  if (!/side table|столик|integrated table/.test(haystack)) {
    // only assert absence when we have enough signal it is a simple lamp
    if (/floor lamp|торшер/.test(haystack) && /plain|simple|без столика/.test(haystack)) {
      negatives.push("no integrated side table");
    }
  }
  if (/articulated|swing/.test(haystack)) {
    negatives.push("not fixed rigid stem only");
  }
  return uniqueStrings(negatives, 8);
}

function inferSearchConstraints(visionCore) {
  return uniqueStrings(
    [
      visionCore.category,
      visionCore.subtype,
      visionCore.mounting,
      visionCore.material,
      visionCore.finish,
      visionCore.construction,
      ...(visionCore.distinctive_features || []).slice(0, 4),
      ...(visionCore.functional_elements || []).slice(0, 3),
    ],
    12,
  );
}

/**
 * Map existing analyze-image semanticDraft → Vision JSON candidate.
 * Preserves distinctive construction/features when present in the draft.
 *
 * @param {object|null|undefined} semanticDraft
 * @returns {import("./visionJsonContract").VisionJson | null}
 */
export function mapSemanticDraftToVisionJson(semanticDraft) {
  if (!semanticDraft || typeof semanticDraft !== "object") return null;

  const primaryObject = resolvePrimarySceneObject(semanticDraft);
  const pro = semanticDraft?.proAnalysis || {};
  const quick = semanticDraft?.quickAnalysis || {};
  const style = pro.styleAnalysis || quick.styleAnalysis || {};
  const { material, finish, material_combinations } = collectMaterialFinish(semanticDraft, primaryObject);
  const mounting = inferMounting(primaryObject, pro.lightingAnalysis);
  const category = inferCategory(semanticDraft, primaryObject);
  const shape = inferShape(semanticDraft, primaryObject);
  const confidence = inferConfidence(semanticDraft, primaryObject);

  const haystack = collectHaystack(
    category,
    mounting,
    material,
    finish,
    shape,
    style.primary,
    style.labelRu,
    style.formLanguageRu,
    style.spatialCharacterRu,
    primaryObject?.type,
    primaryObject?.labelRu,
    primaryObject?.materialGuess,
    primaryObject?.colorGuess,
    pro.designIntent?.summaryRu,
    quick.designIntent?.summaryRu,
    pro.atmosphereRu,
    asArray(pro.lightingAnalysis?.artificialLight).map((light) =>
      [light?.type, light?.labelRu, light?.lightRole, light?.position].join(" "),
    ),
    asArray(pro.furnitureAnalysis).map((item) =>
      [item?.type, item?.labelRu, item?.materialGuess, item?.finish, item?.note].join(" "),
    ),
    asArray(semanticDraft?.specAnalysis?.specificationGroups).flatMap((group) =>
      asArray(group?.items).map((item) => [item?.name, item?.category, item?.note].join(" ")),
    ),
  );

  const subtype = inferSubtype(category, mounting, haystack);
  const construction = inferConstruction(haystack);
  const silhouette = inferSilhouette(haystack, shape);
  const proportions = inferProportions(haystack);
  const distinctive_features = collectDistinctiveFeatures(haystack);
  const functional_elements = collectFunctionalElements(haystack);
  const decorative_details = collectDecorativeDetails(haystack);
  const color_palette = collectColorPalette(semanticDraft, primaryObject);
  const design_character = firstNonEmpty(
    style.labelRu,
    style.spatialCharacterRu,
    style.formLanguageRu,
    style.primary,
  );
  const likely_use = firstNonEmpty(
    /reading|чтени|task/.test(haystack) ? "reading / ambient lighting" : "",
    mounting === "floor" ? "freestanding ambient lighting" : "",
    mounting === "ceiling" ? "ceiling ambient lighting" : "",
    mounting === "wall" ? "wall accent lighting" : "",
  );
  const visual_role = firstNonEmpty(
    primaryObject?.visualWeight === "high" ? "focal lighting object" : "",
    "interior lighting accent",
  );

  const spaceType = pro.spaceType || quick.spaceType || {};
  const context = {
    room_type: firstNonEmpty(spaceType.labelRu, spaceType.value, semanticDraft?.sceneGraph?.spaceType),
    placement: firstNonEmpty(
      primaryObject?.position?.horizontal && primaryObject?.position?.vertical
        ? `${primaryObject.position.horizontal} / ${primaryObject.position.vertical}`
        : "",
      mounting,
    ),
    adjacent_objects: uniqueStrings(
      asArray(semanticDraft?.sceneGraph?.objects)
        .filter((obj) => obj?.id && obj.id !== primaryObject?.id)
        .map((obj) => obj.labelRu || humanizeType(obj.type)),
      6,
    ),
    design_intent: firstNonEmpty(pro.designIntent?.summaryRu, quick.designIntent?.summaryRu),
  };

  const negative_constraints = inferNegativeConstraints(haystack, mounting);

  /** @type {import("./visionJsonContract").VisionJson} */
  const vision = {
    category,
    mounting,
    material: firstNonEmpty(material, "unknown"),
    finish: firstNonEmpty(finish, "unknown"),
    style: firstNonEmpty(style.primary, style.labelRu, "unknown"),
    shape,
    confidence,
  };

  if (subtype) vision.subtype = subtype;
  if (construction) vision.construction = construction;
  if (proportions) vision.proportions = proportions;
  if (silhouette) vision.silhouette = silhouette;
  if (distinctive_features.length) vision.distinctive_features = distinctive_features;
  if (decorative_details.length) vision.decorative_details = decorative_details;
  if (functional_elements.length) vision.functional_elements = functional_elements;
  if (color_palette.length) vision.color_palette = color_palette;
  if (material_combinations.length) vision.material_combinations = material_combinations;
  if (likely_use) vision.likely_use = likely_use;
  if (visual_role) vision.visual_role = visual_role;
  if (design_character) vision.design_character = design_character;

  const search_constraints = inferSearchConstraints(vision);
  if (search_constraints.length) vision.search_constraints = search_constraints;
  if (negative_constraints.length) vision.negative_constraints = negative_constraints;

  if (context.room_type || context.placement || context.design_intent || context.adjacent_objects.length) {
    vision.context = {
      ...(context.room_type ? { room_type: context.room_type } : {}),
      ...(context.placement ? { placement: context.placement } : {}),
      ...(context.adjacent_objects.length ? { adjacent_objects: context.adjacent_objects } : {}),
      ...(context.design_intent ? { design_intent: context.design_intent } : {}),
    };
  }

  const field_confidence = {
    category: asConfidence(primaryObject?.confidence || confidence),
    mounting: asConfidence(confidence),
    material: material ? asConfidence(confidence) : asConfidence(0.4),
    finish: finish ? asConfidence(confidence) : asConfidence(0.4),
    style: asConfidence(style.confidence || confidence),
    shape: asConfidence(confidence),
  };
  if (subtype) field_confidence.subtype = asConfidence(Math.min(1, confidence + 0.05));
  if (construction) field_confidence.construction = asConfidence(Math.min(1, confidence));
  if (context.room_type || context.design_intent) {
    field_confidence.context = asConfidence(confidence);
  }
  vision.field_confidence = field_confidence;

  return vision;
}
