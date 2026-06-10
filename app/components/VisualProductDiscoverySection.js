"use client";

import { useState } from "react";
import { getModeluxImageProxyUrl } from "../lib/registry/modeluxImageProxy";

function cardStyle(theme) {
  return {
    borderRadius: "14px",
    border: `1px solid ${theme.border}`,
    background: theme.cardBackground,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  };
}

function linkButtonStyle(theme, isDark) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    padding: "8px 12px",
    borderRadius: "10px",
    border: `1px solid ${theme.border}`,
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
    color: isDark ? "rgba(243,238,231,0.92)" : "rgba(43,43,43,0.92)",
    fontSize: "12px",
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
  };
}

function imageFrameStyle(isDark) {
  return {
    aspectRatio: "1 / 1",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  };
}

function placeholderStyle(text, theme) {
  return {
    ...text,
    fontSize: "11px",
    lineHeight: 1.4,
    textAlign: "center",
    padding: "10px",
    color: theme.textSecondary,
  };
}

function ProductCardImage({ imageUrl, productName, theme, text, isDark }) {
  const [failed, setFailed] = useState(false);
  const proxiedUrl = getModeluxImageProxyUrl(imageUrl);

  if (!proxiedUrl || failed) {
    return (
      <div style={placeholderStyle(text, theme)}>
        {imageUrl ? "Фото недоступно" : "Нет фото"}
      </div>
    );
  }

  return (
    <img
      src={proxiedUrl}
      alt={productName}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

export function VisualProductDiscoverySection({
  candidates = [],
  isLoading = false,
  error = "",
  theme,
  text,
  isMobile = false,
  isDark = false,
}) {
  if (!isLoading && !error && !candidates.length) return null;

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
    gap: isMobile ? "10px" : "12px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {isLoading ? (
        <div style={{ ...text, color: theme.textSecondary, fontSize: "12px" }}>
          Загружаем визуально похожие товары МОДЕЛЮКС…
        </div>
      ) : null}

      {error ? (
        <div style={{ ...text, color: theme.textSecondary, fontSize: "12px", lineHeight: 1.5 }}>
          Не удалось загрузить каталог МОДЕЛЮКС: {error}
        </div>
      ) : null}

      {!isLoading && candidates.length ? (
        <div style={gridStyle}>
          {candidates.map((candidate) => (
            <article key={candidate.productUrl} style={cardStyle(theme)}>
              <div style={imageFrameStyle(isDark)}>
                <ProductCardImage
                  imageUrl={candidate.imageUrl}
                  productName={candidate.productName}
                  theme={theme}
                  text={text}
                  isDark={isDark}
                />
              </div>
              <div
                style={{
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    ...text,
                    fontSize: isMobile ? "11px" : "12px",
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {candidate.productName}
                </div>
                {Number.isFinite(candidate.visualMatchScore) ? (
                  <div
                    style={{
                      ...text,
                      fontSize: isMobile ? "10px" : "11px",
                      lineHeight: 1.4,
                      color: theme.textSecondary,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: theme.textPrimary || text.color }}>
                      Совпадение: {Math.round(candidate.visualMatchScore)}%
                    </div>
                    {Array.isArray(candidate.visualMatchReasons) &&
                    candidate.visualMatchReasons.length ? (
                      <div style={{ marginTop: "6px" }}>
                        <div style={{ marginBottom: "4px" }}>Причины:</div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          {candidate.visualMatchReasons.map((reason) => (
                            <li key={`${candidate.productUrl}-${reason}`}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <a
                  href={candidate.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkButtonStyle(theme, isDark)}
                >
                  Открыть источник
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
