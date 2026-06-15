"use client";

import { memo, useMemo } from "react";
import {
  groupProjectSelectionByCategory,
  PROJECT_SELECTION_STATUS,
  sumBudgetSelectionItems,
} from "../lib/projectSelectionStore";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `≈ ${num.toLocaleString("ru-RU")} ₽`;
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

function actionButtonStyle(isDark, variant = "default") {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    font: "inherit",
    border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
    color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.9)",
  };
  if (variant === "primary") {
    return {
      ...base,
      background: isDark ? "rgba(183,157,138,0.28)" : "rgba(183,157,138,0.22)",
      border: isDark ? "1px solid rgba(183,157,138,0.35)" : "1px solid rgba(183,157,138,0.3)",
    };
  }
  return base;
}

function statusPillStyle(isDark, status) {
  const palette = {
    [PROJECT_SELECTION_STATUS.SELECTED]: {
      bg: isDark ? "rgba(183,157,138,0.22)" : "rgba(183,157,138,0.18)",
      color: isDark ? "rgba(243,238,231,0.9)" : "rgba(80,62,48,0.92)",
      label: "В подборке",
    },
    [PROJECT_SELECTION_STATUS.BUDGET]: {
      bg: isDark ? "rgba(120,180,140,0.18)" : "rgba(120,180,140,0.16)",
      color: isDark ? "rgba(220,245,228,0.95)" : "rgba(34,84,52,0.92)",
      label: "В смете",
    },
    [PROJECT_SELECTION_STATUS.EXCLUDED]: {
      bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      color: isDark ? "rgba(243,238,231,0.5)" : "rgba(110,106,102,0.72)",
      label: "Исключено",
    },
  };
  const tone = palette[status] || palette[PROJECT_SELECTION_STATUS.SELECTED];
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    background: tone.bg,
    color: tone.color,
    label: tone.label,
  };
}

function SelectionRow({ item, isDark, isMobile, onStatusChange }) {
  const pill = statusPillStyle(isDark, item.status);
  const isExcluded = item.status === PROJECT_SELECTION_STATUS.EXCLUDED;

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        padding: isMobile ? "10px 0" : "10px 12px",
        borderRadius: isMobile ? 0 : "12px",
        border: isMobile ? "none" : isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
        borderBottom: isMobile ? (isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)") : undefined,
        background: isMobile ? "transparent" : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.45)",
        opacity: isExcluded ? 0.72 : 1,
      }}
    >
      {item.image ? (
        <img
          src={item.image}
          alt={item.title || item.model || "Товар"}
          loading="lazy"
          decoding="async"
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "8px",
            objectFit: "cover",
            flexShrink: 0,
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
          }}
        />
      ) : (
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "8px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.75)",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
          }}
        >
          Нет фото
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              lineHeight: 1.35,
              color: isDark ? "rgba(243,238,231,0.92)" : "rgba(43,43,43,0.92)",
            }}
          >
            {item.brand || "—"}
          </div>
          <span style={pill}>{pill.label}</span>
        </div>
        <div
          style={{
            marginTop: "4px",
            fontSize: "13px",
            lineHeight: 1.45,
            color: isDark ? "rgba(243,238,231,0.78)" : "rgba(110,106,102,0.9)",
          }}
        >
          {item.title || item.model || "—"}
        </div>
        <div
          style={{
            marginTop: "6px",
            fontSize: "13px",
            fontWeight: 600,
            color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.9)",
          }}
        >
          {formatPrice(item.price)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
          {item.status === PROJECT_SELECTION_STATUS.SELECTED ? (
            <button
              type="button"
              onClick={() => onStatusChange(item.id, PROJECT_SELECTION_STATUS.BUDGET)}
              style={actionButtonStyle(isDark, "primary")}
            >
              В смету
            </button>
          ) : null}
          {item.status !== PROJECT_SELECTION_STATUS.EXCLUDED ? (
            <button
              type="button"
              onClick={() => onStatusChange(item.id, PROJECT_SELECTION_STATUS.EXCLUDED)}
              style={actionButtonStyle(isDark)}
            >
              Исключить
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStatusChange(item.id, PROJECT_SELECTION_STATUS.SELECTED)}
              style={actionButtonStyle(isDark)}
            >
              Вернуть
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const ProjectSelectionSection = memo(function ProjectSelectionSection({
  selectedProjectItems,
  isDark,
  isMobile = false,
  onStatusChange,
}) {
  const items = asArray(selectedProjectItems);
  const activeCount = items.filter((item) => item.status !== PROJECT_SELECTION_STATUS.EXCLUDED).length;
  const budgetSubtotal = useMemo(() => sumBudgetSelectionItems(items), [items]);
  const grouped = useMemo(() => groupProjectSelectionByCategory(items), [items]);

  return (
    <div style={{ marginTop: "20px" }}>
      <div style={sectionLabelStyle(isDark)}>Подборка проекта</div>
      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.5,
          marginBottom: "12px",
          color: isDark ? "rgba(243,238,231,0.72)" : "rgba(110,106,102,0.88)",
        }}
      >
        {activeCount > 0
          ? `${activeCount} ${activeCount === 1 ? "позиция" : activeCount < 5 ? "позиции" : "позиций"} выбрано`
          : "0 позиций выбрано"}
      </div>

      {!items.length ? (
        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.55,
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          Добавьте позиции из рекомендаций, чтобы собрать подборку проекта.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {[...grouped.entries()].map(([category, categoryItems]) => (
            <div key={category}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
                }}
              >
                {category}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {categoryItems.map((item) => (
                  <SelectionRow
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    isMobile={isMobile}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
          {budgetSubtotal > 0 ? (
            <div
              style={{
                marginTop: "4px",
                paddingTop: "12px",
                borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: 1.5,
                color: isDark ? "rgba(243,238,231,0.9)" : "rgba(43,43,43,0.92)",
              }}
            >
              Предварительная сумма выбранных позиций: {formatPrice(budgetSubtotal)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});
