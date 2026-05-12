"use client";

import { useState } from "react";
import { getMutationPrompt } from "../lib/designMutationUtils";
import {
  applyGenerationPackageReadiness,
  evaluateGenerationPackageReadiness,
  getGenerationPackagesByMutation,
} from "../lib/generationPackageUtils";
import { formatEditTypesRu } from "../lib/editableObjectsUtils";
import { getConceptDNA } from "../lib/styleConsistencyUtils";
import { getSafeAnalysisTheme, isLightSwatchColor } from "../lib/getSafeAnalysisTheme";
import {
  ANALYSIS_MODE_LABELS_RU,
  getAnalysisModeEmptyMessage,
  hasSemanticDraftForMode,
  normalizeAnalysisMode,
} from "../lib/validateSemanticDraft";

const MATERIAL_GROUP_LABELS_RU = {
  floor: "Пол",
  walls: "Стены",
  ceiling: "Потолок",
  furniture: "Мебель",
  textiles: "Текстиль",
  metal: "Металл",
  stone: "Камень",
  glass: "Стекло",
};

const IMPORTANCE_LABELS_RU = {
  primary: "основная",
  secondary: "вспомогательная",
  decorative: "декоративная",
};

function getLayerSourceLabel(items) {
  if (process.env.NODE_ENV !== "development") return null;
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  return list.some((item) => item?.source === "fallback") ? "Источник: fallback" : "Источник: Vision";
}

const PRIORITY_LABELS_RU = {
  high: "высокий",
  medium: "средний",
  low: "низкий",
};

const RISK_LABELS_RU = {
  low: "низкий",
  medium: "средний",
  high: "высокий",
};

const PRO_MATERIAL_GROUP_KEYS = ["metal", "stone", "glass"];

const SPEC_GROUP_ORDER = [
  "Отделка пола",
  "Отделка стен",
  "Потолок",
  "Мебель",
  "Освещение",
  "Текстиль",
  "Декор",
  "Хранение",
  "Сантехника",
  "Техника",
  "Двери / перегородки",
  "Окна / шторы",
  "Прочее",
];

function sortSpecificationGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return [...groups].sort((left, right) => {
    const leftIndex = SPEC_GROUP_ORDER.indexOf(left?.group);
    const rightIndex = SPEC_GROUP_ORDER.indexOf(right?.group);
    const leftRank = leftIndex >= 0 ? leftIndex : SPEC_GROUP_ORDER.length;
    const rightRank = rightIndex >= 0 ? rightIndex : SPEC_GROUP_ORDER.length;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return String(left?.group || "").localeCompare(String(right?.group || ""), "ru");
  });
}

function Section({ label, children, theme }) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        borderRadius: "14px",
        padding: theme.cardPadding,
        background: theme.cardBackground,
        border: `1px solid ${theme.border}`,
        boxSizing: "border-box",
      }}
    >
      <div style={labelStyle(theme)}>{label}</div>
      {children}
    </div>
  );
}

function labelStyle(theme) {
  return {
    fontSize: "12px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    fontWeight: 600,
    color: theme.textSecondary,
    marginBottom: "8px",
  };
}

function valueStyle(theme) {
  return {
    fontSize: "14px",
    lineHeight: 1.55,
    color: theme.textPrimary,
  };
}

function formatConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `${Math.round(num * 100)}%`;
}

