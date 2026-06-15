import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const URL = process.env.OSA_SCREENSHOT_URL || "http://localhost:3000/";
const OUT = path.resolve("screenshots/phase-5e-desktop-refactor.png");

await mkdir(path.dirname(OUT), { recursive: true });

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: OUT, fullPage: true });
await browser.close();

console.log("saved", OUT);
