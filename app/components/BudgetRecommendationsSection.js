"use client";

import { memo, useState } from "react";
import { sumRecommendationRows } from "../lib/visualProductDiscovery";
import { buildProjectSelectionItemId } from "../lib/projectSelectionStore";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `≈ ${num.toLocaleString("ru-RU")} ₽`;
}

const THUMB_SIZE = 52;

function thumbFrameStyle(isDark) {
  return {
    width: `${THUMB_SIZE}px`,
    height: `${THUMB_SIZE}px`,
    minWidth: `${THUMB_SIZE}px`,
    minHeight: `${THUMB_SIZE}px`,
    borderRadius: "10px",
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
  };
}

function linkStyle(isDark) {
  return {
    color: isDark ? "rgba(147,197,253,0.95)" : "rgba(37,99,235,0.95)",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: 600,
  };
}

function sectionLabelStyle(isDark) {
  return {
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 650,
    margin: "0 0 10px 2px",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
  };
}

function cardShellStyle(isDark, isMobile) {
  return {
    padding: isMobile ? "8px 0" : "8px 10px",
    borderRadius: isMobile ? 0 : "12px",
    border: isMobile ? "none" : isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.05)",
    borderBottom: isMobile ? (isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.05)") : undefined,
    background: isMobile ? "transparent" : isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.38)",
  };
}

function addButtonStyle(isDark, selected) {
  return {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: selected ? "default" : "pointer",
    font: "inherit",
    lineHeight: 1.2,
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
    background: selected
      ? isDark
        ? "rgba(183,157,138,0.2)"
        : "rgba(183,157,138,0.16)"
      : isDark
        ? "rgba(255,255,255,0.05)"
        : "rgba(255,255,255,0.82)",
    color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.88)",
    opacity: selected ? 0.95 : 1,
    whiteSpace: "nowrap",
  };
}

function rowSelectionId(row) {
  const category = typeof row?.category === "string" ? row.category.trim() : "Прочее";
  const brand = typeof row?.brand === "string" ? row.brand.trim() : "";
  const model = typeof row?.article === "string" ? row.article.trim() : "";
  const title = typeof row?.productName === "string" ? row.productName.trim() : "";
  const sourceUrl =
    (typeof row?.productUrl === "string" ? row.productUrl.trim() : "") ||
    (typeof row?.searchUrl === "string" ? row.searchUrl.trim() : "");
  return buildProjectSelectionItemId({ category, brand, model, article: model, title, sourceUrl });
}

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
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

