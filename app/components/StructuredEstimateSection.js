"use client";

import { memo, useMemo } from "react";
import {
  buildStructuredEstimateRows,
  sumStructuredEstimateRows,
} from "../lib/projectSelectionStore";

function formatPrice(value, withApprox = true) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "—";
  const formatted = num.toLocaleString("ru-RU");
  return withApprox ? `≈ ${formatted} ₽` : `${formatted} ₽`;
}

function sectionLabelStyle(isDark) {
  return {
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 650,
    margin: "0 0 8px 2px",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
  };
}

function cellStyle(isDark, align = "left") {
  return {
    padding: "8px 6px",
    fontSize: "12px",
    lineHeight: 1.4,
    textAlign: align,
    color: isDark ? "rgba(243,238,231,0.82)" : "rgba(43,43,43,0.88)",
    verticalAlign: "top",
  };
}

export const StructuredEstimateSection = memo(function StructuredEstimateSection({
  selectedProjectItems,
  projectKey = "",
  isDark,
  isMobile = false,
}) {
  const estimateRows = useMemo(
    () => buildStructuredEstimateRows(selectedProjectItems, projectKey),
    [selectedProjectItems, projectKey]
  );
  const total = useMemo(() => sumStructuredEstimateRows(estimateRows), [estimateRows]);

  return (
    <div style={{ marginTop: "18px" }}>
      <div style={sectionLabelStyle(isDark)}>Итоговая смета</div>
      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.45,
          marginBottom: "10px",
          color: isDark ? "rgba(243,238,231,0.68)" : "rgba(110,106,102,0.82)",
        }}
      >
        {estimateRows.length
          ? `${estimateRows.length} ${estimateRows.length === 1 ? "позиция" : estimateRows.length < 5 ? "позиции" : "позиций"} • ${formatPrice(total)}`
          : "0 позиций • —"}
      </div>

      {!estimateRows.length ? (
        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.55,
            color: isDark ? "rgba(243,238,231,0.58)" : "rgba(110,106,102,0.78)",
          }}
        >
          Отметьте позиции как «В смете», чтобы сформировать итоговую таблицу.
        </div>
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {estimateRows.map((row) => (
            <div
              key={row.id}
              style={{
                padding: "8px 0",
                borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)",
                fontSize: "12px",
                lineHeight: 1.45,
                color: isDark ? "rgba(243,238,231,0.82)" : "rgba(43,43,43,0.88)",
              }}
            >
              <div style={{ fontWeight: 600 }}>{row.category}</div>
              <div style={{ marginTop: "2px" }}>
                {row.brand}
                {row.model ? ` / ${row.model}` : ""}
              </div>
              <div style={{ marginTop: "4px", display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <span>
                  {row.quantity} {row.unit}
                </span>
                <span>{formatPrice(row.price, false)}</span>
                <span style={{ fontWeight: 600 }}>{formatPrice(row.total, false)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "420px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
                }}
              >
                {["Категория", "Бренд / модель", "Кол-во", "Цена", "Сумма"].map((label, index) => (
                  <th
                    key={label}
                    style={{
                      ...cellStyle(isDark, index >= 2 ? "right" : "left"),
                      fontWeight: 650,
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: isDark ? "rgba(243,238,231,0.52)" : "rgba(110,106,102,0.72)",
                      paddingBottom: "6px",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estimateRows.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <td style={cellStyle(isDark)}>{row.category}</td>
                  <td style={cellStyle(isDark)}>
                    {row.brand}
                    {row.model ? ` / ${row.model}` : ""}
                  </td>
                  <td style={cellStyle(isDark, "right")}>
                    {row.quantity} {row.unit}
                  </td>
                  <td style={cellStyle(isDark, "right")}>{formatPrice(row.price, false)}</td>
                  <td style={{ ...cellStyle(isDark, "right"), fontWeight: 600 }}>{formatPrice(row.total, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
