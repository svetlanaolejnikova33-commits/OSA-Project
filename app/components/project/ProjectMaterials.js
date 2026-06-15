"use client";

import { memo } from "react";

const EMPTY_MIN_HEIGHT = "52px";

export const ProjectMaterials = memo(function ProjectMaterials({
  items,
  isDark,
  emptyLabel = "Материалы появятся после анализа.",
}) {
  if (!Array.isArray(items) || !items.length) {
    return (
      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.5,
          minHeight: EMPTY_MIN_HEIGHT,
          color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", minHeight: EMPTY_MIN_HEIGHT }}>
      {items.map((item) => (
        <div
          key={item}
          style={{
            padding: "8px 10px",
            borderRadius: "12px",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)",
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.55)",
            fontSize: "13px",
            lineHeight: 1.45,
            color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.9)",
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
});
