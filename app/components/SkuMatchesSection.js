"use client";

import { memo } from "react";
import { sumPreviewBudgetRows } from "../lib/registry/buildPreviewBudgetRows";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num.toLocaleString("ru-RU")} ₽`;
}

const THUMB_SIZE = 84;

function cardStyle(isDark) {
  return {
    padding: "12px",
    borderRadius: "16px",
    marginBottom: "12px",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
  };
}

function titleStyle(isDark) {
  return {
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 600,
    margin: "0 0 10px 2px",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
  };
}

function linkStyle(isDark) {
  return {
    color: isDark ? "rgba(147,197,253,0.95)" : "rgba(37,99,235,0.95)",
    textDecoration: "underline",
    fontSize: "12px",
  };
}

const thumbFrameStyle = (isDark) => ({
  width: `${THUMB_SIZE}px`,
  height: `${THUMB_SIZE}px`,
  minWidth: `${THUMB_SIZE}px`,
  minHeight: `${THUMB_SIZE}px`,
  aspectRatio: "1 / 1",
  borderRadius: "10px",
  flexShrink: 0,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
});

function ProductThumb({ imageUrl, alt, isDark }) {
  if (!imageUrl) {
    return (
      <div style={thumbFrameStyle(isDark)}>
        <span
          style={{
            fontSize: "10px",
            lineHeight: 1.35,
            textAlign: "center",
            padding: "6px",
            color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.78)",
          }}
        >
          Нет фото
        </span>
      </div>
    );
  }

  return (
    <div style={thumbFrameStyle(isDark)}>
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}

export const SkuMatchesSection = memo(function SkuMatchesSection({ budgetDraft, isDark }) {
  if (!budgetDraft) return null;

  const rows = asArray(budgetDraft?.previewBudgetRows);
  const lightingTotal = sumPreviewBudgetRows(rows);

  return (
    <div style={{ marginTop: "16px", marginBottom: "16px" }}>
      <div style={titleStyle(isDark)}>Реальные позиции</div>

      {!rows.length ? (
        <div
          style={{
            ...cardStyle(isDark),
            marginBottom: 0,
            fontSize: "13px",
            lineHeight: 1.5,
            minHeight: "52px",
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          Реальные позиции ещё не подобраны
        </div>
      ) : (
        <>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {rows.map((row, index) => {
              const sourceUrl = row.productUrl || row.searchUrl || "";
              const searchUrl = row.searchUrl || sourceUrl;
              return (
                <li
                  key={`${row.article || "row"}-${index}`}
                  style={{
                    ...cardStyle(isDark),
                    marginBottom: 0,
                    fontSize: "13px",
                    lineHeight: 1.55,
                    color: isDark ? "rgba(243,238,231,0.9)" : "rgba(43,43,43,0.9)",
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <ProductThumb
                      imageUrl={row.imageUrl}
                      alt={row.productName || row.article || "Товар"}
                      isDark={isDark}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{row.brand || "—"}</div>
                      <div>{row.article || "—"}</div>
                      <div>{row.productName || "—"}</div>
                      <div style={{ marginTop: "4px", fontWeight: 600 }}>{formatPrice(row.unitPrice)}</div>
                    </div>
                  </div>

                  {Number.isFinite(row.matchScore) && row.matchScore > 0 ? (
                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "12px",
                        lineHeight: 1.5,
                        color: isDark ? "rgba(243,238,231,0.78)" : "rgba(110,106,102,0.9)",
                      }}
                    >
                      <div>
                        <strong>Совпадение:</strong> {row.matchScore}%
                      </div>
                      {asArray(row.matchReasons).length ? (
                        <div style={{ marginTop: "4px" }}>
                          <div style={{ fontWeight: 600 }}>Причины:</div>
                          <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
                            {row.matchReasons.map((reason) => (
                              <li key={`${row.article}-${reason}`}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div style={{ marginTop: "10px", minHeight: "18px" }}>
                    {row.imageUrl && sourceUrl ? (
                      <a href={sourceUrl} target="_blank" rel="noreferrer" style={linkStyle(isDark)}>
                        Открыть источник
                      </a>
                    ) : (
                      <div
                        style={{
                          fontSize: "12px",
                          lineHeight: 1.45,
                          color: isDark ? "rgba(243,238,231,0.68)" : "rgba(110,106,102,0.85)",
                        }}
                      >
                        Изображение пока не найдено.{" "}
                        {searchUrl ? (
                          <a href={searchUrl} target="_blank" rel="noreferrer" style={linkStyle(isDark)}>
                            Открыть поиск по артикулу
                          </a>
                        ) : null}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div
            style={{
              marginTop: "12px",
              fontSize: "13px",
              fontWeight: 600,
              lineHeight: 1.5,
              color: isDark ? "rgba(243,238,231,0.92)" : "rgba(43,43,43,0.92)",
            }}
          >
            Предварительная стоимость освещения: {formatPrice(lightingTotal)}
          </div>
        </>
      )}
    </div>
  );
});
