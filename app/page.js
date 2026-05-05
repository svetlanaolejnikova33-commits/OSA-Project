'use client';

import { useEffect, useMemo, useState } from "react";

const VISUAL_VARIATION_SUFFIX = `

Variation direction (interpret creatively, do not copy verbatim):
— slightly different composition
— alternative lighting
— variation in materials and accents`;

const OSA_VISUAL_HISTORY_KEY = "osa-visual-history-v1";

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

function normalizeSavedVisual(item) {
  if (!item || typeof item !== "object") return null;
  if (typeof item.imageBase64 !== "string") return null;
  if (item.id === undefined || item.id === null) return null;
  return {
    id: String(item.id),
    imageBase64: item.imageBase64,
    promptUsed: typeof item.promptUsed === "string" ? item.promptUsed : "",
    title: typeof item.title === "string" ? item.title : "",
    style: typeof item.style === "string" ? item.style : "",
    mood: typeof item.mood === "string" ? item.mood : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
  };
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

  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState("");
  const [selectedImageFileName, setSelectedImageFileName] = useState("");

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
  const previewImagePromptUsed = selectedSessionVisual?.promptUsed ?? "";

  useEffect(() => {
    if (!selectedImagePreviewUrl) return;
    return () => URL.revokeObjectURL(selectedImagePreviewUrl);
  }, [selectedImagePreviewUrl]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OSA_VISUAL_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed.map(normalizeSavedVisual).filter(Boolean);
      setSavedVisuals(next);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionVisual) {
      setIsImageVisible(false);
      const id = window.requestAnimationFrame(() => setIsImageVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    setIsImageVisible(false);
  }, [selectedSessionVisual?.id]);

  const mainStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px",
    background: isDark
      ? "radial-gradient(circle at 20% 20%,#32353A 0%,#1D1F22 45%,#141516 100%)"
      : "linear-gradient(180deg,#F7F8FA 0%,#EEF1F4 100%)",
    color: isDark ? "#F3EEE7" : "#1F2224",
    fontFamily: "Inter,sans-serif",
    transition: "background 0.6s ease,color 0.6s ease",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0px)" : "translateY(18px)",
  };

  const panelStyle = {
    width: "100%",
    maxWidth: "900px",
    borderRadius: "28px",
    padding: "56px 48px",
    textAlign: "center",
    boxSizing: "border-box",
    background: isDark
      ? "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))"
      : "linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0.72))",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
    boxShadow: isDark
      ? "0 30px 80px rgba(0,0,0,0.34)"
      : "0 24px 60px rgba(81,92,107,0.14)",
    backdropFilter: "blur(18px)",
    transition: "all 0.6s ease",
  };

  const badgeStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    padding: "10px 16px",
    borderRadius: "999px",
    marginBottom: "26px",
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(31,34,36,0.05)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(31,34,36,0.08)",
    color: isDark ? "rgba(243,238,231,0.72)" : "rgba(31,34,36,0.62)",
    transition: "all 0.6s ease",
  };

  const titleStyle = {
    fontSize: "64px",
    lineHeight: "1.02",
    fontWeight: "600",
    letterSpacing: "-0.04em",
    margin: "0 0 18px 0",
  };

  const textStyle = {
    maxWidth: "680px",
    margin: "0 auto 34px auto",
    fontSize: "18px",
    lineHeight: "1.75",
    color: isDark ? "rgba(243,238,231,0.72)" : "rgba(31,34,36,0.68)",
    transition: "color 0.6s ease",
  };

  const primaryButton = {
    background: isDark ? "#B79D8A" : "#2A2D31",
    color: isDark ? "#141516" : "#F3EEE7",
    border: "none",
    padding: "15px 28px",
    fontSize: "16px",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isDark
      ? "0 12px 30px rgba(183,157,138,0.24)"
      : "0 12px 30px rgba(42,45,49,0.18)",
  };

  const secondaryButton = {
    background: "transparent",
    color: isDark ? "#F3EEE7" : "#1F2224",
    border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(31,34,36,0.12)",
    padding: "15px 28px",
    fontSize: "16px",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const statStyle = {
    flex: "1 1 0",
    minWidth: "0",
    padding: "18px 20px",
    borderRadius: "18px",
    boxSizing: "border-box",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(31,34,36,0.06)",
    transition: "all 0.6s ease",
  };

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
    margin: "0 auto 42px auto",
    borderRadius: "22px",
    padding: "22px 20px",
    textAlign: "center",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(31,34,36,0.08)",
    boxShadow: isDark ? "0 22px 60px rgba(0,0,0,0.18)" : "0 18px 50px rgba(81,92,107,0.10)",
    backdropFilter: "blur(18px)",
    transition: "all 0.6s ease",
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
    color: isDark ? "rgba(243,238,231,0.64)" : "rgba(31,34,36,0.62)",
  };

  const modeTabsWrapperStyle = {
    maxWidth: "560px",
    width: "100%",
    margin: "0 auto 24px auto",
    padding: "6px",
    borderRadius: "18px",
    display: "flex",
    gap: "6px",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.66)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
    boxShadow: isDark
      ? "0 20px 55px rgba(0,0,0,0.20)"
      : "0 18px 45px rgba(81,92,107,0.10)",
    backdropFilter: "blur(16px)",
  };

  const getModeTabButtonStyle = (active) => ({
    flex: 1,
    borderRadius: "14px",
    border: "none",
    cursor: "pointer",
    padding: "12px 14px",
    fontSize: "14px",
    letterSpacing: "0.02em",
    fontWeight: active ? "650" : "520",
    color: active
      ? isDark
        ? "#F3EEE7"
        : "#141516"
      : isDark
        ? "rgba(243,238,231,0.64)"
        : "rgba(31,34,36,0.64)",
    background: active
      ? isDark
        ? "linear-gradient(180deg,rgba(183,157,138,0.24),rgba(183,157,138,0.10))"
        : "linear-gradient(180deg,rgba(42,45,49,0.10),rgba(42,45,49,0.05))"
      : "transparent",
    transition: "all 0.25s ease",
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
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(31,34,36,0.12)",
    background: isDark ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.82)",
    color: isDark ? "#F3EEE7" : "#1F2224",
    fontSize: "15px",
    lineHeight: "1.6",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    overflowWrap: "break-word",
    textAlign: "left",
    transition: "all 0.3s ease",
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
    background: isDark ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.78)",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(31,34,36,0.10)",
  };

  const aiResultHeaderBaseStyle = {
    padding: "16px 16px 14px 16px",
    borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
  };

  const aiResultHeaderGenerateStyle = {
    ...aiResultHeaderBaseStyle,
    background: isDark
      ? "linear-gradient(135deg, rgba(183,157,138,0.30) 0%, rgba(255,255,255,0.05) 70%)"
      : "linear-gradient(135deg, rgba(183,157,138,0.18) 0%, rgba(42,45,49,0.05) 70%)",
  };

  const aiResultHeaderAnalyzeStyle = {
    ...aiResultHeaderBaseStyle,
    background: isDark
      ? "linear-gradient(135deg, rgba(154,144,168,0.30) 0%, rgba(255,255,255,0.05) 70%)"
      : "linear-gradient(135deg, rgba(154,144,168,0.20) 0%, rgba(42,45,49,0.05) 70%)",
  };

  const aiResultHeaderTitleStyle = {
    fontSize: "13px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: "650",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(20,22,24,0.84)",
  };

  const aiResultHeaderSubtitleStyle = {
    marginTop: "8px",
    fontSize: "15px",
    lineHeight: "1.5",
    color: isDark ? "rgba(243,238,231,0.72)" : "rgba(31,34,36,0.70)",
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
    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.60)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(31,34,36,0.08)",
  };

  const aiEmptyTitleStyle = {
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: isDark ? "rgba(243,238,231,0.66)" : "rgba(31,34,36,0.66)",
    marginBottom: "10px",
  };

  const aiEmptyTextStyle = {
    fontSize: "15px",
    lineHeight: "1.65",
    color: isDark ? "rgba(243,238,231,0.78)" : "rgba(31,34,36,0.78)",
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
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.62)",
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
    color: isDark ? "rgba(243,238,231,0.62)" : "rgba(31,34,36,0.62)",
    marginBottom: "8px",
  };

  const aiFieldValueStyle = {
    fontSize: "15px",
    lineHeight: "1.65",
    color: isDark ? "rgba(243,238,231,0.82)" : "rgba(31,34,36,0.82)",
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
    borderColor: isDark ? "rgba(183,157,138,0.35)" : "rgba(183,157,138,0.28)",
    background: isDark ? "rgba(183,157,138,0.10)" : "rgba(183,157,138,0.10)",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(31,34,36,0.86)",
  };

  const aiChipAnalyzeStyle = {
    ...aiChipStyleBase,
    borderColor: isDark ? "rgba(154,144,168,0.35)" : "rgba(154,144,168,0.28)",
    background: isDark ? "rgba(154,144,168,0.10)" : "rgba(154,144,168,0.10)",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(31,34,36,0.86)",
  };

  const aiBulletListStyle = {
    margin: "8px 0 0 0",
    padding: "0 0 0 18px",
  };

  const aiBulletItemStyle = {
    color: isDark ? "rgba(243,238,231,0.82)" : "rgba(31,34,36,0.82)",
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
    background: isDark ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.70)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
  };

  const conceptSectionTitleStyle = {
    fontSize: "12px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: "650",
    color: isDark ? "rgba(243,238,231,0.78)" : "rgba(31,34,36,0.74)",
    marginBottom: "8px",
  };

  const uploadZoneStyle = {
    width: "100%",
    borderRadius: "18px",
    padding: "22px 16px",
    border: isDark ? "1px dashed rgba(255,255,255,0.18)" : "1px dashed rgba(31,34,36,0.18)",
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.62)",
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
    color: isDark ? "rgba(243,238,231,0.78)" : "rgba(31,34,36,0.72)",
    maxWidth: "420px",
  };

  const uploadPreviewStyle = {
    width: "100%",
    maxWidth: "420px",
    borderRadius: "14px",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(31,34,36,0.10)",
    background: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.65)",
    overflow: "hidden",
    boxShadow: isDark ? "0 20px 55px rgba(0,0,0,0.18)" : "0 18px 45px rgba(81,92,107,0.10)",
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
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.70)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.10)",
    boxShadow: isDark ? "0 22px 60px rgba(0,0,0,0.18)" : "0 18px 50px rgba(81,92,107,0.10)",
    backdropFilter: "blur(16px)",
  };

  const imageInnerStyle = {
    padding: "14px",
    boxSizing: "border-box",
  };

  const imageFrameStyle = {
    width: "100%",
    borderRadius: "14px",
    overflow: "hidden",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(31,34,36,0.10)",
    background: isDark ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.75)",
    boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.22)" : "0 14px 36px rgba(81,92,107,0.16)",
  };

  const imageMetaSummaryStyle = {
    marginTop: "18px",
    padding: "14px 16px",
    borderRadius: "14px",
    textAlign: "left",
    boxSizing: "border-box",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
  };

  const imageMetaSummaryRowStyle = {
    marginBottom: "10px",
    fontSize: "15px",
    lineHeight: "1.55",
    color: isDark ? "rgba(243,238,231,0.88)" : "rgba(31,34,36,0.88)",
  };

  const imageMetaSummaryLabelStyle = {
    display: "block",
    fontSize: "11px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    marginBottom: "4px",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(31,34,36,0.55)",
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
    color: isDark ? "rgba(243,238,231,0.82)" : "rgba(31,34,36,0.82)",
    background: isDark ? "rgba(0,0,0,0.18)" : "rgba(31,34,36,0.04)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
    boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "none",
  };

  const downloadCurrentVisualButtonStyle = {
    ...secondaryButton,
    display: "block",
    width: "100%",
    maxWidth: "280px",
    margin: "14px auto 0 auto",
    padding: "11px 18px",
    fontSize: "14px",
    borderRadius: "12px",
    boxSizing: "border-box",
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

  const sessionGallerySectionStyle = {
    marginTop: "20px",
    paddingTop: "18px",
    borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
    textAlign: "left",
    boxSizing: "border-box",
  };

  const sessionGalleryTitleStyle = {
    fontSize: "12px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: "650",
    color: isDark ? "rgba(243,238,231,0.72)" : "rgba(31,34,36,0.72)",
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

  const getSessionGalleryCardStyle = (selected) => ({
    borderRadius: "16px",
    padding: "10px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    height: "100%",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.78)",
    border: selected
      ? isDark
        ? "2px solid rgba(183,157,138,0.55)"
        : "2px solid rgba(42,45,49,0.55)"
      : isDark
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(31,34,36,0.08)",
    boxShadow: selected
      ? isDark
        ? "0 0 0 4px rgba(183,157,138,0.12), 0 16px 44px rgba(0,0,0,0.20)"
        : "0 0 0 4px rgba(183,157,138,0.14), 0 14px 36px rgba(81,92,107,0.12)"
      : isDark
        ? "0 12px 32px rgba(0,0,0,0.14)"
        : "0 10px 28px rgba(81,92,107,0.10)",
    transition: "border-color 220ms ease, box-shadow 220ms ease",
  });

  const sessionGalleryThumbStyle = {
    borderRadius: "12px",
    overflow: "hidden",
    aspectRatio: "4 / 3",
    flexShrink: 0,
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(31,34,36,0.10)",
    background: isDark ? "rgba(0,0,0,0.14)" : "rgba(31,34,36,0.04)",
    marginBottom: "10px",
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
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(31,34,36,0.04)",
    border: isDark ? "1px dashed rgba(255,255,255,0.14)" : "1px dashed rgba(31,34,36,0.14)",
  };

  const getSessionGalleryChooseButtonStyle = (selected) => ({
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
        ? "linear-gradient(180deg,rgba(183,157,138,0.22),rgba(183,157,138,0.10))"
        : "linear-gradient(180deg,rgba(42,45,49,0.10),rgba(42,45,49,0.05))"
      : secondaryButton.background,
    border: selected
      ? isDark
        ? "1px solid rgba(183,157,138,0.35)"
        : "1px solid rgba(42,45,49,0.22)"
      : secondaryButton.border,
    color: selected ? (isDark ? "#F3EEE7" : "#141516") : secondaryButton.color,
  });

  const savedVisualsModuleStyle = {
    width: "100%",
    maxWidth: "100%",
    marginTop: "18px",
    borderRadius: "18px",
    overflow: "hidden",
    boxSizing: "border-box",
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.70)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.10)",
    boxShadow: isDark ? "0 22px 60px rgba(0,0,0,0.18)" : "0 18px 50px rgba(81,92,107,0.10)",
    backdropFilter: "blur(16px)",
  };

  const savedVisualsHeaderStyle = {
    padding: "16px 16px 12px 16px",
    borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
    textAlign: "left",
    boxSizing: "border-box",
  };

  const savedVisualsTitleStyle = {
    fontSize: "13px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: "650",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(20,22,24,0.84)",
  };

  const savedVisualsSubtitleStyle = {
    marginTop: "8px",
    fontSize: "14px",
    lineHeight: "1.5",
    color: isDark ? "rgba(243,238,231,0.62)" : "rgba(31,34,36,0.62)",
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
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.78)",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(31,34,36,0.08)",
    boxShadow: isDark ? "0 14px 40px rgba(0,0,0,0.14)" : "0 12px 32px rgba(81,92,107,0.10)",
  };

  const savedVisualThumbWrapStyle = {
    borderRadius: "12px",
    overflow: "hidden",
    aspectRatio: "4 / 3",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(31,34,36,0.10)",
    background: isDark ? "rgba(0,0,0,0.14)" : "rgba(31,34,36,0.04)",
    marginBottom: "10px",
  };

  const savedVisualDateStyle = {
    fontSize: "12px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(31,34,36,0.55)",
    marginBottom: "6px",
  };

  const savedVisualCardTitleStyle = {
    fontSize: "15px",
    lineHeight: "1.45",
    fontWeight: "600",
    color: isDark ? "rgba(243,238,231,0.92)" : "rgba(31,34,36,0.92)",
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

  const handleDownloadVisualFile = (base64, createdAtIso) => {
    if (!base64) return;
    const d = createdAtIso ? new Date(createdAtIso) : new Date();
    const name = buildVisualDownloadFilename(Number.isNaN(d.getTime()) ? new Date() : d);
    downloadPngFromBase64(base64, name);
  };

  const handleRemoveSavedVisual = (id) => {
    setSavedVisuals((prev) => {
      const next = prev.filter((x) => x.id !== id);
      try {
        localStorage.setItem(OSA_VISUAL_HISTORY_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleGenerateVisual = async (isAlternate = false) => {
    if (isImageRunning) return;
    if (!resultData) return;

    const prompt = interiorDescription.trim();
    if (!prompt) return;
    if (isAlternate && sessionVisualGallery.length === 0) return;

    const promptForApi = isAlternate ? `${prompt}${VISUAL_VARIATION_SUFFIX}` : prompt;

    setImageRequestKind(isAlternate ? "alternate" : "primary");
    setIsImageRunning(true);
    setImageError("");
    setShowImagePromptDetails(false);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptForApi, resultData }),
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
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        imageBase64: nextB64,
        promptUsed: nextPromptUsed,
        createdAt: new Date().toISOString(),
      };

      setSessionVisualGallery((prev) => [...prev, newItem]);
      if (!isAlternate) {
        setSelectedSessionVisualId(newItem.id);
      }

      if (nextB64 && nextPromptUsed && resultData) {
        const persistItem = {
          ...newItem,
          title: resultData.title,
          style: resultData.style,
          mood: resultData.mood,
        };
        setSavedVisuals((prev) => {
          const next = [persistItem, ...prev];
          try {
            localStorage.setItem(OSA_VISUAL_HISTORY_KEY, JSON.stringify(next));
          } catch (err) {
            console.error(err);
          }
          return next;
        });
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

  const handleGenerateInteriorConcept = async () => {
    if (isRunning) return;
    const prompt = interiorDescription.trim();
    if (!prompt) return;

    setIsRunning(true);
    setGenerateError("");
    setResultData(null);
    setSessionVisualGallery([]);
    setSelectedSessionVisualId(null);
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

      setResultData(payload);
      window.setTimeout(() => setIsGenerateResultVisible(true), 0);
    } catch (error) {
      console.error(error);
      setGenerateError(error?.message || "Не удалось получить ответ AI. Попробуйте еще раз.");
      setResultData(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setSelectedImageFileName(file.name);
    setSelectedImagePreviewUrl(url);
    setAnalyzeImageResult(null);
  };

  const handleAnalyzeImage = () => {
    if (isRunning) return;
    if (!selectedImagePreviewUrl) return;

    setIsRunning(true);
    setAnalyzeImageResult(null);

    window.setTimeout(() => {
      setAnalyzeImageResult({
        recognized: [
          "Стилистика: теплый современный интерьер с мягкими переходами и акцентными плоскостями",
          "Материалы: дерево/орех + матовое стекло + текстильные фактуры",
          "Свет: теплые сценарии подсветки с фокусом на зонирование",
          "Композиция: взгляд ведет от входной группы к центральной зоне",
        ],
        style: "Теплый modern / soft-minimal с премиальными тактильными материалами",
        strengths: [
          "Единая палитра: графит + орех создают «дорогую» основу",
          "Зонирование читается без визуального шума",
          "Тактильность материалов поддерживает комфорт и глубину",
        ],
        improvements: [
          "Уточнить сценарии света (добавить акцентный слой для деталей/декора)",
          "Выровнять визуальные акценты по ритму (вертикали/горизонтали)",
          "Проверить, как изменится восприятие при другой текстуре/матовости стен",
        ],
        categoriesForSelection: [
          "Освещение",
          "Отделка стен",
          "Текстиль",
          "Мебель и фасады",
          "Стекло/перегородки",
          "Декор и искусство",
        ],
        debugNote: `[Дальше будет подключен AI API] Файл: ${selectedImageFileName || "выбранное изображение"}`,
      });
      setIsRunning(false);
    }, 650);
  };

  return (
    <main style={mainStyle}>
      <div style={panelStyle}>
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "150px",
              height: "150px",
              borderRadius: "999px",
              margin: "auto",
              background: isDark
                ? "radial-gradient(circle,rgba(183,157,138,0.28) 0%,rgba(183,157,138,0.08) 45%,rgba(183,157,138,0) 72%)"
                : "radial-gradient(circle,rgba(154,144,168,0.22) 0%,rgba(154,144,168,0.08) 45%,rgba(154,144,168,0) 72%)",
              filter: "blur(10px)",
              transform: visible ? "scale(1)" : "scale(0.86)",
              opacity: visible ? 1 : 0,
              transition: "all 1.1s ease",
            }}
          />
          <img
            src="/logo.png"
            alt="OSA logo"
            style={{
              width: "120px",
              position: "relative",
              zIndex: 2,
              opacity: visible ? 0.98 : 0,
              transform: visible ? "scale(1)" : "scale(0.92)",
              transition: "all 1.1s ease",
            }}
          />
        </div>

        <div style={badgeStyle}>
          <span>Interior platform</span>
          <span>•</span>
          <span>{isDark ? "Graphite poetry" : "Silver mist"}</span>
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
            gap: "14px",
            flexWrap: "wrap",
            marginBottom: "42px",
          }}
        >
          <button
            style={primaryButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px) scale(1)";
            }}
          >
            Начать проект
          </button>

          <button
            style={secondaryButton}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
            }}
          >
            Переключить тему
          </button>
        </div>

        <div style={workspaceCardStyle}>
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
                    <button
                      style={alternateVisualButtonStyle}
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
                      ) : previewImageBase64 ? (
                        <>
                          <div style={{ ...imageFrameStyle, ...generateRevealStyle(isImageVisible) }}>
                            <img
                              src={`data:image/png;base64,${previewImageBase64}`}
                              alt="Сгенерированный визуал интерьера"
                              style={{ width: "100%", height: "auto", display: "block" }}
                            />
                          </div>
                          <button
                            type="button"
                            style={downloadCurrentVisualButtonStyle}
                            onClick={() => handleDownloadVisualFile(previewImageBase64)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0px)";
                            }}
                          >
                            Скачать визуал
                          </button>
                        </>
                      ) : isImageRunning && imageRequestKind === "primary" ? (
                        <div style={sessionGallerySkeletonStyle}>
                          <div style={aiEmptyTextStyle}>Генерируем визуал...</div>
                        </div>
                      ) : (
                        <div style={aiEmptyTextStyle}>
                          Нажмите «Сгенерировать визуал», чтобы получить рендер по текущей концепции.
                        </div>
                      )}

                      {previewImageBase64 && previewImagePromptUsed ? (
                        <>
                          <div style={imageMetaSummaryStyle}>
                            <div style={{ ...imageMetaSummaryRowStyle, marginBottom: "12px" }}>
                              <span style={imageMetaSummaryLabelStyle}>Название концепции</span>
                              {resultData.title}
                            </div>
                            <div style={{ ...imageMetaSummaryRowStyle, marginBottom: "12px" }}>
                              <span style={imageMetaSummaryLabelStyle}>Стиль</span>
                              {resultData.style}
                            </div>
                            <div style={{ ...imageMetaSummaryRowStyle, marginBottom: 0 }}>
                              <span style={imageMetaSummaryLabelStyle}>Настроение</span>
                              {resultData.mood}
                            </div>
                          </div>

                          <button
                            type="button"
                            style={imageDetailsToggleStyle}
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
                              <pre style={imageDetailsPromptStyle}>{previewImagePromptUsed}</pre>
                            </div>
                          </div>
                        </>
                      ) : null}

                      {sessionVisualGallery.length > 0 ? (
                        <div style={sessionGallerySectionStyle}>
                          <div style={sessionGalleryTitleStyle}>Варианты для этой концепции</div>
                          <div style={sessionGalleryGridStyle}>
                            {sessionVisualGallery.map((item, index) => {
                              const isSel = selectedSessionVisual?.id === item.id;
                              return (
                                <div key={item.id} style={getSessionGalleryCardStyle(isSel)}>
                                  <div style={sessionGalleryThumbStyle}>
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
                    </div>
                  </div>
                </>
              ) : null}

              <div style={savedVisualsModuleStyle}>
                <div style={savedVisualsHeaderStyle}>
                  <div style={savedVisualsTitleStyle}>Сохранённые варианты</div>
                  <div style={savedVisualsSubtitleStyle}>
                    Локально в этом браузере. Сохранено: {savedVisuals.length}.
                  </div>
                </div>
                {savedVisuals.length === 0 ? (
                  <div style={{ padding: "16px 16px 18px 16px", boxSizing: "border-box" }}>
                    <div style={aiEmptyTextStyle}>
                      Здесь появятся визуалы после генерации — они сохраняются автоматически.
                    </div>
                  </div>
                ) : (
                  <div style={savedVisualsGridStyle}>
                    {savedVisuals.map((item) => (
                      <div key={item.id} style={savedVisualCardStyle}>
                        <div style={savedVisualThumbWrapStyle}>
                          <img
                            src={`data:image/png;base64,${item.imageBase64}`}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        </div>
                        <div style={savedVisualDateStyle}>
                          {new Date(item.createdAt).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div style={savedVisualCardTitleStyle}>{item.title || "Без названия"}</div>
                        <div style={savedVisualActionsStyle}>
                          <button
                            type="button"
                            style={savedVisualActionButtonStyle}
                            onClick={() => handleDownloadVisualFile(item.imageBase64, item.createdAt)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0px)";
                            }}
                          >
                            Скачать
                          </button>
                          <button
                            type="button"
                            style={{
                              ...savedVisualActionButtonStyle,
                              color: isDark ? "rgba(243,238,231,0.92)" : "#1F2224",
                              borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(31,34,36,0.16)",
                              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(31,34,36,0.04)",
                            }}
                            onClick={() => handleRemoveSavedVisual(item.id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0px)";
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <label style={uploadZoneStyle}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  style={fileInputStyle}
                />

                {selectedImagePreviewUrl ? (
                  <div style={uploadPreviewStyle}>
                    <img
                      src={selectedImagePreviewUrl}
                      alt="Предпросмотр загруженного изображения"
                      style={{ width: "100%", display: "block" }}
                    />
                  </div>
                ) : (
                  <div>
                    <div style={uploadHintStyle}>
                      Загрузите рендер, фото или визуализацию интерьера
                    </div>
                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "13px",
                        color: isDark ? "rgba(243,238,231,0.60)" : "rgba(31,34,36,0.58)",
                      }}
                    >
                      Поддерживаются изображения (JPG/PNG/WebP)
                    </div>
                  </div>
                )}
              </label>

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
                {isRunning ? "Проанализируем…" : "Проанализировать"}
              </button>

              <div style={aiResultModuleStyle}>
                <div style={aiResultHeaderAnalyzeStyle}>
                  <div style={aiResultHeaderTitleStyle}>AI Vision Analysis</div>
                  <div style={aiResultHeaderSubtitleStyle}>
                    {analyzeImageResult
                      ? "Анализ сформирован и готов к подбору"
                      : isAnalyzeLoading
                        ? "Распознаем элементы и собираем рекомендации…"
                        : "Загрузите изображение и нажмите «Проанализировать»"}
                  </div>
                </div>

                <div style={aiResultContentStyle}>
                  {analyzeImageResult ? (
                    <div style={aiFieldsGridStyle}>
                      <div style={{ ...aiFieldCardAnalyzeStyle, gridColumn: "1 / -1" }}>
                        <div style={aiFieldLabelStyle}>Что распознано</div>
                        <ul style={aiBulletListStyle}>
                          {analyzeImageResult.recognized.map((r) => (
                            <li key={r} style={aiBulletItemStyle}>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={aiFieldCardAnalyzeStyle}>
                        <div style={aiFieldLabelStyle}>Предполагаемый стиль</div>
                        <div style={aiFieldValueStyle}>{analyzeImageResult.style}</div>
                      </div>

                      <div style={aiFieldCardAnalyzeStyle}>
                        <div style={aiFieldLabelStyle}>Сильные стороны</div>
                        <ul style={aiBulletListStyle}>
                          {analyzeImageResult.strengths.map((s) => (
                            <li key={s} style={aiBulletItemStyle}>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={aiFieldCardAnalyzeStyle}>
                        <div style={aiFieldLabelStyle}>Что улучшить</div>
                        <ul style={aiBulletListStyle}>
                          {analyzeImageResult.improvements.map((i) => (
                            <li key={i} style={aiBulletItemStyle}>
                              {i}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ ...aiFieldCardAnalyzeStyle, gridColumn: "1 / -1" }}>
                        <div style={aiFieldLabelStyle}>Категории для подбора</div>
                        <div style={aiChipsContainerStyle}>
                          {analyzeImageResult.categoriesForSelection.map((c) => (
                            <span key={c} style={aiChipAnalyzeStyle}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={aiEmptyStateStyle}>
                      <div style={aiEmptyTitleStyle}>Результат анализа</div>
                      <div style={aiEmptyTextStyle}>
                        {isAnalyzeLoading
                          ? "Система оценивает изображение и готовит структурированный разбор…"
                          : "После загрузки изображения нажмите «Проанализировать» — появится аналитический вывод и категории для подбора."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={statsRowWrapperStyle}>
          <div style={statStyle}>
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
                color: isDark ? "rgba(243,238,231,0.64)" : "rgba(31,34,36,0.62)",
              }}
            >
              Анализ визуального решения и переход к подбору
            </div>
          </div>

          <div style={statStyle}>
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
                color: isDark ? "rgba(243,238,231,0.64)" : "rgba(31,34,36,0.62)",
              }}
            >
              Основа для точных итераций, спецификаций и связок
            </div>
          </div>

          <div style={statStyle}>
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
                color: isDark ? "rgba(243,238,231,0.64)" : "rgba(31,34,36,0.62)",
              }}
            >
              Подготовка к смете и согласованию проекта с клиентом
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}