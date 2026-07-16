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

function collectMaterialFinish(semanticDraft, primaryObject) {
  const pro = semanticDraft?.proAnalysis || {};
  const materialAnalysis = pro.materialAnalysis;
  let material = "";
  let finish = "";

  if (materialAnalysis && typeof materialAnalysis === "object") {
    for (const items of Object.values(materialAnalysis)) {
      for (const item of asArray(items)) {
        if (!item || typeof item !== "object") continue;
        if (!material) {
          material = firstNonEmpty(item.possibleMaterial, item.materialFamily, item.materialGuess);
        }
        if (!finish) {
          finish = firstNonEmpty(item.finish, item.texture, item.tone);
        }
        if (material && finish) break;
      }
      if (material && finish) break;
    }
  }

  for (const item of asArray(pro.furnitureAnalysis)) {
    if (!item || typeof item !== "object") continue;
    if (!material) material = firstNonEmpty(item.materialGuess);
    if (!finish) finish = firstNonEmpty(item.finish, item.color);
    if (material && finish) break;
  }

  if (primaryObject) {
    if (!material) material = firstNonEmpty(primaryObject.materialGuess);
    if (!finish) finish = firstNonEmpty(primaryObject.colorGuess);
  }

  return { material, finish };
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
  if (/floor|торшер|напольн/.test(haystack)) return "floor";
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

/**
 * Map existing analyze-image semanticDraft → Vision JSON candidate.
 * Does not call a model; reuses fields already produced by the current pipeline.
 *
 * @param {object|null|undefined} semanticDraft
 * @returns {import("./visionJsonContract").VisionJson | null}
 */
export function mapSemanticDraftToVisionJson(semanticDraft) {
  if (!semanticDraft || typeof semanticDraft !== "object") return null;

  const primaryObject = resolvePrimarySceneObject(semanticDraft);
  const style =
    semanticDraft?.proAnalysis?.styleAnalysis || semanticDraft?.quickAnalysis?.styleAnalysis || {};
  const { material, finish } = collectMaterialFinish(semanticDraft, primaryObject);

  return {
    category: inferCategory(semanticDraft, primaryObject),
    mounting: inferMounting(primaryObject, semanticDraft?.proAnalysis?.lightingAnalysis),
    material: firstNonEmpty(material, "unknown"),
    finish: firstNonEmpty(finish, "unknown"),
    style: firstNonEmpty(style.primary, style.labelRu, "unknown"),
    shape: inferShape(semanticDraft, primaryObject),
    confidence: inferConfidence(semanticDraft, primaryObject),
  };
}
