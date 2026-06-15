"use client";

import { useState } from "react";
import { formatEditTypesRu } from "../lib/editableObjectsUtils";
import { getConceptDNA } from "../lib/styleConsistencyUtils";
import { getSafeAnalysisTheme, isLightSwatchColor } from "../lib/getSafeAnalysisTheme";
import { ConceptIntentSection } from "./ConceptIntentSection";
import { SupplierMatchesSection } from "./SupplierMatchesSection";
import { VisualProductDiscoverySection } from "./VisualProductDiscoverySection";
import { BudgetRecommendationsSection } from "./BudgetRecommendationsSection";
import { ProjectSelectionSection } from "./ProjectSelectionSection";
import { StructuredEstimateSection } from "./StructuredEstimateSection";
import { sumPreviewBudgetRows } from "../lib/registry/buildPreviewBudgetRows";
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

/** Essential path sections start expanded on first open. */
const DEFAULT_EXPANDED_SECTIONS = new Set(["summary", "style-intent", "visual-product-discovery"]);

function Section({ label, children, theme, isMobile = false, sectionKey, defaultExpanded }) {
  const initialExpanded =
    typeof defaultExpanded === "boolean"
      ? defaultExpanded
      : sectionKey == null
        ? false
        : DEFAULT_EXPANDED_SECTIONS.has(sectionKey);
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        borderBottom: `1px solid ${theme.border}`,
        marginBottom: "2px",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: isMobile ? "14px 0 10px 0" : "12px 0 8px 0",
          border: "none",
          background: "transparent",
          color: "inherit",
          font: "inherit",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ ...labelStyle(theme, true), marginBottom: 0 }}>{label}</span>
        <span aria-hidden style={{ fontSize: "12px", opacity: 0.6, flexShrink: 0 }}>
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded ? (
        <div
          style={{
            paddingBottom: isMobile ? "16px" : "12px",
            textAlign: "left",
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function labelStyle(theme, isMobile = false) {
  return {
    fontSize: "12px",
    letterSpacing: isMobile ? "0.05em" : "0.10em",
    textTransform: "uppercase",
    fontWeight: 600,
    color: theme.textSecondary,
    marginBottom: isMobile ? "0" : "8px",
  };
}

function valueStyle(theme, isMobile = false) {
  return {
    fontSize: isMobile ? "15px" : "14px",
    lineHeight: isMobile ? 1.42 : 1.55,
    color: theme.textPrimary,
    textAlign: isMobile ? "left" : undefined,
    letterSpacing: isMobile ? "normal" : undefined,
  };
}

function formatConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `${Math.round(num * 100)}%`;
}

function Chips({ items, theme, isMobile = false }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? "6px" : "8px" }}>
      {items.map((item) => (
        <span
          key={String(item)}
          className="osa-chip"
          style={{
            padding: isMobile ? "6px 8px" : "6px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            lineHeight: 1.25,
            border: `1px solid ${theme.chipBorder}`,
            background: theme.chipBackground,
            color: theme.chipText,
            whiteSpace: isMobile ? "normal" : "nowrap",
            letterSpacing: isMobile ? "normal" : undefined,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function PaletteSwatches({ entries, theme, isMobile = false }) {
  const [showAll, setShowAll] = useState(false);
  if (!Array.isArray(entries) || !entries.length) return null;
  const limit = isMobile ? 5 : entries.length;
  const hiddenCount = entries.length - limit;
  const visible = showAll || !isMobile ? entries : entries.slice(0, limit);
  const sw = isMobile ? 36 : 36;
  const gap = isMobile ? 8 : 10;

  return (
    <div className="osa-palette-swatches" style={{ display: "flex", flexWrap: "wrap", gap, alignItems: "flex-start" }}>
      {visible.map((entry, index) => {
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
              gap: "3px",
              minWidth: isMobile ? "40px" : "52px",
              maxWidth: isMobile ? "56px" : "72px",
            }}
          >
            {swatchColor ? (
              <span
                aria-hidden="true"
                style={{
                  width: `${sw}px`,
                  height: `${sw}px`,
                  borderRadius: isMobile ? "9px" : "10px",
                  background: swatchColor,
                  border: lightSwatch ? `1px solid ${theme.swatchBorder}` : "1px solid rgba(0,0,0,0.08)",
                }}
              />
            ) : (
              <span
                style={{
                  width: `${sw}px`,
                  height: `${sw}px`,
                  borderRadius: isMobile ? "9px" : "10px",
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
            {!isMobile ? (
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
            ) : (
              <span
                style={{
                  fontSize: "11px",
                  lineHeight: 1.25,
                  textAlign: "center",
                  color: theme.swatchLabel,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                {label}
              </span>
            )}
          </div>
        );
      })}
      {isMobile && hiddenCount > 0 && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            alignSelf: "center",
            marginTop: "4px",
            padding: "6px 10px",
            borderRadius: "999px",
            border: `1px solid ${theme.border}`,
            background: theme.chipBackground,
            color: theme.chipText,
            font: "inherit",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          ещё {hiddenCount}
        </button>
      ) : null}
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

function ColorLogicSection({ colorAnalysis, theme, text, isMobile = false }) {
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
    <Section label="Цветовая логика" theme={theme} isMobile={isMobile} sectionKey="color">
      <div
        style={{
          ...text,
          marginBottom: "8px",
          color: theme.textSecondary,
          fontSize: "12px",
          textTransform: "none",
          letterSpacing: isMobile ? "normal" : undefined,
        }}
      >
        {paletteSourceLabel(display.source)}
      </div>
      {display.dominant.length ? <PaletteSwatches entries={display.dominant} theme={theme} isMobile={isMobile} /> : null}
      {display.accents.length ? (
        <div style={{ marginTop: "10px" }}>
          <PaletteSwatches entries={display.accents} theme={theme} isMobile={isMobile} />
        </div>
      ) : null}
      {display.description ? (
        <div style={{ ...text, marginTop: "10px", textTransform: "none", fontWeight: 400 }}>{display.description}</div>
      ) : null}
      {display.warmth || display.brightness || display.contrast ? (
        <div style={{ ...text, marginTop: "8px", color: theme.textSecondary, textTransform: "none" }}>
          {[display.warmth, display.brightness, display.contrast].filter(Boolean).join(" · ")}
        </div>
      ) : null}
    </Section>
  );
}

function EmptyModeState({ message, theme, revealStyle, activeMode, isMobile = false }) {
  return (
    <div
      style={{
        ...revealStyle,
        width: "100%",
        boxSizing: "border-box",
        padding: isMobile ? "12px 14px" : theme.panelPadding,
        borderRadius: isMobile ? "12px" : activeMode === "quick" ? "14px" : "16px",
        background: theme.background,
        border: isMobile ? "none" : `1px solid ${theme.border}`,
        color: theme.textSecondary,
        fontSize: isMobile ? "15px" : "14px",
        lineHeight: isMobile ? 1.42 : 1.55,
        textAlign: isMobile ? "left" : undefined,
      }}
    >
      {message}
    </div>
  );
}

function formatRegistryFlag(value) {
  return value ? "да" : "нет";
}

function ConceptDNASection({ styleConsistency, theme, text, isMobile = false }) {
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
    <Section label="Логика концепции" theme={theme} isMobile={isMobile} sectionKey="concept-dna">
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
          <div style={{ ...text, marginBottom: "6px", color: theme.textSecondary, fontSize: "12px", textTransform: "none" }}>
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

function EditableElementsSection({ editableObjects, theme, text, isMobile = false }) {
  const items = Array.isArray(editableObjects) ? editableObjects.slice(0, 6) : [];
  if (!items.length) return null;
  const sourceLabel = getLayerSourceLabel(editableObjects);

  return (
    <Section label="Редактируемые элементы" theme={theme} isMobile={isMobile} sectionKey="editable">
      {sourceLabel ? (
        <div style={{ ...text, fontSize: "11px", color: theme.textSecondary, marginBottom: "8px" }}>{sourceLabel}</div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "8px" : "10px" }}>
        {items.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: isMobile ? "8px 0" : "10px 12px",
              borderRadius: isMobile ? "0" : "12px",
              border: isMobile ? "none" : `1px solid ${theme.border}`,
              background: isMobile ? "transparent" : theme.cardBackground,
              borderBottom: isMobile ? `1px solid ${theme.border}` : undefined,
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

function SceneSpatialMapSection({ sceneGraph, theme, text, isMobile = false }) {
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
    <Section label="Структура сцены" theme={theme} isMobile={isMobile} sectionKey="spatial">
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

function PotentialBrandsSection({ budgetDraft, theme, text, isMobile = false, quiet = false }) {
  const groups = Array.isArray(budgetDraft?.normalizedSpecGroups)
    ? budgetDraft.normalizedSpecGroups.filter((entry) => asArray(entry?.supplierCandidates?.matchedBrands).length)
    : [];
  if (!groups.length) return null;

  return (
    <Section label="Потенциальные бренды" theme={theme} isMobile={isMobile} sectionKey="brands">
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {groups.map((entry) => {
          const title = entry.parentLabelRu ? `${entry.parentLabelRu} / ${entry.labelRu}` : entry.labelRu;
          const matchedBrands = entry.supplierCandidates?.matchedBrands || [];
          return (
            <div
              key={`${entry.registryCategoryId}-brands`}
              style={{
                padding: isMobile ? "8px 0" : "10px 12px",
                borderRadius: isMobile ? "0" : "12px",
                border: isMobile ? "none" : `1px solid ${theme.border}`,
                background: isMobile ? "transparent" : theme.cardBackground,
                borderBottom: isMobile ? `1px solid ${theme.border}` : undefined,
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
              {!quiet ? (
                <>
                  <div style={{ ...text, marginTop: "8px", fontSize: "12px", color: theme.textSecondary }}>
                    suppliers: {entry.supplierCandidates?.supplierCount ?? matchedBrands.length}
                  </div>
                  <div style={{ ...text, fontSize: "12px", color: theme.textSecondary }}>
                    confidence: {entry.supplierCandidates?.confidence || "low"}
                  </div>
                </>
              ) : null}
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

function budgetDraftButtonStyle(theme) {
  return {
    padding: "10px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${theme.border}`,
    background: theme.cardBackground,
    color: theme.textPrimary,
    font: "inherit",
  };
}

function BudgetDraftActionButton({ budgetDraft, onCreateBudgetDraft, theme, text, isMobile = false, quiet = false }) {
  if (budgetDraft) {
    if (quiet) return null;
    return (
      <div style={{ ...text, fontWeight: 600 }}>
        Черновик сметы создан
        {Array.isArray(budgetDraft.normalizedSpecGroups) && budgetDraft.normalizedSpecGroups.length
          ? ` · ${budgetDraft.normalizedSpecGroups.length} категорий`
          : ""}
      </div>
    );
  }
  return (
    <>
      {quiet ? (
        <div style={{ ...text, color: theme.textSecondary, fontSize: "13px", lineHeight: 1.5, marginBottom: "10px" }}>
          Черновик сметы ещё не создан
        </div>
      ) : null}
      <button type="button" onClick={onCreateBudgetDraft} style={budgetDraftButtonStyle(theme)}>
        Создать черновик сметы
      </button>
    </>
  );
}

function VisualProductDiscoveryBlock({
  showVisualProductDiscovery,
  visualProductCandidates,
  visualProductCandidatesLoading,
  visualProductCandidatesError,
  theme,
  text,
  isMobile,
  isDark,
}) {
  if (!showVisualProductDiscovery) return null;

  return (
    <Section
      label="ВИЗУАЛЬНО ПОХОЖИЕ ТОВАРЫ"
      theme={theme}
      isMobile={isMobile}
      sectionKey="visual-product-discovery"
    >
      <div
        style={{
          ...text,
          marginBottom: "10px",
          color: theme.textSecondary,
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        Подбор по категории «Подвесные светильники» из каталога МОДЕЛЮКС. Без SKU и цен — только
        визуальный выбор перед сметой.
      </div>
      <VisualProductDiscoverySection
        candidates={visualProductCandidates}
        isLoading={visualProductCandidatesLoading}
        error={visualProductCandidatesError}
        theme={theme}
        text={text}
        isMobile={isMobile}
        isDark={isDark}
      />
    </Section>
  );
}

function BudgetDraftSection({ budgetDraft, onCreateBudgetDraft, theme, text, isMobile = false, quiet = false }) {
  const groups = sortSpecificationGroups(budgetDraft?.groups || []);
  const normalizedGroups = Array.isArray(budgetDraft?.normalizedSpecGroups)
    ? budgetDraft.normalizedSpecGroups
    : [];
  if (!budgetDraft) {
    return (
      <Section label="Черновик сметы" theme={theme} isMobile={isMobile} sectionKey="budget">
        {quiet ? (
          <BudgetDraftActionButton
            budgetDraft={budgetDraft}
            onCreateBudgetDraft={onCreateBudgetDraft}
            theme={theme}
            text={text}
            isMobile={isMobile}
            quiet
          />
        ) : (
          <div style={{ ...text, color: theme.textSecondary, fontSize: "12px", lineHeight: 1.5 }}>
            Нажмите «Создать черновик сметы» выше — структура подтянется из SPEC-анализа.
          </div>
        )}
      </Section>
    );
  }

  if (quiet) {
    const categoryCount = normalizedGroups.length || groups.length;
    const total = sumPreviewBudgetRows(budgetDraft.previewBudgetRows);
    return (
      <Section label="Черновик сметы" theme={theme} isMobile={isMobile} sectionKey="budget">
        <div style={{ ...text, fontSize: "14px", lineHeight: 1.5 }}>
          {categoryCount
            ? `${categoryCount} ${categoryCount === 1 ? "категория" : categoryCount < 5 ? "категории" : "категорий"} в черновике`
            : "Структура сметы готова"}
        </div>
        {total > 0 ? (
          <div style={{ ...text, marginTop: "8px", fontSize: "14px", fontWeight: 600, lineHeight: 1.5 }}>
            Предварительная сумма: ≈ {total.toLocaleString("ru-RU")} ₽
          </div>
        ) : null}
      </Section>
    );
  }

  return (
    <Section label="Черновик сметы" theme={theme} isMobile={isMobile} sectionKey="budget">
      <>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                        padding: isMobile ? "8px 0" : "10px 12px",
                        borderRadius: isMobile ? "0" : "12px",
                        border: isMobile ? "none" : `1px solid ${theme.border}`,
                        background: isMobile ? "transparent" : theme.cardBackground,
                        borderBottom: isMobile ? `1px solid ${theme.border}` : undefined,
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
    </Section>
  );
}

function withMobileTheme(theme, isMobile) {
  if (!isMobile) return theme;
  return {
    ...theme,
    panelPadding: "13px",
    cardPadding: "0px",
    sectionGap: "0px",
  };
}

function CompactAnalysisSummary({ semanticDraft, analysisMode, theme, text, isMobile }) {
  const quick = semanticDraft?.quickAnalysis || {};
  const pro = semanticDraft?.proAnalysis || {};
  const spec = semanticDraft?.specAnalysis || {};
  const mode = analysisMode;

  const styleLine =
    mode === "quick"
      ? quick.styleAnalysis?.labelRu || quick.styleAnalysis?.primary || ""
      : mode === "spec"
        ? spec.styleAnalysis?.labelRu || spec.styleAnalysis?.primary || ""
        : pro.styleAnalysis?.labelRu || pro.styleAnalysis?.primary || "";

  const spaceLine =
    mode === "quick"
      ? quick.spaceType?.labelRu || quick.spaceType?.value || ""
      : mode === "spec"
        ? spec.spaceType?.labelRu || spec.spaceType?.value || ""
        : pro.spaceType?.labelRu || pro.spaceType?.value || "";

  const summaryLine =
    mode === "quick"
      ? quick.designIntent?.summaryRu || ""
      : mode === "spec"
        ? spec.designIntent?.summaryRu || ""
        : pro.designIntent?.summaryRu || "";

  if (!styleLine && !spaceLine && !summaryLine) return null;

  return (
    <div
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: isMobile ? "4px 0 8px" : "4px 0 12px",
      }}
    >
      {spaceLine ? (
        <div style={{ ...text, fontSize: isMobile ? "14px" : "15px", fontWeight: 600 }}>{spaceLine}</div>
      ) : null}
      {styleLine ? <div style={text}>{styleLine}</div> : null}
      {summaryLine ? (
        <div style={{ ...text, color: theme.textSecondary, fontSize: "13px", lineHeight: 1.5 }}>{summaryLine}</div>
      ) : null}
    </div>
  );
}

function ConceptIntentBlock({
  semanticDraft,
  theme,
  text,
  isMobile,
  onConceptIntentSubmit,
  isConceptIntentProcessing,
  conceptIntentError,
  conceptIntentSuccess,
  conceptIntentResultVisualId,
  onAnalyzeConceptResult,
}) {
  if (!semanticDraft) return null;
  return (
    <div style={{ width: "100%", minWidth: 0, alignSelf: "stretch", flex: "none" }}>
      <ConceptIntentSection
        theme={theme}
        text={text}
        isMobile={isMobile}
        isProcessing={isConceptIntentProcessing}
        feedbackError={conceptIntentError}
        feedbackSuccess={conceptIntentSuccess}
        resultVisualId={conceptIntentResultVisualId}
        onSubmitIntent={onConceptIntentSubmit}
        onAnalyzeResult={onAnalyzeConceptResult}
      />
    </div>
  );
}

export function VisionAnalysisPanel({
  semanticDraft,
  activeMode,
  isDark,
  isMobile = false,
  revealStyle,
  budgetDraft,
  onCreateBudgetDraft,
  onConceptIntentSubmit,
  isConceptIntentProcessing = false,
  conceptIntentError = "",
  conceptIntentSuccess = "",
  conceptIntentResultVisualId = "",
  onAnalyzeConceptResult,
  showVisualProductDiscovery = false,
  visualProductCandidates = [],
  visualProductCandidatesLoading = false,
  visualProductCandidatesError = "",
  placement = "pipeline",
  selectedProjectItems = [],
  onAddToProjectSelection,
  onProjectSelectionStatusChange,
  activeProjectKey = "",
}) {
  if (!semanticDraft) return null;

  const analysisMode = normalizeAnalysisMode(activeMode || semanticDraft.analysisMode);
  const theme = withMobileTheme(getSafeAnalysisTheme(semanticDraft, isDark, analysisMode), isMobile);
  const text = valueStyle(theme, isMobile);
  const isCenterPlacement = placement === "center";
  const isBudgetPlacement = placement === "budget";
  const showConceptIntent = isCenterPlacement;
  const showProductDiscovery = isCenterPlacement && showVisualProductDiscovery;
  const hidePipelineChrome = placement === "pipeline" || placement === "budget";
  const isBimPlacement = placement === "bim";

  if (isBimPlacement) {
    return (
      <div className="osa-analysis-panel" style={{ width: "100%", textAlign: "left" }}>
        <ConceptDNASection styleConsistency={semanticDraft.styleConsistency} theme={theme} text={text} isMobile={isMobile} />
        <SceneSpatialMapSection sceneGraph={semanticDraft.sceneGraph} theme={theme} text={text} isMobile={isMobile} />
        <EditableElementsSection editableObjects={semanticDraft.editableObjects} theme={theme} text={text} isMobile={isMobile} />
      </div>
    );
  }

  if (isBudgetPlacement) {
    return (
      <div className="osa-analysis-panel" style={{ width: "100%", textAlign: "left" }}>
        <BudgetDraftSection
          budgetDraft={budgetDraft}
          onCreateBudgetDraft={onCreateBudgetDraft}
          theme={theme}
          text={text}
          isMobile={isMobile}
          quiet
        />
        <PotentialBrandsSection
          budgetDraft={budgetDraft}
          theme={theme}
          text={text}
          isMobile={isMobile}
          quiet
        />
        <BudgetRecommendationsSection
          budgetDraft={budgetDraft}
          isDark={isDark}
          isMobile={isMobile}
          selectedProjectItems={selectedProjectItems}
          onAddToProjectSelection={onAddToProjectSelection}
        />
        <ProjectSelectionSection
          selectedProjectItems={selectedProjectItems}
          isDark={isDark}
          isMobile={isMobile}
          onStatusChange={onProjectSelectionStatusChange}
        />
        <StructuredEstimateSection
          selectedProjectItems={selectedProjectItems}
          projectKey={activeProjectKey}
          isDark={isDark}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (!hasSemanticDraftForMode(semanticDraft, analysisMode)) {
    return (
      <EmptyModeState
        message={getAnalysisModeEmptyMessage(analysisMode)}
        theme={theme}
        revealStyle={revealStyle}
        activeMode={analysisMode}
        isMobile={isMobile}
      />
    );
  }

  const quick = semanticDraft.quickAnalysis || {};
  const pro = semanticDraft.proAnalysis || {};
  const spec = semanticDraft.specAnalysis || {};

  if (isCenterPlacement) {
    return (
      <div className="osa-analysis-panel" style={{ width: "100%", textAlign: "left" }}>
        <CompactAnalysisSummary
          semanticDraft={semanticDraft}
          analysisMode={analysisMode}
          theme={theme}
          text={text}
          isMobile={isMobile}
        />
        <VisualProductDiscoveryBlock
          showVisualProductDiscovery={showProductDiscovery}
          visualProductCandidates={visualProductCandidates}
          visualProductCandidatesLoading={visualProductCandidatesLoading}
          visualProductCandidatesError={visualProductCandidatesError}
          theme={theme}
          text={text}
          isMobile={isMobile}
          isDark={isDark}
        />
        {showConceptIntent ? (
          <ConceptIntentBlock
            semanticDraft={semanticDraft}
            theme={theme}
            text={text}
            isMobile={isMobile}
            onConceptIntentSubmit={onConceptIntentSubmit}
            isConceptIntentProcessing={isConceptIntentProcessing}
            conceptIntentError={conceptIntentError}
            conceptIntentSuccess={conceptIntentSuccess}
            conceptIntentResultVisualId={conceptIntentResultVisualId}
            onAnalyzeConceptResult={onAnalyzeConceptResult}
          />
        ) : null}
      </div>
    );
  }

  const panelShell = () =>
    isMobile
      ? {
          ...revealStyle,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          display: "block",
          padding: 0,
          borderRadius: 0,
          background: "transparent",
          border: "none",
        }
      : {
          ...revealStyle,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          padding: 0,
          borderRadius: 0,
          background: "transparent",
          border: "none",
        };

  if (analysisMode === "quick") {
    return (
      <div className="osa-analysis-panel" style={panelShell()}>
        <Section label={`Режим ${ANALYSIS_MODE_LABELS_RU.quick}`} theme={theme} isMobile={isMobile} sectionKey="mode-quick">
          <div style={{ ...text, fontSize: "13px", color: theme.textSecondary, textTransform: "none", letterSpacing: "normal" }}>
            Быстрый творческий разбор сцены
          </div>
        </Section>
        {quick.designIntent?.summaryRu || quick.designIntent?.emotionalEffectRu ? (
          <Section label="Краткий замысел" theme={theme} isMobile={isMobile} sectionKey="summary">
            {quick.designIntent.summaryRu ? <div style={{ ...text, marginBottom: "8px" }}>{quick.designIntent.summaryRu}</div> : null}
            {quick.designIntent.emotionalEffectRu ? (
              <div style={{ ...text, color: theme.textSecondary }}>{quick.designIntent.emotionalEffectRu}</div>
            ) : null}
          </Section>
        ) : null}
        {quick.spaceType?.labelRu || quick.spaceType?.value ? (
          <Section label="Назначение помещения" theme={theme} isMobile={isMobile} sectionKey="space">
            <div style={{ ...text, fontSize: "15px", fontWeight: 600 }}>
              {quick.spaceType.labelRu || quick.spaceType.value}
              {formatConfidence(quick.spaceType.confidence) ? ` · ${formatConfidence(quick.spaceType.confidence)}` : ""}
            </div>
          </Section>
        ) : null}
        {quick.styleAnalysis?.labelRu || quick.styleAnalysis?.primary ? (
          <Section label="Стиль" theme={theme} isMobile={isMobile} sectionKey="style">
            <div style={{ ...text, marginBottom: "8px" }}>
              {quick.styleAnalysis.labelRu || quick.styleAnalysis.primary}
              {formatConfidence(quick.styleAnalysis.confidence) ? ` · ${formatConfidence(quick.styleAnalysis.confidence)}` : ""}
            </div>
            {Array.isArray(quick.styleAnalysis.secondary) && quick.styleAnalysis.secondary.length ? (
              <Chips items={quick.styleAnalysis.secondary} theme={theme} isMobile={isMobile} />
            ) : null}
          </Section>
        ) : null}
        {quick.atmosphereRu ? (
          <Section label="Атмосфера" theme={theme} isMobile={isMobile} sectionKey="atmosphere">
            <div style={text}>{quick.atmosphereRu}</div>
          </Section>
        ) : null}
        <ColorLogicSection colorAnalysis={quick.colorAnalysis} theme={theme} text={text} isMobile={isMobile} />
      </div>
    );
  }

  if (analysisMode === "pro") {
    return (
      <div className="osa-analysis-panel" style={panelShell()}>
        <Section label={`Режим ${ANALYSIS_MODE_LABELS_RU.pro}`} theme={theme} isMobile={isMobile} sectionKey="mode-pro">
          <div style={{ ...text, fontSize: "13px", color: theme.textSecondary, textTransform: "none", letterSpacing: "normal" }}>
            Профессиональная интерьерная карта
          </div>
        </Section>
        {pro.designIntent?.summaryRu ||
        pro.designIntent?.emotionalEffectRu ||
        (Array.isArray(pro.designIntent?.keyDesignDrivers) && pro.designIntent.keyDesignDrivers.length) ? (
          <Section label="Стиль и замысел" theme={theme} isMobile={isMobile} sectionKey="style-intent">
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
              <Chips items={pro.designIntent.keyDesignDrivers} theme={theme} isMobile={isMobile} />
            ) : null}
          </Section>
        ) : null}
        {!hidePipelineChrome ? (
          <VisualProductDiscoveryBlock
            showVisualProductDiscovery={showVisualProductDiscovery}
            visualProductCandidates={visualProductCandidates}
            visualProductCandidatesLoading={visualProductCandidatesLoading}
            visualProductCandidatesError={visualProductCandidatesError}
            theme={theme}
            text={text}
            isMobile={isMobile}
            isDark={isDark}
          />
        ) : null}
        {!hidePipelineChrome ? (
          <ConceptIntentBlock
            semanticDraft={semanticDraft}
            theme={theme}
            text={text}
            isMobile={isMobile}
            onConceptIntentSubmit={onConceptIntentSubmit}
            isConceptIntentProcessing={isConceptIntentProcessing}
            conceptIntentError={conceptIntentError}
            conceptIntentSuccess={conceptIntentSuccess}
            conceptIntentResultVisualId={conceptIntentResultVisualId}
            onAnalyzeConceptResult={onAnalyzeConceptResult}
          />
        ) : null}
        {!hidePipelineChrome && budgetDraft && !isMobile ? (
          <Section label="Найденные поставщики" theme={theme} isMobile={isMobile} sectionKey="supplier-matches-pro">
            <SupplierMatchesSection
              budgetDraft={budgetDraft}
              isDark={isDark}
              isMobile={isMobile}
              title=""
            />
          </Section>
        ) : null}
        {pro.spaceType?.labelRu || pro.spaceType?.value ? (
          <Section label="Назначение помещения" theme={theme} isMobile={isMobile} sectionKey="space">
            <div style={{ ...text, fontSize: "15px", fontWeight: 600 }}>
              {pro.spaceType.labelRu || pro.spaceType.value}
              {formatConfidence(pro.spaceType.confidence) ? ` · ${formatConfidence(pro.spaceType.confidence)}` : ""}
            </div>
          </Section>
        ) : null}
        {Array.isArray(pro.functionalZones) && pro.functionalZones.length ? (
          <Section label="Функциональные зоны" theme={theme} isMobile={isMobile} sectionKey="zones">
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
          <Section label="Атмосфера" theme={theme} isMobile={isMobile} sectionKey="atmosphere">
            <div style={text}>{pro.atmosphereRu}</div>
          </Section>
        ) : null}
        <ColorLogicSection colorAnalysis={pro.colorAnalysis} theme={theme} text={text} isMobile={isMobile} />
        {pro.lightingAnalysis &&
        (pro.lightingAnalysis.overallLightingMood ||
          (Array.isArray(pro.lightingAnalysis.technicalNotes) && pro.lightingAnalysis.technicalNotes.length) ||
          (Array.isArray(pro.lightingAnalysis.artificialLight) && pro.lightingAnalysis.artificialLight.length) ||
          pro.lightingAnalysis.naturalLight?.present) ? (
          <Section label="Свет" theme={theme} isMobile={isMobile} sectionKey="light">
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
              <Chips items={pro.lightingAnalysis.technicalNotes} theme={theme} isMobile={isMobile} />
            ) : null}
          </Section>
        ) : null}
        {hasProMaterialAnalysis(pro.materialAnalysis) ? (
          <Section label="Материалы" theme={theme} isMobile={isMobile} sectionKey="materials">
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
          <Section label="Мебель" theme={theme} isMobile={isMobile} sectionKey="furniture">
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
          <Section label="Текстиль" theme={theme} isMobile={isMobile} sectionKey="textile">
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
          <Section label="Отделка" theme={theme} isMobile={isMobile} sectionKey="surfaces">
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
          <Section label="Декор" theme={theme} isMobile={isMobile} sectionKey="decor">
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
          <Section label="Что важно сохранить" theme={theme} isMobile={isMobile} sectionKey="preserve">
            <Chips items={pro.designIntent.whatMustBePreserved} theme={theme} isMobile={isMobile} />
          </Section>
        ) : null}
        {!hidePipelineChrome ? (
          <>
            <ConceptDNASection styleConsistency={semanticDraft.styleConsistency} theme={theme} text={text} isMobile={isMobile} />
            <SceneSpatialMapSection sceneGraph={semanticDraft.sceneGraph} theme={theme} text={text} isMobile={isMobile} />
            <EditableElementsSection editableObjects={semanticDraft.editableObjects} theme={theme} text={text} isMobile={isMobile} />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="osa-analysis-panel" style={panelShell()}>
      <Section label={`Режим ${ANALYSIS_MODE_LABELS_RU.spec}`} theme={theme} isMobile={isMobile} sectionKey="mode-spec">
        <div style={{ ...text, fontSize: "13px", color: theme.textSecondary, textTransform: "none", letterSpacing: "normal" }}>
          Подготовка к SKU, BIM и смете
        </div>
        <div style={{ ...text, marginTop: "8px", color: theme.textSecondary, fontSize: "12px", lineHeight: 1.5, textTransform: "none" }}>
          Черновая спецификация по изображению. Точные артикулы, размеры и цены появятся после подключения каталогов и BIM-данных.
        </div>
      </Section>
      {hidePipelineChrome ? null : (
      <Section label="Смета" theme={theme} isMobile={isMobile} sectionKey="budget-action">
        <BudgetDraftActionButton
          budgetDraft={budgetDraft}
          onCreateBudgetDraft={onCreateBudgetDraft}
          theme={theme}
          text={text}
          isMobile={isMobile}
        />
      </Section>
      )}
      {Array.isArray(spec.functionalZones) && spec.functionalZones.length ? (
        <Section label="Функциональные зоны" theme={theme} isMobile={isMobile} sectionKey="zones">
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
        <Section label="Категории поставщиков" theme={theme} isMobile={isMobile} sectionKey="supplier-categories">
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
        <Section label="Группы спецификации" theme={theme} isMobile={isMobile} sectionKey="spec-groups-intro">
          <div style={{ ...text, marginBottom: "10px", color: theme.textSecondary }}>
            {spec.specificationGroups.length} групп для сметы, BIM и подбора SKU
          </div>
        </Section>
      ) : null}
      {Array.isArray(spec.specificationGroups) && spec.specificationGroups.length
        ? sortSpecificationGroups(spec.specificationGroups).map((group) => (
            <Section
              key={group.group}
              label={group.group}
              theme={theme}
              isMobile={isMobile}
              sectionKey={`spec-group-${String(group.group || "g").replace(/\s+/g, "-")}`}
            >
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
        <Section label="Потенциальные позиции сметы" theme={theme} isMobile={isMobile} sectionKey="product-categories">
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
        <Section label="Кандидаты для замены" theme={theme} isMobile={isMobile} sectionKey="replacement">
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
        <Section label="Заметки для SKU" theme={theme} isMobile={isMobile} sectionKey="procurement-notes">
          <Chips items={spec.procurementNotes} theme={theme} isMobile={isMobile} />
        </Section>
      ) : null}
      {Array.isArray(spec.whatMustBePreserved) && spec.whatMustBePreserved.length ? (
        <Section label="Что важно сохранить" theme={theme} isMobile={isMobile} sectionKey="preserve-spec">
          <Chips items={spec.whatMustBePreserved} theme={theme} isMobile={isMobile} />
        </Section>
      ) : null}
      {!hidePipelineChrome ? (
        <>
          <ConceptDNASection styleConsistency={semanticDraft.styleConsistency} theme={theme} text={text} isMobile={isMobile} />
          <SceneSpatialMapSection sceneGraph={semanticDraft.sceneGraph} theme={theme} text={text} isMobile={isMobile} />
          <EditableElementsSection editableObjects={semanticDraft.editableObjects} theme={theme} text={text} isMobile={isMobile} />
        </>
      ) : null}
      {!hidePipelineChrome ? (
        <VisualProductDiscoveryBlock
          showVisualProductDiscovery={showVisualProductDiscovery}
          visualProductCandidates={visualProductCandidates}
          visualProductCandidatesLoading={visualProductCandidatesLoading}
          visualProductCandidatesError={visualProductCandidatesError}
          theme={theme}
          text={text}
          isMobile={isMobile}
          isDark={isDark}
        />
      ) : null}
      {!hidePipelineChrome ? (
        <ConceptIntentBlock
          semanticDraft={semanticDraft}
          theme={theme}
          text={text}
          isMobile={isMobile}
          onConceptIntentSubmit={onConceptIntentSubmit}
          isConceptIntentProcessing={isConceptIntentProcessing}
          conceptIntentError={conceptIntentError}
          conceptIntentSuccess={conceptIntentSuccess}
          conceptIntentResultVisualId={conceptIntentResultVisualId}
          onAnalyzeConceptResult={onAnalyzeConceptResult}
        />
      ) : null}
      {!hidePipelineChrome ? (
        <BudgetDraftSection
          budgetDraft={budgetDraft}
          onCreateBudgetDraft={onCreateBudgetDraft}
          theme={theme}
          text={text}
          isMobile={isMobile}
        />
      ) : null}
      <PotentialBrandsSection budgetDraft={budgetDraft} theme={theme} text={text} isMobile={isMobile} />
    </div>
  );
}
