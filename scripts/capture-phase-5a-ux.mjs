import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const URL = process.env.OSA_SCREENSHOT_URL || "http://localhost:3000/";
const OUT_DIR = path.resolve("screenshots/phase-5a-ux");

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: "msedge",
});
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT_DIR, "osa-phase-5a-ux.png"), fullPage: true });
await browser.close();

console.log("saved", path.join(OUT_DIR, "osa-phase-5a-ux.png"));
