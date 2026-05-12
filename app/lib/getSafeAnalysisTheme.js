const WARM_ACCENT = "#B79D8A";
const WARM_ACCENT_SOFT = "rgba(183,157,138,0.24)";

const DARK_THEME = {
  background: "rgba(35, 33, 31, 0.92)",
  cardBackground: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  textPrimary: "#F3EEE7",
  textSecondary: "rgba(243,238,231,0.72)",
  accent: WARM_ACCENT,
  chipBackground: "rgba(255,255,255,0.05)",
  chipBorder: "rgba(255,255,255,0.12)",
  chipText: "rgba(243,238,231,0.86)",
};

const LIGHT_THEME = {
  background: "rgba(255,255,255,0.78)",
  cardBackground: "rgba(255,255,255,0.62)",
  border: "rgba(0,0,0,0.06)",
  textPrimary: "rgba(43,43,43,0.94)",
  textSecondary: "rgba(110,106,102,0.88)",
  accent: WARM_ACCENT,
  chipBackground: "rgba(255,255,255,0.72)",
  chipBorder: "rgba(183,157,138,0.22)",
  chipText: "rgba(43,43,43,0.88)",
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function parseHexColor(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return {
      r: parseInt(raw.slice(1, 3), 16),
      g: parseInt(raw.slice(3, 5), 16),
      b: parseInt(raw.slice(5, 7), 16),
    };
  }
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const hex = raw.slice(1);
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  return null;
}

function parseRgbColor(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  const match = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 ? clamp01(parts[3]) : 1,
  };
}

function parseColor(value) {
  return parseHexColor(value) || parseRgbColor(value);
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(colorA, colorB) {
  const lumA = relativeLuminance(colorA);
  const lumB = relativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function pickSafeAccent(candidate, backgroundColor, fallback) {
  const accent = parseColor(candidate);
  const background = parseColor(backgroundColor);
  if (!accent || !background) return fallback;
  if (contrastRatio(accent, background) < 2.8) return fallback;
  if (relativeLuminance(accent) > 0.9 && relativeLuminance(background) > 0.75) return fallback;
  return candidate;
}

export function getSafeAnalysisTheme(semanticDraft, isDark, analysisMode = "pro") {
  const base = isDark ? DARK_THEME : LIGHT_THEME;
  const uiTheme =
    semanticDraft?.quickAnalysis?.colorAnalysis?.uiTheme ||
    semanticDraft?.colorAnalysis?.uiTheme ||
    semanticDraft?.palette?.uiTheme ||
    {};
  const accent = pickSafeAccent(uiTheme.accent, base.background, base.accent);
  const compact = analysisMode === "quick";

  return {
    ...base,
    accent,
    accentSoft: isDark ? "rgba(183,157,138,0.18)" : WARM_ACCENT_SOFT,
    panelPadding: compact ? "12px" : "16px",
    cardPadding: compact ? "12px" : "16px",
    sectionGap: compact ? "8px" : "12px",
    swatchBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)",
    swatchLabel: base.textSecondary,
  };
}

export function isLightSwatchColor(color) {
  const parsed = parseColor(color);
  if (!parsed) return false;
  return relativeLuminance(parsed) > 0.82;
}
