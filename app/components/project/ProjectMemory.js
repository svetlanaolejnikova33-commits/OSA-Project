"use client";

import { useEffect, useState } from "react";
import { getImageFromDB, isIndexedDbAvailable } from "../../lib/imageStore";
import { getAnalysisModeStates } from "../../lib/projectWorkspaceModel";

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ModeBadges({ states, isDark }) {
  const entries = [
    ["QUICK", states.quick],
    ["PRO", states.pro],
    ["SPEC", states.spec],
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
      {entries.map(([label, done]) => (
        <span
          key={label}
          style={{
            padding: "4px 8px",
            borderRadius: "999px",
            fontSize: "10px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            border: done
              ? "1px solid rgba(183,157,138,0.42)"
              : isDark
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(0,0,0,0.06)",
            background: done
              ? isDark
                ? "rgba(183,157,138,0.16)"
                : "rgba(183,157,138,0.12)"
              : isDark
                ? "rgba(255,255,255,0.03)"
                : "rgba(255,255,255,0.55)",
            color: done
              ? isDark
                ? "rgba(243,238,231,0.9)"
                : "rgba(43,43,43,0.9)"
              : isDark
                ? "rgba(243,238,231,0.45)"
                : "rgba(110,106,102,0.65)",
          }}
        >
          {label} {done ? "✓" : "—"}
        </span>
      ))}
    </div>
  );
}

function SavedAnalysisRow({ row, active, isDark, isMobile, previewUrl, onOpen }) {
  const draft = row?.semanticDraft || null;
  const states = getAnalysisModeStates(draft);
  const title = row?.sourceImageName || row?.title || draft?.quickAnalysis?.spaceType?.labelRu || "Сцена";
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        width: "100%",
        padding: isMobile ? "10px" : "12px",
        marginBottom: "8px",
        borderRadius: "16px",
        border: active
          ? "1px solid rgba(183,157,138,0.45)"
          : isDark
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(0,0,0,0.04)",
        background: active
          ? isDark
            ? "linear-gradient(145deg,rgba(183,157,138,0.18),rgba(183,157,138,0.06))"
            : "linear-gradient(145deg, rgba(183,157,138,0.16), rgba(214,197,180,0.10))"
          : isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.45)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: isMobile ? "44px" : "52px",
          height: isMobile ? "44px" : "52px",
          borderRadius: "12px",
          overflow: "hidden",
          flexShrink: 0,
          background: isDark ? "rgba(0,0,0,0.2)" : "rgba(239,231,220,0.45)",
        }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: isDark ? "rgba(243,238,231,0.45)" : "rgba(110,106,102,0.65)",
            }}
          >
            IMG
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: "4px",
            fontSize: "11px",
            color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.78)",
          }}
        >
          {formatTimestamp(row?.updatedAt || row?.createdAt)}
        </div>
        <ModeBadges states={states} isDark={isDark} />
        {Array.isArray(draft?.designMutations) || Array.isArray(draft?.generationPackages) ? (
          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              lineHeight: 1.45,
              color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
            }}
          >
            Mutations: {Array.isArray(draft?.designMutations) ? draft.designMutations.length : 0} · Packages:{" "}
            {Array.isArray(draft?.generationPackages) ? draft.generationPackages.length : 0}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "999px",
              fontSize: "10px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              border: "1px solid rgba(183,157,138,0.42)",
              background: isDark ? "rgba(183,157,138,0.16)" : "rgba(183,157,138,0.12)",
              color: isDark ? "rgba(243,238,231,0.9)" : "rgba(43,43,43,0.9)",
            }}
          >
            saved
          </span>
          <button
            type="button"
            onClick={() => onOpen?.(row)}
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
              color: "inherit",
              font: "inherit",
            }}
          >
            Открыть
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectMemory({
  savedRecords,
  activeSavedRecordId,
  activeSceneLabel,
  activeSceneTimestamp,
  activeSemanticDraft,
  isDark,
  isMobile = false,
  onOpenSavedRecord,
}) {
  const [previewMap, setPreviewMap] = useState({});

  useEffect(() => {
    if (!isIndexedDbAvailable() || !Array.isArray(savedRecords) || !savedRecords.length) {
      setPreviewMap({});
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const next = {};
      for (const row of savedRecords.slice(0, 12)) {
        const imageId = typeof row?.sourceImageId === "string" ? row.sourceImageId : "";
        const mimeType =
          typeof row?.sourceImageMimeType === "string" ? row.sourceImageMimeType : "image/png";
        if (!imageId) continue;
        try {
          const base64 = await getImageFromDB(imageId);
          if (cancelled || !base64) continue;
          next[row.id] = `data:${mimeType};base64,${base64}`;
        } catch {
          // ignore preview failures
        }
      }
      if (!cancelled) setPreviewMap(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [savedRecords]);

  return (
    <div>
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 600,
          margin: "0 0 14px 2px",
          color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
        }}
      >
        Project Memory
      </div>

      <div
        style={{
          padding: "12px",
          borderRadius: "16px",
          marginBottom: "14px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.04)",
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
        }}
      >
        <div style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
          Active scene
        </div>
        <div style={{ marginTop: "6px", fontSize: "14px", fontWeight: 600, lineHeight: 1.4 }}>
          {activeSceneLabel || "Сцена не выбрана"}
        </div>
        <div
          style={{
            marginTop: "4px",
            fontSize: "12px",
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          {formatTimestamp(activeSceneTimestamp)}
        </div>
        <ModeBadges states={getAnalysisModeStates(activeSemanticDraft)} isDark={isDark} />
      </div>

      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 600,
          margin: "0 0 10px 2px",
          color: isDark ? "rgba(243,238,231,0.55)" : "rgba(110,106,102,0.85)",
        }}
      >
        Сохранённые анализы
      </div>

      {Array.isArray(savedRecords) && savedRecords.length ? (
        <div style={{ maxHeight: isMobile ? "none" : "min(58vh, 560px)", overflowY: isMobile ? "visible" : "auto", paddingRight: "4px" }}>
          {savedRecords.map((row) => (
            <SavedAnalysisRow
              key={row.id}
              row={row}
              active={row.id === activeSavedRecordId}
              isDark={isDark}
              isMobile={isMobile}
              previewUrl={previewMap[row.id]}
              onOpen={onOpenSavedRecord}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: "13px",
            lineHeight: 1.5,
            color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
          }}
        >
          Сохраните анализ сцены, чтобы он появился в памяти проекта.
        </div>
      )}
    </div>
  );
}