function SkuProductCard({
  row,
  isDark,
  isMobile,
  compact = false,
  isInSelection = false,
  onAddToProjectSelection,
}) {
  const sourceUrl = row.productUrl || row.searchUrl || "";
  const searchUrl = row.searchUrl || sourceUrl;
  const matchScore = Number.isFinite(row.matchScore) && row.matchScore > 0 ? row.matchScore : null;

  return (
    <div style={cardShellStyle(isDark, isMobile)}>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <ProductThumb imageUrl={row.imageUrl} alt={row.productName || row.article || "Товар"} isDark={isDark} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              lineHeight: 1.3,
              color: isDark ? "rgba(243,238,231,0.9)" : "rgba(43,43,43,0.9)",
            }}
          >
            {row.brand || "—"}
            {row.productName || row.article ? (
              <span style={{ fontWeight: 500, color: isDark ? "rgba(243,238,231,0.68)" : "rgba(110,106,102,0.82)" }}>
                {" "}
                / {row.productName || row.article}
              </span>
            ) : null}
          </div>
          <div
            style={{
              marginTop: "4px",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 10px",
              alignItems: "center",
              fontSize: "12px",
              lineHeight: 1.35,
            }}
          >
            <span style={{ fontWeight: 600, color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.88)" }}>
              {formatPrice(row.unitPrice)}
            </span>
            {matchScore ? (
              <span style={{ color: isDark ? "rgba(243,238,231,0.5)" : "rgba(110,106,102,0.68)", fontSize: "11px" }}>
                {matchScore}%
              </span>
            ) : null}
            {row.visualAnalogLabel ? (
              <span
                style={{
                  fontSize: "10px",
                  lineHeight: 1.35,
                  color: isDark ? "rgba(243,238,231,0.48)" : "rgba(110,106,102,0.65)",
                  fontStyle: "italic",
                }}
              >
                {row.visualAnalogLabel}
              </span>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "center",
              marginTop: "6px",
            }}
          >
            {sourceUrl || searchUrl ? (
              <a href={sourceUrl || searchUrl} target="_blank" rel="noreferrer" style={linkStyle(isDark)}>
                Открыть источник
              </a>
            ) : null}
            {!compact && onAddToProjectSelection ? (
              <button
                type="button"
                disabled={isInSelection}
                onClick={() => onAddToProjectSelection(row)}
                style={addButtonStyle(isDark, isInSelection)}
              >
                {isInSelection ? "В подборке ✓" : "Добавить в проект"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function groupRowsByCategory(rows) {
  const map = new Map();
  for (const row of rows) {
    const category = typeof row?.category === "string" && row.category.trim() ? row.category.trim() : "Прочее";
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(row);
  }
  return map;
}

function AlternativesBlock({
  alternatives,
  isDark,
  isMobile,
  selectionIdSet,
  onAddToProjectSelection,
}) {
  const [open, setOpen] = useState(false);
  const altCount = alternatives.reduce((sum, entry) => sum + entry.rows.length, 0);
  if (!altCount) return null;

  return (
    <div style={{ marginTop: "16px" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "block",
          width: "100%",
          margin: 0,
          padding: "10px 0",
          border: "none",
          borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          background: "transparent",
          color: isDark ? "rgba(243,238,231,0.72)" : "rgba(110,106,102,0.88)",
          font: "inherit",
          fontSize: "13px",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        {open ? "Скрыть альтернативы ▲" : `Показать ещё ${altCount} вариантов ▼`}
      </button>
      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
          {alternatives.map((entry) => (
            <div key={`alt-${entry.category}`}>
              {alternatives.length > 1 ? (
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    marginBottom: "8px",
                    color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
                  }}
                >
                  {entry.category}
                </div>
              ) : null}
              {entry.rows.map((row, index) => {
                const rowId = rowSelectionId(row);
                return (
                  <SkuProductCard
                    key={`${entry.category}-alt-${row.article || index}`}
                    row={row}
                    isDark={isDark}
                    isMobile={isMobile}
                    compact={false}
                    isInSelection={rowId ? selectionIdSet.has(rowId) : false}
                    onAddToProjectSelection={onAddToProjectSelection}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const BudgetRecommendationsSection = memo(function BudgetRecommendationsSection({
  budgetDraft,
  recommendationRows = [],
  recommendationsLoading = false,
  recommendationsEmptyMessage = "",
  isDark,
  isMobile = false,
  selectedProjectItems = [],
  onAddToProjectSelection,
}) {
  if (!budgetDraft) return null;

  const selectionIdSet = new Set(asArray(selectedProjectItems).map((item) => item?.id).filter(Boolean));
  const previewRows = asArray(budgetDraft.previewBudgetRows);
  const usingPreviewRows = previewRows.length > 0;
  const rows = usingPreviewRows ? previewRows : asArray(recommendationRows);
  const showVisualSearchLoading = !usingPreviewRows && recommendationsLoading;
  const emptyMessage = usingPreviewRows
    ? "Рекомендуемые позиции ещё не подобраны."
    : recommendationsEmptyMessage || "Визуальные аналоги пока не найдены";
  const byCategory = groupRowsByCategory(rows);
  const primaries = [];
  const alternatives = [];

  for (const [category, categoryRows] of byCategory.entries()) {
    if (!categoryRows.length) continue;
    primaries.push({ category, row: categoryRows[0] });
    if (categoryRows.length > 1) {
      alternatives.push({ category, rows: categoryRows.slice(1) });
    }
  }

  const total = sumRecommendationRows(rows);

  return (
    <div style={{ marginTop: "16px" }}>
      <div style={sectionLabelStyle(isDark)}>Рекомендуемые позиции</div>

      {showVisualSearchLoading ? (
        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.5,
            color: isDark ? "rgba(243,238,231,0.58)" : "rgba(110,106,102,0.78)",
          }}
        >
          Поиск визуальных аналогов…
        </div>
      ) : !primaries.length ? (
        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.5,
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {primaries.map((entry) => {
            const rowId = rowSelectionId(entry.row);
            return (
              <div key={`primary-${entry.category}`}>
                {primaries.length > 1 ? (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
                    }}
                  >
                    {entry.category}
                  </div>
                ) : null}
                <SkuProductCard
                  row={entry.row}
                  isDark={isDark}
                  isMobile={isMobile}
                  isInSelection={rowId ? selectionIdSet.has(rowId) : false}
                  onAddToProjectSelection={onAddToProjectSelection}
                />
              </div>
            );
          })}
          {total > 0 ? (
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: 1.5,
                color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.9)",
              }}
            >
              Предварительная сумма: {formatPrice(total)}
            </div>
          ) : null}
        </div>
      )}

      <AlternativesBlock
        alternatives={alternatives}
        isDark={isDark}
        isMobile={isMobile}
        selectionIdSet={selectionIdSet}
        onAddToProjectSelection={onAddToProjectSelection}
      />
    </div>
  );
});
