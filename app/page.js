'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  saveImageToDB,
  getImageFromDB,
  deleteImageFromDB,
  getAllImagesFromDB,
  isIndexedDbAvailable,
  saveSemanticAnalysisToDB,
  getSemanticAnalysesByProjectKey,
  getLatestSemanticAnalysis,
  getAllSemanticAnalysesFromDB,
} from "./lib/imageStore";
import { runMockSemanticAnalysis } from "./lib/semanticAnalysisService";
import { SemanticAnalysisCards } from "./components/SemanticAnalysisCards";

/** Atmosphere modes (image API + badges). English labels as design system. */
const ATMOSPHERE_KEYS = [
  "architectural_white",
  "soft_nordic",
  "gallery_calm",
  "quiet_contrast",
  "graphite_poetry",
  "silver_mist",
  "warm_editorial",
];

const LEGACY_ALTERNATE_KIND_KEYS = ["composition", "materials", "light", "decor", "budget", "premium", "bold"];

const ALTERNATE_KIND_KEYS = [...ATMOSPHERE_KEYS, ...LEGACY_ALTERNATE_KIND_KEYS];

const ALTERNATE_KIND_LABEL_RU = {
  composition: "Композиция",
  materials: "Материалы",
  light: "Свет",
  decor: "Декор",
  budget: "Бюджет",
  premium: "Премиум",
  bold: "Смелый креатив",
  architectural_white: "Architectural White",
  soft_nordic: "Soft Nordic",
  gallery_calm: "Gallery Calm",
  quiet_contrast: "Quiet Contrast",
  graphite_poetry: "Graphite Poetry",
  silver_mist: "Silver Mist",
  warm_editorial: "Warm Editorial",
};

const ATMOSPHERE_SWATCH = {
  architectural_white: "#F3F1EC",
  soft_nordic: "#E6EBE8",
  gallery_calm: "#D8D4CE",
  quiet_contrast: "#B8B2A8",
  graphite_poetry: "#3A3A3D",
  silver_mist: "#D9D5E3",
  warm_editorial: "#C8A78F",
};

function AtmosphereDropdown({ value, onChange, disabled, isDark }) {
  const [open, setOpen] = useState(false);
  const [menuAnim, setMenuAnim] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setMenuAnim(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMenuAnim(true));
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const t = setTimeout(() => {
      document.addEventListener("mousedown", close);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = ALTERNATE_KIND_LABEL_RU[value] || value;
  const sw = ATMOSPHERE_SWATCH[value] || "#CCCCCC";

  const triggerStyle = {
    width: "100%",
    height: "52px",
    paddingLeft: "18px",
    paddingRight: "18px",
    borderRadius: "16px",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(60,50,45,0.08)",
    background: isDark ? "rgba(28,28,30,0.78)" : "rgba(255,248,244,0.82)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    color: isDark ? "#F3EEE7" : "#2B2B2B",
    fontWeight: 500,
    letterSpacing: "0.02em",
    fontSize: "14px",
    fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    boxSizing: "border-box",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  const menuStyle = {
    position: "absolute",
    left: 0,
    right: 0,
    marginTop: "10px",
    borderRadius: "18px",
    overflow: "hidden",
    background: isDark ? "rgba(24,24,26,0.96)" : "rgba(252,248,244,0.96)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
    border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(60,50,45,0.1)",
    zIndex: 50,
    opacity: menuAnim ? 1 : 0,
    transform: menuAnim ? "translateY(0)" : "translateY(-6px)",
    transition: "opacity 0.22s ease-out, transform 0.22s ease-out",
    pointerEvents: menuAnim ? "auto" : "none",
  };

  return (
    <div
      ref={rootRef}
      className="osa-atmosphere-dropdown"
      style={{
        position: "relative",
        flex: "0 1 260px",
        minWidth: "min(200px, 100%)",
        maxWidth: "280px",
        alignSelf: "stretch",
      }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Atmosphere — атмосфера визуала"
        onClick={() => !disabled && setOpen((o) => !o)}
        onMouseEnter={(e) => {
          if (disabled) return;
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = isDark
            ? "0 10px 30px rgba(0,0,0,0.28)"
            : "0 10px 24px rgba(170,150,130,0.14)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
        style={triggerStyle}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              background: sw,
              flexShrink: 0,
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.06)",
              boxSizing: "border-box",
            }}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        </span>
        <span aria-hidden style={{ opacity: 0.5, fontSize: "9px", lineHeight: 1, flexShrink: 0 }}>
          ▼
        </span>
      </button>
      {open ? (
        <div role="listbox" aria-label="Atmosphere" style={menuStyle}>
          {ATMOSPHERE_KEYS.map((k) => {
            const sel = value === k;
            const baseBg = sel
              ? isDark
                ? "rgba(210,180,155,0.06)"
                : "rgba(210,180,155,0.1)"
              : "transparent";
            return (
              <button
                key={k}
                type="button"
                role="option"
                aria-selected={sel}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark
                    ? sel
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.06)"
                    : sel
                      ? "rgba(190,170,150,0.16)"
                      : "rgba(190,170,150,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = baseBg;
                }}
                style={{
                  width: "100%",
                  minHeight: "48px",
                  paddingLeft: "18px",
                  paddingRight: "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  border: "none",
                  borderLeft: sel ? "2px solid #d2b49b" : "2px solid transparent",
                  boxSizing: "border-box",
                  background: baseBg,
                  color: isDark ? "#F3EEE7" : "#2B2B2B",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                  outline: "none",
                  WebkitTapHighlightColor: "transparent",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  boxShadow: sel
                    ? isDark
                      ? "inset 0 0 28px rgba(210,180,155,0.07)"
                      : "inset 0 0 22px rgba(210,180,155,0.11)"
                    : "none",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: ATMOSPHERE_SWATCH[k],
                    flexShrink: 0,
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)",
                    boxSizing: "border-box",
                  }}
                />
                {ALTERNATE_KIND_LABEL_RU[k]}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const OSA_VISUAL_HISTORY_KEY = "osa-visual-history-v1";
const OSA_PROJECT_PROMPTS_KEY = "osa-project-prompts-v1";
const OSA_ACTIVE_PROJECT_KEY = "osa-active-project-v1";
const OSA_ACTIVE_PROMPT_VERSION_KEY = "osa-active-prompt-version-v1";
const OSA_VISUAL_HISTORY_LEGACY_KEYS = [
  "osa-visual-history",
  "osa-visual-history-v0",
  "osa-visual-history-v1",
];

function listOsaLocalStorageKeys() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && typeof k === "string" && k.toLowerCase().startsWith("osa")) keys.push(k);
    }
    keys.sort();
    return keys;
  } catch {
    return [];
  }
}

function safeReadLocalStorageJsonArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function pickFirstNonEmptyVisualHistoryKey() {
  // Prefer current key, but fallback to any legacy keys that contain an array payload.
  const direct = safeReadLocalStorageJsonArray(OSA_VISUAL_HISTORY_KEY);
  if (direct && direct.length) return OSA_VISUAL_HISTORY_KEY;
  for (const k of OSA_VISUAL_HISTORY_LEGACY_KEYS) {
    const arr = safeReadLocalStorageJsonArray(k);
    if (arr && arr.length) return k;
  }
  // Last resort: scan any `osa-visual-history*` keys.
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || typeof k !== "string") continue;
      const low = k.toLowerCase();
      if (!low.startsWith("osa-visual-history")) continue;
      const arr = safeReadLocalStorageJsonArray(k);
      if (arr && arr.length) return k;
    }
  } catch {
    // ignore
  }
  return OSA_VISUAL_HISTORY_KEY;
}

function coercePromptVersionsMap(rawValue) {
  // Storage format (v1): { [projectKey]: PromptVersion[] }
  // Legacy format:      { [projectKey]: string }
  const out = {};
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return out;
  for (const [k, v] of Object.entries(rawValue)) {
    const projectKey = typeof k === "string" ? k.trim() : "";
    if (!projectKey) continue;
    if (Array.isArray(v)) {
      const versions = v
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : newStableId();
          const text = typeof row.text === "string" ? row.text : "";
          const title = typeof row.title === "string" ? row.title : "";
          const createdAt =
            typeof row.createdAt === "string" && row.createdAt.trim()
              ? row.createdAt
              : new Date().toISOString();
          return { id, projectKey, text, title, createdAt };
        })
        .filter(Boolean);
      out[projectKey] = versions;
    } else if (typeof v === "string") {
      // Legacy single prompt: expose as Version 1 without persisting automatically.
      out[projectKey] = [
        {
          id: newStableId(),
          projectKey,
          text: v,
          title: "Версия 1",
          createdAt: new Date().toISOString(),
          legacy: true,
        },
      ];
    }
  }
  return out;
}

function normalizePromptText(text) {
  // Requirements: trim + remove extra spaces at beginning/end (trim covers that).
  return typeof text === "string" ? text.trim() : "";
}

