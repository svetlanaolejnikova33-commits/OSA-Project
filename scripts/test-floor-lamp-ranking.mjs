/**
 * Regression guard — floor lamp reference-feature ranking.
 * Run: npx jiti scripts/test-floor-lamp-ranking.mjs
 */
import {
  extractVisualQuery,
  rankVisualCandidates,
} from "../app/lib/visualProduct/rankVisualCandidates.js";

const REFERENCE_DRAFT = {
  proAnalysis: {
    spaceType: { value: "living_room", labelRu: "Гостиная" },
    styleAnalysis: {
      primary: "modern",
      labelRu: "Современный с элементами арт-деко",
      secondary: ["арт-деко", "contemporary"],
    },
    atmosphereRu: "Тёплый мягкий свет",
    colorAnalysis: { colorLogicRu: "Латунь и золото" },
    materialAnalysis: {
      metal: [{ materialGuess: "латунь", finish: "brushed brass" }],
      fabric: [{ materialGuess: "ткань" }],
      floor: [],
      walls: [],
      ceiling: [],
      furniture: [],
      textiles: [],
      glass: [],
      stone: [],
    },
    lightingAnalysis: {
      artificialLight: [{ type: "floor_lamp", labelRu: "Торшер с тканевым абажуром" }],
    },
    designIntent: { summaryRu: "Торшер с латунной стойкой и тканевым абажуром." },
  },
  specAnalysis: { specificationGroups: [], productCategories: [], supplierCategories: [] },
  sceneGraph: {
    objects: [
      {
        type: "floor_lamp",
        labelRu: "Торшер",
        categoryId: "lighting.floor_lamps",
        supplierCategoryId: "lighting.floor_lamps",
      },
    ],
    zones: [],
    relationships: [],
    preservationRules: [],
  },
};

const FIXTURE_CATALOG = [
  {
    productName: "MODEMODERN TORCHERE BRASS FABRIC SHADE PL GD",
    productUrl: "https://modelux.ru/product/torchere-brass-fabric-gd",
    imageUrl: "https://modelux.ru/upload/torchere-brass-fabric.jpg",
  },
  {
    productName: "MODEMODERN FLOOR LAMP LINEN ABAT-JOUR LATUN PL GD",
    productUrl: "https://modelux.ru/product/floor-lamp-linen-latun-gd",
    imageUrl: "https://modelux.ru/upload/floor-linen-latun.jpg",
  },
  {
    productName: "MODEMODERN ART DECO FLOOR LAMP GOLD TABLE TRAY PL GO",
    productUrl: "https://modelux.ru/product/art-deco-floor-gold-tray",
    imageUrl: "https://modelux.ru/upload/art-deco-floor.jpg",
  },
  {
    productName: "MODEMODERN CONTEMPORARY FLOOR LAMP WARM LIGHT PL GD",
    productUrl: "https://modelux.ru/product/contemporary-floor-warm",
    imageUrl: "https://modelux.ru/upload/contemporary-warm.jpg",
  },
  {
    productName: "MODEMODERN FLOOR LAMP SLIM VERTICAL STAND PL BS",
    productUrl: "https://modelux.ru/product/slim-vertical-bs",
    imageUrl: "https://modelux.ru/upload/slim-vertical.jpg",
  },
  {
    productName: "MODEMODERN NAPOLNYI SVETILNIK PL BK",
    productUrl: "https://modelux.ru/product/napolnyi-svetilnik-bk",
    imageUrl: "https://modelux.ru/upload/napolnyi-bk.jpg",
  },
  {
    productName: "MODEMODERN GLASS PENDANT PODVESNOI PL GD",
    productUrl: "https://modelux.ru/product/glass-pendant-podves",
    imageUrl: "https://modelux.ru/upload/pendant-wrong.jpg",
  },
  {
    productName: "MODEMODERN CEILING LUSTRE PL WH",
    productUrl: "https://modelux.ru/product/ceiling-lustre",
    imageUrl: "https://modelux.ru/upload/lustre-wrong.jpg",
  },
];

export { FIXTURE_CATALOG, REFERENCE_DRAFT };

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

const visualQuery = extractVisualQuery(REFERENCE_DRAFT);
assert(visualQuery.type === "floor_lamp", `expected floor_lamp query, got ${visualQuery.type}`);

const ranked = rankVisualCandidates(REFERENCE_DRAFT, FIXTURE_CATALOG);
assert(ranked.length > 0, "ranked list must not be empty");

const top = ranked[0];
assert(/brass|latun|gold|linen|art deco|torchere|napolny/i.test(top.productName), "top match should be brass/fabric floor lamp");

const pendant = ranked.find((row) => /podves|pendant/i.test(row.productName));
assert(!pendant || pendant.visualMatchScore < top.visualMatchScore, "pendant must rank below floor lamp matches");

const excluded = ranked.find((row) => /lustre|chandelier/i.test(row.productName));
assert(!excluded, "люстра candidate must be excluded from floor_lamp ranking");

console.log("[floor-lamp-ranking] PASS");
console.log(
  JSON.stringify(
    ranked.slice(0, 5).map((row) => ({
      title: row.productName,
      sku: row.sku,
      score: row.visualMatchScore,
      reasons: row.visualMatchReasons,
    })),
    null,
    2,
  ),
);
