"use client";

import { memo, useMemo } from "react";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function categoryTitle(entry) {
  const parent = typeof entry?.parentLabelRu === "string" ? entry.parentLabelRu.trim() : "";
  const label = typeof entry?.labelRu === "string" ? entry.labelRu.trim() : "";
  if (parent) return parent;
  return label || "Категория";
}

function categorySubtitle(entry) {
  const parent = typeof entry?.parentLabelRu === "string" ? entry.parentLabelRu.trim() : "";
  const label = typeof entry?.labelRu === "string" ? entry.labelRu.trim() : "";
  if (parent && label && parent !== label) return label;
  return "";
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

function sortGroups(groups) {
  return [...groups].sort((left, right) => {
    const leftCount = asArray(left?.supplierCandidates?.matchedBrands).length;
    const rightCount = asArray(right?.supplierCandidates?.matchedBrands).length;
    if (leftCount !== rightCount) return rightCount - leftCount;
    return categoryTitle(left).localeCompare(categoryTitle(right), "ru");
  });
}

const emptyMessageStyle = (isDark) => ({
  fontSize: "13px",
  lineHeight: 1.5,
  minHeight: "52px",
  color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
});

const sectionTitleStyle = (isDark) => ({
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 600,
  margin: "0 0 10px 2px",
  color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
});

export const SupplierMatchesSection = memo(function SupplierMatchesSection({
  budgetDraft,
  isDark,
  isMobile = false,
  title = "Найденные поставщики",
  showReadiness = false,
  supplierIntelligence = null,
  displayMode = "chips",
  onlyWithBrands = false,
}) {
  const groups = useMemo(() => {
    const source = onlyWithBrands
      ? asArray(budgetDraft?.normalizedSpecGroups).filter(
          (entry) => asArray(entry?.supplierCandidates?.matchedBrands).length > 0
        )
      : asArray(budgetDraft?.normalizedSpecGroups);
    return sortGroups(source);
  }, [budgetDraft?.normalizedSpecGroups, onlyWithBrands]);

  if (!budgetDraft) {
    return (
      <div style={cardStyle(isDark)}>
        <div style={emptyMessageStyle(isDark)}>
          Создайте черновик сметы, чтобы увидеть поставщиков из реестра.
        </div>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div style={cardStyle(isDark)}>
        <div style={emptyMessageStyle(isDark)}>
          {onlyWithBrands
            ? "Поставщики из реестра пока не найдены. Проверьте группы освещения в анализе."
            : "Категории сметы пока не сформированы."}
        </div>
      </div>
    );
  }

  return (
    <div>
      {title ? <div style={sectionTitleStyle(isDark)}>{title}</div> : null}

      {showReadiness && supplierIntelligence ? (
        <div style={{ ...cardStyle(isDark), marginBottom: "12px", minHeight: "52px" }}>
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
          const categoryHint = categorySubtitle(entry);
          const brandLabel =
            matchedBrands.length === 1 ? "1 бренд найден" : `${matchedBrands.length} брендов найдено`;
          return (
            <div
              key={`${entry.registryCategoryId}-${entry.sourceText || categoryName}`}
              style={cardStyle(isDark)}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.4, marginBottom: "4px" }}>
                {categoryName}
              </div>
              {categoryHint ? (
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.45,
                    marginBottom: "6px",
                    color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.78)",
                  }}
                >
                  {categoryHint}
                </div>
              ) : null}
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: 1.45,
                  marginBottom: "8px",
                  color: isDark ? "rgba(243,238,231,0.68)" : "rgba(110,106,102,0.82)",
                }}
              >
                {matchedBrands.length ? brandLabel : "Поставщики пока не найдены для этой категории"}
              </div>
              {matchedBrands.length ? (
                displayMode === "list" ? (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "18px",
                      fontSize: "13px",
                      lineHeight: 1.55,
                      color: isDark ? "rgba(243,238,231,0.9)" : "rgba(43,43,43,0.9)",
                    }}
                  >
                    {matchedBrands.map((brand) => (
                      <li key={`${entry.registryCategoryId}-${brand.brandId || brand.brandName}`}>
                        {brand.brandName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {matchedBrands.map((brand) => (
                      <span key={`${entry.registryCategoryId}-${brand.brandId || brand.brandName}`} style={chipStyle(isDark)}>
                        {brand.brandName}
                      </span>
                    ))}
                  </div>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});
