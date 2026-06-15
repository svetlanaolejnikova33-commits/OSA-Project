"use client";

/**
 * Platform hero — visible on all main workspace screens.
 * `integrated` renders hero as the top zone of the central workspace canvas (desktop).
 * `compact` reduces height when a project session is active.
 */
export function PlatformHeroBanner({
  isDark,
  isMobile,
  visible,
  compact = false,
  integrated = false,
  workspaceNarrow = false,
  lightAmbientHeroOverlay = "",
  onSetTheme,
}) {
  const heroSectionStyle = {
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    margin: integrated ? "0" : "0 auto",
    marginTop: compact ? "0" : integrated ? "0" : isMobile ? "0" : "clamp(4px, 1.2vw, 12px)",
    marginBottom: compact ? (isMobile ? "6px" : "8px") : integrated ? "0" : isMobile ? "10px" : "18px",
    padding: compact
      ? isMobile
        ? "8px 4px 10px 4px"
        : "8px 6px 10px 6px"
      : integrated
        ? isMobile
          ? "8px 12px 22px 12px"
          : "28px 28px 44px 28px"
        : isMobile
          ? "8px 12px 22px 12px"
          : "16px 16px 36px 16px",
    boxSizing: "border-box",
    textAlign: "center",
    animation: undefined,
    background: "transparent",
    borderBottom: integrated && !compact && !isMobile
      ? isDark
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(0,0,0,0.06)"
      : undefined,
  };

  const logoSize = compact
    ? isMobile
      ? "clamp(32px, 9vw, 40px)"
      : "clamp(36px, 3.5vw, 44px)"
    : isMobile
      ? "clamp(44px, 13vw, 56px)"
      : workspaceNarrow
        ? "clamp(76px, 9.5vw, 96px)"
        : integrated
          ? "clamp(120px, 12vw, 154px)"
          : "clamp(80px, 8.5vw, 100px)";

  const titleStyle = {
    fontSize: compact
      ? isMobile
        ? "clamp(1rem, 4.2vw, 1.12rem)"
        : "clamp(1.05rem, 1.8vw, 1.25rem)"
      : isMobile
        ? "clamp(1.25rem, 5vw, 1.6rem)"
        : integrated
          ? "clamp(2.45rem, 4.4vw, 3.35rem)"
          : "clamp(1.65rem, 3vw, 2.2rem)",
    lineHeight: 1.16,
    fontWeight: isDark ? "600" : "650",
    letterSpacing: "-0.015em",
    margin: compact ? "4px 0 0 0" : isMobile ? "0 0 10px 0" : "0 0 12px 0",
    position: "relative",
    zIndex: 1,
    color: isDark ? "#FAFAF8" : "#2B2B2B",
    textShadow: "none",
  };

  const textStyle = {
    maxWidth: compact ? "560px" : isMobile ? "640px" : "640px",
    margin: compact ? "2px auto 0 auto" : isMobile ? "0 auto 12px auto" : "0 auto 16px auto",
    fontSize: compact ? "11px" : isMobile ? "0.8125rem" : integrated ? "16px" : "15px",
    lineHeight: 1.45,
    letterSpacing: compact ? "0.02em" : "0.015em",
    color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)",
    position: "relative",
    zIndex: 1,
  };

  const badgeStyle = {
    display: compact ? "none" : "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    padding: "4px 10px",
    borderRadius: "999px",
    marginBottom: isMobile ? "8px" : integrated ? "12px" : "10px",
    fontSize: "10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.35)",
    border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)",
    color: isDark ? "rgba(243,238,231,0.58)" : "rgba(110,106,102,0.78)",
    position: "relative",
    zIndex: 1,
  };

  const glowStyle = compact
    ? { display: "none" }
    : {
        position: "absolute",
        left: "50%",
        top: "42%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "min(180px, 58vw)" : integrated ? "min(520px, 80vw)" : "min(480px, 72vw)",
        height: isMobile ? "min(180px, 58vw)" : integrated ? "min(520px, 80vw)" : "min(480px, 72vw)",
        borderRadius: "50%",
        background: isDark
          ? "radial-gradient(circle at center, rgba(255,255,255,0.04) 0%, transparent 72%)"
          : `${lightAmbientHeroOverlay}radial-gradient(circle at center, rgba(255,255,255,0.55) 0%, transparent 72%)`,
        filter: "blur(36px)",
        pointerEvents: "none",
        zIndex: 0,
        opacity: visible ? 0.9 : 0,
        transition: "opacity 1s ease",
      };

  const themeTabsWrapperStyle = {
    display: "inline-flex",
    gap: "2px",
    marginTop: compact ? "8px" : isMobile ? "12px" : integrated ? "16px" : "14px",
    padding: "2px",
    borderRadius: "10px",
    background: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.28)",
    border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    position: "relative",
    zIndex: 1,
  };

  const getThemeTabStyle = (active) => ({
    border: "none",
    borderRadius: "8px",
    padding: isMobile ? "5px 11px" : "4px 12px",
    fontSize: "11px",
    lineHeight: 1.2,
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
    font: "inherit",
    color: active
      ? isDark
        ? "rgba(243,238,231,0.88)"
        : "#2B2B2B"
      : isDark
        ? "rgba(243,238,231,0.45)"
        : "rgba(110,106,102,0.65)",
    background: active
      ? isDark
        ? "rgba(183,157,138,0.12)"
        : "rgba(183,157,138,0.10)"
      : "transparent",
    transition: "background 0.2s ease, color 0.2s ease",
  });

  return (
    <div className="osa-hero-section" style={heroSectionStyle}>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: compact ? "6px" : "0",
          width: "100%",
          zIndex: 1,
        }}
      >
        <div style={glowStyle} aria-hidden />
        <img
          src="/logo.png"
          alt="OSA"
          style={{
            width: logoSize,
            height: "auto",
            position: "relative",
            zIndex: 2,
            opacity: visible ? 0.94 : 0,
            transform: visible ? "scale(1)" : "scale(0.96)",
            transition: "opacity 0.9s ease, transform 1s ease",
            display: "block",
            filter: isDark
              ? "drop-shadow(0 6px 14px rgba(0,0,0,0.35))"
              : "drop-shadow(0 4px 12px rgba(43,43,43,0.08))",
          }}
        />
        <div style={{ minWidth: 0 }}>
          {!compact ? (
            <div style={badgeStyle}>
              <span>OSA</span>
              <span aria-hidden="true">•</span>
              <span>Interior AI</span>
            </div>
          ) : null}
          <h1 className="osa-hero-title" style={titleStyle}>
            Поддержка вашего проекта
          </h1>
          <p className="osa-hero-subtitle" style={textStyle}>
            Концепция ↔ Комплектация ↔ Смета
          </p>
        </div>
      </div>

      <div
        className="osa-hero-theme-row"
        style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 1 }}
        role="group"
        aria-label="Тема интерфейса"
      >
        <div style={themeTabsWrapperStyle}>
          <button
            type="button"
            style={getThemeTabStyle(!isDark)}
            aria-pressed={!isDark}
            onClick={() => onSetTheme?.("light")}
          >
            Светлая
          </button>
          <button
            type="button"
            style={getThemeTabStyle(isDark)}
            aria-pressed={isDark}
            onClick={() => onSetTheme?.("dark")}
          >
            Тёмная
          </button>
        </div>
      </div>
    </div>
  );
}
