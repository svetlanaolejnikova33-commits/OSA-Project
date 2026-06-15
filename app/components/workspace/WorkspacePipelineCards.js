"use client";

import { useEffect, useState } from "react";

function PipelineCard({
  id,
  title,
  preview,
  previewSubline,
  isDark,
  isMobile,
  cardStyle,
  hoverHandlers,
  defaultExpanded = false,
  children,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  return (
    <div className="osa-stat-card" style={cardStyle} {...hoverHandlers}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`osa-pipeline-${id}`}
        style={{
          display: "block",
          width: "100%",
          margin: 0,
          padding: 0,
          border: "none",
          background: "transparent",
          color: "inherit",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "10px",
            marginBottom: "6px",
          }}
        >
          <div
            style={{
              fontSize: isMobile ? "22px" : "28px",
              fontWeight: 600,
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
          <span
            aria-hidden
            style={{
              fontSize: "13px",
              opacity: 0.5,
              flexShrink: 0,
              marginTop: isMobile ? "4px" : "6px",
            }}
          >
            {expanded ? "−" : "+"}
          </span>
        </div>
        <div
          style={{
            fontSize: isMobile ? "13px" : "14px",
            lineHeight: 1.5,
            color: isDark ? "rgba(243,238,231,0.64)" : "rgba(110,106,102,0.82)",
          }}
        >
          {preview}
          {previewSubline ? (
            <div
              style={{
                marginTop: "4px",
                fontSize: isMobile ? "12px" : "13px",
                lineHeight: 1.45,
                color: isDark ? "rgba(243,238,231,0.52)" : "rgba(110,106,102,0.72)",
              }}
            >
              {previewSubline}
            </div>
          ) : null}
        </div>
      </button>
      {expanded && children ? (
        <div
          id={`osa-pipeline-${id}`}
          style={{
            marginTop: "14px",
            paddingTop: "14px",
            borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
            textAlign: "left",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function WorkspacePipelineCards({ cards, isDark, isMobile, wrapperStyle, cardStyle, hoverHandlers }) {
  if (!Array.isArray(cards) || !cards.length) return null;

  return (
    <div className="osa-stats-row" style={wrapperStyle}>
      {cards.map((card) => (
        <PipelineCard
          key={card.id}
          id={card.id}
          title={card.title}
          preview={card.preview}
          previewSubline={card.previewSubline}
          isDark={isDark}
          isMobile={isMobile}
          cardStyle={cardStyle}
          hoverHandlers={hoverHandlers}
          defaultExpanded={Boolean(card.defaultExpanded)}
        >
          {card.detail}
        </PipelineCard>
      ))}
    </div>
  );
}
