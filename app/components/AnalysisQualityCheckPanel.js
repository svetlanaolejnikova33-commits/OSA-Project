"use client";

import { runAnalysisQualityChecks } from "../lib/analysisQualityChecks";
import {
  ANALYSIS_TEST_SCENARIOS,
  inferScenarioTypeFromSemanticDraft,
} from "../lib/analysisTestScenarios";

export function AnalysisQualityCheckPanel({
  semanticDraft,
  budgetDraft,
  scenarioType,
  onScenarioTypeChange,
  isDark,
}) {
  if (process.env.NODE_ENV !== "development" || !semanticDraft) return null;

  const resolvedScenarioType = scenarioType || inferScenarioTypeFromSemanticDraft(semanticDraft);
  const report = runAnalysisQualityChecks(semanticDraft, resolvedScenarioType, budgetDraft);

  return (
    <div
      style={{
        marginTop: "14px",
        padding: "12px",
        borderRadius: "14px",
        border: isDark ? "1px dashed rgba(255,255,255,0.14)" : "1px dashed rgba(0,0,0,0.12)",
        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.55)",
      }}
    >
      <div style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>
        Quality Check
      </div>
      <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <label style={{ fontSize: "12px", display: "flex", gap: "6px", alignItems: "center" }}>
          <span>Сценарий</span>
          <select
            value={resolvedScenarioType}
            onChange={(event) => onScenarioTypeChange?.(event.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: "8px",
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
              background: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.9)",
              color: "inherit",
              font: "inherit",
            }}
          >
            {ANALYSIS_TEST_SCENARIOS.map((scenario) => (
              <option key={scenario.type} value={scenario.type}>
                {scenario.labelRu}
              </option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: "12px" }}>score: {report.score}</span>
        <span style={{ fontSize: "12px" }}>passed: {report.passedChecks.length}</span>
        <span style={{ fontSize: "12px" }}>failed: {report.failedChecks.length}</span>
      </div>

      {report.passedChecks.length ? (
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>passed</div>
          {report.passedChecks.map((check) => (
            <div key={check.id} style={{ fontSize: "12px", lineHeight: 1.45 }}>
              {check.labelRu}
            </div>
          ))}
        </div>
      ) : null}

      {report.warnings.length ? (
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>warnings</div>
          {report.warnings.map((warning) => (
            <div key={warning} style={{ fontSize: "12px", lineHeight: 1.45 }}>
              {warning}
            </div>
          ))}
        </div>
      ) : null}

      {report.failedChecks.length ? (
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>failed</div>
          {report.failedChecks.map((check) => (
            <div key={check.id} style={{ fontSize: "12px", lineHeight: 1.45 }}>
              {check.labelRu}
              {check.detail ? ` · ${check.detail}` : ""}
            </div>
          ))}
        </div>
      ) : null}

      {report.recommendations.length ? (
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>рекомендации</div>
          {report.recommendations.map((item) => (
            <div key={item} style={{ fontSize: "12px", lineHeight: 1.45 }}>
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
