import { chromium, devices } from "playwright-core";

const URL = "https://www.osa-platform.ru/";
const pixel7 = devices["Pixel 7"];

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
});

const context = await browser.newContext({
  ...pixel7,
  locale: "ru-RU",
});

const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => pageErrors.push(String(err)));

await page.addInitScript(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});

const failedResources = [];
page.on("response", (res) => {
  if (res.status() >= 400) failedResources.push(`${res.status()} ${res.url()}`);
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);

const shell = page.locator(".osa-mobile-shell");
const hasShell = (await shell.count()) > 0;

async function clickAndReport(label, selector) {
  const el = page.locator(selector).first();
  const visible = await el.isVisible().catch(() => false);
  if (!visible) return { label, ok: false, detail: "not visible" };
  try {
    await el.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    return { label, ok: true, detail: "click ok" };
  } catch (e) {
    return { label, ok: false, detail: String(e.message || e) };
  }
}

async function activeTabLabel() {
  return page
    .locator("button.osa-mobile-shell__tab[aria-selected='true']")
    .textContent()
    .then((t) => t?.trim() || null)
    .catch(() => null);
}

const tabGenerate = await clickAndReport(
  "tab-generate",
  'button.osa-mobile-shell__tab:has-text("Создать интерьер")',
);
const tabAfterGenerate = await activeTabLabel();

const tabAnalyze = await clickAndReport(
  "tab-analyze",
  'button.osa-mobile-shell__tab:has-text("Анализировать изображение")',
);
const tabAfterAnalyze = await activeTabLabel();

await page.locator('button.osa-mobile-shell__tab:has-text("Создать интерьер")').click().catch(() => {});
await page.waitForTimeout(400);

const cta = await clickAndReport("start-project", 'button:has-text("Начать проект")');
const heroHiddenAfterStart = !(await page.locator('button:has-text("Начать проект")').isVisible().catch(() => false));

await page.locator("textarea.osa-form-textarea").fill("тестовая комната 30м², светлый минимализм");
await page.waitForTimeout(200);

const generateBtn = page.locator('button:has-text("Сгенерировать")').first();
let generateClick = { label: "generate", ok: false, detail: "not visible" };
if (await generateBtn.isVisible().catch(() => false)) {
  try {
    await generateBtn.click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    const loading = await page.locator('button:has-text("Генерируем концепцию")').isVisible().catch(() => false);
    generateClick = {
      label: "generate",
      ok: true,
      detail: loading ? "click ok, loading state" : "click ok",
    };
  } catch (e) {
    generateClick = { label: "generate", ok: false, detail: String(e.message || e) };
  }
}

await page.locator('button.osa-mobile-shell__tab:has-text("Анализировать изображение")').click().catch(() => {});
await page.waitForTimeout(400);

let upload = { label: "image-upload", ok: false, detail: "not tested" };
const uploadBtn = page.locator('button:has-text("Загрузить изображение")').first();
if (await uploadBtn.isVisible().catch(() => false)) {
  try {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
    await page.waitForTimeout(800);
    const uploadedText = await page.locator("text=Загружено:").isVisible().catch(() => false);
    upload = { label: "image-upload", ok: uploadedText, detail: uploadedText ? "preview shown" : "file set, no preview text" };
  } catch (e) {
    upload = { label: "image-upload", ok: false, detail: String(e.message || e) };
  }
}

const activeTab = await activeTabLabel();

console.log(
  JSON.stringify(
    {
      url: URL,
      hasMobileShell: hasShell,
      activeTabAfterTests: activeTab,
      tabAfterGenerate,
      tabAfterAnalyze,
      heroHiddenAfterStart,
      clicks: [tabGenerate, tabAnalyze, cta, generateClick, upload],
      consoleErrors,
      pageErrors,
      failedResources: failedResources.slice(0, 10),
    },
    null,
    2,
  ),
);

await browser.close();
