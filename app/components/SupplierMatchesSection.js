"use client";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function categoryTitle(entry) {
  const parent = typeof entry?.parentLabelRu === "string" ? entry.parentLabelRu.trim() : "";
  const label = typeof entry?.labelRu === "string" ? entry.labelRu.trim() : "";
  if (parent && label) return `${parent} / ${label}`;
  return label || parent || "Категория";
}

function cardStyle(isDark) {
  return {
    padding: "12px",
    borderRadius: "16px",
    marginBottom: "12px",
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
  };
}

function chipStyle(isDark) {
  return {
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "12px",
    border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    color: isDark ? "rgba(243,238,231,0.92)" : "rgba(43,43,43,0.9)",
  };
}

export function SupplierMatchesSection({
  budgetDraft,
  isDark,
  isMobile = false,
  title = "Найденные поставщики",
  showReadiness = false,
  supplierIntelligence = null,
}) {
  const groups = asArray(budgetDraft?.normalizedSpecGroups);
  if (!budgetDraft) {
    return (
      <div style={cardStyle(isDark)}>
        <div style={{ fontSize: "13px", lineHeight: 1.5, color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)" }}>
          Создайте черновик сметы, чтобы увидеть поставщиков из реестра.
        </div>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div style={cardStyle(isDark)}>
        <div style={{ fontSize: "13px", lineHeight: 1.5, color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)" }}>
          Категории сметы пока не сформированы.
        </div>
      </div>
    );
  }

  return (
    <div>
      {title ? (
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 600,
            margin: "0 0 10px 2px",
            color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
          }}
        >
          {title}
        </div>
      ) : null}

      {showReadiness && supplierIntelligence ? (
        <div style={{ ...cardStyle(isDark), marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "6px" }}>
            Категории: {supplierIntelligence.categoryCount}
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.5 }}>
            Найдено брендов: {supplierIntelligence.matchedBrandCount}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "10px" : "8px" }}>
        {groups.map((entry) => {
          const matchedBrands = asArray(entry?.supplierCandidates?.matchedBrands);
          const categoryName = categoryTitle(entry);
          return (
            <div
              key={`${entry.registryCategoryId}-${entry.sourceText || categoryName}`}
              style={cardStyle(isDark)}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.4, marginBottom: "6px" }}>
                {categoryName}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: 1.45,
                  marginBottom: "8px",
                  color: isDark ? "rgba(243,238,231,0.68)" : "rgba(110,106,102,0.82)",
                }}
              >
                Брендов: {matchedBrands.length}
              </div>
              {matchedBrands.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {matchedBrands.map((brand) => (
                    <span key={`${entry.registryCategoryId}-${brand.brandId || brand.brandName}`} style={chipStyle(isDark)}>
                      {brand.brandName}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.45,
                    color: isDark ? "rgba(243,238,231,0.58)" : "rgba(110,106,102,0.78)",
                  }}
                >
                  Поставщики пока не найдены для этой категории
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
