import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const URL = process.env.OSA_SCREENSHOT_URL || "http://localhost:3000/";
const OUT_DIR = path.resolve("screenshots/phase-5d-ux");

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: "msedge",
});

const desktop = await browser.newPage({ viewport: { width: 1360, height: 900 } });
await desktop.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
await desktop.waitForTimeout(2500);
await desktop.screenshot({ path: path.join(OUT_DIR, "osa-phase-5d-desktop.png"), fullPage: true });
await desktop.close();

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
await mobile.waitForTimeout(2500);
await mobile.screenshot({ path: path.join(OUT_DIR, "osa-phase-5d-mobile.png"), fullPage: true });
await mobile.close();

await browser.close();

console.log("saved", path.join(OUT_DIR, "osa-phase-5d-desktop.png"));
console.log("saved", path.join(OUT_DIR, "osa-phase-5d-mobile.png"));
