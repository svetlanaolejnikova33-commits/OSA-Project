import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const URL = "http://localhost:3000/";
const OUT_DIR = path.resolve("screenshots/visual-discovery-mvp");
const SESSION_KEY = "osa-active-project-session-v1";
const STORAGE_VERSION_KEY = "osa-storage-version";

const semanticDraft = {
  languageMode: "ru",
  analysisMode: "full",
  resultAnalysisMode: "spec",
  completedAnalysisModes: ["quick", "pro", "spec"],
  quickAnalysis: {
    spaceType: { value: "living_room", labelRu: "Гостиная", confidence: 0.9 },
    styleAnalysis: { primary: "modern", labelRu: "Современный", confidence: 0.85 },
    atmosphereRu: "Светлая гостиная с подвесным светильником",
    colorAnalysis: { dominant: ["#E8E4DF"], accents: ["#8B7355"], colorLogicRu: "Нейтральная база" },
    designIntent: { summaryRu: "Жилая зона с акцентным освещением" },
  },
  proAnalysis: {
    spaceType: { value: "living_room", labelRu: "Гостиная", confidence: 0.9 },
    styleAnalysis: {
      primary: "modern",
      labelRu: "Современный минимализм",
      secondary: ["minimal"],
      confidence: 0.9,
    },
    colorAnalysis: {
      colorLogicRu: "Светлая палитра с латунными акцентами",
      dominant: ["#E8E4DF"],
      accents: ["#8B7355"],
    },
    materialAnalysis: {
      metal: [{ materialGuess: "латунь", finish: "brushed" }],
      glass: [{ materialGuess: "стекло" }],
      floor: [],
      walls: [],
      ceiling: [],
      furniture: [],
      textiles: [],
      stone: [],
    },
    lightingAnalysis: {
      artificialLight: [{ type: "pendant", labelRu: "Подвесной светильник над столом" }],
    },
  },
  specAnalysis: {
    specificationGroups: [
      {
        group: "Освещение",
        priority: "high",
        items: [
          {
            name: "Подвесной светильник",
            category: "подвесной светильник",
            visible: true,
            quantityEstimate: "1",
          },
        ],
      },
    ],
    productCategories: [
      {
        category: "Подвесные светильники",
        reason: "Видимый подвес над обеденной зоной",
        priority: "high",
      },
    ],
    supplierCategories: [],
    procurementNotes: [],
    whatMustBePreserved: [],
    replacementCandidates: [],
    functionalZones: [],
  },
  sceneGraph: {
    objects: [
      {
        id: "light-1",
        labelRu: "Подвесной светильник",
        categoryId: "lighting.pendants",
        supplierCategoryId: "lighting.pendants",
      },
    ],
  },
  editableObjects: [],
  styleConsistency: {},
  designMutations: [],
  generationPackages: [],
  warnings: [],
};

const sessionEnvelope = {
  storageSchemaVersion: 1,
  projectKey: "proj-visual-discovery-demo",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activeMode: "analyze",
  createDraft: {},
  analyzeDraft: {
    selectedAnalysisMode: "pro",
    resultAnalysisMode: "pro",
    semanticDraft,
    selectedImageFileName: "demo-interior.jpg",
    selectedImageMimeType: "image/jpeg",
    selectedImageDimensions: { width: 1600, height: 1200 },
    selectedImageId: "analysis:proj-visual-discovery-demo:demo-1",
    activeAnalysisRecordId: "",
    activeSavedAnalysisRecordId: "",
    savedDocumentSnapshot: "",
    isAnalyzeResultVisible: true,
  },
};

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
const page = await context.newPage();

await page.addInitScript(
  ({ sessionKey, storageVersionKey, envelope }) => {
    localStorage.setItem(storageVersionKey, "1");
    localStorage.setItem(sessionKey, JSON.stringify(envelope));
    localStorage.setItem("osa-active-project-v1", envelope.projectKey);
  },
  { sessionKey: SESSION_KEY, storageVersionKey: STORAGE_VERSION_KEY, envelope: sessionEnvelope },
);

await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(4000);

const section = page.getByText("ВИЗУАЛЬНО ПОХОЖИЕ ТОВАРЫ", { exact: false });
const sectionCount = await section.count();

if (sectionCount > 0) {
  await section.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
}

await page.screenshot({ path: path.join(OUT_DIR, "visual-discovery-full-page.png"), fullPage: true });

if (sectionCount > 0) {
  const card = page.locator("article").filter({ hasText: "Открыть источник" }).first();
  if (await card.count()) {
    await card.screenshot({ path: path.join(OUT_DIR, "visual-discovery-card.png") });
  }
}

console.log(
  JSON.stringify(
    {
      sectionFound: sectionCount > 0,
      outputDir: OUT_DIR,
      files: ["visual-discovery-full-page.png", "visual-discovery-card.png"],
    },
    null,
    2,
  ),
);

await browser.close();
