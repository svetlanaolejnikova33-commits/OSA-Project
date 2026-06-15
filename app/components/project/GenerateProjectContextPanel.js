"use client";

import { memo } from "react";

function GenerateProjectContextPanelInner({
  isDark,
  isMobile,
  hasGenerateProjectWorkspace,
  rightContextVisual,
  activeProjectMeta,
  showImagePromptDetails,
  sessionContextAligned,
  sessionVisualGalleryLength,
  sectionTitleStyle,
  contextPlaceholderCardStyle,
  visualImageMissingStyle,
  imageDetailsToggleStyle,
  imageDetailsExpandGridStyle,
  imageDetailsExpandInnerStyle,
  imageDetailsPromptStyle,
  primaryButton,
  secondaryButton,
  onToggleImagePromptDetails,
  onDownloadVisual,
  onRemoveVisual,
  onCycleVariant,
}) {
  return (
    <>
      <div style={sectionTitleStyle}>Контекст проекта</div>
      {!hasGenerateProjectWorkspace ? (
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
        <div>
          {rightContextVisual ? (
            <>
              <div
                style={{
                  borderRadius: "14px",
                  overflow: "hidden",
                  marginBottom: "12px",
                  border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.04)",
                  background: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.55)",
                  aspectRatio: "4 / 3",
                  minHeight: "120px",
                  width: "100%",
                }}
              >
                {rightContextVisual.imageBase64 && String(rightContextVisual.imageBase64).trim() ? (
                  <img
                    src={`data:image/png;base64,${rightContextVisual.imageBase64}`}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{ ...visualImageMissingStyle, minHeight: "120px" }}>Изображение не найдено</div>
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
                    onClick={onToggleImagePromptDetails}
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
                    fontSize: isMobile ? "13px" : "14px",
                    borderRadius: "12px",
                    boxSizing: "border-box",
                  }}
                  onClick={() =>
                    onDownloadVisual(
                      rightContextVisual.imageBase64,
                      rightContextVisual.createdAt,
                      rightContextVisual.variantId
                    )
                  }
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
                    fontSize: isMobile ? "13px" : "14px",
                    borderRadius: "12px",
                    boxSizing: "border-box",
                  }}
                  onClick={() => onRemoveVisual(rightContextVisual.variantId)}
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
                    fontSize: isMobile ? "13px" : "14px",
                    borderRadius: "12px",
                    boxSizing: "border-box",
                    opacity: sessionContextAligned && sessionVisualGalleryLength > 1 ? 1 : 0.45,
                  }}
                  disabled={!sessionContextAligned || sessionVisualGalleryLength < 2}
                  onClick={onCycleVariant}
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

          <div style={{ ...sectionTitleStyle, marginTop: "22px" }}>Материалы</div>
          <div style={contextPlaceholderCardStyle}>Скоро: подбор материалов и каталог.</div>
          <div style={{ ...sectionTitleStyle, marginTop: "14px" }}>Смета</div>
          <div style={{ ...contextPlaceholderCardStyle, marginBottom: 0 }}>
            Скоро: ориентировочная смета по проекту.
          </div>
        </div>
      )}
    </>
  );
}

export const GenerateProjectContextPanel = memo(GenerateProjectContextPanelInner);
