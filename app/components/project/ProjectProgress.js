"use client";

export function ProjectProgress({ steps, isDark }) {
  if (!Array.isArray(steps) || !steps.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "8px",
      }}
    >
      {steps.map((step) => (
        <div
          key={step.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            padding: "8px 10px",
            borderRadius: "12px",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)",
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.55)",
            fontSize: "12px",
            lineHeight: 1.35,
            color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.9)",
          }}
        >
          <span>{step.label}</span>
          <span
            style={{
              fontWeight: 600,
              color: step.done
                ? isDark
                  ? "rgba(183,157,138,0.95)"
                  : "rgba(120,92,72,0.92)"
                : isDark
                  ? "rgba(243,238,231,0.42)"
                  : "rgba(110,106,102,0.55)",
            }}
          >
            {step.done ? "✓" : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
