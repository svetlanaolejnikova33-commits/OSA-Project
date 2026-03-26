'use client';

import { useEffect, useState } from "react";

export default function Home() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [mode, setMode] = useState("generate"); // "generate" | "analyze"

  const [interiorDescription, setInteriorDescription] = useState("");
  const [resultData, setResultData] = useState(null);
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

  useEffect(() => {
    if (!selectedImagePreviewUrl) return;
    return () => URL.revokeObjectURL(selectedImagePreviewUrl);
  }, [selectedImagePreviewUrl]);

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
    minWidth: "160px",
    padding: "18px 20px",
    borderRadius: "18px",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(31,34,36,0.06)",
    transition: "all 0.6s ease",
  };

  const workspaceCardStyle = {
    maxWidth: "760px",
    margin: "0 auto 42px auto",
    borderRadius: "22px",
    padding: "22px 20px",
    textAlign: "center",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(31,34,36,0.08)",
    boxShadow: isDark ? "0 22px 60px rgba(0,0,0,0.18)" : "0 18px 50px rgba(81,92,107,0.10)",
    backdropFilter: "blur(18px)",
    transition: "all 0.6s ease",
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
    width: "100%",
    minHeight: "130px",
    padding: "14px 14px",
    borderRadius: "16px",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(31,34,36,0.12)",
    background: isDark ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.82)",
    color: isDark ? "#F3EEE7" : "#1F2224",
    fontSize: "15px",
    lineHeight: "1.6",
    outline: "none",
    resize: "vertical",
    textAlign: "left",
    transition: "all 0.3s ease",
  };

  const actionButtonStyle = {
    ...primaryButton,
    width: "100%",
    maxWidth: "320px",
    margin: "14px auto 0 auto",
    opacity: isRunning ? 0.75 : 1,
  };

  const aiResultModuleStyle = {
    marginTop: "18px",
    borderRadius: "18px",
    overflow: "hidden",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginTop: "10px",
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

  const handleGenerateInteriorConcept = () => {
    if (isRunning) return;
    setIsRunning(true);
    setResultData(null);
    setIsGenerateResultVisible(false);

    const prompt = interiorDescription.trim();
    const conceptName = prompt.length
      ? prompt.length > 44
        ? prompt.slice(0, 44) + "…"
        : prompt
      : "Концепция интерьера";

    window.setTimeout(() => {
      const nextResultData = {
        title: `Концепция: ${conceptName}`,
        style: "Soft-minimal / warm modern",
        palette: isDark
          ? {
              base: "Graphite #141516",
              accent: "Walnut #B79D8A",
              contrast: "Ivory #F3EEE7",
            }
          : {
              base: "Ivory #F4F1EA",
              accent: "Walnut #B79D8A",
              contrast: "Graphite #2B2D31",
            },
        materials: ["Шпон ореха (полумат)", "Керамогранит под камень", "Микроцемент", "Матовое стекло", "Текстиль (лен/велюр)"],
        mood: "Тихо. Собрано. Премиально.",
        concept: {
          planning: "Читаемое зонирование + один фокус; прямые оси без визуального шума.",
          lighting: "3 слоя (общий/рабочий/акцентный), 2700–3000K, подсветка фактур и вертикалей.",
          materials: "База: орех + камень; матовые плоскости, мягкие отражения; стекло для легкости.",
          accents: "Один материал-герой, ритм вертикалей, точечный декор без перегруза.",
          storage: "Встроенные плоскости, единые линии фасадов, скрытые зоны для повседневного.",
        },
      };

      console.log(nextResultData);
      setResultData(nextResultData);
      window.setTimeout(() => setIsGenerateResultVisible(true), 0);
      setIsRunning(false);
    }, 550);
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
              <div style={{ ...workspaceLabelStyle, marginBottom: "12px" }}>Описание интерьера</div>
              <textarea
                value={interiorDescription}
                onChange={(e) => {
                  setInteriorDescription(e.target.value);
                  setResultData(null);
                  setIsGenerateResultVisible(false);
                }}
                placeholder="Например: квартира 45м², теплое дерево + мягкая геометрия, светлая база, минимум визуального шума, максимум хранения…"
                style={textareaStyle}
              />

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
                {isRunning ? "Генерируем…" : "Сгенерировать"}
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
                    <div style={aiFieldsGridStyle}>
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
                    <div style={aiEmptyStateStyle}>
                      <div style={aiEmptyTitleStyle}>Результат концепции</div>
                      <div style={aiEmptyTextStyle}>
                        {isGenerateLoading
                          ? "Система анализирует ввод и формирует дизайн-концепцию…"
                          : "Опишите интерьер в поле выше и нажмите «Сгенерировать» — мы соберем концепцию в структуре."}
                      </div>
                    </div>
                  )}
                </div>
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

        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
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