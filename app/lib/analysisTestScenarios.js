export const ANALYSIS_TEST_SCENARIO_TYPES = [
  "light_kitchen_dining",
  "dark_bedroom",
  "industrial_loft",
  "bathroom",
  "kids_room",
  "classic_living_room",
  "minimal_entryway",
];

export const ANALYSIS_TEST_SCENARIOS = [
  {
    type: "light_kitchen_dining",
    labelRu: "Светлая кухня-столовая",
    roomTypeHints: ["kitchen", "dining", "кухн", "столов"],
    expectedChecks: {
      roomType: true,
      functionalZonesMin: 2,
      materialGroupsMin: 3,
      lighting: true,
      sceneGraph: true,
      editableObjects: true,
      styleConsistency: true,
      specGroups: true,
    },
  },
  {
    type: "dark_bedroom",
    labelRu: "Тёмная спальня",
    roomTypeHints: ["bedroom", "спальн"],
    expectedChecks: {
      roomType: true,
      functionalZonesMin: 2,
      materialGroupsMin: 3,
      lighting: true,
      sceneGraph: true,
      editableObjects: true,
      styleConsistency: true,
      specGroups: true,
    },
  },
  {
    type: "industrial_loft",
    labelRu: "Индустриальный лофт",
    roomTypeHints: ["loft", "open_space", "living_room", "лофт", "гостин"],
    expectedChecks: {
      roomType: true,
      functionalZonesMin: 2,
      materialGroupsMin: 3,
      lighting: true,
      sceneGraph: true,
      editableObjects: true,
      styleConsistency: true,
      specGroups: true,
    },
  },
  {
    type: "bathroom",
    labelRu: "Санузел",
    roomTypeHints: ["bathroom", "сануз", "ванн"],
    expectedChecks: {
      roomType: true,
      functionalZonesMin: 2,
      materialGroupsMin: 3,
      lighting: true,
      sceneGraph: true,
      editableObjects: true,
      styleConsistency: true,
      specGroups: true,
    },
  },
  {
    type: "kids_room",
    labelRu: "Детская",
    roomTypeHints: ["kids", "children", "детск"],
    expectedChecks: {
      roomType: true,
      functionalZonesMin: 2,
      materialGroupsMin: 3,
      lighting: true,
      sceneGraph: true,
      editableObjects: true,
      styleConsistency: true,
      specGroups: true,
    },
  },
  {
    type: "classic_living_room",
    labelRu: "Классическая гостиная",
    roomTypeHints: ["living_room", "гостин", "classic", "классич"],
    expectedChecks: {
      roomType: true,
      functionalZonesMin: 2,
      materialGroupsMin: 3,
      lighting: true,
      sceneGraph: true,
      editableObjects: true,
      styleConsistency: true,
      specGroups: true,
    },
  },
  {
    type: "minimal_entryway",
    labelRu: "Минималистичная прихожая",
    roomTypeHints: ["hallway", "entry", "прихож", "entryway"],
    expectedChecks: {
      roomType: true,
      functionalZonesMin: 2,
      materialGroupsMin: 3,
      lighting: true,
      sceneGraph: true,
      editableObjects: true,
      styleConsistency: true,
      specGroups: true,
    },
  },
];

export function getAnalysisTestScenarioByType(scenarioType) {
  const type = typeof scenarioType === "string" ? scenarioType.trim() : "";
  return ANALYSIS_TEST_SCENARIOS.find((scenario) => scenario.type === type) || null;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/ё/g, "е") : "";
}

export function inferScenarioTypeFromSemanticDraft(semanticDraft) {
  const quick = semanticDraft?.quickAnalysis || {};
  const pro = semanticDraft?.proAnalysis || {};
  const haystack = [
    quick.spaceType?.value,
    quick.spaceType?.labelRu,
    pro.spaceType?.value,
    pro.spaceType?.labelRu,
    quick.styleAnalysis?.labelRu,
    pro.styleAnalysis?.labelRu,
    semanticDraft?.sceneGraph?.spaceType,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  for (const scenario of ANALYSIS_TEST_SCENARIOS) {
    if (scenario.roomTypeHints.some((hint) => haystack.includes(normalizeText(hint)))) {
      return scenario.type;
    }
  }

  return "classic_living_room";
}
