"use client";

export function GenerateConceptCompact({ resultData, isDark, isMobile }) {
  if (!resultData) return null;

  const labelStyle = {
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 600,
    marginBottom: "4px",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
  };

  const valueStyle = {
    fontSize: isMobile ? "14px" : "15px",
    lineHeight: 1.45,
    color: isDark ? "rgba(243,238,231,0.92)" : "rgba(43,43,43,0.92)",
  };

  const chipStyle = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    marginRight: "6px",
    marginBottom: "6px",
    border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.06)",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
  };

  return (
    <div
      style={{
        width: "100%",
        textAlign: "left",
        padding: isMobile ? "14px 0 0" : "16px 0 0",
        borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <div style={labelStyle}>Концепция</div>
        <div style={{ ...valueStyle, fontWeight: 600 }}>{resultData.title}</div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "12px",
        }}
      >
        <div>
          <div style={labelStyle}>Стиль</div>
          <div style={valueStyle}>{resultData.style || "—"}</div>
        </div>
        <div>
          <div style={labelStyle}>Настроение</div>
          <div style={valueStyle}>{resultData.mood || "—"}</div>
        </div>
      </div>
      {Array.isArray(resultData.materials) && resultData.materials.length ? (
        <div style={{ marginTop: "12px" }}>
          <div style={labelStyle}>Материалы</div>
          <div>
            {resultData.materials.map((m) => (
              <span key={m} style={chipStyle}>
                {m}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