function Chips({ items, theme }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {items.map((item) => (
        <span
          key={String(item)}
          style={{
            padding: "6px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            lineHeight: 1.25,
            border: `1px solid ${theme.chipBorder}`,
            background: theme.chipBackground,
            color: theme.chipText,
            whiteSpace: "nowrap",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function PaletteSwatches({ entries, theme }) {
  if (!Array.isArray(entries) || !entries.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
      {entries.map((entry, index) => {
        const key = `${entry.hex || "text"}-${entry.labelRu || index}`;
        const label = (entry.labelRu || entry.hex || "цвет").slice(0, 18);
        const swatchColor = entry.hex || "";
        const lightSwatch = isLightSwatchColor(swatchColor);
        return (
          <div
            key={key}
            title={entry.labelRu || entry.hex || "цвет"}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              minWidth: "52px",
              maxWidth: "72px",
            }}
          >
            {swatchColor ? (
              <span
                aria-hidden="true"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: swatchColor,
                  border: lightSwatch ? `1px solid ${theme.swatchBorder}` : "1px solid rgba(0,0,0,0.08)",
                }}
              />
            ) : (
              <span
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  border: `1px dashed ${theme.border}`,
                  color: theme.textSecondary,
                }}
              >
                txt
              </span>
            )}
            <span
              style={{
                fontSize: "10px",
                lineHeight: 1.3,
                textAlign: "center",
                color: theme.swatchLabel,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                width: "100%",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatMaterialSpec(item) {
  if (!item || typeof item !== "object") return "";
  const parts = [
    item.materialFamily,
    item.possibleMaterial,
    item.texture,
    item.finish,
    item.tone,
    formatConfidence(item.confidence),
    item.note,
  ].filter(Boolean);
  return parts.join(" · ");
}

function hasMaterialAnalysis(materialAnalysis) {
  if (!materialAnalysis || typeof materialAnalysis !== "object") return false;
  return Object.values(materialAnalysis).some((items) => Array.isArray(items) && items.length > 0);
}

function hasProMaterialAnalysis(materialAnalysis) {
  if (!materialAnalysis || typeof materialAnalysis !== "object") return false;
  return PRO_MATERIAL_GROUP_KEYS.some((key) => Array.isArray(materialAnalysis[key]) && materialAnalysis[key].length > 0);
}

function hasSurfaceBlock(ceilingAnalysis, wallAnalysis, floorAnalysis, decorAnalysis) {
  const ceiling =
    ceilingAnalysis &&
    typeof ceilingAnalysis === "object" &&
    (ceilingAnalysis.labelRu ||
      ceilingAnalysis.type ||
      (Array.isArray(ceilingAnalysis.details) && ceilingAnalysis.details.length) ||
      (Array.isArray(ceilingAnalysis.decorativeElements) && ceilingAnalysis.decorativeElements.length));
  const walls = Array.isArray(wallAnalysis) && wallAnalysis.length > 0;
  const floors = Array.isArray(floorAnalysis) && floorAnalysis.length > 0;
  const decor = Array.isArray(decorAnalysis) && decorAnalysis.length > 0;
  return Boolean(ceiling || walls || floors || decor);
}

function formatSpecGroupItem(item) {
  if (!item || typeof item !== "object") return "";
  const parts = [
    item.category,
    item.quantityEstimate ? `кол-во: ${item.quantityEstimate}` : "",
    item.replacementRisk ? `риск замены: ${RISK_LABELS_RU[item.replacementRisk] || item.replacementRisk}` : "",
    item.skuReadiness ? `SKU: ${PRIORITY_LABELS_RU[item.skuReadiness] || item.skuReadiness}` : "",
    item.note,
  ].filter(Boolean);
  return parts.join(" · ");
}

function getColorDisplay(colorAnalysis) {
  const extracted = colorAnalysis?.extractedPalette || {};
  const interpreted = colorAnalysis?.interpretedPalette || {};
  return {
    dominant: extracted.dominant?.length ? extracted.dominant : colorAnalysis?.dominant || [],
    accents: extracted.accents?.length ? extracted.accents : colorAnalysis?.accents || [],
    description: interpreted.descriptionRu || colorAnalysis?.colorLogicRu || "",
    warmth: extracted.averageWarmth || colorAnalysis?.temperature || "",
    brightness: extracted.averageBrightness || "",
    contrast: extracted.contrastLevel || colorAnalysis?.contrast || "",
    source: extracted.source === "extracted" ? "extracted" : "vision",
  };
}

function paletteSourceLabel(source) {
  return source === "extracted" ? "Палитра: извлечена из изображения" : "Палитра: определена Vision";
}

function ColorLogicSection({ colorAnalysis, theme, text }) {
  const display = getColorDisplay(colorAnalysis);
  if (
    !display.dominant.length &&
    !display.accents.length &&
    !display.description &&
    !display.warmth &&
    !display.brightness &&
    !display.contrast
  ) {
    return null;
  }

  return (
    <Section label="Цветовая логика" theme={theme}>
      <div style={{ ...text, marginBottom: "8px", color: theme.textSecondary, fontSize: "12px" }}>
        {paletteSourceLabel(display.source)}
      </div>
      {display.dominant.length ? <PaletteSwatches entries={display.dominant} theme={theme} /> : null}
      {display.accents.length ? (
        <div style={{ marginTop: "10px" }}>
          <PaletteSwatches entries={display.accents} theme={theme} />
        </div>
      ) : null}
      {display.description ? <div style={{ ...text, marginTop: "10px" }}>{display.description}</div> : null}
      {display.warmth || display.brightness || display.contrast ? (
        <div style={{ ...text, marginTop: "8px", color: theme.textSecondary }}>
          {[display.warmth, display.brightness, display.contrast].filter(Boolean).join(" · ")}
        </div>
      ) : null}
    </Section>
  );
}

function EmptyModeState({ message, theme, revealStyle, activeMode }) {
  return (
    <div
      style={{
        ...revealStyle,
        width: "100%",
        boxSizing: "border-box",
        padding: theme.panelPadding,
        borderRadius: activeMode === "quick" ? "14px" : "16px",
        background: theme.background,
        border: `1px solid ${theme.border}`,
        color: theme.textSecondary,
        fontSize: "14px",
        lineHeight: 1.55,
      }}
    >
      {message}
    </div>
  );
}

function formatRegistryFlag(value) {
  return value ? "да" : "нет";
}

function ConceptDNASection({ styleConsistency, theme, text }) {
  const conceptDNA = getConceptDNA(styleConsistency);
  if (
    !conceptDNA.styleCore &&
    !conceptDNA.atmosphereCore &&
    !conceptDNA.colorCore &&
    !conceptDNA.materialCore &&
    !conceptDNA.compositionCore &&
    !conceptDNA.mustPreserve?.length
  ) {
    return null;
  }

  return (
    <Section label="ДНК концепции" theme={theme}>
      {conceptDNA.styleCore ? <div style={text}>Стиль: {conceptDNA.styleCore}</div> : null}
      {conceptDNA.atmosphereCore ? (
        <div style={{ ...text, marginTop: "6px" }}>Атмосфера: {conceptDNA.atmosphereCore}</div>
      ) : null}
      {conceptDNA.colorCore ? (
        <div style={{ ...text, marginTop: "6px" }}>Цветовое ядро: {conceptDNA.colorCore}</div>
      ) : null}
      {conceptDNA.materialCore ? (
        <div style={{ ...text, marginTop: "6px" }}>Материальное ядро: {conceptDNA.materialCore}</div>
      ) : null}
      {conceptDNA.compositionCore ? (
        <div style={{ ...text, marginTop: "6px" }}>Композиционное ядро: {conceptDNA.compositionCore}</div>
      ) : null}
      {Array.isArray(conceptDNA.mustPreserve) && conceptDNA.mustPreserve.length ? (
        <div style={{ marginTop: "10px" }}>
          <div style={{ ...text, marginBottom: "6px", color: theme.textSecondary, fontSize: "12px" }}>
            Что важно сохранить
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {conceptDNA.mustPreserve.slice(0, 5).map((item) => (
              <div key={item} style={{ ...text, fontSize: "12px", lineHeight: 1.45 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Section>
  );
}

function EditableElementsSection({ editableObjects, theme, text }) {
  const items = Array.isArray(editableObjects) ? editableObjects.slice(0, 6) : [];
  if (!items.length) return null;
  const sourceLabel = getLayerSourceLabel(editableObjects);

  return (
    <Section label="Редактируемые элементы" theme={theme}>
      {sourceLabel ? (
        <div style={{ ...text, fontSize: "11px", color: theme.textSecondary, marginBottom: "8px" }}>{sourceLabel}</div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: "10px 12px",
              borderRadius: "12px",
              border: `1px solid ${theme.border}`,
              background: theme.cardBackground,
            }}
          >
            <div style={{ ...text, fontWeight: 600 }}>{entry.labelRu}</div>
            <div style={{ ...text, marginTop: "6px", fontSize: "12px", color: theme.textSecondary }}>
              Правки: {formatEditTypesRu(entry.editTypes)}
            </div>
            <div style={{ ...text, fontSize: "12px", color: theme.textSecondary }}>
              Безопасность: {entry.editSafety || "medium"}
            </div>
            <div style={{ ...text, fontSize: "12px", color: theme.textSecondary }}>
              Стиль: {entry.styleImpact || "medium"} · Бюджет: {entry.budgetImpact || "medium"}
            </div>
            <div style={{ ...text, marginTop: "6px", fontSize: "12px", lineHeight: 1.45 }}>
              Подсказка: {entry.promptHintRu}
            </div>
            {entry.styleConsistencyImpact ? (
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ ...text, fontSize: "12px", color: theme.textSecondary }}>
                  Повлияет на:{" "}
                  {(Array.isArray(entry.styleConsistencyImpact.impactedAreas)
                    ? entry.styleConsistencyImpact.impactedAreas
                    : []
                  ).join(", ") || "стиль"}
                </div>
                {entry.styleConsistencyImpact.warningRu ? (
                  <div style={{ ...text, fontSize: "12px", lineHeight: 1.45 }}>
                    {entry.styleConsistencyImpact.warningRu}
                  </div>
                ) : null}
                {entry.styleConsistencyImpact.preserveHintRu ? (
                  <div style={{ ...text, fontSize: "12px", lineHeight: 1.45 }}>
                    Стоит сохранить: {entry.styleConsistencyImpact.preserveHintRu}
                  </div>
                ) : null}
                {entry.styleConsistencyImpact.intentionalChangeHintRu ? (
                  <div style={{ ...text, fontSize: "12px", lineHeight: 1.45 }}>
                    Если цель — изменить эффект, можно: {entry.styleConsistencyImpact.intentionalChangeHintRu}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}

function formatReadinessReasons(reasons) {
  const list = Array.isArray(reasons) ? reasons : [];
  return list.map((reason) => (reason === "нет preserveRules" ? "пакет не готов" : reason));
}

function DesignMutationsSection({
  designMutations,
  generationPackages,
  semanticDraft,
  theme,
  text,
  onPrepareGenerationPackage,
  sourceImageId,
  sourceImageBase64,
  onControlledRegenerate,
  isControlledRegenerating,
  controlledRegenerationError,
  controlledRegenerationResult,
  onAnalyzeControlledVisual,
}) {
  const items = Array.isArray(designMutations) ? designMutations : [];
  const [selectedMutationId, setSelectedMutationId] = useState("");
  if (!items.length) return null;

  const selectedMutation = items.find((mutation) => mutation.id === selectedMutationId) || null;
  const preparedPackage = selectedMutation
    ? getGenerationPackagesByMutation({ generationPackages }, selectedMutation.id)[0] || null
    : null;
  const readiness = preparedPackage
    ? evaluateGenerationPackageReadiness(preparedPackage, {
        sourceImageId: sourceImageId || preparedPackage.sourceImageId || "",
        sourceImageBase64: sourceImageBase64 || "",
      })
    : { ready: false, reasons: ["пакет не готов"] };
  const preparedPrompt =
    preparedPackage?.promptRu || (selectedMutation ? getMutationPrompt(selectedMutation, semanticDraft) : "");

  return (
    <Section label="Варианты развития концепции" theme={theme}>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((mutation) => (
          <div
            key={mutation.id}
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: `1px solid ${selectedMutationId === mutation.id ? theme.accentBorder || theme.border : theme.border}`,
              background: theme.cardBackground,
            }}
          >
            <div style={{ ...text, fontWeight: 600 }}>{mutation.labelRu}</div>
            <div style={{ ...text, marginTop: "6px", fontSize: "12px", lineHeight: 1.45 }}>{mutation.goalRu}</div>
            {mutation.preserveDNA?.length ? (
              <div style={{ ...text, marginTop: "8px", fontSize: "12px", color: theme.textSecondary }}>
                Сохранить: {mutation.preserveDNA.join(", ")}
              </div>
            ) : null}
            {mutation.changeTargets?.length ? (
              <div style={{ ...text, marginTop: "4px", fontSize: "12px", color: theme.textSecondary }}>
                Изменить: {mutation.changeTargets.join(", ")}
              </div>
            ) : null}
            <div style={{ ...text, marginTop: "8px", fontSize: "12px", color: theme.textSecondary }}>
              Стиль: {mutation.styleImpact} · Бюджет: {mutation.budgetImpact} · Риск: {mutation.riskLevel}
            </div>
            <div style={{ ...text, marginTop: "8px", fontSize: "12px", lineHeight: 1.45 }}>
              Prompt: {mutation.promptTemplateRu}
            </div>
            {mutation.noteRu ? (
              <div style={{ ...text, marginTop: "6px", fontSize: "12px", lineHeight: 1.45 }}>{mutation.noteRu}</div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setSelectedMutationId(mutation.id);
                onPrepareGenerationPackage?.(mutation);
              }}
              style={{
                marginTop: "10px",
                padding: "8px 12px",
                borderRadius: "999px",
                border: `1px solid ${theme.border}`,
                background: "transparent",
                color: "inherit",
                font: "inherit",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Подготовить итерацию
            </button>
          </div>
        ))}
      </div>
      {selectedMutation ? (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "12px",
            border: `1px dashed ${theme.border}`,
            background: theme.cardBackground,
          }}
        >
          <div style={{ ...text, fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
            {preparedPackage ? "Пакет итерации подготовлен" : "Подготовленный prompt"}
          </div>
          {preparedPackage ? (
            <>
              <div style={{ ...text, fontSize: "12px", lineHeight: 1.45 }}>Цель: {preparedPackage.goalRu || selectedMutation.goalRu}</div>
              {preparedPackage.preserveRules?.length ? (
                <div style={{ ...text, marginTop: "6px", fontSize: "12px", lineHeight: 1.45 }}>
                  Сохранить: {preparedPackage.preserveRules.join(", ")}
                </div>
              ) : null}
              {preparedPackage.changeTargets?.length ? (
                <div style={{ ...text, marginTop: "6px", fontSize: "12px", lineHeight: 1.45 }}>
                  Изменить: {preparedPackage.changeTargets.join(", ")}
                </div>
              ) : null}
              <div style={{ ...text, marginTop: "6px", fontSize: "12px", lineHeight: 1.45 }}>
                Риск: {preparedPackage.riskLevel} · status: {preparedPackage.status} · readyForGeneration:{" "}
                {preparedPackage.readyForGeneration ? "true" : "false"}
              </div>
              <div style={{ ...text, marginTop: "8px", fontSize: "12px", lineHeight: 1.5 }}>
                promptRu: {preparedPackage.promptRu}
              </div>
              <div style={{ ...text, marginTop: "8px", fontSize: "12px", lineHeight: 1.5 }}>
                negativePromptRu: {preparedPackage.negativePromptRu}
              </div>
              <button
                type="button"
                disabled={!readiness.ready || isControlledRegenerating}
                onClick={() => {
                  const readyPackage = applyGenerationPackageReadiness(preparedPackage, {
                    sourceImageId: sourceImageId || preparedPackage.sourceImageId || "",
                    sourceImageBase64: sourceImageBase64 || "",
                  });
                  onControlledRegenerate?.(readyPackage);
                }}
                style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: `1px solid ${theme.border}`,
                  background: readiness.ready ? theme.accentBackground || "transparent" : "transparent",
                  color: "inherit",
                  font: "inherit",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: readiness.ready && !isControlledRegenerating ? "pointer" : "default",
                  opacity: readiness.ready && !isControlledRegenerating ? 1 : 0.55,
                }}
              >
                {isControlledRegenerating ? "Создание controlled-итерации..." : "Создать controlled-итерацию"}
              </button>
              {!readiness.ready ? (
                <div style={{ ...text, marginTop: "8px", fontSize: "12px", color: theme.textSecondary }}>
                  {formatReadinessReasons(readiness.reasons).join("; ")}
                </div>
              ) : null}
              {controlledRegenerationError ? (
                <div style={{ ...text, marginTop: "8px", fontSize: "12px", color: theme.dangerText || "#b42318" }}>
                  {controlledRegenerationError}
                </div>
              ) : null}
              {controlledRegenerationResult?.visualId ? (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px",
                    borderRadius: "10px",
                    border: `1px solid ${theme.border}`,
                    background: theme.cardBackground,
                  }}
                >
                  <div style={{ ...text, fontSize: "12px", fontWeight: 600 }}>Controlled-итерация создана</div>
                  <div style={{ ...text, marginTop: "6px", fontSize: "12px", lineHeight: 1.45 }}>
                    Родительская сцена: {controlledRegenerationResult.parentVisualId}
                  </div>
                  {controlledRegenerationResult.mutationLabel ? (
                    <div style={{ ...text, marginTop: "4px", fontSize: "12px", lineHeight: 1.45 }}>
                      Mutation: {controlledRegenerationResult.mutationLabel}
                    </div>
                  ) : null}
                  {controlledRegenerationResult.preserveRules?.length ? (
                    <div style={{ ...text, marginTop: "4px", fontSize: "12px", lineHeight: 1.45 }}>
                      Сохранено: {controlledRegenerationResult.preserveRules.join(", ")}
                    </div>
                  ) : null}
                  {controlledRegenerationResult.changeTargets?.length ? (
                    <div style={{ ...text, marginTop: "4px", fontSize: "12px", lineHeight: 1.45 }}>
                      Изменено: {controlledRegenerationResult.changeTargets.join(", ")}
                    </div>
                  ) : null}
                  <div style={{ ...text, marginTop: "4px", fontSize: "12px", lineHeight: 1.45 }}>
                    Статус: {controlledRegenerationResult.status || "completed"}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAnalyzeControlledVisual?.(controlledRegenerationResult.visualId)}
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      border: `1px solid ${theme.border}`,
                      background: "transparent",
                      color: "inherit",
                      font: "inherit",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Проанализировать новую версию
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ ...text, fontSize: "12px", lineHeight: 1.5 }}>{preparedPrompt}</div>
          )}
        </div>
      ) : null}
    </Section>
  );
}

function SceneSpatialMapSection({ sceneGraph, theme, text }) {
  const zones = Array.isArray(sceneGraph?.zones)
    ? sceneGraph.zones.filter((zone) => zone.id !== "unknown_zone").slice(0, 4)
    : [];
  const objects = Array.isArray(sceneGraph?.objects) ? sceneGraph.objects.slice(0, 6) : [];
  const relationships = Array.isArray(sceneGraph?.relationships) ? sceneGraph.relationships.slice(0, 5) : [];
  if (!zones.length && !objects.length && !relationships.length) return null;
  const sourceLabel = getLayerSourceLabel(sceneGraph?.objects);

  const zoneLabelById = Object.fromEntries((sceneGraph?.zones || []).map((zone) => [zone.id, zone.labelRu]));
  const objectLabelById = Object.fromEntries((sceneGraph?.objects || []).map((object) => [object.id, object.labelRu]));
  const resolveLabel = (id) => objectLabelById[id] || zoneLabelById[id] || id;

  return (
    <Section label="Пространственная карта сцены" theme={theme}>
      {sourceLabel ? (
        <div style={{ ...text, fontSize: "11px", color: theme.textSecondary, marginBottom: "8px" }}>{sourceLabel}</div>
      ) : null}
      {zones.length ? (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ ...text, marginBottom: "6px", color: theme.textSecondary, fontSize: "12px" }}>Зоны</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {zones.map((zone) => (
              <div key={zone.id} style={text}>
                {zone.labelRu} — {zone.position} — {zone.role}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {objects.length ? (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ ...text, marginBottom: "6px", color: theme.textSecondary, fontSize: "12px" }}>Объекты</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {objects.map((object) => (
              <div key={object.id} style={text}>
                {object.labelRu} — {object.position?.horizontal || "unknown"} / {object.position?.vertical || "unknown"} /{" "}
                {object.position?.depth || "unknown"}
                {zoneLabelById[object.zoneId] ? ` — ${zoneLabelById[object.zoneId]}` : ""}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {relationships.length ? (
        <div>
          <div style={{ ...text, marginBottom: "6px", color: theme.textSecondary, fontSize: "12px" }}>Связи</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {relationships.map((relationship, index) => (
              <div key={`${relationship.fromObjectId}-${relationship.toObjectId}-${index}`} style={text}>
                {resolveLabel(relationship.fromObjectId)} {relationship.relation} {resolveLabel(relationship.toObjectId)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Section>
  );
}

function PotentialBrandsSection({ budgetDraft, theme, text }) {
  const groups = Array.isArray(budgetDraft?.normalizedSpecGroups)
    ? budgetDraft.normalizedSpecGroups.filter((entry) => asArray(entry?.supplierCandidates?.matchedBrands).length)
    : [];
  if (!groups.length) return null;

  return (
    <Section label="Потенциальные бренды" theme={theme}>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {groups.map((entry) => {
          const title = entry.parentLabelRu ? `${entry.parentLabelRu} / ${entry.labelRu}` : entry.labelRu;
          const matchedBrands = entry.supplierCandidates?.matchedBrands || [];
          return (
            <div
              key={`${entry.registryCategoryId}-brands`}
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                border: `1px solid ${theme.border}`,
                background: theme.cardBackground,
              }}
            >
              <div style={{ ...text, fontWeight: 600 }}>{title}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                {matchedBrands.map((brand) => (
                  <span
                    key={`${entry.registryCategoryId}-${brand.brandId || brand.brandName}`}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      border: `1px solid ${theme.border}`,
                      background: theme.background,
                      color: theme.textPrimary,
                    }}
                  >
                    {brand.brandName}
                  </span>
                ))}
              </div>
              <div style={{ ...text, marginTop: "8px", fontSize: "12px", color: theme.textSecondary }}>
                suppliers: {entry.supplierCandidates?.supplierCount ?? matchedBrands.length}
              </div>
              <div style={{ ...text, fontSize: "12px", color: theme.textSecondary }}>
                confidence: {entry.supplierCandidates?.confidence || "low"}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function BudgetDraftSection({ budgetDraft, onCreateBudgetDraft, theme, text }) {
  const groups = sortSpecificationGroups(budgetDraft?.groups || []);
  const normalizedGroups = Array.isArray(budgetDraft?.normalizedSpecGroups)
    ? budgetDraft.normalizedSpecGroups
    : [];
  return (
    <Section label="Черновик сметы" theme={theme}>
      {!budgetDraft ? (
        <button
          type="button"
          onClick={onCreateBudgetDraft}
          style={{
            padding: "10px 14px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            border: `1px solid ${theme.border}`,
            background: theme.cardBackground,
            color: theme.textPrimary,
            font: "inherit",
          }}
        >
          Создать черновик сметы
        </button>
      ) : (
        <>
          <div style={{ ...text, fontWeight: 600 }}>Черновик сметы создан</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
            {groups.length ? (
              groups.map((group) => (
                <div key={group.group || group.group} style={text}>
                  {group.group}
                </div>
              ))
            ) : (
              <div style={{ ...text, color: theme.textSecondary }}>Группы появятся после SPEC-анализа.</div>
            )}
          </div>
          {normalizedGroups.length ? (
            <div style={{ marginTop: "16px" }}>
              <div style={{ ...text, fontWeight: 600, marginBottom: "10px" }}>Нормализованные категории</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {normalizedGroups.map((entry) => {
                  const title = entry.parentLabelRu
                    ? `${entry.parentLabelRu} / ${entry.labelRu}`
                    : entry.labelRu;
                  return (
                    <div
                      key={`${entry.registryCategoryId}-${entry.sourceText || title}`}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "12px",
                        border: `1px solid ${theme.border}`,
                        background: theme.cardBackground,
                      }}
                    >
                      <div style={{ ...text, fontWeight: 600 }}>{title}</div>
                      <div style={{ ...text, marginTop: "6px", fontSize: "12px", color: theme.textSecondary }}>
                        SKU: {formatRegistryFlag(entry.skuRelevant)}
                      </div>
                      <div style={{ ...text, fontSize: "12px", color: theme.textSecondary }}>
                        BIM: {formatRegistryFlag(entry.bimRelevant)}
                      </div>
                      <div style={{ ...text, fontSize: "12px", color: theme.textSecondary }}>
                        Вес бюджета: {entry.budgetRole || "minor"}
                      </div>
                      <div style={{ ...text, fontSize: "12px", color: theme.textSecondary }}>
                        Confidence: {entry.confidence ?? "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div style={{ ...text, marginTop: "10px", fontSize: "12px", color: theme.textSecondary, lineHeight: 1.5 }}>
            {budgetDraft.note ||
              "Цены, артикулы и количества появятся после подключения каталогов и BIM-данных."}
          </div>
        </>
      )}
    </Section>
  );
}

export function VisionAnalysisPanel({
  semanticDraft,
  activeMode,
  isDark,
  revealStyle,
  budgetDraft,
  onCreateBudgetDraft,
  onPrepareGenerationPackage,
  sourceImageId,
  sourceImageBase64,
  onControlledRegenerate,
  isControlledRegenerating,
  controlledRegenerationError,
  controlledRegenerationResult,
  onAnalyzeControlledVisual,
}) {
  if (!semanticDraft) return null;

  const analysisMode = normalizeAnalysisMode(activeMode || semanticDraft.analysisMode);
  const theme = getSafeAnalysisTheme(semanticDraft, isDark, analysisMode);
  const text = valueStyle(theme);

  if (!hasSemanticDraftForMode(semanticDraft, analysisMode)) {
    return (
      <EmptyModeState
        message={getAnalysisModeEmptyMessage(analysisMode)}
        theme={theme}
        revealStyle={revealStyle}
        activeMode={analysisMode}
      />
    );
  }

  const quick = semanticDraft.quickAnalysis || {};
  const pro = semanticDraft.proAnalysis || {};
  const spec = semanticDraft.specAnalysis || {};

  if (analysisMode === "quick") {
    return (
      <div
        style={{
          ...revealStyle,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: theme.sectionGap,
          padding: theme.panelPadding,
          borderRadius: "14px",
          background: theme.background,
          border: `1px solid ${theme.border}`,
        }}
      >
        <Section label={`Режим ${ANALYSIS_MODE_LABELS_RU.quick}`} theme={theme}>
          <div style={{ ...text, fontSize: "13px", color: theme.textSecondary }}>Быстрый творческий разбор сцены</div>
        </Section>
        {quick.spaceType?.labelRu || quick.spaceType?.value ? (
          <Section label="Назначение помещения" theme={theme}>
            <div style={{ ...text, fontSize: "15px", fontWeight: 600 }}>
              {quick.spaceType.labelRu || quick.spaceType.value}
              {formatConfidence(quick.spaceType.confidence) ? ` · ${formatConfidence(quick.spaceType.confidence)}` : ""}
            </div>
          </Section>
        ) : null}
        {quick.styleAnalysis?.labelRu || quick.styleAnalysis?.primary ? (
          <Section label="Стиль" theme={theme}>
            <div style={{ ...text, marginBottom: "8px" }}>
              {quick.styleAnalysis.labelRu || quick.styleAnalysis.primary}
              {formatConfidence(quick.styleAnalysis.confidence) ? ` · ${formatConfidence(quick.styleAnalysis.confidence)}` : ""}
            </div>
            {Array.isArray(quick.styleAnalysis.secondary) && quick.styleAnalysis.secondary.length ? (
              <Chips items={quick.styleAnalysis.secondary} theme={theme} />
            ) : null}
          </Section>
        ) : null}
        {quick.atmosphereRu ? (
          <Section label="Атмосфера" theme={theme}>
            <div style={text}>{quick.atmosphereRu}</div>
          </Section>
        ) : null}
        <ColorLogicSection colorAnalysis={quick.colorAnalysis} theme={theme} text={text} />
        {quick.designIntent?.summaryRu || quick.designIntent?.emotionalEffectRu ? (
          <Section label="Краткий замысел" theme={theme}>
            {quick.designIntent.summaryRu ? <div style={{ ...text, marginBottom: "8px" }}>{quick.designIntent.summaryRu}</div> : null}
            {quick.designIntent.emotionalEffectRu ? (
              <div style={{ ...text, color: theme.textSecondary }}>{quick.designIntent.emotionalEffectRu}</div>
            ) : null}
          </Section>
        ) : null}
      </div>
    );
  }

  if (analysisMode === "pro") {
    return (
      <div
        style={{
          ...revealStyle,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: theme.sectionGap,
          padding: theme.panelPadding,
          borderRadius: "16px",
          background: theme.background,
          border: `1px solid ${theme.border}`,
        }}
      >
        <Section label={`Режим ${ANALYSIS_MODE_LABELS_RU.pro}`} theme={theme}>
          <div style={{ ...text, fontSize: "13px", color: theme.textSecondary }}>Профессиональная интерьерная карта</div>
        </Section>
        {pro.spaceType?.labelRu || pro.spaceType?.value ? (
          <Section label="Назначение помещения" theme={theme}>
            <div style={{ ...text, fontSize: "15px", fontWeight: 600 }}>
              {pro.spaceType.labelRu || pro.spaceType.value}
              {formatConfidence(pro.spaceType.confidence) ? ` · ${formatConfidence(pro.spaceType.confidence)}` : ""}
            </div>
          </Section>
        ) : null}
        {Array.isArray(pro.functionalZones) && pro.functionalZones.length ? (
          <Section label="Функциональные зоны" theme={theme}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {pro.functionalZones.map((zone) => (
                <div key={`${zone.type}-${zone.labelRu}`} style={text}>
                  {zone.labelRu || zone.type}
                  {zone.position ? ` · ${zone.position}` : ""}
                  {zone.importance ? ` · ${IMPORTANCE_LABELS_RU[zone.importance] || zone.importance}` : ""}
                  {formatConfidence(zone.confidence) ? ` · ${formatConfidence(zone.confidence)}` : ""}
                  {zone.designRole ? ` · ${zone.designRole}` : ""}
                  {Array.isArray(zone.visibleElements) && zone.visibleElements.length ? ` · ${zone.visibleElements.join(", ")}` : ""}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        {pro.atmosphereRu ? (
          <Section label="Атмосфера" theme={theme}>
            <div style={text}>{pro.atmosphereRu}</div>
          </Section>
        ) : null}
        {pro.designIntent?.summaryRu ||
        pro.designIntent?.emotionalEffectRu ||
        (Array.isArray(pro.designIntent?.keyDesignDrivers) && pro.designIntent.keyDesignDrivers.length) ? (
          <Section label="Стиль и замысел" theme={theme}>
            {pro.styleAnalysis?.labelRu || pro.styleAnalysis?.primary ? (
              <div style={{ ...text, marginBottom: "8px" }}>
                {pro.styleAnalysis.labelRu || pro.styleAnalysis.primary}
                {formatConfidence(pro.styleAnalysis.confidence) ? ` · ${formatConfidence(pro.styleAnalysis.confidence)}` : ""}
              </div>
            ) : null}
            {pro.designIntent.summaryRu ? <div style={{ ...text, marginBottom: "8px" }}>{pro.designIntent.summaryRu}</div> : null}
            {pro.designIntent.emotionalEffectRu ? (
              <div style={{ ...text, marginBottom: "8px", color: theme.textSecondary }}>{pro.designIntent.emotionalEffectRu}</div>
            ) : null}
            {Array.isArray(pro.designIntent.keyDesignDrivers) && pro.designIntent.keyDesignDrivers.length ? (
              <Chips items={pro.designIntent.keyDesignDrivers} theme={theme} />
            ) : null}
          </Section>
        ) : null}
        <ColorLogicSection colorAnalysis={pro.colorAnalysis} theme={theme} text={text} />
        {pro.lightingAnalysis &&
        (pro.lightingAnalysis.overallLightingMood ||
          (Array.isArray(pro.lightingAnalysis.technicalNotes) && pro.lightingAnalysis.technicalNotes.length) ||
          (Array.isArray(pro.lightingAnalysis.artificialLight) && pro.lightingAnalysis.artificialLight.length) ||
          pro.lightingAnalysis.naturalLight?.present) ? (
          <Section label="Свет" theme={theme}>
            {pro.lightingAnalysis.naturalLight ? (
              <div style={{ ...text, marginBottom: "8px" }}>
                {[
                  pro.lightingAnalysis.naturalLight.present ? "естественный свет" : "",
                  pro.lightingAnalysis.naturalLight.direction,
                  pro.lightingAnalysis.naturalLight.intensity,
                  pro.lightingAnalysis.naturalLight.diffusion,
                  pro.lightingAnalysis.naturalLight.temperatureEstimate,
                  pro.lightingAnalysis.naturalLight.estimatedKelvin,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ) : null}
            {Array.isArray(pro.lightingAnalysis.artificialLight) && pro.lightingAnalysis.artificialLight.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                {pro.lightingAnalysis.artificialLight.map((item) => (
                  <div key={`${item.type}-${item.labelRu}-${item.position}`} style={text}>
                    {item.labelRu || item.type}
                    {item.position ? ` · ${item.position}` : ""}
                    {item.lightRole ? ` · ${item.lightRole}` : ""}
                    {item.estimatedKelvin ? ` · ${item.estimatedKelvin}` : ""}
                    {formatConfidence(item.confidence) ? ` · ${formatConfidence(item.confidence)}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
            {pro.lightingAnalysis.overallLightingMood ? (
              <div style={{ ...text, marginBottom: "8px" }}>{pro.lightingAnalysis.overallLightingMood}</div>
            ) : null}
            {Array.isArray(pro.lightingAnalysis.technicalNotes) && pro.lightingAnalysis.technicalNotes.length ? (
              <Chips items={pro.lightingAnalysis.technicalNotes} theme={theme} />
            ) : null}
          </Section>
        ) : null}
        {hasProMaterialAnalysis(pro.materialAnalysis) ? (
          <Section label="Материалы" theme={theme}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {PRO_MATERIAL_GROUP_KEYS.map((key) => {
                const label = MATERIAL_GROUP_LABELS_RU[key];
                const items = pro.materialAnalysis?.[key];
                if (!Array.isArray(items) || !items.length) return null;
                return (
                  <div key={key}>
                    <div style={{ ...text, marginBottom: "6px", color: theme.textSecondary, fontSize: "12px" }}>{label}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {items.map((item, index) => (
                        <div key={`${key}-${index}`} style={text}>
                          {formatMaterialSpec(item)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}
        {Array.isArray(pro.furnitureAnalysis) && pro.furnitureAnalysis.length ? (
          <Section label="Мебель" theme={theme}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {pro.furnitureAnalysis.map((item) => (
                <div key={`${item.type}-${item.labelRu}-${item.position}`} style={text}>
                  {item.labelRu || item.type}
                  {item.position ? ` · ${item.position}` : ""}
                  {item.style ? ` · ${item.style}` : ""}
                  {item.materialGuess ? ` · ${item.materialGuess}` : ""}
                  {item.finish ? ` · ${item.finish}` : ""}
                  {item.color ? ` · ${item.color}` : ""}
                  {formatConfidence(item.confidence) ? ` · ${formatConfidence(item.confidence)}` : ""}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        {Array.isArray(pro.textileAnalysis) && pro.textileAnalysis.length ? (
          <Section label="Текстиль" theme={theme}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {pro.textileAnalysis.map((item) => (
                <div key={`${item.type}-${item.labelRu}`} style={text}>
                  {item.labelRu || item.type}
                  {item.materialGuess ? ` · ${item.materialGuess}` : ""}
                  {item.texture ? ` · ${item.texture}` : ""}
                  {item.pattern ? ` · ${item.pattern}` : ""}
                  {formatConfidence(item.confidence) ? ` · ${formatConfidence(item.confidence)}` : ""}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        {hasSurfaceBlock(pro.ceilingAnalysis, pro.wallAnalysis, pro.floorAnalysis, []) ? (
          <Section label="Отделка" theme={theme}>
            {pro.ceilingAnalysis?.labelRu || pro.ceilingAnalysis?.type ? (
              <div style={{ ...text, marginBottom: "8px" }}>
                Потолок: {pro.ceilingAnalysis.labelRu || pro.ceilingAnalysis.type}
              </div>
            ) : null}
            {Array.isArray(pro.wallAnalysis) && pro.wallAnalysis.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                {pro.wallAnalysis.map((item, index) => (
                  <div key={`wall-${index}`} style={text}>
                    {item.zone ? `${item.zone}: ` : "Стена: "}
                    {[item.finish, item.texture, item.color, formatConfidence(item.confidence)].filter(Boolean).join(" · ")}
                  </div>
                ))}
              </div>
            ) : null}
            {Array.isArray(pro.floorAnalysis) && pro.floorAnalysis.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {pro.floorAnalysis.map((item, index) => (
                  <div key={`floor-${index}`} style={text}>
                    Пол: {[item.finish, item.materialGuess, item.tone, formatConfidence(item.confidence)].filter(Boolean).join(" · ")}
                  </div>
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}
        {Array.isArray(pro.decorAnalysis) && pro.decorAnalysis.length ? (
          <Section label="Декор" theme={theme}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {pro.decorAnalysis.map((item) => (
                <div key={`${item.type}-${item.labelRu}`} style={text}>
                  {item.labelRu || item.type}
                  {item.position ? ` · ${item.position}` : ""}
                  {formatConfidence(item.confidence) ? ` · ${formatConfidence(item.confidence)}` : ""}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
        {Array.isArray(pro.designIntent?.whatMustBePreserved) && pro.designIntent.whatMustBePreserved.length ? (
          <Section label="Что важно сохранить" theme={theme}>
            <Chips items={pro.designIntent.whatMustBePreserved} theme={theme} />
          </Section>
        ) : null}
        <ConceptDNASection styleConsistency={semanticDraft.styleConsistency} theme={theme} text={text} />
        <SceneSpatialMapSection sceneGraph={semanticDraft.sceneGraph} theme={theme} text={text} />
        <EditableElementsSection editableObjects={semanticDraft.editableObjects} theme={theme} text={text} />
        <DesignMutationsSection
          designMutations={semanticDraft.designMutations}
          generationPackages={semanticDraft.generationPackages}
          semanticDraft={semanticDraft}
          theme={theme}
          text={text}
          onPrepareGenerationPackage={onPrepareGenerationPackage}
          sourceImageId={sourceImageId}
          sourceImageBase64={sourceImageBase64}
          onControlledRegenerate={onControlledRegenerate}
          isControlledRegenerating={isControlledRegenerating}
          controlledRegenerationError={controlledRegenerationError}
          controlledRegenerationResult={controlledRegenerationResult}
          onAnalyzeControlledVisual={onAnalyzeControlledVisual}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...revealStyle,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
        gap: theme.sectionGap,
        padding: theme.panelPadding,
        borderRadius: "16px",
        background: theme.background,
        border: `1px solid ${theme.border}`,
      }}
    >
      <Section label={`Режим ${ANALYSIS_MODE_LABELS_RU.spec}`} theme={theme}>
                <div style={{ ...text, fontSize: "13px", color: theme.textSecondary }}>Подготовка к SKU, BIM и смете</div>
          <div style={{ ...text, marginTop: "8px", color: theme.textSecondary, fontSize: "12px", lineHeight: 1.5 }}>
            Черновая спецификация по изображению. Точные артикулы, размеры и цены появятся после подключения каталогов и BIM-данных.
          </div>
      </Section>
      {Array.isArray(spec.functionalZones) && spec.functionalZones.length ? (
        <Section label="Функциональные зоны" theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {spec.functionalZones.map((zone) => (
              <div key={`${zone.type}-${zone.labelRu}`} style={text}>
                {zone.labelRu || zone.type}
                {zone.position ? ` · ${zone.position}` : ""}
                {zone.importance ? ` · ${IMPORTANCE_LABELS_RU[zone.importance] || zone.importance}` : ""}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      {Array.isArray(spec.supplierCategories) && spec.supplierCategories.length ? (
        <Section label="Категории поставщиков" theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {spec.supplierCategories.map((item) => (
              <div key={`supplier-${item.category}-${item.reason}`} style={text}>
                {item.category}
                {item.priority ? ` · приоритет: ${PRIORITY_LABELS_RU[item.priority] || item.priority}` : ""}
                {item.reason ? ` · ${item.reason}` : ""}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      {Array.isArray(spec.specificationGroups) && spec.specificationGroups.length ? (
        <Section label="Группы спецификации" theme={theme}>
          <div style={{ ...text, marginBottom: "10px", color: theme.textSecondary }}>
            {spec.specificationGroups.length} групп для сметы, BIM и подбора SKU
          </div>
        </Section>
      ) : null}
      {Array.isArray(spec.specificationGroups) && spec.specificationGroups.length
        ? sortSpecificationGroups(spec.specificationGroups).map((group) => (
            <Section key={group.group} label={group.group} theme={theme}>
              <div style={{ ...text, marginBottom: "8px", color: theme.textSecondary, fontSize: "12px" }}>
                {[
                  group.priority ? `приоритет: ${PRIORITY_LABELS_RU[group.priority] || group.priority}` : "",
                  group.budgetWeight ? `вес сметы: ${PRIORITY_LABELS_RU[group.budgetWeight] || group.budgetWeight}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {group.items.map((item) => (
                  <div key={`${group.group}-${item.name}-${item.category}`} style={text}>
                    {item.name}
                    {formatSpecGroupItem(item) ? ` · ${formatSpecGroupItem(item)}` : ""}
                  </div>
                ))}
              </div>
            </Section>
          ))
        : null}
      {Array.isArray(spec.productCategories) && spec.productCategories.length ? (
        <Section label="Потенциальные позиции сметы" theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {spec.productCategories.map((item) => (
              <div key={`${item.category}-${item.reason}`} style={text}>
                {item.category}
                {item.priority ? ` · приоритет: ${PRIORITY_LABELS_RU[item.priority] || item.priority}` : ""}
                {item.reason ? ` · ${item.reason}` : ""}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      {Array.isArray(spec.replacementCandidates) && spec.replacementCandidates.length ? (
        <Section label="Кандидаты для замены" theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {spec.replacementCandidates.map((item) => (
              <div key={`${item.target}-${item.category}`} style={text}>
                {item.target}
                {item.category ? ` · ${item.category}` : ""}
                {item.changeRisk ? ` · риск: ${RISK_LABELS_RU[item.changeRisk] || item.changeRisk}` : ""}
                {item.reason ? ` · ${item.reason}` : ""}
                {item.recommendation ? ` · ${item.recommendation}` : ""}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      {Array.isArray(spec.procurementNotes) && spec.procurementNotes.length ? (
        <Section label="Заметки для SKU" theme={theme}>
          <Chips items={spec.procurementNotes} theme={theme} />
        </Section>
      ) : null}
      {Array.isArray(spec.whatMustBePreserved) && spec.whatMustBePreserved.length ? (
        <Section label="Что важно сохранить" theme={theme}>
          <Chips items={spec.whatMustBePreserved} theme={theme} />
        </Section>
      ) : null}
      <ConceptDNASection styleConsistency={semanticDraft.styleConsistency} theme={theme} text={text} />
      <SceneSpatialMapSection sceneGraph={semanticDraft.sceneGraph} theme={theme} text={text} />
      <EditableElementsSection editableObjects={semanticDraft.editableObjects} theme={theme} text={text} />
      <DesignMutationsSection
        designMutations={semanticDraft.designMutations}
        generationPackages={semanticDraft.generationPackages}
        semanticDraft={semanticDraft}
        theme={theme}
        text={text}
        onPrepareGenerationPackage={onPrepareGenerationPackage}
        sourceImageId={sourceImageId}
        sourceImageBase64={sourceImageBase64}
        onControlledRegenerate={onControlledRegenerate}
        isControlledRegenerating={isControlledRegenerating}
        controlledRegenerationError={controlledRegenerationError}
        controlledRegenerationResult={controlledRegenerationResult}
        onAnalyzeControlledVisual={onAnalyzeControlledVisual}
      />
      <BudgetDraftSection
        budgetDraft={budgetDraft}
        onCreateBudgetDraft={onCreateBudgetDraft}
        theme={theme}
        text={text}
      />
      <PotentialBrandsSection budgetDraft={budgetDraft} theme={theme} text={text} />
    </div>
  );
}
