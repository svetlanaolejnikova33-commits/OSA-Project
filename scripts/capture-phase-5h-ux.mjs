import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const URL = process.env.OSA_SCREENSHOT_URL || "http://localhost:3000/";
const OUT_DIR = path.resolve("screenshots/phase-5h-ux");

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: "msedge" });

const desktopPage = await browser.newPage({ viewport: { width: 1360, height: 900 } });
await desktopPage.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
await desktopPage.waitForTimeout(2500);
await desktopPage.screenshot({
  path: path.join(OUT_DIR, "desktop-dark-hero.png"),
  fullPage: true,
});
console.log("saved desktop");

const mobilePage = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobilePage.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
await mobilePage.waitForTimeout(2500);
await mobilePage.screenshot({
  path: path.join(OUT_DIR, "mobile-simplified.png"),
  fullPage: true,
});
console.log("saved mobile");

await browser.close();
console.log("done", OUT_DIR);
