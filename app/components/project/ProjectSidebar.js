"use client";

import { memo, useMemo } from "react";
import {
  getBudgetCategories,
  getMaterialHighlights,
  getProjectProgressSteps,
  getProjectSnapshot,
  getSidebarPalette,
  getSupplierIntelligence,
} from "../../lib/projectWorkspaceModel";
import { getEditableObjectsSummary } from "../../lib/editableObjectsUtils";
import { getConceptDNASummary } from "../../lib/styleConsistencyUtils";
import { getSceneGraphSummary } from "../../lib/sceneGraphUtils";
import { ProjectMaterials } from "./ProjectMaterials";
import { ProjectProgress } from "./ProjectProgress";
import { ResponsiveSection } from "../ResponsiveSection";
import { SkuMatchesSection } from "../SkuMatchesSection";
import { SupplierMatchesSection } from "../SupplierMatchesSection";

const SIDEBAR_EMPTY_MIN_HEIGHT = "52px";

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

const PaletteSwatches = memo(function PaletteSwatches({ entries, isDark }) {
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", minHeight: "28px" }} className="osa-palette-swatches">
      {entries.map((entry, index) => (
        <div
          key={`${entry.hex || "color"}-${index}`}
          title={entry.labelRu || entry.hex || "цвет"}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: entry.hex || "transparent",
            border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.08)",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
});

function ConceptDNABlock({ conceptSummary, isMobile }) {
  if (isMobile) {
    return (
      <div style={{ fontSize: "13px", lineHeight: 1.55, minHeight: SIDEBAR_EMPTY_MIN_HEIGHT }}>
        <div style={{ marginBottom: "6px" }}>
          <span style={{ opacity: 0.55 }}>Стиль · </span>
          {conceptSummary.style}
        </div>
        <div style={{ marginBottom: "6px" }}>
          <span style={{ opacity: 0.55 }}>Палитра · </span>
          {conceptSummary.palette}
        </div>
        <div>
          <span style={{ opacity: 0.55 }}>Материалы · </span>
          {conceptSummary.materials}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: SIDEBAR_EMPTY_MIN_HEIGHT }}>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>Стиль: {conceptSummary.style}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>Палитра: {conceptSummary.palette}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>Материалы: {conceptSummary.materials}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
        Сохраняемых элементов: {conceptSummary.preservationCount}
      </div>
      <div style={{ fontSize: "13px", lineHeight: 1.5 }}>Значимых правок: {conceptSummary.highImpactEditsCount}</div>
    </div>
  );
}

function SceneGraphBlock({ sceneGraphSummary, editableSummary, isMobile }) {
  if (isMobile) {
    return (
      <div style={{ fontSize: "13px", lineHeight: 1.55, minHeight: SIDEBAR_EMPTY_MIN_HEIGHT }}>
        {sceneGraphSummary.zoneCount} зон · {sceneGraphSummary.objectCount} объектов · {editableSummary.total} редактируемых
      </div>
    );
  }

  return (
    <div style={{ minHeight: SIDEBAR_EMPTY_MIN_HEIGHT }}>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>Зоны: {sceneGraphSummary.zoneCount}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>Объекты: {sceneGraphSummary.objectCount}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>Редактируемые: {sceneGraphSummary.editableCount}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
        Для сметы: {sceneGraphSummary.budgetRelevantCount}
      </div>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>Элементов: {editableSummary.total}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>Безопасных: {editableSummary.highSafety}</div>
      <div style={{ fontSize: "13px", lineHeight: 1.5 }}>Рискованных: {editableSummary.risky}</div>
    </div>
  );
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
  const palette = useMemo(() => getSidebarPalette(semanticDraft), [semanticDraft]);
  const materials = useMemo(() => getMaterialHighlights(semanticDraft), [semanticDraft]);
  const categories = useMemo(
    () => getBudgetCategories(semanticDraft, budgetDraft),
    [semanticDraft, budgetDraft]
  );
  const progress = useMemo(() => getProjectProgressSteps(semanticDraft), [semanticDraft]);
  const supplierIntelligence = useMemo(
    () => getSupplierIntelligence(semanticDraft, budgetDraft),
    [semanticDraft, budgetDraft]
  );
  const sceneGraphSummary = useMemo(
    () => getSceneGraphSummary(semanticDraft?.sceneGraph),
    [semanticDraft?.sceneGraph]
  );
  const editableSummary = useMemo(
    () => getEditableObjectsSummary(semanticDraft?.editableObjects),
    [semanticDraft?.editableObjects]
  );
  const conceptSummary = useMemo(
    () => getConceptDNASummary(semanticDraft?.styleConsistency, semanticDraft?.editableObjects),
    [semanticDraft?.styleConsistency, semanticDraft?.editableObjects]
  );
  const paletteEntries = useMemo(
    () => [...(palette.dominant || []), ...(palette.accents || [])].slice(0, 8),
    [palette.dominant, palette.accents]
  );
  const statusLabel = isRunning ? "Анализ выполняется…" : snapshot.status;

  const titleBase = useMemo(() => sectionTitleStyle(isDark), [isDark]);
  const paletteTitleStyle = useMemo(() => ({ ...titleBase, marginTop: "4px" }), [titleBase]);
  const skuTitleStyle = useMemo(() => ({ ...titleBase, marginTop: "12px" }), [titleBase]);
  const sectionTitleSpaced = useMemo(() => ({ ...titleBase, marginTop: "16px" }), [titleBase]);

  const cardStyle = useMemo(
    () => ({
      padding: isMobile ? "0" : "12px",
      borderRadius: isMobile ? 0 : "16px",
      marginBottom: isMobile ? "0" : "16px",
      border: isMobile ? "none" : isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
      background: isMobile ? "transparent" : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
    }),
    [isDark, isMobile]
  );

  return (
    <div className="osa-project-sidebar">
      {!isMobile ? <div style={titleBase}>Project Sidebar</div> : null}

      <div
        style={{
          minHeight: analysisDocumentSaved ? 0 : "48px",
          marginBottom: analysisDocumentSaved ? 0 : "16px",
        }}
      >
        {!analysisDocumentSaved ? (
          <div
            style={{
              padding: "12px",
              borderRadius: isMobile ? "12px" : "16px",
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
              fontSize: "13px",
              lineHeight: 1.5,
              color: isDark ? "rgba(243,238,231,0.72)" : "rgba(110,106,102,0.88)",
            }}
          >
            Текущий анализ ещё не сохранён
          </div>
        ) : null}
      </div>

      <div
        style={{
          padding: isMobile ? "0 0 12px 0" : "12px",
          borderRadius: isMobile ? 0 : "16px",
          marginBottom: "16px",
          border: isMobile ? "none" : isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          borderBottom: isMobile ? (isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)") : undefined,
          background: isMobile ? "transparent" : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
          minHeight: "72px",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.35, marginBottom: "8px" }}>
          {snapshot.roomName || "Помещение не определено"}
        </div>
        <div
          style={{
            fontSize: "13px",
            marginBottom: "6px",
            color: isDark ? "rgba(243,238,231,0.88)" : "rgba(43,43,43,0.88)",
          }}
        >
          <span style={{ opacity: 0.55 }}>Стиль · </span>
          {snapshot.style || "—"}
        </div>
        <div
          style={{
            fontSize: "12px",
            lineHeight: 1.45,
            minHeight: "18px",
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          {statusLabel}
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <SupplierMatchesSection
          budgetDraft={budgetDraft}
          isDark={isDark}
          isMobile={isMobile}
          title="Найденные поставщики"
          showReadiness={!isMobile}
          supplierIntelligence={supplierIntelligence}
          displayMode="list"
        />
        {budgetDraft && !isMobile ? (
          <div style={{ marginTop: "12px", minHeight: "88px" }}>
            <ProjectProgress steps={supplierIntelligence.readiness} isDark={isDark} />
          </div>
        ) : null}
        {isMobile ? (
          <ResponsiveSection title="Подобранные позиции" titleStyle={skuTitleStyle} isMobile={isMobile} defaultOpen={false}>
            <SkuMatchesSection budgetDraft={budgetDraft} isDark={isDark} />
          </ResponsiveSection>
        ) : (
          <SkuMatchesSection budgetDraft={budgetDraft} isDark={isDark} />
        )}
      </div>

      <ResponsiveSection title="Палитра" titleStyle={paletteTitleStyle} isMobile={isMobile} defaultOpen={!isMobile}>
        <div style={{ minHeight: SIDEBAR_EMPTY_MIN_HEIGHT }}>
          {paletteEntries.length ? (
            <>
              <PaletteSwatches entries={paletteEntries} isDark={isDark} />
              <div
                style={{
                  marginTop: "8px",
                  marginBottom: isMobile ? "0" : "16px",
                  fontSize: "12px",
                  color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
                }}
              >
                {palette.source === "extracted" ? "Извлечена из изображения" : "Определена Vision"}
              </div>
            </>
          ) : (
            <div
              style={{
                marginBottom: isMobile ? "0" : "16px",
                fontSize: "13px",
                lineHeight: 1.5,
                color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
              }}
            >
              Палитра появится после анализа.
            </div>
          )}
        </div>
      </ResponsiveSection>

      <ResponsiveSection title="Ключевые материалы" titleStyle={titleBase} isMobile={isMobile} defaultOpen={!isMobile}>
        <ProjectMaterials items={materials} isDark={isDark} />
      </ResponsiveSection>

      <ResponsiveSection
        title="Потенциальные категории сметы"
        titleStyle={sectionTitleSpaced}
        isMobile={isMobile}
        defaultOpen={false}
      >
        <ProjectMaterials
          items={categories}
          isDark={isDark}
          emptyLabel="Категории сметы появятся после SPEC-анализа."
        />
      </ResponsiveSection>

      <ResponsiveSection title="Логика концепции" titleStyle={sectionTitleSpaced} isMobile={isMobile} defaultOpen={false}>
        <div style={cardStyle}>
          <ConceptDNABlock conceptSummary={conceptSummary} isMobile={isMobile} />
        </div>
      </ResponsiveSection>

      <ResponsiveSection title="Структура сцены" titleStyle={sectionTitleSpaced} isMobile={isMobile} defaultOpen={false}>
        <div style={cardStyle}>
          <SceneGraphBlock
            sceneGraphSummary={sceneGraphSummary}
            editableSummary={editableSummary}
            isMobile={isMobile}
          />
        </div>
      </ResponsiveSection>

      <ResponsiveSection title="Готовность проекта" titleStyle={sectionTitleSpaced} isMobile={isMobile} defaultOpen={!isMobile}>
        <div style={{ minHeight: "88px" }}>
          <ProjectProgress steps={progress} isDark={isDark} />
        </div>
      </ResponsiveSection>
    </div>
  );
});
