"use client";

import {
  getBudgetCategories,
  getMaterialHighlights,
  getProjectProgressSteps,
  getProjectSnapshot,
  getSidebarPalette,
  getSupplierIntelligence,
} from "../../lib/projectWorkspaceModel";
import { getDesignMutationsSummary } from "../../lib/designMutationUtils";
import { getGenerationBridgeSummary } from "../../lib/generationPackageUtils";
import { getEditableObjectsSummary } from "../../lib/editableObjectsUtils";
import { getConceptDNASummary } from "../../lib/styleConsistencyUtils";
import { getSceneGraphSummary } from "../../lib/sceneGraphUtils";
import { ProjectMaterials } from "./ProjectMaterials";
import { ProjectProgress } from "./ProjectProgress";

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

function PaletteSwatches({ palette, isDark }) {
  const entries = [...(palette?.dominant || []), ...(palette?.accents || [])].slice(0, 8);
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
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
          }}
        />
      ))}
    </div>
  );
}

export function ProjectSidebar({ semanticDraft, budgetDraft, isDark, isRunning, analysisDocumentSaved }) {
  const snapshot = getProjectSnapshot(semanticDraft);
  const palette = getSidebarPalette(semanticDraft);
  const materials = getMaterialHighlights(semanticDraft);
  const categories = getBudgetCategories(semanticDraft, budgetDraft);
  const progress = getProjectProgressSteps(semanticDraft);
  const supplierIntelligence = getSupplierIntelligence(semanticDraft, budgetDraft);
  const sceneGraphSummary = getSceneGraphSummary(semanticDraft?.sceneGraph);
  const editableSummary = getEditableObjectsSummary(semanticDraft?.editableObjects);
  const conceptSummary = getConceptDNASummary(semanticDraft?.styleConsistency, semanticDraft?.editableObjects);
  const mutationSummary = getDesignMutationsSummary(semanticDraft?.designMutations);
  const generationBridgeSummary = getGenerationBridgeSummary(semanticDraft);

  return (
    <div>
      <div style={sectionTitleStyle(isDark)}>Project Sidebar</div>

      {!analysisDocumentSaved ? (
        <div
          style={{
            padding: "12px",
            borderRadius: "16px",
            marginBottom: "16px",
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

      <div
        style={{
          padding: "12px",
          borderRadius: "16px",
          marginBottom: "16px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
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
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          {isRunning ? "Анализ выполняется…" : snapshot.status}
        </div>
      </div>

      <div style={{ ...sectionTitleStyle(isDark), marginTop: "4px" }}>Extracted palette</div>
      {palette.dominant.length || palette.accents.length ? (
        <>
          <PaletteSwatches palette={palette} isDark={isDark} />
          <div
            style={{
              marginTop: "8px",
              marginBottom: "16px",
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
            marginBottom: "16px",
            fontSize: "13px",
            lineHeight: 1.5,
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          Палитра появится после анализа.
        </div>
      )}

      <div style={sectionTitleStyle(isDark)}>Ключевые материалы</div>
      <ProjectMaterials items={materials} isDark={isDark} />

      <div style={{ ...sectionTitleStyle(isDark), marginTop: "16px" }}>Потенциальные категории сметы</div>
      <ProjectMaterials
        items={categories}
        isDark={isDark}
        emptyLabel="Категории сметы появятся после SPEC-анализа."
      />

      <div style={{ ...sectionTitleStyle(isDark), marginTop: "16px" }}>Concept DNA</div>
      <div
        style={{
          padding: "12px",
          borderRadius: "16px",
          marginBottom: "16px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
        }}
      >
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>style: {conceptSummary.style}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>palette: {conceptSummary.palette}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
          materials: {conceptSummary.materials}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
          preservation count: {conceptSummary.preservationCount}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5 }}>high impact edits: {conceptSummary.highImpactEditsCount}</div>
      </div>

      <div style={{ ...sectionTitleStyle(isDark), marginTop: "16px" }}>Scene Graph</div>
      <div
        style={{
          padding: "12px",
          borderRadius: "16px",
          marginBottom: "16px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
        }}
      >
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>zones: {sceneGraphSummary.zoneCount}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>objects: {sceneGraphSummary.objectCount}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>editable: {sceneGraphSummary.editableCount}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
          budget relevant: {sceneGraphSummary.budgetRelevantCount}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
          Editable objects: {editableSummary.total}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>High safety: {editableSummary.highSafety}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5 }}>Risky: {editableSummary.risky}</div>
      </div>

      <div style={{ ...sectionTitleStyle(isDark), marginTop: "16px" }}>Design Mutations</div>
      <div
        style={{
          padding: "12px",
          borderRadius: "16px",
          marginBottom: "16px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
        }}
      >
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>total: {mutationSummary.total}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>low risk: {mutationSummary.lowRisk}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>premium: {mutationSummary.premium}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.5 }}>budget optimization: {mutationSummary.budgetOptimization}</div>
      </div>

      <div style={{ ...sectionTitleStyle(isDark), marginTop: "16px" }}>Generation Bridge</div>
      <div
        style={{
          padding: "12px",
          borderRadius: "16px",
          marginBottom: "16px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
        }}
      >
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
          packages total: {generationBridgeSummary.total}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
          draft packages: {generationBridgeSummary.draft}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
          requires image-to-image: {generationBridgeSummary.requiresImageToImage}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>
          requires mask: {generationBridgeSummary.requiresMask}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5 }}>ready: {generationBridgeSummary.ready}</div>
      </div>

      <div style={{ ...sectionTitleStyle(isDark), marginTop: "16px" }}>Supplier Intelligence</div>
      <div
        style={{
          padding: "12px",
          borderRadius: "16px",
          marginBottom: "16px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
        }}
      >
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "6px" }}>
          Категории: {supplierIntelligence.categoryCount}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "10px" }}>
          Matched brands: {supplierIntelligence.matchedBrandCount}
        </div>
        <ProjectProgress steps={supplierIntelligence.readiness} isDark={isDark} />
      </div>

      <div style={{ ...sectionTitleStyle(isDark), marginTop: "16px" }}>Прогресс проекта</div>
      <ProjectProgress steps={progress} isDark={isDark} />
    </div>
  );
}
