/**
 * Regression guard — Phase STABILITY semantic display contract.
 * Run: node scripts/test-compact-semantic-display.mjs
 */
import {
  buildCompactSemanticDisplay,
  buildCompactSemanticDisplayText,
} from "../app/lib/buildCompactSemanticDisplay.js";

const FIXTURE = {
  quickAnalysis: {},
  proAnalysis: {
    styleAnalysis: {
      primary: "modern",
      labelRu: "современный",
      secondary: ["арт-деко"],
    },
    designIntent: {
      summaryRu: "Современный интерьер с элементами арт-деко и латунными акцентами.",
    },
  },
  specAnalysis: {},
};

const RICH_LABEL_FIXTURE = {
  proAnalysis: {
    styleAnalysis: {
      primary: "modern",
      labelRu: "Современный с элементами арт-деко",
      secondary: ["арт-деко", "минимализм"],
    },
    designIntent: {
      summaryRu: "Светлый зал с геометрическими акцентами.",
    },
  },
};

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

const display = buildCompactSemanticDisplay(FIXTURE, "pro");
const combined = buildCompactSemanticDisplayText(display);

assert(display.styleTitle === "современный", `styleTitle expected "современный", got "${display.styleTitle}"`);
assert(combined.includes("современный"), "combined text must include современный");
assert(combined.includes("арт-деко"), "combined text must include арт-деко");
assert(display.summary.includes("арт-деко"), "summary must carry art-deco when secondary is deduped to summary");

const chipOnly = buildCompactSemanticDisplay(
  {
    proAnalysis: {
      styleAnalysis: { labelRu: "современный", secondary: ["арт-деко"] },
      designIntent: {},
    },
  },
  "pro",
);
assert(chipOnly.chips.includes("арт-деко"), "арт-деко chip must render when not present in summary");

const rich = buildCompactSemanticDisplay(RICH_LABEL_FIXTURE, "pro");
const richText = buildCompactSemanticDisplayText(rich);
assert(richText.includes("Современный с элементами арт-деко"), "rich labelRu must appear in display");
assert(
  !rich.chips.includes("арт-деко"),
  "арт-деко chip should be omitted when already present in styleTitle",
);

console.log("[compact-semantic-display] PASS");
console.log(JSON.stringify({ fixture: display, rich }, null, 2));
