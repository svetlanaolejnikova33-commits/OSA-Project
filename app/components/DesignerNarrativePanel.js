"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { buildNarrativeRequestKey, fetchDesignNarrative } from "../lib/designNarrativeClient";
import { buildDesignerNarrative, buildTechnicalAiSnapshot } from "../lib/semanticNarrativeFormatter";

function NarrativeChips({ items, theme, isMobile }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? "6px" : "8px", marginTop: "10px" }}>
      {items.map((item) => (
        <span
          key={String(item)}
          style={{
            padding: isMobile ? "5px 8px" : "5px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            lineHeight: 1.25,
            border: `1px solid ${theme.chipBorder}`,
            background: theme.chipBackground,
            color: theme.chipText,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function NarrativeSectionBlock({ section, theme, text, isMobile }) {
  if (!section?.narrative && !section?.chips?.length) return null;
  return (
    <div
      style={{
        paddingBottom: isMobile ? "14px" : "12px",
        marginBottom: isMobile ? "2px" : "4px",
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 650,
          color: theme.textSecondary,
          marginBottom: "8px",
        }}
      >
        {section.title}
      </div>
      {section.narrative ? (
        <div style={{ ...text, fontSize: isMobile ? "14px" : "14px", lineHeight: 1.6 }}>{section.narrative}</div>
      ) : null}
      <NarrativeChips items={section.chips} theme={theme} isMobile={isMobile} />
    </div>
  );
}

function TechnicalAiDetails({ lines, theme, text, isMobile }) {
  if (!lines.length) return null;
  return (
    <details
      style={{
        marginTop: "12px",
        fontSize: "12px",
        lineHeight: 1.5,
        color: theme.textSecondary,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          userSelect: "none",
          fontWeight: 600,
          letterSpacing: "0.04em",
          padding: "8px 0",
        }}
      >
        Технические данные AI
      </summary>
      <div
        style={{
          marginTop: "8px",
          padding: isMobile ? "10px 0" : "10px 12px",
          borderRadius: isMobile ? 0 : "10px",
          background: isMobile ? "transparent" : theme.cardBackground,
          border: isMobile ? "none" : `1px solid ${theme.border}`,
        }}
      >
        {lines.map((line, index) => (
          <div
            key={`tech-${index}`}
            style={{
              ...text,
              fontSize: "12px",
              lineHeight: 1.45,
              color: theme.textSecondary,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              marginBottom: index < lines.length - 1 ? "6px" : 0,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </details>
  );
}

export const DesignerNarrativePanel = memo(function DesignerNarrativePanel({
  semanticDraft,
  analysisMode,
  theme,
  text,
  isMobile = false,
}) {
  const requestKey = useMemo(
    () => buildNarrativeRequestKey(semanticDraft, analysisMode),
    [semanticDraft, analysisMode]
  );
  const technicalLines = useMemo(
    () => buildTechnicalAiSnapshot(semanticDraft, analysisMode),
    [semanticDraft, analysisMode]
  );

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!semanticDraft || !requestKey) {
      setSections([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setSections([]);
    setLoading(true);

    fetchDesignNarrative({
      semanticDraft,
      analysisMode,
      locale: "ru",
      tone: "professional_designer",
      signal: controller.signal,
    })
      .then((result) => {
        if (!active) return;
        if (result.ok && Array.isArray(result.sections) && result.sections.length) {
          setSections(result.sections);
        } else {
          setSections(buildDesignerNarrative(semanticDraft, analysisMode).sections);
        }
      })
      .catch(() => {
        if (!active) return;
        setSections(buildDesignerNarrative(semanticDraft, analysisMode).sections);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestKey, semanticDraft, analysisMode]);

  if (!semanticDraft) {
    return (
      <div style={{ ...text, fontSize: "13px", lineHeight: 1.55, color: theme.textSecondary }}>
        Краткий разбор сцены появится после анализа изображения.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="osa-designer-narrative" style={{ width: "100%", textAlign: "left" }}>
        <div style={{ ...text, fontSize: "14px", lineHeight: 1.6, color: theme.textSecondary }}>
          Формируем дизайнерское описание…
        </div>
        <TechnicalAiDetails lines={technicalLines} theme={theme} text={text} isMobile={isMobile} />
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div style={{ ...text, fontSize: "13px", lineHeight: 1.55, color: theme.textSecondary }}>
        Краткий разбор сцены появится после анализа изображения.
      </div>
    );
  }

  return (
    <div className="osa-designer-narrative" style={{ width: "100%", textAlign: "left" }}>
      {sections.map((section) => (
        <NarrativeSectionBlock
          key={section.id}
          section={section}
          theme={theme}
          text={text}
          isMobile={isMobile}
        />
      ))}

      <TechnicalAiDetails lines={technicalLines} theme={theme} text={text} isMobile={isMobile} />
    </div>
  );
});