function loadActivePromptVersionMap() {
  try {
    const raw = localStorage.getItem(OSA_ACTIVE_PROMPT_VERSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getActivePromptVersionId(projectKey) {
  if (!projectKey || typeof projectKey !== "string") return null;
  const key = projectKey.trim();
  if (!key) return null;
  const map = loadActivePromptVersionMap();
  const v = map[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function setActivePromptVersionId(projectKey, versionId) {
  if (!projectKey || typeof projectKey !== "string") return;
  const key = projectKey.trim();
  if (!key) return;
  const map = loadActivePromptVersionMap();
  if (versionId && typeof versionId === "string" && versionId.trim()) {
    map[key] = versionId.trim();
  } else {
    delete map[key];
  }
  try {
    localStorage.setItem(OSA_ACTIVE_PROMPT_VERSION_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("OSA: failed to persist active prompt version id", e);
  }
}

function loadPromptVersionsMap() {
  try {
    const raw = localStorage.getItem(OSA_PROJECT_PROMPTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return coercePromptVersionsMap(parsed);
  } catch {
    return {};
  }
}

function getPromptVersionsForProject(projectKey) {
  if (!projectKey || typeof projectKey !== "string") return [];
  const map = loadPromptVersionsMap();
  const key = projectKey.trim();
  const rows = map[key];
  const versions = Array.isArray(rows) ? rows.slice() : [];
  versions.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return versions;
}

function getLatestPromptVersion(projectKey) {
  const versions = getPromptVersionsForProject(projectKey);
  return versions.length ? versions[versions.length - 1] : null;
}

function getStoredProjectPrompt(projectKey) {
  const latest = getLatestPromptVersion(projectKey);
  return latest && typeof latest.text === "string" ? latest.text : "";
}

function savePromptVersion(projectKey, text) {
  if (!projectKey || typeof projectKey !== "string" || !projectKey.trim()) return null;
  const key = projectKey.trim();
  const safeText = normalizePromptText(text);
  const current = loadPromptVersionsMap();
  const versions = Array.isArray(current[key]) ? current[key].filter((v) => v && typeof v === "object") : [];
  const nextIndex = versions.length + 1;
  const version = {
    id: newStableId(),
    projectKey: key,
    text: safeText,
    title: `Версия ${nextIndex}`,
    createdAt: new Date().toISOString(),
  };
  current[key] = [...versions, version];
  try {
    localStorage.setItem(OSA_PROJECT_PROMPTS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("OSA: failed to persist prompt versions", e);
  }
  return version;
}

function deletePromptVersion(projectKey, versionId) {
  if (!projectKey || typeof projectKey !== "string" || !projectKey.trim()) {
    return { ok: false, error: "missing_project_key" };
  }
  if (!versionId || typeof versionId !== "string") {
    return { ok: false, error: "missing_version_id" };
  }
  const key = projectKey.trim();
  const current = loadPromptVersionsMap();
  const versions = Array.isArray(current[key]) ? current[key].filter((v) => v && typeof v === "object") : [];
  if (versions.length <= 1) {
    return { ok: false, error: "cannot_delete_last" };
  }
  const next = versions.filter((v) => String(v.id) !== versionId);
  if (next.length === versions.length) {
    return { ok: false, error: "not_found" };
  }
  current[key] = next;
  try {
    localStorage.setItem(OSA_PROJECT_PROMPTS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("OSA: failed to persist prompt versions (delete)", e);
    return { ok: false, error: "persist_failed" };
  }
  return { ok: true, versions: next };
}

function resolvePromptVersionLink(projectKey, currentText, activePromptVersionId) {
  const text = normalizePromptText(currentText);
  const activeId = typeof activePromptVersionId === "string" && activePromptVersionId.trim()
    ? activePromptVersionId.trim()
    : null;
  if (!activeId) return { promptVersionId: null, promptText: text };
  const versions = getPromptVersionsForProject(projectKey);
  const active = versions.find((v) => v && String(v.id) === String(activeId)) || null;
  const activeText = active && typeof active.text === "string" ? normalizePromptText(active.text) : "";
  const isSame = activeText && activeText === text;
  return { promptVersionId: isSame ? activeId : null, promptText: text };
}

function persistActiveProjectKey(key) {
  try {
    if (key != null && String(key).trim()) {
      localStorage.setItem(OSA_ACTIVE_PROJECT_KEY, String(key).trim());
    } else {
      localStorage.removeItem(OSA_ACTIVE_PROJECT_KEY);
    }
  } catch (e) {
    console.warn("OSA: active project persist failed", e);
  }
}

function buildVisualDownloadFilename(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `osa-visual-${y}-${m}-${d}-${h}${min}${s}.png`;
}

function downloadPngFromBase64(base64, filename) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function newStableId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizePalette(p) {
  if (!p || typeof p !== "object") {
    return { base: "", accent: "", contrast: "" };
  }
  return {
    base: typeof p.base === "string" ? p.base : "",
    accent: typeof p.accent === "string" ? p.accent : "",
    contrast: typeof p.contrast === "string" ? p.contrast : "",
  };
}

function normalizeSavedVisual(item) {
  if (!item || typeof item !== "object") return null;
  if (item.id === undefined || item.id === null) return null;
  const legacyB64 = typeof item.imageBase64 === "string" && item.imageBase64.length > 0;
  const imageStored = item.imageStored === true;
  if (!legacyB64 && !imageStored) return null;
  const rawKind = item.alternateKind;
  const alternateKind =
    typeof rawKind === "string" && ALTERNATE_KIND_KEYS.includes(rawKind) ? rawKind : null;
  const projectKeyRaw = item.projectKey ?? item.conceptKey;
  const projectKey =
    typeof projectKeyRaw === "string" && projectKeyRaw.trim() ? projectKeyRaw.trim() : "";
  return {
    id: String(item.id),
    imageBase64: legacyB64 ? item.imageBase64 : "",
    promptUsed: typeof item.promptUsed === "string" ? item.promptUsed : "",
    promptText: typeof item.promptText === "string" ? item.promptText : "",
    promptVersionId: typeof item.promptVersionId === "string" ? item.promptVersionId : null,
    variationLabel: typeof item.variationLabel === "string" ? item.variationLabel : "",
    editOfVisualId: typeof item.editOfVisualId === "string" ? item.editOfVisualId : null,
    editInstruction: typeof item.editInstruction === "string" ? item.editInstruction : "",
    iterationType: typeof item.iterationType === "string" ? item.iterationType : "",
    title: typeof item.title === "string" ? item.title : "",
    style: typeof item.style === "string" ? item.style : "",
    mood: typeof item.mood === "string" ? item.mood : "",
    palette: normalizePalette(item.palette),
    projectKey,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    alternateKind,
    imageStored: imageStored || legacyB64,
  };
}

function visualToLocalStorageRecord(v) {
  return {
    id: String(v.id),
    promptUsed: typeof v.promptUsed === "string" ? v.promptUsed : "",
    promptText: typeof v.promptText === "string" ? v.promptText : "",
    promptVersionId: typeof v.promptVersionId === "string" ? v.promptVersionId : null,
    variationLabel: typeof v.variationLabel === "string" ? v.variationLabel : "",
    editOfVisualId: typeof v.editOfVisualId === "string" ? v.editOfVisualId : null,
    editInstruction: typeof v.editInstruction === "string" ? v.editInstruction : "",
    iterationType: typeof v.iterationType === "string" ? v.iterationType : "",
    title: typeof v.title === "string" ? v.title : "",
    style: typeof v.style === "string" ? v.style : "",
    mood: typeof v.mood === "string" ? v.mood : "",
    palette: normalizePalette(v.palette),
    createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
    projectKey: typeof v.projectKey === "string" ? v.projectKey : "",
    alternateKind:
      typeof v.alternateKind === "string" && ALTERNATE_KIND_KEYS.includes(v.alternateKind)
        ? v.alternateKind
        : null,
    imageStored: true,
  };
}

function buildProjectListFromVisuals(visuals) {
  const byKey = new Map();
  for (const v of visuals) {
    const key =
      typeof v.projectKey === "string" && v.projectKey.trim()
        ? v.projectKey.trim()
        : (v.title && String(v.title).trim()) || "Без названия";
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(v);
  }
  const rows = Array.from(byKey.entries()).map(([key, items]) => {
    const sorted = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const title = (sorted[0].title && String(sorted[0].title).trim()) || "Без названия";
    return {
      key,
      title,
      items: sorted,
      latest: sorted[0],
    };
  });
  const maxTs = rows.length
    ? Math.max(...rows.map((r) => new Date(r.latest.createdAt).getTime()))
    : 0;
  return rows
    .map((r) => ({
      ...r,
      status:
        new Date(r.latest.createdAt).getTime() === maxTs && maxTs > 0
          ? "в работе"
          : "черновик",
    }))
    .sort((a, b) => new Date(b.latest.createdAt) - new Date(a.latest.createdAt));
}

function persistVisualHistoryRecords(records) {
  try {
    const payload = records.map(visualToLocalStorageRecord);
    localStorage.setItem(OSA_VISUAL_HISTORY_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("OSA visual history write failed:", e);
  }
}

function resultDataMatchesActiveProject(resultData, activeProjectKey) {
  if (!resultData || !activeProjectKey) return false;
  if (resultData.projectKey && resultData.projectKey === activeProjectKey) return true;
  if (!resultData.projectKey && resultData.title === activeProjectKey) return true;
  return false;
}

function extractUserBriefFromPromptUsed(promptUsed) {
  if (!promptUsed || typeof promptUsed !== "string") return "";
  const lines = promptUsed.split("\n");
  for (const line of lines) {
    const m = line.match(/^User brief:\s*(.+)$/i);
    if (m) return m[1].trim();
  }
  return "";
}

function sampleAmbientRgbFromBase64(base64, onDone) {
  if (!base64 || typeof document === "undefined") {
    onDone(null);
    return;
  }
  const img = new Image();
  img.onload = () => {
    try {
      const w = 48;
      const h = 48;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        onDone(null);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 16) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n += 1;
      }
      if (!n) {
        onDone(null);
        return;
      }
      r = Math.round(r / n);
      g = Math.round(g / n);
      b = Math.round(b / n);
      const mix = 0.55;
      const gr = (r + g + b) / 3;
      r = Math.round(r * mix + gr * (1 - mix));
      g = Math.round(g * mix + gr * (1 - mix));
      b = Math.round(b * mix + gr * (1 - mix));
      onDone({ r, g, b });
    } catch {
      onDone(null);
    }
  };
  img.onerror = () => onDone(null);
  img.src = `data:image/png;base64,${base64}`;
}

const PROJECT_UI_SURFACE_TRANSITION =
  "background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, backdrop-filter 0.4s ease";

function inferProjectPaletteFamily(style, mood, promptUsed) {
  const corpus = [style, mood, promptUsed]
    .filter((x) => typeof x === "string" && x.trim())
    .join(" ")
    .toLowerCase();
  if (!corpus.trim()) return null;

  const score = { industrial: 0, japandi: 0, classic: 0 };
  const bump = (family, needles) => {
    for (const n of needles) {
      if (corpus.includes(n)) score[family] += n.length >= 5 ? 2 : 1;
    }
  };

  bump("industrial", [
    "industrial",
    "индустриал",
    "loft",
    "лофт",
    "concrete",
    "бетон",
    "graphite",
    "графит",
    "brutal",
    "брутал",
    "steel",
    "сталь",
    "warehouse",
    "металл",
    "metal",
    "factory",
    "urban",
    "груб",
    "труб",
    "exposed",
  ]);
  bump("japandi", [
    "japandi",
    "японди",
    "scandi",
    "сканди",
    "wabi",
    "sabi",
    "японск",
    "japanese",
    "дзен",
    "zen",
    "oak",
    "дуб",
    "light wood",
    "светлое дерев",
    "bamboo",
    "бамбук",
    "rice paper",
    "wabi-sabi",
    "kinfolk",
    "muji",
    "муджи",
  ]);
  bump("classic", [
    "classic",
    "классик",
    "neoclass",
    "неокласс",
    "traditional",
    "традиц",
    "art deco",
    "ар-деко",
    "baroque",
    "барокко",
    "bourgeois",
    "лепнин",
    "molding",
    "moulding",
    "карниз",
    "парадн",
    "palace",
    "формальн",
    "elegant",
    "элегант",
  ]);

  const max = Math.max(score.industrial, score.japandi, score.classic);
  if (max === 0) return null;
  for (const f of ["industrial", "japandi", "classic"]) {
    if (score[f] === max) return f;
  }
  return null;
}

function buildWorkspaceProjectPalette(family, isDark) {
  if (family === "industrial") {
    return {
      family,
      mainRadialExtraLight:
        "radial-gradient(42% 40% at 72% 10%, rgba(212,165,94,0.14), transparent), radial-gradient(52% 48% at 10% 88%, rgba(58,60,66,0.11), transparent),",
      mainRadialExtraDark:
        "radial-gradient(44% 42% at 68% 6%, rgba(212,165,94,0.08), transparent), radial-gradient(48% 44% at 12% 92%, rgba(72,64,58,0.32), transparent),",
      panelBackgroundLight:
        "linear-gradient(168deg, rgba(46,48,52,0.07) 0%, rgba(88,68,54,0.09) 40%, rgba(212,165,94,0.075) 100%)",
      panelBackgroundDark:
        "linear-gradient(178deg, rgba(30,32,36,0.94) 0%, rgba(38,34,30,0.9) 50%, rgba(48,40,34,0.86) 100%)",
      panelBorder: isDark ? "1px solid rgba(118,108,98,0.22)" : "1px solid rgba(58,60,64,0.14)",
      panelShadow: isDark
        ? "0 28px 72px rgba(0,0,0,0.42), 0 0 0 1px rgba(212,165,94,0.06), inset 0 1px 0 rgba(255,255,255,0.04)"
        : "0 12px 34px rgba(42,44,48,0.08), 0 2px 28px rgba(212,165,94,0.1), inset 0 1px 0 rgba(255,255,255,0.58)",
      rightBackgroundLight:
        "linear-gradient(198deg, rgba(42,44,48,0.05) 0%, rgba(255,252,248,0.52) 42%, rgba(212,165,94,0.055) 100%)",
      rightBackgroundDark:
        "linear-gradient(188deg, rgba(28,30,34,0.9) 0%, rgba(36,32,28,0.84) 100%)",
      rightBorder: isDark ? "1px solid rgba(110,100,90,0.2)" : "1px solid rgba(54,56,60,0.12)",
      rightShadow: isDark
        ? "0 18px 48px rgba(0,0,0,0.32), 0 0 0 1px rgba(212,165,94,0.05)"
        : "0 10px 28px rgba(42,44,48,0.07), 0 2px 18px rgba(212,165,94,0.09), inset 0 1px 0 rgba(255,255,255,0.52)",
      workspaceCardLight: {
        background: "linear-gradient(180deg, rgba(40,42,46,0.04), rgba(255,255,255,0.5))",
        border: "1px solid rgba(54,56,60,0.1)",
        boxShadow:
          "0 12px 32px rgba(42,44,48,0.07), 0 2px 22px rgba(212,165,94,0.08), inset 0 1px 0 rgba(255,255,255,0.55)",
      },
      workspaceCardDark: {
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        border: "1px solid rgba(120,110,100,0.14)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.22)",
      },
      imageModuleLight: {
        background: "linear-gradient(165deg, rgba(46,48,52,0.05), rgba(255,255,255,0.52))",
        border: "1px solid rgba(54,56,60,0.11)",
        boxShadow:
          "0 12px 32px rgba(42,44,48,0.07), 0 2px 24px rgba(212,165,94,0.09), inset 0 1px 0 rgba(255,255,255,0.52)",
      },
      imageModuleDark: {
        background: "linear-gradient(165deg, rgba(255,255,255,0.04), rgba(0,0,0,0.12))",
        border: "1px solid rgba(120,110,100,0.14)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.22)",
      },
      imageFrameLight: {
        border: "1px solid rgba(54,56,60,0.12)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.62), rgba(46,48,52,0.04))",
        boxShadow:
          "0 14px 36px rgba(42,44,48,0.09), 0 2px 22px rgba(212,165,94,0.1), inset 0 1px 0 rgba(255,255,255,0.48)",
      },
      imageFrameDark: {
        border: "1px solid rgba(110,100,92,0.18)",
        background: "rgba(0,0,0,0.14)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
      },
      primaryBackgroundLight: "linear-gradient(135deg, #6e625c, #9a7d68)",
      primaryBackgroundDark: "linear-gradient(135deg, #7a6d62, #5c5248)",
      primaryBoxShadow: isDark
        ? "0 12px 30px rgba(0,0,0,0.35), 0 0 28px rgba(212,165,94,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 8px 22px rgba(92,78,68,0.22), 0 0 32px rgba(212,165,94,0.2), inset 0 1px 0 rgba(255,255,255,0.35)",
      secondaryBackground: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,252,248,0.42)",
      secondaryBorder: isDark ? "1px solid rgba(120,110,100,0.2)" : "1px solid rgba(58,60,64,0.1)",
      accentBorderSelected: isDark ? "rgba(212,165,94,0.55)" : "rgba(212,165,94,0.5)",
      accentRing: isDark ? "rgba(212,165,94,0.14)" : "rgba(212,165,94,0.12)",
      chooseSelectedLight: "linear-gradient(180deg, rgba(212,165,94,0.22), rgba(110,98,92,0.12))",
      chooseSelectedDark: "linear-gradient(180deg, rgba(212,165,94,0.2), rgba(60,56,52,0.14))",
      statLightBackground:
        "linear-gradient(165deg, rgba(255,255,255,0.48) 0%, rgba(46,48,52,0.05) 52%, rgba(212,165,94,0.07) 100%)",
      statLightShadowDefault:
        "0 8px 22px rgba(42,44,48,0.07), 0 1px 0 rgba(212,165,94,0.1), inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -1px 0 rgba(0,0,0,0.02)",
      statLightShadowHover:
        "0 12px 28px rgba(42,44,48,0.09), 0 2px 0 rgba(212,165,94,0.12), inset 0 1px 0 rgba(255,255,255,0.62), inset 0 -1px 0 rgba(0,0,0,0.03)",
    };
  }

  if (family === "japandi") {
    return {
      family,
      mainRadialExtraLight:
        "radial-gradient(48% 44% at 22% 12%, rgba(196,168,130,0.14), transparent), radial-gradient(55% 50% at 82% 78%, rgba(154,170,146,0.12), transparent),",
      mainRadialExtraDark:
        "radial-gradient(46% 42% at 24% 8%, rgba(196,168,130,0.08), transparent), radial-gradient(50% 48% at 80% 85%, rgba(120,138,112,0.14), transparent),",
      panelBackgroundLight:
        "linear-gradient(168deg, rgba(252,248,240,0.82) 0%, rgba(232,223,212,0.78) 45%, rgba(154,170,146,0.14) 100%)",
      panelBackgroundDark:
        "linear-gradient(178deg, rgba(36,38,36,0.92) 0%, rgba(42,44,40,0.88) 52%, rgba(52,58,50,0.82) 100%)",
      panelBorder: isDark ? "1px solid rgba(130,142,124,0.22)" : "1px solid rgba(180,170,150,0.18)",
      panelShadow: isDark
        ? "0 28px 72px rgba(0,0,0,0.4), 0 0 0 1px rgba(154,170,146,0.08), inset 0 1px 0 rgba(255,255,255,0.04)"
        : "0 12px 34px rgba(88,82,72,0.06), 0 2px 28px rgba(154,170,146,0.12), inset 0 1px 0 rgba(255,255,255,0.62)",
      rightBackgroundLight:
        "linear-gradient(200deg, rgba(245,240,232,0.72) 0%, rgba(255,255,255,0.55) 48%, rgba(154,170,146,0.1) 100%)",
      rightBackgroundDark:
        "linear-gradient(188deg, rgba(34,36,34,0.9) 0%, rgba(44,48,42,0.84) 100%)",
      rightBorder: isDark ? "1px solid rgba(124,136,118,0.2)" : "1px solid rgba(188,178,160,0.2)",
      rightShadow: isDark
        ? "0 18px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(154,170,146,0.06)"
        : "0 10px 28px rgba(88,82,72,0.06), 0 2px 20px rgba(154,170,146,0.1), inset 0 1px 0 rgba(255,255,255,0.55)",
      workspaceCardLight: {
        background: "linear-gradient(180deg, rgba(252,248,242,0.65), rgba(255,255,255,0.52))",
        border: "1px solid rgba(188,178,160,0.16)",
        boxShadow:
          "0 12px 32px rgba(88,82,72,0.05), 0 2px 22px rgba(154,170,146,0.1), inset 0 1px 0 rgba(255,255,255,0.58)",
      },
      workspaceCardDark: {
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        border: "1px solid rgba(124,136,118,0.14)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.2)",
      },
      imageModuleLight: {
        background: "linear-gradient(165deg, rgba(245,240,232,0.55), rgba(255,255,255,0.52))",
        border: "1px solid rgba(188,178,160,0.15)",
        boxShadow:
          "0 12px 32px rgba(88,82,72,0.05), 0 2px 24px rgba(154,170,146,0.09), inset 0 1px 0 rgba(255,255,255,0.55)",
      },
      imageModuleDark: {
        background: "linear-gradient(165deg, rgba(255,255,255,0.04), rgba(0,0,0,0.12))",
        border: "1px solid rgba(124,136,118,0.14)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.2)",
      },
      imageFrameLight: {
        border: "1px solid rgba(188,178,160,0.16)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(232,223,212,0.25))",
        boxShadow:
          "0 14px 36px rgba(88,82,72,0.06), 0 2px 20px rgba(154,170,146,0.1), inset 0 1px 0 rgba(255,255,255,0.52)",
      },
      imageFrameDark: {
        border: "1px solid rgba(124,136,118,0.16)",
        background: "rgba(0,0,0,0.12)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.26)",
      },
      primaryBackgroundLight: "linear-gradient(135deg, #c4a882, #e0d2c0)",
      primaryBackgroundDark: "linear-gradient(135deg, #a89274, #7d6e5a)",
      primaryBoxShadow: isDark
        ? "0 12px 30px rgba(0,0,0,0.32), 0 0 26px rgba(196,168,130,0.12), inset 0 1px 0 rgba(255,255,255,0.1)"
        : "0 8px 22px rgba(148,128,104,0.2), 0 0 30px rgba(154,170,146,0.16), inset 0 1px 0 rgba(255,255,255,0.45)",
      secondaryBackground: isDark ? "rgba(255,255,255,0.04)" : "rgba(252,248,242,0.5)",
      secondaryBorder: isDark ? "1px solid rgba(130,142,124,0.18)" : "1px solid rgba(188,178,160,0.22)",
      accentBorderSelected: isDark ? "rgba(154,170,146,0.55)" : "rgba(154,170,146,0.48)",
      accentRing: isDark ? "rgba(154,170,146,0.14)" : "rgba(154,170,146,0.12)",
      chooseSelectedLight: "linear-gradient(180deg, rgba(196,168,130,0.22), rgba(154,170,146,0.14))",
      chooseSelectedDark: "linear-gradient(180deg, rgba(196,168,130,0.18), rgba(100,112,94,0.16))",
      statLightBackground:
        "linear-gradient(165deg, rgba(255,255,255,0.52) 0%, rgba(232,223,212,0.35) 55%, rgba(154,170,146,0.12) 100%)",
      statLightShadowDefault:
        "0 8px 22px rgba(88,82,72,0.06), 0 1px 0 rgba(154,170,146,0.12), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.02)",
      statLightShadowHover:
        "0 12px 28px rgba(88,82,72,0.08), 0 2px 0 rgba(154,170,146,0.14), inset 0 1px 0 rgba(255,255,255,0.64), inset 0 -1px 0 rgba(0,0,0,0.03)",
    };
  }

  if (family === "classic") {
    return {
      family,
      mainRadialExtraLight:
        "radial-gradient(46% 42% at 18% 14%, rgba(196,163,90,0.13), transparent), radial-gradient(52% 48% at 85% 72%, rgba(107,83,68,0.08), transparent),",
      mainRadialExtraDark:
        "radial-gradient(44% 40% at 20% 10%, rgba(196,163,90,0.07), transparent), radial-gradient(48% 44% at 82% 88%, rgba(90,72,60,0.22), transparent),",
      panelBackgroundLight:
        "linear-gradient(168deg, rgba(252,249,242,0.88) 0%, rgba(232,224,214,0.72) 45%, rgba(196,163,90,0.1) 100%)",
      panelBackgroundDark:
        "linear-gradient(178deg, rgba(38,36,34,0.94) 0%, rgba(48,42,36,0.9) 50%, rgba(58,48,40,0.84) 100%)",
      panelBorder: isDark ? "1px solid rgba(160,140,110,0.22)" : "1px solid rgba(150,138,118,0.2)",
      panelShadow: isDark
        ? "0 28px 72px rgba(0,0,0,0.42), 0 0 0 1px rgba(196,163,90,0.06), inset 0 1px 0 rgba(255,255,255,0.04)"
        : "0 12px 34px rgba(90,78,64,0.07), 0 2px 28px rgba(196,163,90,0.11), inset 0 1px 0 rgba(255,255,255,0.62)",
      rightBackgroundLight:
        "linear-gradient(198deg, rgba(252,249,242,0.78) 0%, rgba(255,255,255,0.52) 44%, rgba(196,163,90,0.07) 100%)",
      rightBackgroundDark:
        "linear-gradient(188deg, rgba(34,32,30,0.92) 0%, rgba(44,38,32,0.86) 100%)",
      rightBorder: isDark ? "1px solid rgba(150,130,108,0.2)" : "1px solid rgba(160,148,128,0.2)",
      rightShadow: isDark
        ? "0 18px 48px rgba(0,0,0,0.32), 0 0 0 1px rgba(196,163,90,0.05)"
        : "0 10px 28px rgba(90,78,64,0.06), 0 2px 20px rgba(196,163,90,0.09), inset 0 1px 0 rgba(255,255,255,0.55)",
      workspaceCardLight: {
        background: "linear-gradient(180deg, rgba(252,249,242,0.7), rgba(255,255,255,0.52))",
        border: "1px solid rgba(160,148,128,0.14)",
        boxShadow:
          "0 12px 32px rgba(90,78,64,0.06), 0 2px 22px rgba(196,163,90,0.09), inset 0 1px 0 rgba(255,255,255,0.58)",
      },
      workspaceCardDark: {
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        border: "1px solid rgba(150,130,108,0.16)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.22)",
      },
      imageModuleLight: {
        background: "linear-gradient(165deg, rgba(252,249,242,0.58), rgba(255,255,255,0.52))",
        border: "1px solid rgba(160,148,128,0.14)",
        boxShadow:
          "0 12px 32px rgba(90,78,64,0.06), 0 2px 24px rgba(196,163,90,0.08), inset 0 1px 0 rgba(255,255,255,0.55)",
      },
      imageModuleDark: {
        background: "linear-gradient(165deg, rgba(255,255,255,0.04), rgba(0,0,0,0.12))",
        border: "1px solid rgba(150,130,108,0.15)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.22)",
      },
      imageFrameLight: {
        border: "1px solid rgba(160,148,128,0.15)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.68), rgba(238,228,216,0.32))",
        boxShadow:
          "0 14px 36px rgba(90,78,64,0.07), 0 2px 20px rgba(196,163,90,0.1), inset 0 1px 0 rgba(255,255,255,0.52)",
      },
      imageFrameDark: {
        border: "1px solid rgba(150,130,108,0.17)",
        background: "rgba(0,0,0,0.12)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
      },
      primaryBackgroundLight: "linear-gradient(135deg, #b8963e, #d8c9a4)",
      primaryBackgroundDark: "linear-gradient(135deg, #9a7d34, #6e5a40)",
      primaryBoxShadow: isDark
        ? "0 12px 30px rgba(0,0,0,0.34), 0 0 28px rgba(196,163,90,0.14), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 8px 22px rgba(140,118,72,0.22), 0 0 32px rgba(196,163,90,0.18), inset 0 1px 0 rgba(255,255,255,0.42)",
      secondaryBackground: isDark ? "rgba(255,255,255,0.04)" : "rgba(252,249,242,0.48)",
      secondaryBorder: isDark ? "1px solid rgba(160,140,110,0.2)" : "1px solid rgba(160,148,128,0.2)",
      accentBorderSelected: isDark ? "rgba(196,163,90,0.55)" : "rgba(196,163,90,0.48)",
      accentRing: isDark ? "rgba(196,163,90,0.14)" : "rgba(196,163,90,0.12)",
      chooseSelectedLight: "linear-gradient(180deg, rgba(196,163,90,0.24), rgba(214,197,180,0.14))",
      chooseSelectedDark: "linear-gradient(180deg, rgba(196,163,90,0.2), rgba(90,72,58,0.16))",
      statLightBackground:
        "linear-gradient(165deg, rgba(255,255,255,0.52) 0%, rgba(238,228,216,0.38) 55%, rgba(196,163,90,0.1) 100%)",
      statLightShadowDefault:
        "0 8px 22px rgba(90,78,64,0.06), 0 1px 0 rgba(196,163,90,0.11), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.02)",
      statLightShadowHover:
        "0 12px 28px rgba(90,78,64,0.08), 0 2px 0 rgba(196,163,90,0.13), inset 0 1px 0 rgba(255,255,255,0.64), inset 0 -1px 0 rgba(0,0,0,0.03)",
    };
  }

  return null;
}

export default function Home() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [mode, setMode] = useState("generate"); // "generate" | "analyze"

  const [interiorDescription, setInteriorDescription] = useState("");
  const [resultData, setResultData] = useState(null);
  const [generateError, setGenerateError] = useState("");
  const [sessionVisualGallery, setSessionVisualGallery] = useState([]);
  const [selectedSessionVisualId, setSelectedSessionVisualId] = useState(null);
  const [imageError, setImageError] = useState("");
  const [isImageRunning, setIsImageRunning] = useState(false);
  const [imageRequestKind, setImageRequestKind] = useState(null);
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [showImagePromptDetails, setShowImagePromptDetails] = useState(false);
  const [savedVisuals, setSavedVisuals] = useState([]);
  const [analyzeImageResult, setAnalyzeImageResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerateResultVisible, setIsGenerateResultVisible] = useState(false);
  const [isAnalyzeResultVisible, setIsAnalyzeResultVisible] = useState(false);

  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState("");
  const [selectedImageFileName, setSelectedImageFileName] = useState("");
  const [selectedImageMimeType, setSelectedImageMimeType] = useState("");
  const [selectedImageDimensions, setSelectedImageDimensions] = useState({ width: 0, height: 0 });
  const [selectedImageBase64, setSelectedImageBase64] = useState("");
  const [selectedImageId, setSelectedImageId] = useState("");
  const [analyzeHistory, setAnalyzeHistory] = useState([]);
  const [isAnalyzeDropActive, setIsAnalyzeDropActive] = useState(false);
  const [activeProjectKey, setActiveProjectKey] = useState(null);
  const [atmosphereChoice, setAtmosphereChoice] = useState("architectural_white");
  const [workspaceNarrow, setWorkspaceNarrow] = useState(false);
  const [lightAmbientRgb, setLightAmbientRgb] = useState(null);
  const prevActiveProjectKeyRef = useRef(null);
  const analyzeFileInputRef = useRef(null);
  const stablePreviewBase64Ref = useRef("");
  const [promptVersions, setPromptVersions] = useState([]);
  const [visualEditInstruction, setVisualEditInstruction] = useState("");
  const [promptSaveNotice, setPromptSaveNotice] = useState("");
  const [activePromptVersionId, setActivePromptVersionIdState] = useState(null);
  const [promptHistoryOpen, setPromptHistoryOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(t);
  }, []);

  const isDark = theme === "dark";
  const isGenerateMode = mode === "generate";
  const isAnalyzeMode = mode === "analyze";
  const isGenerateLoading = isRunning && isGenerateMode;
  const isAnalyzeLoading = isRunning && isAnalyzeMode;

  const selectedSessionVisual = useMemo(() => {
    if (!sessionVisualGallery.length) return null;
    const byId = selectedSessionVisualId
      ? sessionVisualGallery.find((v) => v.id === selectedSessionVisualId)
      : null;
    return byId ?? sessionVisualGallery[0];
  }, [sessionVisualGallery, selectedSessionVisualId]);

  const previewImageBase64 = selectedSessionVisual?.imageBase64 ?? "";
  const stablePreviewImageBase64 =
    previewImageBase64 && String(previewImageBase64).trim()
      ? previewImageBase64
      : (stablePreviewBase64Ref.current || "");

  useEffect(() => {
    if (previewImageBase64 && String(previewImageBase64).trim()) {
      stablePreviewBase64Ref.current = previewImageBase64;
    }
  }, [previewImageBase64]);

  useEffect(() => {
    if (isDark || !stablePreviewImageBase64) {
      setLightAmbientRgb(null);
      return;
    }
    let cancelled = false;
    sampleAmbientRgbFromBase64(stablePreviewImageBase64, (rgb) => {
      if (!cancelled) setLightAmbientRgb(rgb);
    });
    return () => {
      cancelled = true;
    };
  }, [isDark, stablePreviewImageBase64]);

  const lightAmbientHeroOverlay = useMemo(() => {
    if (isDark || !lightAmbientRgb) return "";
    const { r, g, b } = lightAmbientRgb;
    const a = 0.1;
    return `radial-gradient(ellipse 92% 65% at 50% 28%, rgba(${r},${g},${b},${a}), transparent 68%),`;
  }, [isDark, lightAmbientRgb]);

  const lightAmbientPanelOverlay = useMemo(() => {
    if (isDark || !lightAmbientRgb) return "";
    const { r, g, b } = lightAmbientRgb;
    const a = 0.09;
    return `radial-gradient(ellipse 100% 58% at 50% 16%, rgba(${r},${g},${b},${a}), transparent 72%),`;
  }, [isDark, lightAmbientRgb]);

  const projectList = useMemo(() => buildProjectListFromVisuals(savedVisuals), [savedVisuals]);

  const rightContextVisual = useMemo(() => {
    if (!activeProjectKey || !selectedSessionVisual) return null;
    const saved = savedVisuals.find((s) => s.id === selectedSessionVisual.id);
    const title = resultData?.title || saved?.title || activeProjectKey;
    const style = resultData?.style ?? saved?.style ?? "";
    const mood = resultData?.mood ?? saved?.mood ?? "";
    const imageBase64 =
      (selectedSessionVisual.imageBase64 && String(selectedSessionVisual.imageBase64).trim()) ||
      (saved?.imageBase64 && String(saved.imageBase64).trim()) ||
      "";
    return {
      kind: saved ? "saved" : "session",
      imageBase64,
      promptUsed: selectedSessionVisual.promptUsed,
      title,
      style,
      mood,
      variantId: selectedSessionVisual.id,
      createdAt: selectedSessionVisual.createdAt,
    };
  }, [activeProjectKey, selectedSessionVisual, resultData, savedVisuals]);

  const activeProjectMeta = useMemo(() => {
    if (!activeProjectKey) return null;
    if (resultDataMatchesActiveProject(resultData, activeProjectKey)) {
      return {
        title: resultData.title,
        style: resultData.style,
        mood: resultData.mood,
      };
    }
    const proj = projectList.find((p) => p.key === activeProjectKey);
    if (proj?.latest) {
      return {
        title: proj.title,
        style: proj.latest.style ?? "",
        mood: proj.latest.mood ?? "",
      };
    }
    return {
      title: activeProjectKey,
      style: "",
      mood: "",
    };
  }, [activeProjectKey, resultData, projectList]);

  const activePromptVersion = useMemo(() => {
    if (!activeProjectKey || !activePromptVersionId) return null;
    const versions = getPromptVersionsForProject(activeProjectKey);
    return versions.find((v) => v && String(v.id) === String(activePromptVersionId)) || null;
  }, [activeProjectKey, activePromptVersionId, promptVersions.length]);

  const promptDirty = useMemo(() => {
    if (!activeProjectKey) return false;
    const current = normalizePromptText(interiorDescription);
    const activeText = activePromptVersion ? normalizePromptText(activePromptVersion.text) : "";
    if (activeText) return current !== activeText;
    // If no active version selected, compare against latest saved version (if any).
    const latest = getLatestPromptVersion(activeProjectKey);
    const latestText = latest ? normalizePromptText(latest.text) : "";
    if (!latestText) return Boolean(current);
    return current !== latestText;
  }, [activeProjectKey, interiorDescription, activePromptVersion, promptVersions.length]);

  const workspaceProjectPalette = useMemo(() => {
    if (!activeProjectKey) return null;
    const family = inferProjectPaletteFamily(
      activeProjectMeta?.style ?? "",
      activeProjectMeta?.mood ?? "",
      selectedSessionVisual?.promptUsed ?? ""
    );
    if (!family) return null;
    return buildWorkspaceProjectPalette(family, isDark);
  }, [activeProjectKey, activeProjectMeta, selectedSessionVisual?.promptUsed, isDark]);

  useEffect(() => {
    if (!selectedImagePreviewUrl) return;
    return () => URL.revokeObjectURL(selectedImagePreviewUrl);
  }, [selectedImagePreviewUrl]);

  const restoreSemanticAnalysisFromRecord = async (record) => {
    if (!record) return;
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : "";
    const imageId = typeof record.imageId === "string" ? record.imageId : "";
    const fileName = typeof record.fileName === "string" ? record.fileName : "";
    const width = Number.isFinite(record.width) ? record.width : 0;
    const height = Number.isFinite(record.height) ? record.height : 0;
    setSelectedImageFileName(fileName);
    setSelectedImageMimeType(mimeType);
    setSelectedImageDimensions({ width, height });
    setSelectedImageId(imageId);
    setAnalyzeImageResult(record.result || null);
    setIsAnalyzeResultVisible(false);
    window.setTimeout(() => setIsAnalyzeResultVisible(true), 0);

    if (imageId && isIndexedDbAvailable()) {
      try {
        const b64 = (await getImageFromDB(imageId)) || "";
        setSelectedImageBase64(b64);
        if (b64 && mimeType) {
          setSelectedImagePreviewUrl(`data:${mimeType};base64,${b64}`);
        }
      } catch (e) {
        console.warn("OSA: failed to restore analysis image:", e);
      }
    }
  };

  useEffect(() => {
    if (!activeProjectKey) return;
    if (!isIndexedDbAvailable()) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getSemanticAnalysesByProjectKey(activeProjectKey, 10);
        if (cancelled) return;
        setAnalyzeHistory(rows);
        const latest = rows && rows.length ? rows[0] : await getLatestSemanticAnalysis(activeProjectKey);
        if (!latest || cancelled) return;
        await restoreSemanticAnalysisFromRecord(latest);
      } catch (e) {
        console.warn("OSA: failed to hydrate semantic analysis history:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectKey]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    try {
      console.log("[OSA][dev] localStorage osa* keys", listOsaLocalStorageKeys());
      const active = localStorage.getItem(OSA_ACTIVE_PROJECT_KEY);
      console.log("[OSA][dev] active project key", {
        storageKey: OSA_ACTIVE_PROJECT_KEY,
        value: active && String(active).trim() ? String(active).trim() : null,
      });
    } catch (e) {
      console.warn("[OSA][dev] localStorage read failed:", e);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // Diagnostics for “Правка выбранного визуала” visibility.
    const visible = Boolean(selectedSessionVisual && mode === "generate" && resultData);
    console.log("[OSA][dev] edit visual block visible:", visible);
    console.log("[OSA][dev] selectedSessionVisual id:", selectedSessionVisual?.id || null);
  }, [selectedSessionVisual?.id, mode, resultData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const chosenHistoryKey = pickFirstNonEmptyVisualHistoryKey();
        const raw = localStorage.getItem(chosenHistoryKey);
        if (!raw) {
          if (process.env.NODE_ENV === "development") {
            console.log("[OSA] visual history: empty localStorage", {
              expectedKey: OSA_VISUAL_HISTORY_KEY,
              chosenHistoryKey,
              osaKeys: listOsaLocalStorageKeys(),
            });
          }
          if (process.env.NODE_ENV === "development" && isIndexedDbAvailable()) {
            try {
              const [images, analyses] = await Promise.all([
                getAllImagesFromDB().catch(() => []),
                getAllSemanticAnalysesFromDB().catch(() => []),
              ]);
              const visualCount = Array.isArray(images) ? images.length : 0;
              const analysisCount = Array.isArray(analyses) ? analyses.length : 0;
              const orphanImagesCount = visualCount; // no metadata → everything is orphan by definition
              console.log("[OSA][dev] indexedDB visualImages count", visualCount);
              console.log("[OSA][dev] indexedDB semanticAnalyses count", analysisCount);
              console.log("[OSA][dev] orphan images count", orphanImagesCount);
              if (orphanImagesCount > 0) {
                console.warn("Найдены изображения без metadata");
              }
            } catch (e) {
              console.warn("[OSA][dev] indexedDB counts failed:", e);
            }
          }
          return;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          console.error("OSA visual history: expected array in localStorage");
          return;
        }

        // If user has data under a legacy key, copy it into the current key (do NOT delete legacy).
        if (chosenHistoryKey !== OSA_VISUAL_HISTORY_KEY) {
          try {
            const currentArr = safeReadLocalStorageJsonArray(OSA_VISUAL_HISTORY_KEY) || [];
            const merged = [...currentArr, ...parsed];
            localStorage.setItem(OSA_VISUAL_HISTORY_KEY, JSON.stringify(merged));
            if (process.env.NODE_ENV === "development") {
              console.log("[OSA] visual history migrated (non-destructive)", {
                fromKey: chosenHistoryKey,
                toKey: OSA_VISUAL_HISTORY_KEY,
                legacyCount: parsed.length,
                existingCount: currentArr.length,
                mergedCount: merged.length,
              });
            }
          } catch (e) {
            console.warn("[OSA] visual history migration copy failed:", e);
          }
        }

        let migrated = false;
        const nextRows = [];
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const hasInline =
            typeof item.imageBase64 === "string" && item.imageBase64.length > 0;
          if (hasInline && isIndexedDbAvailable()) {
            try {
              await saveImageToDB(item.id, item.imageBase64);
              migrated = true;
              const { imageBase64, ...meta } = item;
              nextRows.push({ ...meta, imageStored: true });
            } catch (e) {
              console.error("OSA: migration to IndexedDB failed for id", item?.id, e);
              nextRows.push(item);
            }
          } else {
            nextRows.push({
              ...item,
              imageStored:
                item.imageStored === true ||
                (hasInline && !isIndexedDbAvailable()),
            });
          }
        }

        if (migrated) {
          try {
            localStorage.setItem(OSA_VISUAL_HISTORY_KEY, JSON.stringify(nextRows));
          } catch (e) {
            console.error("OSA: failed to persist migrated metadata", e);
          }
        }

        const normalized = nextRows.map(normalizeSavedVisual).filter(Boolean);
        const hydrated = await Promise.all(
          normalized.map(async (v) => {
            if (v.imageBase64 && v.imageBase64.length > 0) return v;
            if (!isIndexedDbAvailable()) return v;
            try {
              const b64 = await getImageFromDB(v.id);
              return { ...v, imageBase64: b64 || "" };
            } catch (e) {
              console.warn("OSA: hydrate image failed", v.id, e);
              return { ...v, imageBase64: "" };
            }
          })
        );

        if (cancelled) return;
        setSavedVisuals(hydrated);

        if (process.env.NODE_ENV === "development") {
          let idbImages = 0;
          let idbAnalyses = 0;
          let orphanImages = 0;
          try {
            if (isIndexedDbAvailable()) {
              const all = await getAllImagesFromDB();
              idbImages = all.length;
              const metaIds = new Set(hydrated.map((v) => String(v.id)));
              orphanImages = all.reduce((acc, row) => {
                const id = row && row.id != null ? String(row.id) : "";
                if (!id) return acc;
                return metaIds.has(id) ? acc : acc + 1;
              }, 0);
            }
          } catch (e) {
            console.warn("[OSA] getAllImagesFromDB:", e);
          }
          try {
            if (isIndexedDbAvailable()) {
              const allA = await getAllSemanticAnalysesFromDB();
              idbAnalyses = allA.length;
            }
          } catch (e) {
            console.warn("[OSA] getAllSemanticAnalysesFromDB:", e);
          }
          console.log("[OSA][dev] indexedDB visualImages count", idbImages);
          console.log("[OSA][dev] indexedDB semanticAnalyses count", idbAnalyses);
          console.log("[OSA][dev] orphan images count", orphanImages);
          if (orphanImages > 0) {
            console.warn("Найдены изображения без metadata");
          }
          const projects = buildProjectListFromVisuals(hydrated);
          console.log("[OSA] visual history loaded", {
            chosenHistoryKey,
            osaKeys: listOsaLocalStorageKeys(),
            metadataRecords: hydrated.length,
            idbImages,
            idbAnalyses,
            orphanImages,
            projects: projects.length,
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedSessionVisual) {
      setIsImageVisible(false);
      const id = window.requestAnimationFrame(() => setIsImageVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    setIsImageVisible(false);
  }, [selectedSessionVisual?.id]);

  useEffect(() => {
    setSelectedSessionVisualId((sel) => {
      if (!sel) return sel;
      if (sessionVisualGallery.some((v) => v.id === sel)) return sel;
      return sessionVisualGallery[0]?.id ?? null;
    });
  }, [sessionVisualGallery]);

  useEffect(() => {
    const prev = prevActiveProjectKeyRef.current;
    prevActiveProjectKeyRef.current = activeProjectKey;
    if (prev && !activeProjectKey) {
      setSessionVisualGallery([]);
      setSelectedSessionVisualId(null);
      setResultData(null);
    }
  }, [activeProjectKey]);

  useEffect(() => {
    if (!activeProjectKey) {
      setPromptVersions([]);
      setActivePromptVersionIdState(null);
      setPromptHistoryOpen(false);
      return;
    }
    setPromptVersions(getPromptVersionsForProject(activeProjectKey).slice().reverse());
    setActivePromptVersionIdState(getActivePromptVersionId(activeProjectKey));
    setPromptHistoryOpen(false);
  }, [activeProjectKey]);

  useEffect(() => {
    if (!savedVisuals.length) return;
    try {
      const raw = localStorage.getItem(OSA_ACTIVE_PROJECT_KEY);
      if (!raw || !String(raw).trim()) return;
      const key = String(raw).trim();
      const list = buildProjectListFromVisuals(savedVisuals);
      if (!list.some((p) => p.key === key)) return;
      setActiveProjectKey((prev) => (prev == null ? key : prev));
    } catch (e) {
      console.warn("OSA: restore active project failed", e);
    }
  }, [savedVisuals]);

  useEffect(() => {
    if (!activeProjectKey) return;
    const proj = projectList.find((p) => p.key === activeProjectKey);
    if (!proj?.items?.length) {
      return;
    }
    const nextGallery = proj.items.map((item) => ({
      id: item.id,
      imageBase64: item.imageBase64,
      promptUsed: item.promptUsed,
      promptText: item.promptText || "",
      promptVersionId: item.promptVersionId ?? null,
      variationLabel: item.variationLabel || "",
      editOfVisualId: item.editOfVisualId ?? null,
      editInstruction: item.editInstruction || "",
      iterationType: item.iterationType || "",
      createdAt: item.createdAt,
      alternateKind: item.alternateKind ?? null,
    }));
    setSessionVisualGallery(nextGallery);
    setSelectedSessionVisualId((sel) => {
      if (sel && nextGallery.some((x) => x.id === sel)) return sel;
      return nextGallery[0].id;
    });
    setResultData((prev) => {
      if (resultDataMatchesActiveProject(prev, activeProjectKey)) {
        const hasFullConcept =
          (prev.materials && prev.materials.length > 0) ||
          (prev.concept &&
            typeof prev.concept.planning === "string" &&
            prev.concept.planning.trim().length > 0);
        if (hasFullConcept) return prev;
      }
      const L = proj.latest;
      return {
        title: L.title || proj.title || "Без названия",
        style: L.style || "",
        mood: L.mood || "",
        palette: L.palette ?? { base: "", accent: "", contrast: "" },
        projectKey: L.projectKey || activeProjectKey,
        materials: [],
        concept: { planning: "", lighting: "", materials: "", accents: "", storage: "" },
      };
    });
    const L = proj.latest;
    const brief = extractUserBriefFromPromptUsed(L.promptUsed);
    const activeId = getActivePromptVersionId(activeProjectKey);
    const versionsAsc = getPromptVersionsForProject(activeProjectKey);
    const activeV = activeId ? versionsAsc.find((v) => v && String(v.id) === String(activeId)) : null;
    const savedPrompt = getStoredProjectPrompt(activeProjectKey);
    setInteriorDescription(() => {
      if (activeV && typeof activeV.text === "string" && normalizePromptText(activeV.text)) {
        return activeV.text;
      }
      if (savedPrompt && savedPrompt.trim()) return savedPrompt;
      if (brief) return brief;
      return `Концепция «${proj.title}»`;
    });
  }, [activeProjectKey, projectList]);

  useEffect(() => {
    if (!activeProjectKey) return;
    if (projectList.some((p) => p.key === activeProjectKey)) return;
    persistActiveProjectKey(null);
    setActiveProjectKey(null);
  }, [projectList, activeProjectKey]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1199px)");
    const update = () => setWorkspaceNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setShowImagePromptDetails(false);
  }, [activeProjectKey, selectedSessionVisual?.id]);

  const visualImageMissingStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    minHeight: "72px",
    fontSize: "11px",
    lineHeight: 1.35,
    textAlign: "center",
    padding: "6px",
    boxSizing: "border-box",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
    background: isDark ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.04)",
  };

  const mainStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "24px 20px 48px 20px",
    background: isDark
      ? `${workspaceProjectPalette?.mainRadialExtraDark ?? ""}radial-gradient(circle at 20% 20%,#32353A 0%,#1D1F22 45%,#141516 100%)`
      : `${workspaceProjectPalette?.mainRadialExtraLight ?? ""}radial-gradient(50% 50% at 20% 10%, rgba(183,157,138,0.10), transparent), radial-gradient(40% 40% at 80% 30%, rgba(160,150,190,0.08), transparent), #F3EEE7`,
    color: isDark ? "#F3EEE7" : "#2B2B2B",
    fontFamily: "Inter,sans-serif",
    transition: "background 0.4s ease, color 0.6s ease",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0px)" : "translateY(18px)",
  };

  const workspaceShellStyle = {
    width: "100%",
    maxWidth: "1680px",
    margin: "0 auto",
    boxSizing: "border-box",
  };

  const workspaceHeaderMinimalStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 0 8px 0",
    marginBottom: "4px",
    borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)",
    background: isDark ? "rgba(18,19,21,0.28)" : "rgba(255,255,255,0.55)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  };

  const workspaceGridStyle = {
    display: "grid",
    gridTemplateColumns: workspaceNarrow ? "minmax(0,1fr)" : "280px minmax(0,1fr) 320px",
    gap: "24px",
    alignItems: "start",
    width: "100%",
    boxSizing: "border-box",
  };

  const sidePanelBaseStyle = {
    borderRadius: "22px",
    padding: "20px 18px",
    boxSizing: "border-box",
    background: isDark
      ? "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))"
      : "rgba(255,255,255,0.5)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark
      ? "0 18px 48px rgba(0,0,0,0.28)"
      : "0 10px 28px rgba(0,0,0,0.05), 0 2px 16px rgba(160,150,190,0.07), inset 0 1px 0 rgba(255,255,255,0.55)",
    backdropFilter: isDark ? "blur(18px)" : "blur(12px)",
    WebkitBackdropFilter: isDark ? "blur(18px)" : "blur(12px)",
    transition: "all 0.6s ease",
    minWidth: 0,
  };

  const rightContextAsideStyle = {
    ...sidePanelBaseStyle,
    ...(workspaceProjectPalette
      ? {
          background: isDark
            ? workspaceProjectPalette.rightBackgroundDark
            : `${lightAmbientPanelOverlay}${workspaceProjectPalette.rightBackgroundLight}`,
          border: workspaceProjectPalette.rightBorder,
          boxShadow: workspaceProjectPalette.rightShadow,
          transition: PROJECT_UI_SURFACE_TRANSITION,
        }
      : {}),
  };

  const sidePanelSectionTitleStyle = {
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: "600",
    margin: "0 0 14px 2px",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
  };

  const workspaceCenterColumnStyle = {
    minWidth: 0,
    width: "100%",
  };

  const panelStyle = {
    width: "100%",
    maxWidth: "100%",
    borderRadius: "28px",
    padding: "28px 40px 52px 40px",
    textAlign: "center",
    boxSizing: "border-box",
    background: isDark
      ? workspaceProjectPalette?.panelBackgroundDark ??
        "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))"
      : `${lightAmbientPanelOverlay}${
          workspaceProjectPalette?.panelBackgroundLight ??
          "linear-gradient(168deg, rgba(246,244,250,0.55) 0%, rgba(234,232,242,0.72) 42%, rgba(238,234,228,0.88) 100%)"
        }`,
    border:
      workspaceProjectPalette?.panelBorder ??
      (isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)"),
    boxShadow:
      workspaceProjectPalette?.panelShadow ??
      (isDark
        ? "0 30px 80px rgba(0,0,0,0.34)"
        : "0 10px 30px rgba(0,0,0,0.06), 0 2px 28px rgba(160,150,190,0.08), inset 0 1px 0 rgba(255,255,255,0.6)"),
    backdropFilter: isDark ? "blur(18px)" : "blur(12px)",
    WebkitBackdropFilter: isDark ? "blur(18px)" : "blur(12px)",
    transition: workspaceProjectPalette ? PROJECT_UI_SURFACE_TRANSITION : "all 0.6s ease",
  };

  const badgeStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    padding: "8px 14px",
    borderRadius: "999px",
    marginBottom: "14px",
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.45)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
    color: isDark ? "rgba(243,238,231,0.72)" : "rgba(110,106,102,0.88)",
    transition: "all 0.6s ease",
  };

  const heroBadgeStyle = {
    ...badgeStyle,
    marginBottom: "26px",
    position: "relative",
    zIndex: 1,
  };

  const heroLogoAnchorStyle = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    marginBottom: "6px",
    zIndex: 1,
  };

  const heroLogoGlowOrbStyle = {
    position: "absolute",
    left: "50%",
    top: "48%",
    transform: "translate(-50%, -50%)",
    width: "min(720px, 110vw)",
    height: "min(720px, 110vw)",
    maxWidth: "820px",
    maxHeight: "820px",
    borderRadius: "50%",
    background: isDark
      ? "radial-gradient(circle at center, rgba(183,157,138,0.18) 0%, rgba(183,157,138,0.08) 38%, transparent 70%)"
      : "radial-gradient(circle at center, rgba(183,157,138,0.22) 0%, rgba(160,150,190,0.11) 42%, rgba(183,157,138,0.06) 58%, transparent 74%)",
    filter: "blur(42px)",
    pointerEvents: "none",
    zIndex: 0,
    opacity: visible ? 1 : 0,
    transition: "opacity 1s ease",
  };

  const heroLogoInnerWrapStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    padding: "8px 0 12px 0",
  };

  const heroSectionStyle = {
    position: "relative",
    width: "100%",
    maxWidth: "1040px",
    margin: "0 auto",
    marginTop: "clamp(4px, 1.5vw, 16px)",
    padding: "8px 12px 40px 12px",
    boxSizing: "border-box",
    textAlign: "center",
    animation: "osaHeroEnter 1.05s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both",
    background: isDark
      ? "transparent"
      : `${lightAmbientHeroOverlay}linear-gradient(to bottom, rgba(255,252,245,0.94), rgba(245,235,220,0.78), rgba(240,228,210,0.65))`,
  };

  const titleStyle = {
    fontSize: "clamp(46px, 4.8vw, 62px)",
    lineHeight: "1.05",
    fontWeight: isDark ? "600" : "650",
    letterSpacing: "-0.022em",
    margin: "0 0 24px 0",
    position: "relative",
    zIndex: 1,
    color: isDark ? "#FAFAF8" : "#2B2B2B",
    textShadow: isDark
      ? "0 2px 20px rgba(0,0,0,0.4), 0 4px 36px rgba(0,0,0,0.25)"
      : "0 2px 18px rgba(255,255,255,0.75), 0 3px 28px rgba(160,150,190,0.10)",
  };

  const textStyle = {
    maxWidth: "720px",
    margin: "0 auto 40px auto",
    fontSize: "19px",
    lineHeight: "1.72",
    color: isDark ? "rgba(243,238,231,0.74)" : "#6E6A66",
    transition: "color 0.6s ease",
    position: "relative",
    zIndex: 1,
  };

  const contextPlaceholderCardStyle = {
    marginTop: "12px",
    padding: "14px 14px",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: "1.5",
    color: isDark ? "rgba(243,238,231,0.5)" : "rgba(110,106,102,0.75)",
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)",
    border: isDark ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  };

  const primaryButton = {
    background: isDark ? "#B79D8A" : "linear-gradient(135deg, #B79D8A, #D6C5B4)",
    color: isDark ? "#141516" : "#2B2B2B",
    border: "none",
    padding: "15px 28px",
    fontSize: "16px",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isDark
      ? "0 12px 30px rgba(183,157,138,0.24)"
      : "0 8px 20px rgba(183,157,138,0.25), inset 0 1px 0 rgba(255,255,255,0.4)",
    ...(workspaceProjectPalette
      ? {
          background: isDark
            ? workspaceProjectPalette.primaryBackgroundDark
            : workspaceProjectPalette.primaryBackgroundLight,
          boxShadow: workspaceProjectPalette.primaryBoxShadow,
          transition: "background 0.4s ease, box-shadow 0.4s ease, transform 0.3s ease, filter 0.3s ease",
        }
      : {}),
  };

  const secondaryButton = {
    background: isDark ? "transparent" : "rgba(255,255,255,0.4)",
    color: isDark ? "#F3EEE7" : "#2B2B2B",
    border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.04)",
    padding: "15px 28px",
    fontSize: "16px",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isDark ? "none" : "0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.55)",
    ...(workspaceProjectPalette
      ? {
          background: workspaceProjectPalette.secondaryBackground,
          border: workspaceProjectPalette.secondaryBorder,
          transition:
            "background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, transform 0.3s ease",
        }
      : {}),
  };

  const heroCtaPrimaryStyle = {
    ...primaryButton,
    padding: "17px 36px",
    fontSize: "17px",
    borderRadius: "16px",
    minWidth: "196px",
    boxSizing: "border-box",
    transition:
      "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.38s ease, filter 0.38s ease",
  };

  const heroCtaPrimaryShadowDefault = isDark
    ? "0 14px 36px rgba(183,157,138,0.38), 0 0 30px rgba(183,157,138,0.4)"
    : "0 8px 20px rgba(183,157,138,0.25), 0 10px 26px rgba(160,150,190,0.12), 0 2px 10px rgba(0,0,0,0.05), 0 0 34px rgba(183,157,138,0.2), 0 0 52px rgba(214,197,180,0.14), inset 0 1px 0 rgba(255,255,255,0.4)";

  const heroCtaPrimaryShadowHover = isDark
    ? "0 20px 52px rgba(183,157,138,0.5), 0 0 48px rgba(183,157,138,0.45), 0 0 90px rgba(183,157,138,0.2)"
    : "0 10px 24px rgba(183,157,138,0.28), 0 14px 32px rgba(160,150,190,0.14), 0 2px 12px rgba(0,0,0,0.06), 0 0 46px rgba(183,157,138,0.28), 0 0 72px rgba(214,197,180,0.2), inset 0 1px 0 rgba(255,255,255,0.45)";

  const heroCtaSecondaryStyle = {
    ...secondaryButton,
    padding: "17px 36px",
    fontSize: "17px",
    borderRadius: "16px",
    minWidth: "196px",
    boxSizing: "border-box",
  };

  const statCardLightShadowDefault = workspaceProjectPalette
    ? workspaceProjectPalette.statLightShadowDefault
    : "0 8px 22px rgba(0,0,0,0.06), 0 1px 0 rgba(160,150,190,0.08), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.02)";
  const statCardLightShadowHover = workspaceProjectPalette
    ? workspaceProjectPalette.statLightShadowHover
    : "0 12px 28px rgba(0,0,0,0.08), 0 2px 0 rgba(160,150,190,0.1), inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.03)";

  const statStyle = {
    flex: "1 1 0",
    minWidth: "0",
    padding: "18px 20px",
    borderRadius: "18px",
    boxSizing: "border-box",
    background: isDark
      ? "rgba(255,255,255,0.04)"
      : workspaceProjectPalette
        ? workspaceProjectPalette.statLightBackground
        : "linear-gradient(165deg, rgba(255,255,255,0.52) 0%, rgba(248,245,252,0.38) 55%, rgba(252,248,242,0.42) 100%)",
    border: isDark
      ? "1px solid rgba(255,255,255,0.07)"
      : workspaceProjectPalette
        ? workspaceProjectPalette.secondaryBorder
        : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark ? "none" : statCardLightShadowDefault,
    backdropFilter: isDark ? "none" : "blur(12px)",
    WebkitBackdropFilter: isDark ? "none" : "blur(12px)",
    transition: isDark
      ? "all 0.6s ease"
      : workspaceProjectPalette
        ? "transform 0.25s ease, box-shadow 0.25s ease, background 0.4s ease, border-color 0.4s ease"
        : "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.6s ease",
  };

  const statCardLightHoverHandlers = !isDark
    ? {
        onMouseEnter: (e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = statCardLightShadowHover;
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = statCardLightShadowDefault;
        },
      }
    : {};

  const statsRowWrapperStyle = {
    width: "100%",
    maxWidth: "760px",
    margin: "0 auto",
    padding: 0,
    boxSizing: "border-box",
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    justifyContent: "center",
  };

  const workspaceCardStyle = {
    maxWidth: "760px",
    width: "100%",
    margin: "28px auto 48px auto",
    borderRadius: "22px",
    padding: "22px 20px",
    textAlign: "center",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    ...(workspaceProjectPalette
      ? {
          background: isDark
            ? workspaceProjectPalette.workspaceCardDark.background
            : workspaceProjectPalette.workspaceCardLight.background,
          border: isDark
            ? workspaceProjectPalette.workspaceCardDark.border
            : workspaceProjectPalette.workspaceCardLight.border,
          boxShadow: isDark
            ? workspaceProjectPalette.workspaceCardDark.boxShadow
            : workspaceProjectPalette.workspaceCardLight.boxShadow,
        }
      : {
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
          border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
          boxShadow: isDark
            ? "0 22px 60px rgba(0,0,0,0.18)"
            : "0 10px 30px rgba(0,0,0,0.06), 0 2px 24px rgba(160,150,190,0.07), inset 0 1px 0 rgba(255,255,255,0.58)",
        }),
    backdropFilter: isDark ? "blur(18px)" : "blur(12px)",
    WebkitBackdropFilter: isDark ? "blur(18px)" : "blur(12px)",
    transition: workspaceProjectPalette ? PROJECT_UI_SURFACE_TRANSITION : "all 0.6s ease",
  };

  const workspaceGeneratePromptBlockStyle = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    margin: "0 auto",
    padding: 0,
    boxSizing: "border-box",
    alignSelf: "stretch",
  };

  const workspaceLabelStyle = {
    marginBottom: "10px",
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: isDark ? "600" : "650",
    color: isDark ? "rgba(243,238,231,0.64)" : "#6E6A66",
  };

  const modeTabsWrapperStyle = {
    maxWidth: "680px",
    width: "100%",
    margin: "0 auto 36px auto",
    padding: "7px",
    borderRadius: "18px",
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: "6px",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.5)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark
      ? "0 20px 55px rgba(0,0,0,0.20)"
      : "0 8px 24px rgba(0,0,0,0.05), 0 1px 20px rgba(160,150,190,0.08), inset 0 1px 0 rgba(255,255,255,0.55)",
    backdropFilter: isDark ? "blur(16px)" : "blur(12px)",
    WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(12px)",
  };

  const getModeTabButtonStyle = (active) => ({
    flex: 1,
    borderRadius: "14px",
    border: "none",
    cursor: "pointer",
    padding: "14px 18px",
    fontSize: "15px",
    letterSpacing: "0.02em",
    fontWeight: active ? "650" : "520",
    color: active
      ? isDark
        ? "#F3EEE7"
        : "#2B2B2B"
      : isDark
        ? "rgba(243,238,231,0.64)"
        : "rgba(110,106,102,0.82)",
    background: active
      ? isDark
        ? "linear-gradient(180deg,rgba(183,157,138,0.24),rgba(183,157,138,0.10))"
        : "linear-gradient(180deg, rgba(183,157,138,0.22), rgba(214,197,180,0.16))"
      : "transparent",
    transition: "all 0.25s ease",
  });

  const getProjectListRowStyle = (selected) => ({
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    width: "100%",
    padding: "12px 12px",
    marginBottom: "8px",
    borderRadius: "16px",
    cursor: "pointer",
    textAlign: "left",
    border: selected
      ? isDark
        ? "1px solid rgba(183,157,138,0.45)"
        : "1px solid rgba(183,157,138,0.45)"
      : isDark
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(0,0,0,0.04)",
    background: selected
      ? isDark
        ? "linear-gradient(145deg,rgba(183,157,138,0.18),rgba(183,157,138,0.06))"
        : "linear-gradient(145deg, rgba(183,157,138,0.16), rgba(214,197,180,0.10))"
      : isDark
        ? "rgba(255,255,255,0.04)"
        : "rgba(255,255,255,0.45)",
    boxShadow: selected
      ? isDark
        ? "0 0 0 1px rgba(183,157,138,0.12), 0 12px 32px rgba(0,0,0,0.32)"
        : "0 0 0 1px rgba(183,157,138,0.12), 0 8px 22px rgba(0,0,0,0.06), 0 2px 16px rgba(160,150,190,0.10), inset 0 1px 0 rgba(255,255,255,0.45)"
      : isDark
        ? "0 6px 20px rgba(0,0,0,0.2)"
        : "0 4px 14px rgba(0,0,0,0.04), 0 1px 12px rgba(160,150,190,0.06), inset 0 1px 0 rgba(255,255,255,0.42)",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.25s ease, transform 0.2s ease",
  });

  const textareaStyle = {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    minHeight: "130px",
    margin: 0,
    padding: "14px 14px",
    borderRadius: "16px",
    border: workspaceProjectPalette
      ? workspaceProjectPalette.secondaryBorder
      : isDark
        ? "1px solid rgba(255,255,255,0.10)"
        : "1px solid rgba(0,0,0,0.04)",
    background: isDark
      ? "rgba(0,0,0,0.16)"
      : workspaceProjectPalette
        ? workspaceProjectPalette.secondaryBackground
        : "rgba(239,231,220,0.55)",
    color: isDark ? "#F3EEE7" : "#2B2B2B",
    fontSize: "15px",
    lineHeight: "1.6",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    overflowWrap: "break-word",
    textAlign: "left",
    transition: workspaceProjectPalette
      ? "background 0.4s ease, border-color 0.4s ease, color 0.3s ease"
      : "all 0.3s ease",
  };

  const actionButtonStyle = {
    ...primaryButton,
    display: "block",
    width: "100%",
    maxWidth: "320px",
    margin: "14px auto 0 auto",
    alignSelf: "center",
    boxSizing: "border-box",
    opacity: isRunning ? 0.75 : 1,
  };

  const aiResultModuleStyle = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    marginTop: "18px",
    borderRadius: "18px",
    overflow: "hidden",
    boxSizing: "border-box",
    alignSelf: "stretch",
    background: isDark ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.55)",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark
      ? "none"
      : "0 6px 22px rgba(0,0,0,0.05), 0 1px 16px rgba(160,150,190,0.07), inset 0 1px 0 rgba(255,255,255,0.52)",
    backdropFilter: isDark ? "none" : "blur(12px)",
    WebkitBackdropFilter: isDark ? "none" : "blur(12px)",
  };

  const aiResultHeaderBaseStyle = {
    padding: "16px 16px 14px 16px",
    borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
  };

  const aiResultHeaderGenerateStyle = {
    ...aiResultHeaderBaseStyle,
    background: isDark
      ? "linear-gradient(135deg, rgba(183,157,138,0.30) 0%, rgba(255,255,255,0.05) 70%)"
      : "linear-gradient(135deg, rgba(183,157,138,0.20) 0%, rgba(160,150,190,0.08) 55%, rgba(255,255,255,0.35) 100%)",
  };

  const aiResultHeaderAnalyzeStyle = {
    ...aiResultHeaderBaseStyle,
    background: isDark
      ? "linear-gradient(135deg, rgba(154,144,168,0.30) 0%, rgba(255,255,255,0.05) 70%)"
      : "linear-gradient(135deg, rgba(160,150,190,0.14) 0%, rgba(183,157,138,0.08) 50%, rgba(255,255,255,0.35) 100%)",
  };

  const aiResultHeaderTitleStyle = {
    fontSize: "13px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: "650",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(43,43,43,0.9)",
  };

  const aiResultHeaderSubtitleStyle = {
    marginTop: "8px",
    fontSize: "15px",
    lineHeight: "1.5",
    color: isDark ? "rgba(243,238,231,0.72)" : "rgba(110,106,102,0.9)",
  };

  const aiResultContentStyle = {
    padding: "16px 16px 18px 16px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };

  const aiEmptyStateStyle = {
    padding: "18px 14px",
    borderRadius: "16px",
    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.45)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark ? "none" : "0 6px 18px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
  };

  const aiEmptyTitleStyle = {
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: isDark ? "rgba(243,238,231,0.66)" : "rgba(110,106,102,0.85)",
    marginBottom: "10px",
  };

  const aiEmptyTextStyle = {
    fontSize: "15px",
    lineHeight: "1.65",
    color: isDark ? "rgba(243,238,231,0.78)" : "#6E6A66",
    whiteSpace: "pre-wrap",
  };

  const aiFieldsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
    gap: "12px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };

  const aiFieldCardBaseStyle = {
    borderRadius: "16px",
    padding: "14px 14px 12px 14px",
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)",
    boxShadow: isDark ? "none" : "0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.45)",
  };

  const aiFieldCardGenerateStyle = {
    ...aiFieldCardBaseStyle,
    border: isDark ? "1px solid rgba(183,157,138,0.22)" : "1px solid rgba(183,157,138,0.20)",
  };

  const aiFieldCardAnalyzeStyle = {
    ...aiFieldCardBaseStyle,
    border: isDark ? "1px solid rgba(154,144,168,0.22)" : "1px solid rgba(154,144,168,0.20)",
  };

  const aiFieldLabelStyle = {
    fontSize: "12px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: isDark ? "600" : "650",
    color: isDark ? "rgba(243,238,231,0.62)" : "#6E6A66",
    marginBottom: "8px",
  };

  const aiFieldValueStyle = {
    fontSize: "15px",
    lineHeight: "1.65",
    color: isDark ? "rgba(243,238,231,0.82)" : "rgba(43,43,43,0.88)",
  };

  const aiChipsContainerStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
  };

  const aiChipStyleBase = {
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    lineHeight: "1.2",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  const aiChipGenerateStyle = {
    ...aiChipStyleBase,
    borderColor: isDark ? "rgba(183,157,138,0.35)" : "rgba(183,157,138,0.32)",
    background: isDark ? "rgba(183,157,138,0.10)" : "rgba(183,157,138,0.12)",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(43,43,43,0.88)",
  };

  const aiChipAnalyzeStyle = {
    ...aiChipStyleBase,
    borderColor: isDark ? "rgba(154,144,168,0.35)" : "rgba(160,150,190,0.22)",
    background: isDark ? "rgba(154,144,168,0.10)" : "rgba(160,150,190,0.10)",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(43,43,43,0.88)",
  };

  const aiBulletListStyle = {
    margin: "8px 0 0 0",
    padding: "0 0 0 18px",
  };

  const aiBulletItemStyle = {
    color: isDark ? "rgba(243,238,231,0.82)" : "rgba(43,43,43,0.86)",
    marginBottom: "6px",
    lineHeight: "1.6",
  };

  const conceptSectionsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
    gap: "12px",
    marginTop: "10px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };

  const conceptSectionCardStyle = {
    borderRadius: "14px",
    padding: "12px 12px 10px 12px",
    background: isDark ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.52)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark ? "none" : "0 4px 14px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.48)",
  };

  const conceptSectionTitleStyle = {
    fontSize: "12px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: "650",
    color: isDark ? "rgba(243,238,231,0.78)" : "rgba(110,106,102,0.88)",
    marginBottom: "8px",
  };

  const uploadZoneStyle = {
    width: "100%",
    borderRadius: "18px",
    padding: "22px 16px",
    border: isDark ? "1px dashed rgba(255,255,255,0.18)" : "1px dashed rgba(0,0,0,0.1)",
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.45)",
    textAlign: "center",
    transition: "all 0.3s ease",
    cursor: "pointer",
    minHeight: "160px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
  };

  const uploadHintStyle = {
    fontSize: "15px",
    lineHeight: "1.6",
    color: isDark ? "rgba(243,238,231,0.78)" : "rgba(110,106,102,0.9)",
    maxWidth: "420px",
  };

  const uploadPreviewStyle = {
    width: "100%",
    maxWidth: "420px",
    borderRadius: "14px",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.04)",
    background: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.55)",
    overflow: "hidden",
    boxShadow: isDark
      ? "0 20px 55px rgba(0,0,0,0.18)"
      : "0 10px 28px rgba(0,0,0,0.06), 0 2px 20px rgba(160,150,190,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
  };

  const fileInputStyle = { display: "none" };

  const generateRevealStyle = (active) => ({
    opacity: active ? 1 : 0,
    transform: active ? "translateY(0px)" : "translateY(10px)",
    transition: "opacity 320ms ease, transform 420ms ease",
  });

  const imageModuleStyle = {
    width: "100%",
    maxWidth: "100%",
    marginTop: "14px",
    borderRadius: "18px",
    overflow: "hidden",
    boxSizing: "border-box",
    ...(workspaceProjectPalette
      ? {
          background: isDark
            ? workspaceProjectPalette.imageModuleDark.background
            : workspaceProjectPalette.imageModuleLight.background,
          border: isDark
            ? workspaceProjectPalette.imageModuleDark.border
            : workspaceProjectPalette.imageModuleLight.border,
          boxShadow: isDark
            ? workspaceProjectPalette.imageModuleDark.boxShadow
            : workspaceProjectPalette.imageModuleLight.boxShadow,
        }
      : {
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.55)",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          boxShadow: isDark
            ? "0 22px 60px rgba(0,0,0,0.18)"
            : "0 10px 30px rgba(0,0,0,0.06), 0 2px 24px rgba(160,150,190,0.07), inset 0 1px 0 rgba(255,255,255,0.55)",
        }),
    backdropFilter: isDark ? "blur(16px)" : "blur(12px)",
    WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(12px)",
    ...(workspaceProjectPalette ? { transition: PROJECT_UI_SURFACE_TRANSITION } : {}),
  };

  const imageInnerStyle = {
    padding: "14px",
    boxSizing: "border-box",
  };

  const imageFrameStyle = {
    width: "100%",
    borderRadius: "14px",
    overflow: "hidden",
    ...(workspaceProjectPalette
      ? {
          border: isDark
            ? workspaceProjectPalette.imageFrameDark.border
            : workspaceProjectPalette.imageFrameLight.border,
          background: isDark
            ? workspaceProjectPalette.imageFrameDark.background
            : workspaceProjectPalette.imageFrameLight.background,
          boxShadow: isDark
            ? workspaceProjectPalette.imageFrameDark.boxShadow
            : workspaceProjectPalette.imageFrameLight.boxShadow,
        }
      : {
          border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.04)",
          background: isDark ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.6)",
          boxShadow: isDark
            ? "0 16px 48px rgba(0,0,0,0.22)"
            : "0 12px 32px rgba(0,0,0,0.07), 0 2px 20px rgba(160,150,190,0.09), inset 0 1px 0 rgba(255,255,255,0.5)",
        }),
    ...(workspaceProjectPalette ? { transition: PROJECT_UI_SURFACE_TRANSITION } : {}),
  };

  const imageDetailsToggleStyle = {
    ...secondaryButton,
    display: "block",
    width: "100%",
    maxWidth: "280px",
    margin: "12px auto 0 auto",
    padding: "11px 18px",
    fontSize: "14px",
    borderRadius: "12px",
    boxSizing: "border-box",
    alignSelf: "center",
  };

  const imageDetailsExpandGridStyle = (open) => ({
    display: "grid",
    gridTemplateRows: open ? "1fr" : "0fr",
    marginTop: open ? "14px" : "0px",
    transition: "grid-template-rows 420ms ease, margin-top 420ms ease",
  });

  const imageDetailsExpandInnerStyle = {
    overflow: "hidden",
    minHeight: 0,
  };

  const imageDetailsPromptStyle = {
    margin: 0,
    padding: "14px 16px 16px 16px",
    borderRadius: "14px",
    textAlign: "left",
    boxSizing: "border-box",
    fontSize: "13px",
    lineHeight: "1.65",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: isDark ? "rgba(243,238,231,0.82)" : "rgba(43,43,43,0.85)",
    background: isDark ? "rgba(0,0,0,0.18)" : "rgba(239,231,220,0.35)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.5)",
  };

  const visualActionsRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
    alignItems: "stretch",
    marginTop: "16px",
    width: "100%",
    boxSizing: "border-box",
  };

  const alternateVisualButtonStyle = {
    ...secondaryButton,
    display: "block",
    flex: "1 1 200px",
    maxWidth: "320px",
    margin: "0 auto",
    padding: "15px 28px",
    fontSize: "16px",
    borderRadius: "14px",
    boxSizing: "border-box",
    alignSelf: "center",
  };

  const alternateActionsClusterStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    flex: "1 1 320px",
    maxWidth: "100%",
    justifyContent: "center",
    alignItems: "stretch",
  };

  const sessionGallerySectionStyle = {
    marginTop: "20px",
    paddingTop: "18px",
    borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
    textAlign: "left",
    boxSizing: "border-box",
  };

  const sessionGalleryTitleStyle = {
    fontSize: "12px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: "650",
    color: isDark ? "rgba(243,238,231,0.72)" : "rgba(110,106,102,0.88)",
    marginBottom: "12px",
  };

  const sessionGalleryGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
    gridAutoRows: "1fr",
    gap: "12px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };

  const getSessionGalleryCardStyle = (selected) => {
    const acc = workspaceProjectPalette?.accentBorderSelected;
    const ring = workspaceProjectPalette?.accentRing;
    return {
      borderRadius: "16px",
      padding: "10px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      height: "100%",
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)",
      border: selected
        ? isDark
          ? `2px solid ${acc ?? "rgba(183,157,138,0.55)"}`
          : `2px solid ${acc ?? "rgba(183,157,138,0.5)"}`
        : isDark
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(0,0,0,0.04)",
      boxShadow: selected
        ? isDark
          ? `0 0 0 4px ${ring ?? "rgba(183,157,138,0.12)"}, 0 16px 44px rgba(0,0,0,0.20)`
          : `0 0 0 4px ${ring ?? "rgba(183,157,138,0.12)"}, 0 8px 24px rgba(0,0,0,0.06), 0 2px 18px rgba(160,150,190,0.10), inset 0 1px 0 rgba(255,255,255,0.48)`
        : isDark
          ? "0 12px 32px rgba(0,0,0,0.14)"
          : "0 6px 18px rgba(0,0,0,0.05), 0 1px 12px rgba(160,150,190,0.06), inset 0 1px 0 rgba(255,255,255,0.45)",
      transition: "border-color 0.4s ease, box-shadow 0.4s ease",
    };
  };

  const sessionGalleryThumbStyle = {
    borderRadius: "12px",
    overflow: "hidden",
    aspectRatio: "4 / 3",
    flexShrink: 0,
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.04)",
    background: isDark ? "rgba(0,0,0,0.14)" : "rgba(239,231,220,0.35)",
    marginBottom: "10px",
  };

  const sessionGalleryVariantBadgeStyle = {
    position: "absolute",
    top: "6px",
    left: "6px",
    zIndex: 1,
    maxWidth: "calc(100% - 12px)",
    fontSize: "9px",
    fontWeight: 650,
    letterSpacing: "0.06em",
    lineHeight: 1.2,
    textTransform: "uppercase",
    padding: "3px 6px",
    borderRadius: "6px",
    boxSizing: "border-box",
    background: isDark ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.92)",
    color: isDark ? "rgba(243,238,231,0.95)" : "rgba(43,43,43,0.9)",
    border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.35)" : "0 2px 10px rgba(0,0,0,0.06), 0 1px 8px rgba(160,150,190,0.08)",
  };

  const sessionGallerySkeletonStyle = {
    borderRadius: "16px",
    padding: "14px",
    boxSizing: "border-box",
    minHeight: "200px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.4)",
    border: isDark ? "1px dashed rgba(255,255,255,0.14)" : "1px dashed rgba(0,0,0,0.1)",
  };

  const getSessionGalleryChooseButtonStyle = (selected) => {
    const acc = workspaceProjectPalette?.accentBorderSelected;
    return {
      ...secondaryButton,
      marginTop: "auto",
      width: "100%",
      padding: "9px 10px",
      fontSize: "13px",
      borderRadius: "12px",
      boxSizing: "border-box",
      cursor: selected ? "default" : "pointer",
      opacity: selected ? 0.92 : 1,
      background: selected
        ? isDark
          ? workspaceProjectPalette?.chooseSelectedDark ??
            "linear-gradient(180deg,rgba(183,157,138,0.22),rgba(183,157,138,0.10))"
          : workspaceProjectPalette?.chooseSelectedLight ??
            "linear-gradient(180deg, rgba(183,157,138,0.2), rgba(214,197,180,0.12))"
        : secondaryButton.background,
      border: selected
        ? isDark
          ? `1px solid ${acc ?? "rgba(183,157,138,0.35)"}`
          : `1px solid ${acc ?? "rgba(183,157,138,0.35)"}`
        : secondaryButton.border,
      color: selected ? (isDark ? "#F3EEE7" : "#2B2B2B") : secondaryButton.color,
    };
  };

  const savedVisualsModuleStyle = {
    width: "100%",
    maxWidth: "100%",
    marginTop: "18px",
    borderRadius: "18px",
    overflow: "hidden",
    boxSizing: "border-box",
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.55)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark
      ? "0 22px 60px rgba(0,0,0,0.18)"
      : "0 10px 28px rgba(0,0,0,0.06), 0 2px 20px rgba(160,150,190,0.07), inset 0 1px 0 rgba(255,255,255,0.52)",
    backdropFilter: isDark ? "blur(16px)" : "blur(12px)",
    WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(12px)",
  };

  const savedVisualsHeaderStyle = {
    padding: "16px 16px 12px 16px",
    borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
    textAlign: "left",
    boxSizing: "border-box",
  };

  const savedVisualsTitleStyle = {
    fontSize: "13px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: "650",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(43,43,43,0.9)",
  };

  const savedVisualsSubtitleStyle = {
    marginTop: "8px",
    fontSize: "14px",
    lineHeight: "1.5",
    color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.88)",
  };

  const savedVisualsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
    gap: "12px",
    padding: "14px 14px 16px 14px",
    boxSizing: "border-box",
  };

  const savedVisualCardStyle = {
    borderRadius: "16px",
    padding: "12px",
    textAlign: "left",
    boxSizing: "border-box",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.52)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
    boxShadow: isDark
      ? "0 14px 40px rgba(0,0,0,0.14)"
      : "0 8px 22px rgba(0,0,0,0.05), 0 1px 14px rgba(160,150,190,0.07), inset 0 1px 0 rgba(255,255,255,0.52)",
  };

  const savedVisualThumbWrapStyle = {
    borderRadius: "12px",
    overflow: "hidden",
    aspectRatio: "4 / 3",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.04)",
    background: isDark ? "rgba(0,0,0,0.14)" : "rgba(239,231,220,0.35)",
    marginBottom: "10px",
  };

  const savedVisualDateStyle = {
    fontSize: "12px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.78)",
    marginBottom: "6px",
  };

  const savedVisualCardTitleStyle = {
    fontSize: "15px",
    lineHeight: "1.45",
    fontWeight: "600",
    color: isDark ? "rgba(243,238,231,0.92)" : "rgba(43,43,43,0.92)",
    marginBottom: "12px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  const savedVisualActionsStyle = {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  };

  const savedVisualActionButtonStyle = {
    ...secondaryButton,
    flex: "1 1 auto",
    minWidth: "108px",
    padding: "9px 12px",
    fontSize: "13px",
    borderRadius: "12px",
    boxSizing: "border-box",
  };

  const handleDownloadVisualFile = async (imageBase64, createdAtIso, visualId) => {
    let b64 = imageBase64 && String(imageBase64).trim() ? imageBase64 : "";
    if (!b64 && visualId) {
      if (!isIndexedDbAvailable()) {
        window.alert(
          "IndexedDB недоступна — невозможно прочитать изображение для скачивания."
        );
        return;
      }
      try {
        b64 = (await getImageFromDB(visualId)) || "";
      } catch (e) {
        console.error(e);
        window.alert("Не удалось прочитать изображение из IndexedDB.");
        return;
      }
    }
    if (!b64) {
      window.alert("Изображение не найдено.");
      return;
    }
    const d = createdAtIso ? new Date(createdAtIso) : new Date();
    const name = buildVisualDownloadFilename(Number.isNaN(d.getTime()) ? new Date() : d);
    downloadPngFromBase64(b64, name);
  };

  const handleRemoveSavedVisual = (id) => {
    deleteImageFromDB(id);
    setSavedVisuals((prev) => {
      const next = prev.filter((x) => x.id !== id);
      persistVisualHistoryRecords(next);
      return next;
    });
  };

  const handleRemoveSessionVisual = (variantId) => {
    if (!variantId) return;
    deleteImageFromDB(variantId);
    setSessionVisualGallery((prev) => prev.filter((x) => x.id !== variantId));
    setSavedVisuals((prev) => {
      if (!prev.some((x) => x.id === variantId)) return prev;
      const next = prev.filter((x) => x.id !== variantId);
      persistVisualHistoryRecords(next);
      return next;
    });
  };

  const handleCycleSessionVariant = () => {
    if (sessionVisualGallery.length < 2) return;
    const idx = sessionVisualGallery.findIndex((v) => v.id === selectedSessionVisual?.id);
    const nextIdx = idx < 0 ? 0 : (idx + 1) % sessionVisualGallery.length;
    setSelectedSessionVisualId(sessionVisualGallery[nextIdx].id);
    setShowImagePromptDetails(false);
  };

  const handleGenerateVisual = async (isAlternate = false) => {
    if (isImageRunning) return;
    if (!resultData) return;

    const prompt = interiorDescription.trim();
    if (!prompt) return;
    if (isAlternate && sessionVisualGallery.length === 0) return;

    const atmospherePicked = ATMOSPHERE_KEYS.includes(atmosphereChoice)
      ? atmosphereChoice
      : "architectural_white";

    setImageRequestKind(isAlternate ? "alternate" : "primary");
    setIsImageRunning(true);
    setImageError("");
    setShowImagePromptDetails(false);

    try {
      const promptLink = resolvePromptVersionLink(
        activeProjectKey || resultData?.projectKey || "",
        prompt,
        activePromptVersionId
      );
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          resultData,
          atmosphere: atmospherePicked,
          isAlternate,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось сгенерировать визуал.");
      }

      const nextB64 = payload?.imageBase64 || "";
      const nextPromptUsed = payload?.promptUsed || "";
      if (!nextB64 || !nextPromptUsed) {
        throw new Error("Сервер вернул пустое изображение.");
      }

      const newItem = {
        id: newStableId(),
        imageBase64: nextB64,
        promptUsed: nextPromptUsed,
        promptText: promptLink.promptText,
        promptVersionId: promptLink.promptVersionId,
        variationLabel:
          atmospherePicked && ALTERNATE_KIND_LABEL_RU[atmospherePicked]
            ? ALTERNATE_KIND_LABEL_RU[atmospherePicked]
            : "",
        editOfVisualId: null,
        editInstruction: "",
        iterationType: "",
        createdAt: new Date().toISOString(),
        alternateKind: atmospherePicked,
      };

      setSessionVisualGallery((prev) => [...prev, newItem]);
      if (!isAlternate) {
        setSelectedSessionVisualId(newItem.id);
      }

      if (nextB64 && nextPromptUsed && resultData) {
        let projectKey = resultData.projectKey;
        if (!projectKey || !String(projectKey).trim()) {
          projectKey = newStableId();
          setResultData((prev) => (prev ? { ...prev, projectKey } : prev));
        }
        const rawPersist = {
          ...newItem,
          title: typeof resultData.title === "string" ? resultData.title : "",
          style: typeof resultData.style === "string" ? resultData.style : "",
          mood: typeof resultData.mood === "string" ? resultData.mood : "",
          palette: normalizePalette(resultData.palette),
          projectKey,
          imageStored: true,
        };
        const persistItem = normalizeSavedVisual(rawPersist);
        if (!persistItem) {
          console.error("OSA: failed to normalize visual for storage");
        } else if (!isIndexedDbAvailable()) {
          setImageError(
            "IndexedDB недоступна — визуал не будет сохранён после перезагрузки. Используйте браузер с поддержкой IndexedDB."
          );
        } else {
          try {
            await saveImageToDB(persistItem.id, nextB64);
            setSavedVisuals((prev) => {
              const next = [persistItem, ...prev.filter((x) => x.id !== persistItem.id)];
              persistVisualHistoryRecords(next);
              return next;
            });
          } catch (err) {
            console.error(err);
            setImageError(
              "Не удалось сохранить изображение в IndexedDB. Визуал виден только до перезагрузки страницы."
            );
          }
        }
      }

      window.setTimeout(() => setIsImageVisible(true), 0);
    } catch (error) {
      console.error(error);
      setImageError(error?.message || "Не удалось получить визуал. Попробуйте еще раз.");
    } finally {
      setIsImageRunning(false);
      setImageRequestKind(null);
    }
  };

  const handleCreateTextEditIteration = async () => {
    if (isImageRunning) return;
    if (!resultData) return;
    if (!selectedSessionVisual) return;
    const instruction = String(visualEditInstruction || "").trim();
    if (!instruction) return;

    if (process.env.NODE_ENV === "development") {
      console.log("[OSA][dev] selectedSessionVisual before edit", selectedSessionVisual);
      console.log("[OSA][dev] preview image source", {
        selectedSessionVisualId,
        previewLen: (previewImageBase64 || "").length,
        stablePreviewLen: (stablePreviewImageBase64 || "").length,
        isImageRunning,
        imageRequestKind,
      });
    }

    const basePrompt =
      (selectedSessionVisual.promptText && String(selectedSessionVisual.promptText).trim()) ||
      (selectedSessionVisual.promptUsed && String(selectedSessionVisual.promptUsed).trim()) ||
      interiorDescription.trim();
    if (!basePrompt) return;

    const prompt = [
      "Create a new iteration based on the previous interior concept.",
      "Keep the overall composition and room logic unless the user asks otherwise.",
      `Apply these changes: ${instruction}.`,
      "Avoid changing unrelated elements.",
      "Maintain photorealistic interior render quality.",
      "No text, no watermark, no logos.",
      "",
      "Previous concept:",
      basePrompt,
    ].join("\n");

    const atmospherePicked = ATMOSPHERE_KEYS.includes(atmosphereChoice)
      ? atmosphereChoice
      : "architectural_white";

    setImageRequestKind("text_edit");
    setIsImageRunning(true);
    setImageError("");
    setShowImagePromptDetails(false);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          resultData,
          atmosphere: atmospherePicked,
          isAlternate: false,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось создать правку.");
      }

      const nextB64 = payload?.imageBase64 || "";
      const nextPromptUsed = payload?.promptUsed || "";
      if (!nextB64 || !nextPromptUsed) {
        throw new Error("Сервер вернул пустое изображение.");
      }

      const newItem = {
        id: newStableId(),
        imageBase64: nextB64,
        promptUsed: nextPromptUsed,
        promptText: basePrompt,
        promptVersionId: selectedSessionVisual.promptVersionId ?? null,
        variationLabel: "ПРАВКА",
        editOfVisualId: selectedSessionVisual.id,
        editInstruction: instruction,
        iterationType: "text_edit",
        createdAt: new Date().toISOString(),
        alternateKind: null,
      };

      setSessionVisualGallery((prev) => [...prev, newItem]);
      setSelectedSessionVisualId(newItem.id);
      setVisualEditInstruction("");
      if (process.env.NODE_ENV === "development") {
        console.log("[OSA][dev] selectedSessionVisual after edit", newItem);
      }

      let projectKey = resultData.projectKey;
      if (!projectKey || !String(projectKey).trim()) {
        projectKey = newStableId();
        setResultData((prev) => (prev ? { ...prev, projectKey } : prev));
      }

      const rawPersist = {
        ...newItem,
        title: typeof resultData.title === "string" ? resultData.title : "",
        style: typeof resultData.style === "string" ? resultData.style : "",
        mood: typeof resultData.mood === "string" ? resultData.mood : "",
        palette: normalizePalette(resultData.palette),
        projectKey,
        imageStored: true,
      };
      const persistItem = normalizeSavedVisual(rawPersist);
      if (!persistItem) {
        console.error("OSA: failed to normalize edited visual for storage");
      } else if (!isIndexedDbAvailable()) {
        setImageError(
          "IndexedDB недоступна — визуал не будет сохранён после перезагрузки. Используйте браузер с поддержкой IndexedDB."
        );
      } else {
        try {
          await saveImageToDB(persistItem.id, nextB64);
          setSavedVisuals((prev) => {
            const next = [persistItem, ...prev.filter((x) => x.id !== persistItem.id)];
            persistVisualHistoryRecords(next);
            return next;
          });
        } catch (err) {
          console.error(err);
          setImageError(
            "Не удалось сохранить изображение в IndexedDB. Визуал виден только до перезагрузки страницы."
          );
        }
      }

      window.setTimeout(() => setIsImageVisible(true), 0);
    } catch (error) {
      console.error(error);
      setImageError(error?.message || "Не удалось создать правку. Попробуйте еще раз.");
    } finally {
      setIsImageRunning(false);
      setImageRequestKind(null);
    }
  };

  const handleGenerateInteriorConcept = async () => {
    if (isRunning) return;
    const prompt = interiorDescription.trim();
    if (!prompt) return;

    setIsRunning(true);
    setGenerateError("");
    setResultData(null);
    if (!activeProjectKey) {
      setSessionVisualGallery([]);
      setSelectedSessionVisualId(null);
    }
    setImageError("");
    setIsImageVisible(false);
    setShowImagePromptDetails(false);
    setIsGenerateResultVisible(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось сгенерировать концепцию.");
      }

      const projectKey = newStableId();
      setResultData({ ...payload, projectKey });
      window.setTimeout(() => setIsGenerateResultVisible(true), 0);
    } catch (error) {
      console.error(error);
      setGenerateError(error?.message || "Не удалось получить ответ AI. Попробуйте еще раз.");
      setResultData(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartNewProject = () => {
    persistActiveProjectKey(null);
    setActiveProjectKey(null);
    setMode("generate");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("osa-workspace-anchor")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  const handleSavePromptVersion = () => {
    if (!activeProjectKey) return;
    const currentText = normalizePromptText(interiorDescription);
    const latest = getLatestPromptVersion(activeProjectKey);
    const latestText = latest ? normalizePromptText(latest.text) : "";
    if (!currentText) return;
    if (latestText && currentText === latestText) {
      setPromptSaveNotice("Изменений нет — версия уже сохранена.");
      window.setTimeout(() => setPromptSaveNotice(""), 1800);
      setPromptVersions(getPromptVersionsForProject(activeProjectKey).slice().reverse());
      return null;
    }
    const v = savePromptVersion(activeProjectKey, currentText);
    setPromptSaveNotice("Сохранено");
    window.setTimeout(() => setPromptSaveNotice(""), 1500);
    setPromptVersions(getPromptVersionsForProject(activeProjectKey).slice().reverse());
    return v;
  };

  const handleDeletePromptVersion = (versionId) => {
    if (!activeProjectKey) return;
    const versionsAsc = getPromptVersionsForProject(activeProjectKey);
    if (versionsAsc.length <= 1) {
      setPromptSaveNotice("Нельзя удалить единственную версию промпта.");
      window.setTimeout(() => setPromptSaveNotice(""), 2000);
      return;
    }
    const deleting = versionsAsc.find((v) => v && String(v.id) === String(versionId));
    const res = deletePromptVersion(activeProjectKey, String(versionId));
    if (!res.ok) {
      if (res.error === "cannot_delete_last") {
        setPromptSaveNotice("Нельзя удалить единственную версию промпта.");
        window.setTimeout(() => setPromptSaveNotice(""), 2000);
      }
      setPromptVersions(getPromptVersionsForProject(activeProjectKey).slice().reverse());
      return;
    }
    const nextAsc = getPromptVersionsForProject(activeProjectKey);
    setPromptVersions(nextAsc.slice().reverse());

    const current = normalizePromptText(interiorDescription);
    const deletingText = deleting ? normalizePromptText(deleting.text) : "";
    if (deletingText && current === deletingText) {
      const latestNext = nextAsc.length ? nextAsc[nextAsc.length - 1] : null;
      setInteriorDescription(latestNext?.text || "");
    }
  };

  const handleMakePromptVersionCurrent = (version) => {
    if (!activeProjectKey || !version) return;
    setInteriorDescription(version.text || "");
    setActivePromptVersionIdState(version.id);
    setActivePromptVersionId(activeProjectKey, version.id);
    setPromptSaveNotice("Версия промпта активна");
    window.setTimeout(() => setPromptSaveNotice(""), 1500);
    setPromptHistoryOpen(false);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    ingestAnalyzeImageFile(file);
    try {
      e.target.value = "";
    } catch (err) {
      // ignore
    }
  };

  async function ingestAnalyzeImageFile(file) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      window.alert("Поддерживаются только JPG / PNG / WebP.");
      return;
    }

    const fileName = file.name || "image";
    const mimeType = file.type || "image/png";
    const url = URL.createObjectURL(file);

    setSelectedImageFileName(fileName);
    setSelectedImageMimeType(mimeType);
    setSelectedImagePreviewUrl(url);
    setAnalyzeImageResult(null);
    setIsAnalyzeResultVisible(false);
    setSelectedImageBase64("");
    setSelectedImageId("");
    setSelectedImageDimensions({ width: 0, height: 0 });

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("FileReader error"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

    const rawB64 = String(dataUrl).includes(",") ? String(dataUrl).split(",").pop() : "";
    setSelectedImageBase64(rawB64 || "");

    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
    setSelectedImageDimensions(dims);
  }

  const handleAnalyzeImage = async () => {
    if (isRunning) return;
    if (!selectedImagePreviewUrl || !selectedImageFileName) return;

    let projectKey = activeProjectKey;
    if (!projectKey) {
      projectKey = newStableId();
      persistActiveProjectKey(projectKey);
      setActiveProjectKey(projectKey);
    }

    const width = selectedImageDimensions?.width || 0;
    const height = selectedImageDimensions?.height || 0;

    setIsRunning(true);
    setAnalyzeImageResult(null);
    setIsAnalyzeResultVisible(false);

    try {
      const createdAt = new Date().toISOString();
      const analysisId = newStableId();
      const imageId = `analysis:${projectKey}:${analysisId}`;
      setSelectedImageId(imageId);

      // Mock latency for cinematic feel
      await new Promise((r) => window.setTimeout(r, 650 + Math.floor(Math.random() * 450)));

      const mood = activeProjectMeta?.mood ?? "";
      const result = runMockSemanticAnalysis({
        fileName: selectedImageFileName,
        width,
        height,
        mood,
        projectKey,
        paletteFamily: workspaceProjectPalette?.family ?? "",
      });

      setAnalyzeImageResult(result);
      window.setTimeout(() => setIsAnalyzeResultVisible(true), 0);

      if (isIndexedDbAvailable()) {
        if (selectedImageBase64) {
          await saveImageToDB(imageId, selectedImageBase64);
        }
        const record = {
          id: `${projectKey}::${analysisId}`,
          projectKey,
          createdAt,
          imageId,
          fileName: selectedImageFileName || "",
          mimeType: selectedImageMimeType || "image/png",
          width,
          height,
          result,
        };
        await saveSemanticAnalysisToDB(record);
        const rows = await getSemanticAnalysesByProjectKey(projectKey, 10);
        setAnalyzeHistory(rows);
      }
    } catch (e) {
      console.error(e);
      window.alert("Не удалось выполнить анализ. Попробуйте ещё раз.");
    } finally {
      setIsRunning(false);
    }
  };

  const sessionContextAligned = Boolean(
    activeProjectKey && resultDataMatchesActiveProject(resultData, activeProjectKey)
  );

  return (
    <main style={mainStyle}>
      <style>{`
        @keyframes osaContextReveal {
          from {
            opacity: 0;
            transform: translateY(14px);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes osaHeroEnter {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .osa-atmosphere-dropdown *::selection {
          background: rgba(210, 180, 155, 0.28);
          color: inherit;
        }
        .osa-atmosphere-dropdown *::-moz-selection {
          background: rgba(210, 180, 155, 0.28);
          color: inherit;
        }
      `}</style>
      <div style={workspaceShellStyle}>
        <header style={workspaceHeaderMinimalStyle} aria-label="Верхняя панель" />

        <div style={workspaceGridStyle}>
          <aside style={sidePanelBaseStyle} aria-label="Проекты">
            <div style={sidePanelSectionTitleStyle}>Проекты</div>
            {projectList.length === 0 ? (
              <div
                style={{
                  ...contextPlaceholderCardStyle,
                  marginTop: 0,
                  borderStyle: "solid",
                  borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.04)",
                  color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
                }}
              >
                Создайте первую концепцию, чтобы проект появился здесь.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  maxHeight: "min(70vh, 640px)",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {projectList.map((p) => {
                  const isSel = activeProjectKey === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      title="Открыть проект"
                      aria-pressed={isSel}
                      aria-label={`Проект: ${p.title}`}
                      onClick={() => {
                        const next = activeProjectKey === p.key ? null : p.key;
                        persistActiveProjectKey(next);
                        setActiveProjectKey(next);
                      }}
                      style={{
                        ...getProjectListRowStyle(isSel),
                        font: "inherit",
                        color: "inherit",
                        appearance: "none",
                        WebkitAppearance: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = "none";
                        e.currentTarget.style.boxShadow = isSel
                          ? isDark
                            ? "0 0 0 2px rgba(183,157,138,0.5), 0 12px 32px rgba(0,0,0,0.32)"
                            : "0 0 0 2px rgba(183,157,138,0.45), 0 8px 22px rgba(0,0,0,0.06), 0 2px 16px rgba(160,150,190,0.1)"
                          : isDark
                            ? "0 0 0 2px rgba(243,238,231,0.22), 0 6px 20px rgba(0,0,0,0.2)"
                            : "0 0 0 2px rgba(183,157,138,0.28), 0 4px 14px rgba(0,0,0,0.05), 0 1px 12px rgba(160,150,190,0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = getProjectListRowStyle(isSel).boxShadow;
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "10px",
                          overflow: "hidden",
                          flexShrink: 0,
                          background: isDark ? "rgba(0,0,0,0.2)" : "rgba(239,231,220,0.45)",
                        }}
                      >
                        {p.latest.imageBase64 && String(p.latest.imageBase64).trim() ? (
                          <img
                            src={`data:image/png;base64,${p.latest.imageBase64}`}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{ ...visualImageMissingStyle, minHeight: "48px", fontSize: "9px" }}>
                            Изображение не найдено
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.title}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            marginTop: "4px",
                            color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.78)",
                          }}
                        >
                          {new Date(p.latest.createdAt).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "10px",
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            color: isDark ? "rgba(243,238,231,0.45)" : "rgba(110,106,102,0.65)",
                          }}
                        >
                          {p.status}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div style={workspaceCenterColumnStyle}>
            <div style={panelStyle}>
        {!activeProjectKey ? (
        <div style={heroSectionStyle}>
          <div style={heroLogoAnchorStyle}>
            <div style={heroLogoGlowOrbStyle} aria-hidden />
            <div style={heroLogoInnerWrapStyle}>
              <img
                src="/logo.png"
                alt="OSA"
                style={{
                  width: workspaceNarrow ? "clamp(72px, 22vw, 90px)" : "clamp(96px, 11vw, 130px)",
                  height: "auto",
                  position: "relative",
                  zIndex: 2,
                  opacity: visible ? 0.98 : 0,
                  transform: visible ? "scale(1)" : "scale(0.94)",
                  transition: "opacity 1s ease, transform 1.1s ease",
                  display: "block",
                  boxShadow: isDark
                    ? "0 0 80px rgba(183,157,138,0.35), 0 0 160px rgba(183,157,138,0.15)"
                    : "0 0 80px rgba(183,157,138,0.25), 0 0 120px rgba(160,150,190,0.12)",
                  filter: isDark
                    ? "drop-shadow(0 12px 28px rgba(0,0,0,0.55))"
                    : "drop-shadow(0 10px 22px rgba(43,43,43,0.12))",
                }}
              />
            </div>
            <div style={heroBadgeStyle}>
              <span>Interior platform</span>
              <span aria-hidden="true">•</span>
              <span>{isDark ? "Graphite poetry" : "Silver mist"}</span>
            </div>
          </div>
          <h1 style={titleStyle}>
            Платформа, где интерьер
            <br />
            становится системой
          </h1>

          <p style={textStyle}>
            OSA помогает дизайнеру быстрее перейти от визуального образа к реальным решениям:
            материалам, брендам, подбору, логике проекта и будущей смете — в одном ясном пространстве.
          </p>

          <div style={modeTabsWrapperStyle} role="tablist" aria-label="Режимы работы">
          <button
            type="button"
            role="tab"
            aria-selected={isGenerateMode}
            onClick={() => setMode("generate")}
            style={getModeTabButtonStyle(isGenerateMode)}
          >
            Создать интерьер
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isAnalyzeMode}
            onClick={() => setMode("analyze")}
            style={getModeTabButtonStyle(isAnalyzeMode)}
          >
            Анализировать изображение
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "18px",
            flexWrap: "wrap",
            marginBottom: "8px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <button
            type="button"
            style={{ ...heroCtaPrimaryStyle, boxShadow: heroCtaPrimaryShadowDefault }}
            onClick={handleStartNewProject}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px) scale(1.04)";
              e.currentTarget.style.boxShadow = heroCtaPrimaryShadowHover;
              if (!isDark) e.currentTarget.style.filter = "brightness(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px) scale(1)";
              e.currentTarget.style.boxShadow = heroCtaPrimaryShadowDefault;
              e.currentTarget.style.filter = "";
            }}
          >
            Начать проект
          </button>

          <button
            type="button"
            style={{
              ...heroCtaSecondaryStyle,
              fontSize: "13px",
              padding: "10px 16px",
              opacity: 0.88,
            }}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.opacity = "0.88";
            }}
          >
            Тема: {isDark ? "светлая" : "тёмная"}
          </button>
        </div>
        </div>
        ) : null}

        <div id="osa-workspace-anchor" style={workspaceCardStyle}>
          {!activeProjectKey ? (
            <>
          <div style={workspaceLabelStyle}>
            {isGenerateMode ? "Создать интерьер" : "Анализировать изображение"}
          </div>

          {isGenerateMode ? (
            <>
              <div style={workspaceGeneratePromptBlockStyle}>
                <div style={{ ...workspaceLabelStyle, marginBottom: "12px" }}>Описание интерьера</div>
                <textarea
                  value={interiorDescription}
                  onChange={(e) => {
                    setInteriorDescription(e.target.value);
                    setResultData(null);
                    setGenerateError("");
                    setSessionVisualGallery([]);
                    setSelectedSessionVisualId(null);
                    setImageError("");
                    setIsImageVisible(false);
                    setShowImagePromptDetails(false);
                    setIsGenerateResultVisible(false);
                  }}
                  placeholder="Например: квартира 45м², теплое дерево + мягкая геометрия, светлая база, минимум визуального шума, максимум хранения…"
                  style={textareaStyle}
                />
              </div>

              <button
                style={actionButtonStyle}
                onClick={handleGenerateInteriorConcept}
                disabled={isRunning || !interiorDescription.trim()}
                onMouseEnter={(e) => {
                  if (isRunning) return;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  if (isRunning) return;
                  e.currentTarget.style.transform = "translateY(0px)";
                }}
              >
                {isRunning ? "Генерация..." : "Сгенерировать"}
              </button>

              <div style={aiResultModuleStyle}>
                <div style={aiResultHeaderGenerateStyle}>
                  <div style={aiResultHeaderTitleStyle}>AI Concept Builder</div>
                  <div style={aiResultHeaderSubtitleStyle}>
                    {resultData
                      ? "Концепция готова в структурированном виде"
                      : isGenerateLoading
                        ? "Формируем концепцию по описанию…"
                        : "Готовим ответ для вашего запроса"}
                  </div>
                </div>

                <div style={aiResultContentStyle}>
                  {resultData ? (
                    <div style={{ ...aiFieldsGridStyle, ...generateRevealStyle(isGenerateResultVisible) }}>
                      <div
                        style={{
                          ...aiFieldCardGenerateStyle,
                          opacity: isGenerateResultVisible ? 1 : 0,
                          transform: isGenerateResultVisible ? "translateY(0px)" : "translateY(10px)",
                          transition: "opacity 320ms ease, transform 420ms ease",
                          transitionDelay: "0ms",
                        }}
                      >
                        <div style={aiFieldLabelStyle}>Название концепции</div>
                        <div style={aiFieldValueStyle}>{resultData.title}</div>
                      </div>

                      <div
                        style={{
                          ...aiFieldCardGenerateStyle,
                          opacity: isGenerateResultVisible ? 1 : 0,
                          transform: isGenerateResultVisible ? "translateY(0px)" : "translateY(10px)",
                          transition: "opacity 320ms ease, transform 420ms ease",
                          transitionDelay: "70ms",
                        }}
                      >
                        <div style={aiFieldLabelStyle}>Стиль</div>
                        <div style={aiFieldValueStyle}>{resultData.style}</div>
                      </div>

                      <div
                        style={{
                          ...aiFieldCardGenerateStyle,
                          opacity: isGenerateResultVisible ? 1 : 0,
                          transform: isGenerateResultVisible ? "translateY(0px)" : "translateY(10px)",
                          transition: "opacity 320ms ease, transform 420ms ease",
                          transitionDelay: "140ms",
                        }}
                      >
                        <div style={aiFieldLabelStyle}>Палитра</div>
                        <div style={aiChipsContainerStyle}>
                          <span style={aiChipGenerateStyle}>{resultData.palette.base}</span>
                          <span style={aiChipGenerateStyle}>{resultData.palette.accent}</span>
                          <span style={aiChipGenerateStyle}>{resultData.palette.contrast}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          ...aiFieldCardGenerateStyle,
                          opacity: isGenerateResultVisible ? 1 : 0,
                          transform: isGenerateResultVisible ? "translateY(0px)" : "translateY(10px)",
                          transition: "opacity 320ms ease, transform 420ms ease",
                          transitionDelay: "210ms",
                        }}
                      >
                        <div style={aiFieldLabelStyle}>Материалы</div>
                        <div style={aiChipsContainerStyle}>
                          {resultData.materials.map((m) => (
                            <span key={m} style={aiChipGenerateStyle}>
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          ...aiFieldCardGenerateStyle,
                          opacity: isGenerateResultVisible ? 1 : 0,
                          transform: isGenerateResultVisible ? "translateY(0px)" : "translateY(10px)",
                          transition: "opacity 320ms ease, transform 420ms ease",
                          transitionDelay: "280ms",
                        }}
                      >
                        <div style={aiFieldLabelStyle}>Настроение</div>
                        <div style={aiFieldValueStyle}>{resultData.mood}</div>
                      </div>

                      <div
                        style={{
                          ...aiFieldCardGenerateStyle,
                          gridColumn: "1 / -1",
                          opacity: isGenerateResultVisible ? 1 : 0,
                          transform: isGenerateResultVisible ? "translateY(0px)" : "translateY(10px)",
                          transition: "opacity 320ms ease, transform 420ms ease",
                          transitionDelay: "350ms",
                        }}
                      >
                        <div style={aiFieldLabelStyle}>Концепция</div>
                        <div style={conceptSectionsGridStyle}>
                          <div style={conceptSectionCardStyle}>
                            <div style={conceptSectionTitleStyle}>Планировка</div>
                            <div style={aiFieldValueStyle}>{resultData.concept.planning}</div>
                          </div>
                          <div style={conceptSectionCardStyle}>
                            <div style={conceptSectionTitleStyle}>Свет</div>
                            <div style={aiFieldValueStyle}>{resultData.concept.lighting}</div>
                          </div>
                          <div style={conceptSectionCardStyle}>
                            <div style={conceptSectionTitleStyle}>Материалы</div>
                            <div style={aiFieldValueStyle}>{resultData.concept.materials}</div>
                          </div>
                          <div style={conceptSectionCardStyle}>
                            <div style={conceptSectionTitleStyle}>Акценты</div>
                            <div style={aiFieldValueStyle}>{resultData.concept.accents}</div>
                          </div>
                          <div style={conceptSectionCardStyle}>
                            <div style={conceptSectionTitleStyle}>Хранение</div>
                            <div style={aiFieldValueStyle}>{resultData.concept.storage}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...aiEmptyStateStyle, ...generateRevealStyle(!isGenerateLoading) }}>
                      <div style={aiEmptyTitleStyle}>Результат концепции</div>
                      <div style={aiEmptyTextStyle}>
                        {generateError
                          ? generateError
                          : isGenerateLoading
                          ? "Система анализирует ввод и формирует дизайн-концепцию…"
                          : "Опишите интерьер в поле выше и нажмите «Сгенерировать» — мы соберем концепцию в структуре."}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {resultData ? (
                <>
                  <div style={visualActionsRowStyle}>
                    <button
                      style={{ ...actionButtonStyle, marginTop: 0, flex: "1 1 200px", maxWidth: "320px" }}
                      onClick={() => handleGenerateVisual(false)}
                      disabled={isImageRunning || isRunning || !interiorDescription.trim()}
                      onMouseEnter={(e) => {
                        if (isImageRunning || isRunning) return;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        if (isImageRunning || isRunning) return;
                        e.currentTarget.style.transform = "translateY(0px)";
                      }}
                    >
                      {isImageRunning && imageRequestKind === "primary"
                        ? "Генерируем визуал..."
                        : "Сгенерировать визуал"}
                    </button>
                    <div style={alternateActionsClusterStyle}>
                      <AtmosphereDropdown
                        value={atmosphereChoice}
                        onChange={setAtmosphereChoice}
                        disabled={isImageRunning || isRunning}
                        isDark={isDark}
                      />
                      <button
                        style={{
                          ...alternateVisualButtonStyle,
                          flex: "1 1 200px",
                          maxWidth: "320px",
                          margin: 0,
                          alignSelf: "stretch",
                        }}
                        onClick={() => handleGenerateVisual(true)}
                        disabled={
                          isImageRunning ||
                          isRunning ||
                          !interiorDescription.trim() ||
                          sessionVisualGallery.length === 0
                        }
                        onMouseEnter={(e) => {
                          if (isImageRunning || isRunning || sessionVisualGallery.length === 0) return;
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          if (isImageRunning || isRunning) return;
                          e.currentTarget.style.transform = "translateY(0px)";
                        }}
                      >
                        {isImageRunning && imageRequestKind === "alternate"
                          ? "Создаем вариант..."
                          : "Сгенерировать альтернативу"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      ...imageModuleStyle,
                      ...generateRevealStyle(
                        !!(sessionVisualGallery.length || imageError || isImageRunning)
                      ),
                    }}
                  >
                    <div style={imageInnerStyle}>
                      {imageError ? (
                        <div style={aiEmptyTextStyle}>{imageError}</div>
                      ) : stablePreviewImageBase64 && String(stablePreviewImageBase64).trim() ? (
                        <>
                          <div style={{ ...imageFrameStyle, ...generateRevealStyle(isImageVisible) }}>
                            <img
                              src={`data:image/png;base64,${stablePreviewImageBase64}`}
                              alt="Сгенерированный визуал интерьера"
                              style={{ width: "100%", height: "auto", display: "block" }}
                            />
                          </div>
                        </>
                      ) : sessionVisualGallery.length > 0 ? (
                        <div
                          style={{
                            ...imageFrameStyle,
                            ...generateRevealStyle(isImageVisible),
                            maxWidth: "min(100%, 960px)",
                            marginLeft: "auto",
                            marginRight: "auto",
                          }}
                        >
                          <div style={{ ...visualImageMissingStyle, minHeight: "200px" }}>
                            Изображение не найдено
                          </div>
                        </div>
                      ) : isImageRunning && imageRequestKind === "primary" ? (
                        <div style={sessionGallerySkeletonStyle}>
                          <div style={aiEmptyTextStyle}>Генерируем визуал...</div>
                        </div>
                      ) : (
                        <div style={aiEmptyTextStyle}>
                          Нажмите «Сгенерировать визуал», чтобы получить рендер по текущей концепции.
                        </div>
                      )}

                      {sessionVisualGallery.length > 0 ? (
                        <div style={sessionGallerySectionStyle}>
                          <div style={sessionGalleryTitleStyle}>Варианты для этой концепции</div>
                          <div style={sessionGalleryGridStyle}>
                            {sessionVisualGallery.map((item, index) => {
                              const isSel = selectedSessionVisual?.id === item.id;
                              return (
                                <div key={item.id} style={getSessionGalleryCardStyle(isSel)}>
                                  <div style={{ position: "relative", ...sessionGalleryThumbStyle }}>
                                    <span style={sessionGalleryVariantBadgeStyle}>
                                      {item.iterationType === "text_edit"
                                        ? "ПРАВКА"
                                        : item.variationLabel
                                          ? item.variationLabel
                                          : item.alternateKind && ALTERNATE_KIND_LABEL_RU[item.alternateKind]
                                            ? ALTERNATE_KIND_LABEL_RU[item.alternateKind]
                                            : "Основной"}
                                    </span>
                                    {item.imageBase64 && String(item.imageBase64).trim() ? (
                                      <img
                                        src={`data:image/png;base64,${item.imageBase64}`}
                                        alt={`Вариант ${index + 1}`}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          display: "block",
                                        }}
                                      />
                                    ) : (
                                      <div style={visualImageMissingStyle}>Изображение не найдено</div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    style={getSessionGalleryChooseButtonStyle(isSel)}
                                    disabled={isSel}
                                    onClick={() => {
                                      setSelectedSessionVisualId(item.id);
                                      setShowImagePromptDetails(false);
                                    }}
                                    onMouseEnter={(e) => {
                                      if (isSel) return;
                                      e.currentTarget.style.transform = "translateY(-1px)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = "translateY(0px)";
                                    }}
                                  >
                                    {isSel ? "Выбрано" : "Выбрать"}
                                  </button>
                                </div>
                              );
                            })}
                            {isImageRunning && imageRequestKind === "alternate" ? (
                              <div style={sessionGallerySkeletonStyle}>
                                <div style={aiEmptyTextStyle}>Создаем вариант...</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {selectedSessionVisual ? (
                        <div
                          style={{
                            marginTop: "18px",
                            padding: "14px 14px",
                            borderRadius: "14px",
                            textAlign: "left",
                            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.45)",
                            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
                            boxShadow: isDark
                              ? "none"
                              : "0 4px 14px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.48)",
                            backdropFilter: isDark ? "blur(16px)" : "blur(12px)",
                            WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(12px)",
                          }}
                        >
                          <div style={{ ...aiFieldLabelStyle, marginBottom: "6px" }}>
                            Правка выбранного визуала
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              lineHeight: 1.45,
                              marginBottom: "10px",
                              color: isDark ? "rgba(243,238,231,0.70)" : "rgba(110,106,102,0.88)",
                            }}
                          >
                            Создать новую итерацию на основе текущего варианта
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                            <span style={{ opacity: 0.6, fontSize: "12px" }}>Текущий вариант:</span>
                            <span style={{ ...aiChipAnalyzeStyle, padding: "6px 10px", borderRadius: "999px" }}>
                              {selectedSessionVisual.iterationType === "text_edit"
                                ? "ПРАВКА"
                                : selectedSessionVisual.variationLabel
                                  ? selectedSessionVisual.variationLabel
                                  : selectedSessionVisual.alternateKind &&
                                      ALTERNATE_KIND_LABEL_RU[selectedSessionVisual.alternateKind]
                                    ? ALTERNATE_KIND_LABEL_RU[selectedSessionVisual.alternateKind]
                                    : "Основной"}
                            </span>
                          </div>
                          <textarea
                            value={visualEditInstruction}
                            onChange={(e) => setVisualEditInstruction(e.target.value)}
                            placeholder="Например: убрать жёлтый оттенок, заменить кресло на более графичное, добавить белые фасады, сохранить композицию..."
                            style={{
                              ...textareaStyle,
                              minHeight: "74px",
                              marginBottom: "10px",
                            }}
                          />
                          <button
                            type="button"
                            style={{
                              ...primaryButton,
                              margin: 0,
                              padding: "12px 18px",
                              fontSize: "14px",
                              borderRadius: "12px",
                              boxSizing: "border-box",
                              opacity: isImageRunning ? 0.65 : 1,
                            }}
                            disabled={isImageRunning || !String(visualEditInstruction || "").trim()}
                            onClick={handleCreateTextEditIteration}
                            onMouseEnter={(e) => {
                              if (isImageRunning) return;
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              if (isImageRunning) return;
                              e.currentTarget.style.transform = "translateY(0px)";
                            }}
                          >
                            {isImageRunning && imageRequestKind === "text_edit" ? "Создаем…" : "Создать правку"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <>
              <div
                style={{
                  ...uploadZoneStyle,
                  border: isAnalyzeDropActive
                    ? isDark
                      ? "1px dashed rgba(183,157,138,0.55)"
                      : "1px dashed rgba(183,157,138,0.60)"
                    : uploadZoneStyle.border,
                  background: isAnalyzeDropActive
                    ? isDark
                      ? "rgba(183,157,138,0.10)"
                      : "rgba(255,255,255,0.62)"
                    : uploadZoneStyle.background,
                  boxShadow: isAnalyzeDropActive
                    ? isDark
                      ? "0 18px 60px rgba(183,157,138,0.10)"
                      : "0 12px 36px rgba(183,157,138,0.12)"
                    : "none",
                }}
                role="button"
                tabIndex={0}
                onClick={() => analyzeFileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") analyzeFileInputRef.current?.click();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAnalyzeDropActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAnalyzeDropActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAnalyzeDropActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAnalyzeDropActive(false);
                  const file = e.dataTransfer?.files?.[0];
                  if (file) ingestAnalyzeImageFile(file);
                }}
                aria-label="Зона загрузки изображения"
              >
                <input
                  ref={analyzeFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  style={fileInputStyle}
                />

                {selectedImagePreviewUrl ? (
                  <>
                    <div style={uploadPreviewStyle}>
                      <img
                        src={selectedImagePreviewUrl}
                        alt="Предпросмотр загруженного изображения"
                        style={{ width: "100%", display: "block" }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.5,
                        color: isDark ? "rgba(243,238,231,0.70)" : "rgba(110,106,102,0.88)",
                      }}
                    >
                      {selectedImageFileName}
                      {selectedImageDimensions?.width && selectedImageDimensions?.height
                        ? ` · ${selectedImageDimensions.width}×${selectedImageDimensions.height}`
                        : ""}
                    </div>
                    <button
                      type="button"
                      style={{
                        ...secondaryButton,
                        margin: 0,
                        padding: "10px 16px",
                        fontSize: "14px",
                        borderRadius: "12px",
                        boxSizing: "border-box",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        analyzeFileInputRef.current?.click();
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0px)";
                      }}
                    >
                      Загрузить другое
                    </button>
                  </>
                ) : (
                  <div>
                    <div style={uploadHintStyle}>
                      Перетащите изображение сюда или загрузите файл кнопкой ниже
                    </div>
                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "13px",
                        color: isDark ? "rgba(243,238,231,0.60)" : "rgba(110,106,102,0.82)",
                      }}
                    >
                      JPG / PNG / WebP
                    </div>
                    <button
                      type="button"
                      style={{
                        ...primaryButton,
                        margin: "14px auto 0 auto",
                        padding: "12px 18px",
                        fontSize: "14px",
                        borderRadius: "12px",
                        boxSizing: "border-box",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        analyzeFileInputRef.current?.click();
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0px)";
                      }}
                    >
                      Загрузить изображение
                    </button>
                  </div>
                )}
              </div>

              <button
                style={actionButtonStyle}
                onClick={handleAnalyzeImage}
                disabled={isRunning || !selectedImagePreviewUrl}
                onMouseEnter={(e) => {
                  if (isRunning) return;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  if (isRunning) return;
                  e.currentTarget.style.transform = "translateY(0px)";
                }}
              >
                {isRunning ? "Анализируем…" : "Анализировать интерьер"}
              </button>

              <div style={aiResultModuleStyle}>
                <div style={aiResultHeaderAnalyzeStyle}>
                  <div style={aiResultHeaderTitleStyle}>OSA Semantic Analysis</div>
                  <div style={aiResultHeaderSubtitleStyle}>
                    {analyzeImageResult
                      ? "Семантический разбор готов"
                      : isAnalyzeLoading
                        ? "Собираем семантику, палитру и материалы…"
                        : "Загрузите изображение и нажмите «Анализировать интерьер»"}
                  </div>
                </div>

                <div style={aiResultContentStyle}>
                  {analyzeImageResult ? (
                    <>
                      <SemanticAnalysisCards
                        result={analyzeImageResult}
                        revealStyle={generateRevealStyle(isAnalyzeResultVisible)}
                        cardStyle={aiFieldCardAnalyzeStyle}
                        labelStyle={aiFieldLabelStyle}
                        valueStyle={aiFieldValueStyle}
                        chipStyle={aiChipAnalyzeStyle}
                      />

                      {Array.isArray(analyzeHistory) && analyzeHistory.length > 0 ? (
                        <div style={{ marginTop: "14px" }}>
                          <div style={{ ...aiFieldLabelStyle, marginBottom: "10px" }}>HISTORY</div>
                          <div style={aiChipsContainerStyle}>
                            {analyzeHistory.slice(0, 5).map((row) => (
                              <button
                                key={row.id}
                                type="button"
                                style={{
                                  ...aiChipAnalyzeStyle,
                                  cursor: "pointer",
                                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
                                }}
                                onClick={() => restoreSemanticAnalysisFromRecord(row)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateY(0px)";
                                }}
                              >
                                {(row.fileName ? String(row.fileName).slice(0, 18) : "analysis") +
                                  (row.fileName && String(row.fileName).length > 18 ? "…" : "")}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div style={aiEmptyStateStyle}>
                      <div style={aiEmptyTitleStyle}>Результат анализа</div>
                      <div style={aiEmptyTextStyle}>
                        {isAnalyzeLoading
                          ? "Система формирует стиль, материалы, палитру, объекты и атмосферу…"
                          : "Загрузите изображение и нажмите «Анализировать интерьер» — появится cinematic semantic-разбор."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <div style={workspaceLabelStyle}>Рабочая зона проекта</div>
                <button
                  type="button"
                  style={{
                    ...secondaryButton,
                    margin: 0,
                    padding: "9px 14px",
                    fontSize: "13px",
                    borderRadius: "12px",
                    boxSizing: "border-box",
                  }}
                  onClick={() => {
                    persistActiveProjectKey(null);
                    setActiveProjectKey(null);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0px)";
                  }}
                >
                  Новая концепция
                </button>
              </div>
              {activeProjectMeta ? (
                <div style={{ textAlign: "left", marginBottom: "18px" }}>
                  <h2
                    style={{
                      fontSize: "clamp(22px, 4vw, 30px)",
                      fontWeight: 650,
                      margin: "0 0 8px 0",
                      lineHeight: 1.2,
                      color: isDark ? "rgba(243,238,231,0.96)" : "rgba(43,43,43,0.94)",
                    }}
                  >
                    {activeProjectMeta.title}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      lineHeight: 1.55,
                      color: isDark ? "rgba(243,238,231,0.68)" : "rgba(110,106,102,0.88)",
                    }}
                  >
                    {[activeProjectMeta.style, activeProjectMeta.mood].filter(Boolean).join(" · ") ||
                      "Концепция из сохранённых визуалов"}
                  </p>
                </div>
              ) : null}
              <div style={workspaceGeneratePromptBlockStyle}>
                <div style={{ ...workspaceLabelStyle, marginBottom: "12px" }}>
                  Текст для генерации визуала
                  <span
                    style={{
                      marginLeft: "10px",
                      fontSize: "12px",
                      letterSpacing: "0.02em",
                      fontWeight: 500,
                      color: isDark ? "rgba(243,238,231,0.58)" : "rgba(110,106,102,0.78)",
                    }}
                  >
                    {activePromptVersion
                      ? `Сейчас в работе: ${activePromptVersion.title || "Версия"}`
                      : "Сейчас в работе: несохранённая правка"}
                  </span>
                </div>
                <textarea
                  value={interiorDescription}
                  onChange={(e) => {
                    setInteriorDescription(e.target.value);
                    if (activeProjectKey && activePromptVersionId) {
                      setActivePromptVersionIdState(null);
                      setActivePromptVersionId(activeProjectKey, null);
                    }
                    setImageError("");
                  }}
                  placeholder="Кратко опишите задачу для рендера (подпись к визуалу)…"
                  style={textareaStyle}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={{
                      ...secondaryButton,
                      marginTop: "12px",
                      padding: "10px 18px",
                      fontSize: "14px",
                      borderRadius: "12px",
                      boxSizing: "border-box",
                      opacity: !promptDirty ? 0.5 : 1,
                      cursor: !promptDirty ? "default" : "pointer",
                    }}
                    disabled={!activeProjectKey || !promptDirty}
                    onClick={handleSavePromptVersion}
                    onMouseEnter={(e) => {
                      if (!activeProjectKey || !promptDirty) return;
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0px)";
                    }}
                  >
                    Сохранить версию промпта
                  </button>

                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "13px",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.06)",
                      background: isDark ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.55)",
                      color: isDark ? "rgba(243,238,231,0.72)" : "rgba(110,106,102,0.88)",
                      boxSizing: "border-box",
                    }}
                  >
                    {promptDirty ? "Есть несохранённые изменения" : "Сохранено"}
                    {promptSaveNotice ? <span style={{ opacity: 0.75 }}> · {promptSaveNotice}</span> : null}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    padding: "12px 12px",
                    borderRadius: "14px",
                    textAlign: "left",
                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.45)",
                    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
                    boxShadow:
                      isDark ? "none" : "0 4px 14px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.48)",
                    backdropFilter: isDark ? "blur(16px)" : "blur(12px)",
                    WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(12px)",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      border: "none",
                      background: "transparent",
                      padding: "6px 4px",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "inherit",
                      fontFamily: "inherit",
                      transition: "background-color 220ms ease, box-shadow 260ms ease, opacity 220ms ease",
                      willChange: "background-color, box-shadow, opacity",
                    }}
                    onClick={() => setPromptHistoryOpen((v) => !v)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.96";
                      e.currentTarget.style.boxShadow = isDark
                        ? "0 0 0 rgba(0,0,0,0)"
                        : "0 10px 22px rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    aria-expanded={promptHistoryOpen}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ ...aiFieldLabelStyle, marginBottom: "4px" }}>История промптов</div>
                      <div
                        style={{
                          fontSize: "13px",
                          lineHeight: 1.4,
                          color: isDark ? "rgba(243,238,231,0.70)" : "rgba(110,106,102,0.88)",
                        }}
                      >
                        {promptVersions.length} {promptVersions.length === 1 ? "версия" : "версии"} ·{" "}
                        {activePromptVersion
                          ? `Сейчас: ${activePromptVersion.title || "Версия"}`
                          : "Сейчас: несохранённая правка"}
                      </div>
                    </div>
                    <div style={{ opacity: 0.7, fontSize: "14px", flexShrink: 0 }}>
                      {promptHistoryOpen ? "Свернуть" : "Открыть"}
                    </div>
                  </button>

                  {promptHistoryOpen ? (
                    <div style={{ marginTop: "10px" }}>
                      {promptVersions.length ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {promptVersions.slice(0, 10).map((v) => {
                            const isActive =
                              activeProjectKey &&
                              activePromptVersionId &&
                              String(activePromptVersionId) === String(v.id);
                            return (
                              <div
                                key={v.id}
                                style={{
                                  borderRadius: "12px",
                                  padding: "9px 10px",
                                  background: isActive
                                    ? isDark
                                      ? "rgba(210,180,155,0.10)"
                                      : "rgba(210,180,155,0.16)"
                                    : isDark
                                      ? "rgba(0,0,0,0.14)"
                                      : "rgba(255,255,255,0.55)",
                                  border: isActive
                                    ? isDark
                                      ? "1px solid rgba(183,157,138,0.38)"
                                      : "1px solid rgba(183,157,138,0.35)"
                                    : isDark
                                      ? "1px solid rgba(255,255,255,0.08)"
                                      : "1px solid rgba(0,0,0,0.04)",
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  gap: "10px",
                                  cursor: "pointer",
                                }}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleMakePromptVersionCurrent(v)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleMakePromptVersionCurrent(v);
                                  }
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 650,
                                      color: isDark ? "rgba(243,238,231,0.9)" : "rgba(43,43,43,0.9)",
                                    }}
                                  >
                                    {v.title || "Версия"}
                                    {isActive ? (
                                      <span style={{ marginLeft: "8px", opacity: 0.75, fontWeight: 600 }}>
                                        · активна
                                      </span>
                                    ) : null}
                                    <span style={{ opacity: 0.55, fontWeight: 500 }}>
                                      {" "}
                                      · {new Date(v.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      marginTop: "6px",
                                      fontSize: "12.5px",
                                      lineHeight: 1.45,
                                      color: isDark ? "rgba(243,238,231,0.64)" : "rgba(110,106,102,0.88)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                    }}
                                  >
                                    {String(v.text || "").trim() || "—"}
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    style={{
                                      ...secondaryButton,
                                      margin: 0,
                                      padding: "8px 10px",
                                      fontSize: "13px",
                                      borderRadius: "12px",
                                      boxSizing: "border-box",
                                      transform: "translateY(0px)",
                                      transition:
                                        "background-color 220ms ease, border-color 220ms ease, box-shadow 260ms ease, opacity 220ms ease",
                                      willChange: "background-color, border-color, box-shadow, opacity",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMakePromptVersionCurrent(v);
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.boxShadow = isDark
                                        ? "0 14px 30px rgba(0,0,0,0.18)"
                                        : "0 10px 24px rgba(0,0,0,0.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.boxShadow = "none";
                                    }}
                                  >
                                    Сделать текущей
                                  </button>
                                  <button
                                    type="button"
                                    style={{
                                      ...secondaryButton,
                                      margin: 0,
                                      padding: "8px 10px",
                                      fontSize: "13px",
                                      borderRadius: "12px",
                                      boxSizing: "border-box",
                                      opacity: promptVersions.length <= 1 ? 0.45 : 1,
                                      transform: "translateY(0px)",
                                      transition:
                                        "background-color 220ms ease, border-color 220ms ease, box-shadow 260ms ease, opacity 220ms ease",
                                      willChange: "background-color, border-color, box-shadow, opacity",
                                    }}
                                    disabled={promptVersions.length <= 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePromptVersion(v.id);
                                    }}
                                    onMouseEnter={(e) => {
                                      if (promptVersions.length <= 1) return;
                                      e.currentTarget.style.boxShadow = isDark
                                        ? "0 14px 30px rgba(0,0,0,0.18)"
                                        : "0 10px 24px rgba(0,0,0,0.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.boxShadow = "none";
                                    }}
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ ...aiEmptyTextStyle, margin: 0 }}>
                          Сохраните первую версию — здесь появится история.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              {resultData ? (
                <>
                  <div style={visualActionsRowStyle}>
                    <button
                      style={{ ...actionButtonStyle, marginTop: 0, flex: "1 1 200px", maxWidth: "320px" }}
                      onClick={() => handleGenerateVisual(false)}
                      disabled={isImageRunning || isRunning || !interiorDescription.trim()}
                      onMouseEnter={(e) => {
                        if (isImageRunning || isRunning) return;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        if (isImageRunning || isRunning) return;
                        e.currentTarget.style.transform = "translateY(0px)";
                      }}
                    >
                      {isImageRunning && imageRequestKind === "primary"
                        ? "Генерируем визуал..."
                        : "Сгенерировать визуал"}
                    </button>
                    <div style={alternateActionsClusterStyle}>
                      <AtmosphereDropdown
                        value={atmosphereChoice}
                        onChange={setAtmosphereChoice}
                        disabled={isImageRunning || isRunning}
                        isDark={isDark}
                      />
                      <button
                        style={{
                          ...alternateVisualButtonStyle,
                          flex: "1 1 200px",
                          maxWidth: "320px",
                          margin: 0,
                          alignSelf: "stretch",
                        }}
                        onClick={() => handleGenerateVisual(true)}
                        disabled={
                          isImageRunning ||
                          isRunning ||
                          !interiorDescription.trim() ||
                          sessionVisualGallery.length === 0
                        }
                        onMouseEnter={(e) => {
                          if (isImageRunning || isRunning || sessionVisualGallery.length === 0) return;
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          if (isImageRunning || isRunning) return;
                          e.currentTarget.style.transform = "translateY(0px)";
                        }}
                      >
                        {isImageRunning && imageRequestKind === "alternate"
                          ? "Создаем вариант..."
                          : "Сгенерировать альтернативу"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      ...imageModuleStyle,
                      ...generateRevealStyle(
                        !!(sessionVisualGallery.length || imageError || isImageRunning)
                      ),
                    }}
                  >
                    <div style={imageInnerStyle}>
                      {imageError ? (
                        <div style={aiEmptyTextStyle}>{imageError}</div>
                      ) : stablePreviewImageBase64 && String(stablePreviewImageBase64).trim() ? (
                        <>
                          <div
                            style={{
                              ...imageFrameStyle,
                              ...generateRevealStyle(isImageVisible),
                              maxWidth: "min(100%, 960px)",
                              marginLeft: "auto",
                              marginRight: "auto",
                            }}
                          >
                            <img
                              src={`data:image/png;base64,${stablePreviewImageBase64}`}
                              alt="Сгенерированный визуал интерьера"
                              style={{ width: "100%", height: "auto", display: "block" }}
                            />
                          </div>
                        </>
                      ) : sessionVisualGallery.length > 0 ? (
                        <div
                          style={{
                            ...imageFrameStyle,
                            ...generateRevealStyle(isImageVisible),
                            maxWidth: "min(100%, 960px)",
                            marginLeft: "auto",
                            marginRight: "auto",
                          }}
                        >
                          <div style={{ ...visualImageMissingStyle, minHeight: "200px" }}>
                            Изображение не найдено
                          </div>
                        </div>
                      ) : isImageRunning && imageRequestKind === "primary" ? (
                        <div style={sessionGallerySkeletonStyle}>
                          <div style={aiEmptyTextStyle}>Генерируем визуал...</div>
                        </div>
                      ) : (
                        <div style={aiEmptyTextStyle}>
                          Нажмите «Сгенерировать визуал», чтобы получить рендер по текущей концепции.
                        </div>
                      )}

                      {sessionVisualGallery.length > 0 ? (
                        <div style={sessionGallerySectionStyle}>
                          <div style={sessionGalleryTitleStyle}>Варианты для этой концепции</div>
                          <div style={sessionGalleryGridStyle}>
                            {sessionVisualGallery.map((item, index) => {
                              const isSel = selectedSessionVisual?.id === item.id;
                              return (
                                <div key={item.id} style={getSessionGalleryCardStyle(isSel)}>
                                  <div style={{ position: "relative", ...sessionGalleryThumbStyle }}>
                                    <span style={sessionGalleryVariantBadgeStyle}>
                                      {item.iterationType === "text_edit"
                                        ? "ПРАВКА"
                                        : item.variationLabel
                                          ? item.variationLabel
                                          : item.alternateKind && ALTERNATE_KIND_LABEL_RU[item.alternateKind]
                                            ? ALTERNATE_KIND_LABEL_RU[item.alternateKind]
                                            : "Основной"}
                                    </span>
                                    {item.imageBase64 && String(item.imageBase64).trim() ? (
                                      <img
                                        src={`data:image/png;base64,${item.imageBase64}`}
                                        alt={`Вариант ${index + 1}`}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          display: "block",
                                        }}
                                      />
                                    ) : (
                                      <div style={visualImageMissingStyle}>Изображение не найдено</div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    style={getSessionGalleryChooseButtonStyle(isSel)}
                                    disabled={isSel}
                                    onClick={() => {
                                      setSelectedSessionVisualId(item.id);
                                      setShowImagePromptDetails(false);
                                    }}
                                    onMouseEnter={(e) => {
                                      if (isSel) return;
                                      e.currentTarget.style.transform = "translateY(-1px)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = "translateY(0px)";
                                    }}
                                  >
                                    {isSel ? "Выбрано" : "Выбрать"}
                                  </button>
                                </div>
                              );
                            })}
                            {isImageRunning && imageRequestKind === "alternate" ? (
                              <div style={sessionGallerySkeletonStyle}>
                                <div style={aiEmptyTextStyle}>Создаем вариант...</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {selectedSessionVisual ? (
                        <div
                          style={{
                            marginTop: "18px",
                            padding: "14px 14px",
                            borderRadius: "14px",
                            textAlign: "left",
                            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.45)",
                            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
                            boxShadow: isDark
                              ? "none"
                              : "0 4px 14px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.48)",
                            backdropFilter: isDark ? "blur(16px)" : "blur(12px)",
                            WebkitBackdropFilter: isDark ? "blur(16px)" : "blur(12px)",
                          }}
                        >
                          <div style={{ ...aiFieldLabelStyle, marginBottom: "6px" }}>
                            Правка выбранного визуала
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              lineHeight: 1.45,
                              marginBottom: "10px",
                              color: isDark ? "rgba(243,238,231,0.70)" : "rgba(110,106,102,0.88)",
                            }}
                          >
                            Создать новую итерацию на основе выбранного варианта
                          </div>
                          <textarea
                            value={visualEditInstruction}
                            onChange={(e) => setVisualEditInstruction(e.target.value)}
                            placeholder="Например: убрать жёлтый оттенок, заменить кресло на более графичное, добавить белые фасады, сохранить композицию..."
                            style={{
                              ...textareaStyle,
                              minHeight: "74px",
                              marginBottom: "10px",
                            }}
                          />
                          <button
                            type="button"
                            style={{
                              ...primaryButton,
                              margin: 0,
                              padding: "12px 18px",
                              fontSize: "14px",
                              borderRadius: "12px",
                              boxSizing: "border-box",
                              opacity: isImageRunning ? 0.65 : 1,
                            }}
                            disabled={isImageRunning || !String(visualEditInstruction || "").trim()}
                            onClick={handleCreateTextEditIteration}
                            onMouseEnter={(e) => {
                              if (isImageRunning) return;
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              if (isImageRunning) return;
                              e.currentTarget.style.transform = "translateY(0px)";
                            }}
                          >
                            {isImageRunning && imageRequestKind === "text_edit" ? "Создаем…" : "Создать правку"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ ...aiEmptyTextStyle, marginTop: "12px", textAlign: "center" }}>
                  Подготовка данных проекта…
                </div>
              )}
            </>
          )}
        </div>

        <div style={statsRowWrapperStyle}>
          <div style={statStyle} {...statCardLightHoverHandlers}>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              AI
            </div>
            <div
              style={{
                fontSize: "14px",
                lineHeight: "1.5",
                color: isDark ? "rgba(243,238,231,0.64)" : "rgba(110,106,102,0.82)",
              }}
            >
              Анализ визуального решения и переход к подбору
            </div>
          </div>

          <div style={statStyle} {...statCardLightHoverHandlers}>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              BIM
            </div>
            <div
              style={{
                fontSize: "14px",
                lineHeight: "1.5",
                color: isDark ? "rgba(243,238,231,0.64)" : "rgba(110,106,102,0.82)",
              }}
            >
              Основа для точных итераций, спецификаций и связок
            </div>
          </div>

          <div style={statStyle} {...statCardLightHoverHandlers}>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              Budget
            </div>
            <div
              style={{
                fontSize: "14px",
                lineHeight: "1.5",
                color: isDark ? "rgba(243,238,231,0.64)" : "rgba(110,106,102,0.82)",
              }}
            >
              Подготовка к смете и согласованию проекта с клиентом
            </div>
          </div>
        </div>
      </div>
          </div>

          <aside style={rightContextAsideStyle} aria-label="Контекст проекта">
            <div style={sidePanelSectionTitleStyle}>Контекст проекта</div>
            {!activeProjectKey ? (
              <div
                style={{
                  ...contextPlaceholderCardStyle,
                  marginTop: 0,
                  borderStyle: "solid",
                  borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.04)",
                  color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
                }}
              >
                Выберите проект слева.
              </div>
            ) : (
              <div
                style={{
                  animation: "osaContextReveal 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
                }}
              >
                {rightContextVisual ? (
                  <>
                    <div
                      style={{
                        borderRadius: "14px",
                        overflow: "hidden",
                        marginBottom: "12px",
                        border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.04)",
                        background: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.55)",
                      }}
                    >
                      {rightContextVisual.imageBase64 &&
                      String(rightContextVisual.imageBase64).trim() ? (
                        <img
                          src={`data:image/png;base64,${rightContextVisual.imageBase64}`}
                          alt=""
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                      ) : (
                        <div style={{ ...visualImageMissingStyle, minHeight: "120px" }}>
                          Изображение не найдено
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        marginBottom: "10px",
                        lineHeight: 1.35,
                        textAlign: "left",
                      }}
                    >
                      {rightContextVisual.title}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        marginBottom: "6px",
                        textAlign: "left",
                        color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.88)",
                      }}
                    >
                      <span style={{ opacity: 0.55 }}>Стиль · </span>
                      {rightContextVisual.style || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        marginBottom: "14px",
                        textAlign: "left",
                        color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.88)",
                      }}
                    >
                      <span style={{ opacity: 0.55 }}>Настроение · </span>
                      {rightContextVisual.mood || "—"}
                    </div>
                    {rightContextVisual.promptUsed ? (
                      <>
                        <button
                          type="button"
                          style={{
                            ...imageDetailsToggleStyle,
                            maxWidth: "none",
                            width: "100%",
                            margin: "0 0 0 0",
                            alignSelf: "stretch",
                          }}
                          onClick={() => setShowImagePromptDetails((v) => !v)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0px)";
                          }}
                        >
                          {showImagePromptDetails ? "Скрыть детали" : "Показать детали"}
                        </button>
                        <div style={imageDetailsExpandGridStyle(showImagePromptDetails)}>
                          <div style={imageDetailsExpandInnerStyle}>
                            <pre style={imageDetailsPromptStyle}>{rightContextVisual.promptUsed}</pre>
                          </div>
                        </div>
                      </>
                    ) : null}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginTop: "16px",
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          ...primaryButton,
                          width: "100%",
                          margin: 0,
                          padding: "11px 16px",
                          fontSize: "14px",
                          borderRadius: "12px",
                          boxSizing: "border-box",
                        }}
                        onClick={() =>
                          handleDownloadVisualFile(
                            rightContextVisual.imageBase64,
                            rightContextVisual.createdAt,
                            rightContextVisual.variantId
                          )
                        }
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0px)";
                        }}
                      >
                        Скачать визуал
                      </button>
                      <button
                        type="button"
                        style={{
                          ...secondaryButton,
                          width: "100%",
                          margin: 0,
                          padding: "11px 16px",
                          fontSize: "14px",
                          borderRadius: "12px",
                          boxSizing: "border-box",
                        }}
                        onClick={() => handleRemoveSessionVisual(rightContextVisual.variantId)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0px)";
                        }}
                      >
                        Удалить вариант
                      </button>
                      <button
                        type="button"
                        style={{
                          ...secondaryButton,
                          width: "100%",
                          margin: 0,
                          padding: "11px 16px",
                          fontSize: "14px",
                          borderRadius: "12px",
                          boxSizing: "border-box",
                          opacity: sessionContextAligned && sessionVisualGallery.length > 1 ? 1 : 0.45,
                        }}
                        disabled={!sessionContextAligned || sessionVisualGallery.length < 2}
                        onClick={handleCycleSessionVariant}
                        onMouseEnter={(e) => {
                          if (!sessionContextAligned || sessionVisualGallery.length < 2) return;
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0px)";
                        }}
                      >
                        Выбрать вариант
                      </button>
                    </div>
                  </>
                ) : activeProjectMeta ? (
                  <>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        marginBottom: "10px",
                        lineHeight: 1.35,
                        textAlign: "left",
                      }}
                    >
                      {activeProjectMeta.title}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        marginBottom: "6px",
                        textAlign: "left",
                        color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.88)",
                      }}
                    >
                      <span style={{ opacity: 0.55 }}>Стиль · </span>
                      {activeProjectMeta.style || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        marginBottom: "14px",
                        textAlign: "left",
                        color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.88)",
                      }}
                    >
                      <span style={{ opacity: 0.55 }}>Настроение · </span>
                      {activeProjectMeta.mood || "—"}
                    </div>
                    <div
                      style={{
                        ...contextPlaceholderCardStyle,
                        borderStyle: "solid",
                        borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.04)",
                        color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
                        marginTop: 0,
                      }}
                    >
                      Визуал появится здесь после генерации в рабочей зоне.
                    </div>
                  </>
                ) : null}

                <div style={{ ...sidePanelSectionTitleStyle, marginTop: "22px" }}>Материалы</div>
                <div style={contextPlaceholderCardStyle}>Скоро: подбор материалов и каталог.</div>
                <div style={{ ...sidePanelSectionTitleStyle, marginTop: "14px" }}>Смета</div>
                <div style={{ ...contextPlaceholderCardStyle, marginBottom: 0 }}>
                  Скоро: ориентировочная смета по проекту.
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}