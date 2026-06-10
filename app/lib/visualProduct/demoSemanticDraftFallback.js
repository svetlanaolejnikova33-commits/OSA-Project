import { validateSemanticDraft } from "../validateSemanticDraft";

export const DEMO_FALLBACK_WARNING_RU =
  "Demo fallback: Vision недоступен, используется тестовый semanticDraft для проверки Visual Discovery.";

const DEMO_DRAFT_SOURCE = {
  languageMode: "ru",
  analysisMode: "full",
  resultAnalysisMode: "pro",
  completedAnalysisModes: ["quick", "pro", "spec"],
  quickAnalysis: {
    spaceType: { value: "living_room", labelRu: "Гостиная", confidence: 0.9 },
    styleAnalysis: {
      primary: "modern",
      labelRu: "Современный минимализм",
      secondary: ["contemporary"],
      confidence: 0.88,
    },
    atmosphereRu: "Светлая гостиная с подвесным светильником",
    colorAnalysis: {
      dominant: ["#E8E4DF", "#FFFFFF"],
      accents: ["#C9A227", "#B08D57"],
      colorLogicRu: "Светлая палитра с золотыми и латунными акцентами",
      interpretedPalette: {
        descriptionRu: "Светлая палитра с золотыми и латунными акцентами",
      },
    },
    designIntent: {
      summaryRu: "Жилая зона с акцентным подвесным освещением",
      emotionalEffectRu: "Сдержанная современная атмосфера",
    },
  },
  proAnalysis: {
    spaceType: { value: "living_room", labelRu: "Гостиная", confidence: 0.9 },
    styleAnalysis: {
      primary: "modern",
      labelRu: "Современный минимализм",
      secondary: ["contemporary"],
      confidence: 0.9,
      spatialCharacterRu: "Современный жилой интерьер",
      formLanguageRu: "Лаконичные формы",
    },
    colorAnalysis: {
      colorLogicRu: "Светлая палитра с золотыми и латунными акцентами",
      dominant: ["#E8E4DF", "#FFFFFF"],
      accents: ["#C9A227", "#B08D57"],
      interpretedPalette: {
        descriptionRu: "Белая база, золото и латунь в освещении",
      },
    },
    materialAnalysis: {
      metal: [{ materialGuess: "металл", finish: "brushed brass", labelRu: "Латунь" }],
      glass: [{ materialGuess: "стекло", finish: "clear", labelRu: "Стекло" }],
      floor: [],
      walls: [],
      ceiling: [],
      furniture: [],
      textiles: [],
      stone: [],
    },
    lightingAnalysis: {
      artificialLight: [
        {
          type: "pendant",
          labelRu: "Подвесной светильник",
          descriptionRu: "Подвесной светильник над зоной отдыха",
        },
      ],
      overallLightingMood: "Мягкий акцентный свет",
    },
    atmosphereRu: "Современная гостиная с тёплыми металлическими акцентами",
    designIntent: {
      summaryRu: "Акцент на подвесном освещении в современной гостиной",
      whatMustBePreserved: ["подвесной светильник", "светлая палитра"],
    },
  },
  specAnalysis: {
    functionalZones: [],
    productCategories: [
      {
        category: "Подвесные светильники",
        reason: "Демо-fallback для Visual Discovery",
        priority: "high",
      },
    ],
    supplierCategories: [],
    specificationGroups: [
      {
        group: "Освещение",
        priority: "high",
        budgetWeight: "high",
        items: [
          {
            name: "Подвесной светильник",
            category: "подвесной светильник",
            visible: true,
            quantityEstimate: "1",
            replacementRisk: "medium",
            skuReadiness: "medium",
            note: "Demo fallback",
          },
        ],
      },
    ],
    specificationAssets: [],
    zoneSpecifications: [],
    replacementCandidates: [],
    procurementNotes: [],
    whatMustBePreserved: [],
  },
  sceneGraph: {
    zones: [
      {
        id: "zone-living",
        labelRu: "Гостиная",
        type: "living_room",
        position: "center",
        role: "primary",
      },
    ],
    objects: [
      {
        id: "light-pendant-demo",
        labelRu: "Подвесной светильник",
        type: "pendant",
        categoryId: "lighting.pendants",
        supplierCategoryId: "lighting.pendants",
        zoneId: "zone-living",
        materialGuess: "metal, glass",
        colorGuess: "gold, white, brass",
        visualWeight: "high",
        replacementRisk: "medium",
        editablePotential: "high",
        budgetWeight: "high",
      },
    ],
    relationships: [],
    preservationRules: [],
  },
  pipelines: {},
  editableObjects: [],
  styleConsistency: {},
  designMutations: [],
  generationPackages: [],
  warnings: [],
};

export function isDemoFallbackEnabled() {
  if (process.env.NODE_ENV !== "development") return false;
  return (
    process.env.NEXT_PUBLIC_OSA_DEMO_FALLBACK === "true" ||
    process.env.OSA_DEMO_FALLBACK === "true"
  );
}

export function isOpenAiGeoBlockError(message) {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("unsupported_country_region_territory") ||
    normalized.includes("country, region, or territory not supported") ||
    (normalized.includes("403") && normalized.includes("country"))
  );
}

export function createDemoLightingPendantsSemanticDraft(options = {}) {
  const validated = validateSemanticDraft(DEMO_DRAFT_SOURCE, {
    languageMode: "ru",
    analysisMode: "full",
    extractedPalette: options.extractedPalette || null,
    viewMode: options.viewMode || "pro",
  });

  return {
    ...validated,
    demoFallback: true,
    warnings: [DEMO_FALLBACK_WARNING_RU, ...validated.warnings.filter(Boolean)],
  };
}
