"use client";

import { useState } from "react";

const EXAMPLE_LINE =
  "Например: сделать интерьер теплее • заменить светильник • подобрать более бюджетные материалы • добавить больше дерева";

/**
 * Single user-facing entry point for concept iteration.
 * Internal prompt pipeline is triggered via onSubmitIntent only.
 */
export function ConceptIntentSection({
  theme,
  text,
  isMobile = false,
  isProcessing = false,
  feedbackError = "",
  feedbackSuccess = "",
  onSubmitIntent,
  onAnalyzeResult,
  resultVisualId = "",
}) {
  const [intent, setIntent] = useState("");

  const handleSubmit = () => {
    const value = intent.trim();
    if (!value || isProcessing) return;
    onSubmitIntent?.(value);
  };

  const graphiteBorder = theme.border || "rgba(0,0,0,0.06)";
  const inputBg = theme.inputBackground || (isMobile ? "transparent" : "rgba(255,255,255,0.04)");

  return (
    <section
      aria-label="Изменение концепции"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        marginTop: isMobile ? "16px" : "8px",
        padding: isMobile ? "16px 0 0 0" : "20px 0 8px 0",
        borderTop: `1px solid ${graphiteBorder}`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: isMobile ? "12px" : "14px",
          width: "100%",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: isMobile ? "15px" : "16px",
            fontWeight: 600,
            lineHeight: 1.3,
            color: "inherit",
            textAlign: "left",
          }}
        >
          Что вы хотите изменить?
        </h3>
        <button
          type="button"
          disabled
          title="Голосовой ввод — скоро"
          aria-label="Голосовой ввод — скоро"
          style={{
            flexShrink: 0,
            width: isMobile ? "32px" : "34px",
            height: isMobile ? "32px" : "34px",
            borderRadius: "999px",
            border: `1px solid ${graphiteBorder}`,
            background: "transparent",
            color: theme.textSecondary,
            opacity: 0.42,
            cursor: "not-allowed",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="7.5" />
            <path d="M12 9v6M9.5 10.5v3M14.5 10.5v3" />
          </svg>
        </button>
      </div>

      <textarea
        value={intent}
        onChange={(event) => setIntent(event.target.value)}
        placeholder="Опишите желаемое изменение своими словами"
        rows={isMobile ? 4 : 5}
        disabled={isProcessing}
        style={{
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          minHeight: isMobile ? "112px" : "132px",
          padding: isMobile ? "14px 14px" : "16px 18px",
          borderRadius: isMobile ? "14px" : "16px",
          border: `1px solid ${graphiteBorder}`,
          background: inputBg,
          color: "inherit",
          font: "inherit",
          fontSize: isMobile ? "15px" : "15px",
          lineHeight: 1.55,
          textAlign: "left",
          outline: "none",
        }}
      />

      <p
        style={{
          margin: isMobile ? "10px 0 0 0" : "12px 0 0 0",
          fontSize: isMobile ? "12px" : "13px",
          lineHeight: 1.5,
          color: theme.textSecondary,
          textAlign: "left",
        }}
      >
        {EXAMPLE_LINE}
      </p>

      <div style={{ marginTop: isMobile ? "16px" : "18px", width: "100%" }}>
        <button
          type="button"
          className="osa-primary-button"
          onClick={handleSubmit}
          disabled={!intent.trim() || isProcessing}
          style={{
            width: "100%",
            padding: isMobile ? "14px 20px" : "15px 24px",
            borderRadius: "14px",
            border: "none",
            font: "inherit",
            fontSize: isMobile ? "15px" : "15px",
            fontWeight: 600,
            cursor: !intent.trim() || isProcessing ? "default" : "pointer",
            opacity: !intent.trim() || isProcessing ? 0.55 : 1,
            background: theme.accentBackground || "rgba(183,157,138,0.22)",
            color: "inherit",
          }}
        >
          {isProcessing ? "Обновляем концепцию…" : "Обновить концепцию"}
        </button>

        {feedbackSuccess ? (
          <p style={{ ...text, marginTop: "10px", fontSize: "13px", color: theme.textSecondary, textAlign: "left" }}>
            {feedbackSuccess}
          </p>
        ) : null}
      </div>

      {feedbackError ? (
        <div
          style={{
            ...text,
            marginTop: "10px",
            fontSize: "13px",
            lineHeight: 1.45,
            color: theme.dangerText || "#b42318",
            textAlign: "left",
          }}
        >
          {feedbackError}
        </div>
      ) : null}

      {resultVisualId ? (
        <div style={{ marginTop: "12px", textAlign: "left" }}>
          <button
            type="button"
            onClick={() => onAnalyzeResult?.(resultVisualId)}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border: `1px solid ${graphiteBorder}`,
              background: "transparent",
              color: "inherit",
              font: "inherit",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Открыть новую версию
          </button>
        </div>
      ) : null}
    </section>
  );
}
