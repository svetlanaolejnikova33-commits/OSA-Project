"use client";

import { memo, useMemo, useState } from "react";
import {
  getProjectSelectionSummary,
  groupProjectSelectionByCategory,
  PROJECT_SELECTION_STATUS,
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
    margin: "0 0 6px 2px",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
  };
}

function pillActionStyle(isDark, variant = "default") {
  const base = {
    padding: "4px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    font: "inherit",
    lineHeight: 1.2,
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.82)",
    color: isDark ? "rgba(243,238,231,0.86)" : "rgba(43,43,43,0.88)",
  };
  if (variant === "primary") {
    return {
      ...base,
      background: isDark ? "rgba(183,157,138,0.24)" : "rgba(183,157,138,0.2)",
      border: isDark ? "1px solid rgba(183,157,138,0.32)" : "1px solid rgba(183,157,138,0.28)",
    };
  }
  return base;
}

function statusPillStyle(isDark, status) {
  const palette = {
    [PROJECT_SELECTION_STATUS.SELECTED]: {
      bg: isDark ? "rgba(183,157,138,0.18)" : "rgba(183,157,138,0.14)",
      color: isDark ? "rgba(243,238,231,0.86)" : "rgba(80,62,48,0.9)",
      label: "В подборке",
    },
    [PROJECT_SELECTION_STATUS.BUDGET]: {
      bg: isDark ? "rgba(120,180,140,0.16)" : "rgba(120,180,140,0.14)",
      color: isDark ? "rgba(220,245,228,0.92)" : "rgba(34,84,52,0.9)",
      label: "В смете",
    },
    [PROJECT_SELECTION_STATUS.EXCLUDED]: {
      bg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      color: isDark ? "rgba(243,238,231,0.48)" : "rgba(110,106,102,0.68)",
      label: "Исключено",
    },
  };
  const tone = palette[status] || palette[PROJECT_SELECTION_STATUS.SELECTED];
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 7px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    background: tone.bg,
    color: tone.color,
    label: tone.label,
  };
}

function brandModelLine(item) {
  const brand = item.brand || "—";
  const model = item.model || item.title || "";
  return model && model !== brand ? `${brand} / ${model}` : brand;
}

function hasExpandableDetails(item) {
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const model = typeof item.model === "string" ? item.model.trim() : "";
  return Boolean(
    (title && title !== model) ||
      item.sourceUrl ||
      (Number.isFinite(item.matchPercent) && item.matchPercent > 0)
  );
}

function CompactSelectionRow({ item, isDark, onStatusChange }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const pill = statusPillStyle(isDark, item.status);
  const isExcluded = item.status === PROJECT_SELECTION_STATUS.EXCLUDED;
  const showDetails = hasExpandableDetails(item);

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "flex-start",
        padding: "7px 0",
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)",
        opacity: isExcluded ? 0.68 : 1,
      }}
    >
      {item.image ? (
        <img
          src={item.image}
          alt={item.title || item.model || "Товар"}
          loading="lazy"
          decoding="async"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "7px",
            objectFit: "cover",
            flexShrink: 0,
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          }}
        />
      ) : (
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "7px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "9px",
            color: isDark ? "rgba(243,238,231,0.45)" : "rgba(110,106,102,0.65)",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          —
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 8px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              lineHeight: 1.35,
              color: isDark ? "rgba(243,238,231,0.9)" : "rgba(43,43,43,0.9)",
              minWidth: 0,
            }}
          >
            {brandModelLine(item)}
          </div>
          <span style={{ fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>{formatPrice(item.price)}</span>
        </div>
        <div
          style={{
            marginTop: "2px",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 8px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              lineHeight: 1.35,
              color: isDark ? "rgba(243,238,231,0.52)" : "rgba(110,106,102,0.72)",
            }}
          >
            {item.category || "Прочее"}
          </span>
          <span style={pill}>{pill.label}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px", alignItems: "center" }}>
          {item.status === PROJECT_SELECTION_STATUS.SELECTED ? (
            <button
              type="button"
              onClick={() => onStatusChange(item.id, PROJECT_SELECTION_STATUS.BUDGET)}
              style={pillActionStyle(isDark, "primary")}
            >
              В смету
            </button>
          ) : null}
          {item.status !== PROJECT_SELECTION_STATUS.EXCLUDED ? (
            <button
              type="button"
              onClick={() => onStatusChange(item.id, PROJECT_SELECTION_STATUS.EXCLUDED)}
              style={pillActionStyle(isDark)}
            >
              Исключить
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStatusChange(item.id, PROJECT_SELECTION_STATUS.SELECTED)}
              style={pillActionStyle(isDark)}
            >
              Вернуть
            </button>
          )}
          {showDetails ? (
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              style={{
                ...pillActionStyle(isDark),
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: "4px 2px",
                color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.72)",
              }}
            >
              {detailsOpen ? "Скрыть ▲" : "Подробнее ▼"}
            </button>
          ) : null}
        </div>
        {detailsOpen && showDetails ? (
          <div
            style={{
              marginTop: "6px",
              fontSize: "11px",
              lineHeight: 1.45,
              color: isDark ? "rgba(243,238,231,0.58)" : "rgba(110,106,102,0.78)",
            }}
          >
            {item.title && item.title !== item.model ? <div>{item.title}</div> : null}
            {Number.isFinite(item.matchPercent) && item.matchPercent > 0 ? (
              <div>{item.matchPercent}% совпадение</div>
            ) : null}
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: isDark ? "rgba(147,197,253,0.9)" : "rgba(37,99,235,0.9)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Открыть источник
              </a>
            ) : null}
          </div>
        ) : null}
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
  const summary = useMemo(() => getProjectSelectionSummary(items), [items]);
  const grouped = useMemo(() => groupProjectSelectionByCategory(items), [items]);

  const summaryLine =
    summary.budgetTotal > 0
      ? `${summary.selectedCount} выбрано • ${summary.budgetCount} в смете • ${formatPrice(summary.budgetTotal)}`
      : summary.selectedCount > 0
        ? `${summary.selectedCount} выбрано • ${summary.budgetCount} в смете • —`
        : "0 выбрано • 0 в смете • —";

  return (
    <div style={{ marginTop: "18px" }}>
      <div style={sectionLabelStyle(isDark)}>Подборка проекта</div>
      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.45,
          marginBottom: "10px",
          color: isDark ? "rgba(243,238,231,0.68)" : "rgba(110,106,102,0.82)",
        }}
      >
        {summaryLine}
      </div>

      {!items.length ? (
        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.55,
            color: isDark ? "rgba(243,238,231,0.58)" : "rgba(110,106,102,0.78)",
          }}
        >
          Добавьте позиции из рекомендаций, чтобы собрать подборку проекта.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[...grouped.entries()].map(([category, categoryItems]) => (
            <div key={category}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 650,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                  color: isDark ? "rgba(243,238,231,0.48)" : "rgba(110,106,102,0.68)",
                }}
              >
                {category}
              </div>
              <div>
                {categoryItems.map((item) => (
                  <CompactSelectionRow
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
