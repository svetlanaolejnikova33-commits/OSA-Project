"use client";

import { memo, useMemo } from "react";
import { getProjectProgressSteps, getProjectSnapshot, getSupplierIntelligence } from "../../lib/projectWorkspaceModel";
import { ProjectProgress } from "./ProjectProgress";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sectionTitleStyle(isDark) {
  return {
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 600,
    margin: "0 0 10px 2px",
    color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
  };
}

export const ProjectSidebar = memo(function ProjectSidebar({
  semanticDraft,
  budgetDraft,
  isDark,
  isMobile = false,
  isRunning,
  analysisDocumentSaved,
}) {
  const snapshot = useMemo(() => getProjectSnapshot(semanticDraft), [semanticDraft]);
  const supplierIntelligence = useMemo(
    () => getSupplierIntelligence(semanticDraft, budgetDraft),
    [semanticDraft, budgetDraft]
  );
  const progress = useMemo(() => {
    const steps = getProjectProgressSteps(semanticDraft);
    return steps.map((step) => {
      if (step.id === "budget") return { ...step, done: step.done || Boolean(budgetDraft) };
      if (step.id === "sku") {
        return { ...step, done: step.done || asArray(budgetDraft?.previewBudgetRows).length > 0 };
      }
      return step;
    });
  }, [semanticDraft, budgetDraft]);

  const titleBase = useMemo(() => sectionTitleStyle(isDark), [isDark]);
  const statusLabel = isRunning ? "Анализ выполняется…" : analysisDocumentSaved ? "Анализ сохранён" : "Несохранённый анализ";

  return (
    <div className="osa-project-sidebar">
      {!isMobile ? <div style={titleBase}>Статус проекта</div> : null}

      <div
        style={{
          padding: isMobile ? "0 0 12px 0" : "12px",
          borderRadius: isMobile ? 0 : "16px",
          marginBottom: "14px",
          border: isMobile ? "none" : isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          borderBottom: isMobile ? (isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)") : undefined,
          background: isMobile ? "transparent" : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.35, marginBottom: "6px" }}>
          {snapshot.roomName || "Проект без названия"}
        </div>
        <div
          style={{
            fontSize: "12px",
            lineHeight: 1.45,
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          {statusLabel}
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div style={{ ...titleBase, marginTop: 0 }}>Готовность</div>
        <ProjectProgress steps={progress} isDark={isDark} />
      </div>

      {supplierIntelligence.categoryCount > 0 || supplierIntelligence.matchedBrandCount > 0 ? (
        <div
          style={{
            padding: isMobile ? "0" : "12px",
            borderRadius: isMobile ? 0 : "14px",
            border: isMobile ? "none" : isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
            background: isMobile ? "transparent" : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.45)",
            fontSize: "13px",
            lineHeight: 1.5,
            color: isDark ? "rgba(243,238,231,0.78)" : "rgba(110,106,102,0.88)",
          }}
        >
          <div style={{ ...titleBase, marginTop: 0, marginBottom: "8px" }}>Поставщики</div>
          {supplierIntelligence.categoryCount > 0 ? (
            <div>{supplierIntelligence.categoryCount} категорий</div>
          ) : null}
          {supplierIntelligence.matchedBrandCount > 0 ? (
            <div style={{ marginTop: supplierIntelligence.categoryCount > 0 ? "4px" : 0 }}>
              {supplierIntelligence.matchedBrandCount} брендов
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
