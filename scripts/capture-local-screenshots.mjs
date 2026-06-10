import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const URL = "http://localhost:3000/";
const OUT = path.resolve("d:/CURSOR_PROJECTS/OSA/osa-app/screenshots/local-preview");

const mockSemanticDraft = {
  languageMode: "ru",
  analysisMode: "full",
  resultAnalysisMode: "pro",
  completedAnalysisModes: ["quick", "pro", "spec"],
  quickAnalysis: {
    spaceType: { value: "living_room", labelRu: "Гостиная", confidence: 0.91 },
    styleAnalysis: {
      primary: "modern_minimal",
      labelRu: "Современный минимализм",
      confidence: 0.88,
      secondary: ["scandinavian"],
    },
    atmosphereRu: "Спокойная светлая атмосфера с мягким рассеянным светом",
    colorAnalysis: {
      dominant: ["#E8E4DF", "#C9B8A8"],
      accents: ["#8B7355"],
      colorLogicRu: "Тёплая нейтральная база с древесными акцентами",
    },
    designIntent: {
      summaryRu: "Уютное жилое пространство с акцентом на свет и тактильные материалы",
      emotionalEffectRu: "Ощущение спокойствия и собранности",
    },
  },
  proAnalysis: {
    spaceType: { value: "living_room", labelRu: "Гостиная", confidence: 0.91 },
    styleAnalysis: { labelRu: "Scandinavian calm", primary: "scandinavian" },
    functionalZones: [{ nameRu: "Зона отдыха", descriptionRu: "Диванная группа и медиа-зона" }],
    lightingAnalysis: {
      overallLightingMood: "Мягкий рассеянный дневной свет",
      artificialLight: [{ type: "pendant", descriptionRu: "Подвесной светильник над зоной отдыха" }],
    },
    materialAnalysis: {
      wood: [{ nameRu: "Дуб", finishRu: "матовый", confidence: 0.82 }],
    },
    furnitureAnalysis: [{ categoryRu: "Диван", descriptionRu: "Модульный диван нейтрального оттенка" }],
    designIntent: {
      summaryRu: "Функциональная гостиная для семейного отдыха",
      keyDesignDrivers: ["свет", "тактильность", "порядок"],
    },
  },
  specAnalysis: {
    specificationGroups: [
      {
        group: "furniture",
        titleRu: "Мебель",
        items: [{ nameRu: "Диван модульный", materialRu: "ткань", dimensionsRu: "280 см" }],
      },
    ],
    procurementNotes: ["Уточнить отделку древесины у поставщика"],
  },
  pipelines: {},
  sceneGraph: { nodes: [], edges: [] },
  editableObjects: [],
  styleConsistency: {},
  designMutations: [],
  generationPackages: [],
  warnings: [],
};

const demoProjects = [
  {
    id: "osa-vis-demo-1",
    projectKey: "proj-living-minimal",
    title: "Квартира · светлый минимализм",
    createdAt: "2026-05-20T12:00:00.000Z",
    imageStored: true,
  },
  {
    id: "osa-vis-demo-2",
    projectKey: "proj-bedroom-calm",
    title: "Спальня · quiet contrast",
    createdAt: "2026-05-18T09:30:00.000Z",
    imageStored: true,
  },
  {
    id: "osa-vis-demo-3",
    projectKey: "proj-kitchen-warm",
    title: "Кухня-гостиная · warm editorial",
    createdAt: "2026-05-15T16:45:00.000Z",
    imageStored: true,
  },
];

const png1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function shot(page, name, opts = {}) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false, ...opts });
  return file;
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "ru-RU",
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.route("**/api/analyze-image", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ semanticDraft: mockSemanticDraft }),
  });
});

await mkdir(OUT, { recursive: true });

await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);
const files = [];
files.push(await shot(page, "01-main-hero.png"));

await page.evaluate((projects) => {
  localStorage.setItem("osa-visual-history-v1", JSON.stringify(projects));
}, demoProjects);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.waitForSelector(".osa-workspace-sidebar-left", { timeout: 15000 });
files.push(await shot(page, "02-left-projects-panel.png", {
  clip: { x: 0, y: 0, width: 340, height: 900 },
}));
files.push(await shot(page, "02b-full-with-projects.png"));

const projectBtn = page.locator(".osa-workspace-sidebar-left button[aria-label^='Проект:']").first();
await projectBtn.waitFor({ state: "visible", timeout: 15000 });
await projectBtn.click();
await page.waitForTimeout(600);

await page.getByRole("tab", { name: "Анализировать изображение" }).click();
await page.waitForTimeout(800);
files.push(await shot(page, "03-analysis-mode.png"));

const fileInput = page.locator('input[type="file"]').first();
await fileInput.setInputFiles({
  name: "interior-demo.png",
  mimeType: "image/png",
  buffer: png1x1,
});
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Анализировать интерьер" }).click();
await page.waitForTimeout(1200);

for (const mode of ["QUICK", "PRO", "SPEC"]) {
  await page.getByRole("button", { name: mode, exact: true }).click();
  await page.waitForTimeout(700);
  files.push(await shot(page, `04-analysis-${mode.toLowerCase()}.png`));
}

files.push(await shot(page, "05-analysis-full-layout.png"));
files.push(
  await shot(page, "06-project-memory-sidebar.png", {
    clip: { x: 0, y: 0, width: 360, height: 900 },
  }),
);

await writeFile(
  path.join(OUT, "manifest.json"),
  JSON.stringify({ url: URL, commit: "aaca0e1", files }, null, 2),
);

console.log(JSON.stringify({ outDir: OUT, files }, null, 2));
await browser.close();
