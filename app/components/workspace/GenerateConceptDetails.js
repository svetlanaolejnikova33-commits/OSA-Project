"use client";

export function GenerateConceptDetails({
  resultData,
  isDark,
  isMobile,
  isGenerateResultVisible,
  aiFieldsGridStyle,
  aiFieldCardGenerateStyle,
  aiFieldLabelStyle,
  aiFieldValueStyle,
  aiChipGenerateStyle,
  aiChipsContainerStyle,
  conceptSectionsGridStyle,
  conceptSectionCardStyle,
  conceptSectionTitleStyle,
  generateRevealStyle,
}) {
  if (!resultData) {
    return (
      <div style={{ color: isDark ? "rgba(243,238,231,0.62)" : "rgba(110,106,102,0.82)" }}>
        Подробный разбор появится после генерации концепции.
      </div>
    );
  }

  return (
    <div
      className="osa-ai-fields-grid"
      style={{ ...aiFieldsGridStyle, ...generateRevealStyle(isGenerateResultVisible) }}
    >
      <div style={{ ...aiFieldCardGenerateStyle, gridColumn: "1 / -1" }}>
        <div style={aiFieldLabelStyle}>Название концепции</div>
        <div style={aiFieldValueStyle}>{resultData.title}</div>
      </div>
      <div style={aiFieldCardGenerateStyle}>
        <div style={aiFieldLabelStyle}>Стиль</div>
        <div style={aiFieldValueStyle}>{resultData.style}</div>
      </div>
      <div style={aiFieldCardGenerateStyle}>
        <div style={aiFieldLabelStyle}>Палитра</div>
        <div style={aiChipsContainerStyle}>
          <span style={aiChipGenerateStyle}>{resultData.palette.base}</span>
          <span style={aiChipGenerateStyle}>{resultData.palette.accent}</span>
          <span style={aiChipGenerateStyle}>{resultData.palette.contrast}</span>
        </div>
      </div>
      <div style={aiFieldCardGenerateStyle}>
        <div style={aiFieldLabelStyle}>Материалы</div>
        <div style={aiChipsContainerStyle}>
          {resultData.materials.map((m) => (
            <span key={m} style={aiChipGenerateStyle}>
              {m}
            </span>
          ))}
        </div>
      </div>
      <div style={aiFieldCardGenerateStyle}>
        <div style={aiFieldLabelStyle}>Настроение</div>
        <div style={aiFieldValueStyle}>{resultData.mood}</div>
      </div>
      <div style={{ ...aiFieldCardGenerateStyle, gridColumn: "1 / -1" }}>
        <div style={aiFieldLabelStyle}>Концепция</div>
        <div className="osa-concept-grid" style={conceptSectionsGridStyle}>
          <div style={conceptSectionCardStyle}>
            <div style={conceptSectionTitleStyle}>Планировка</div>
            <div style={aiFieldValueStyle}>{resultData.concept.planning}</div>
          </div>
          <div style={conceptSectionCardStyle}>
            <div style={conceptSectionTitleStyle}>Свет</div>
            <div style={aiFieldValueStyle}>{resultData.concept.lighting}</div>
          </div>
          <div style={conceptSectionCardStyle}>
            <div style={conceptSectionTitleStyle}>Материалы</div>
            <div style={aiFieldValueStyle}>{resultData.concept.materials}</div>
          </div>
          <div style={conceptSectionCardStyle}>
            <div style={conceptSectionTitleStyle}>Акценты</div>
            <div style={aiFieldValueStyle}>{resultData.concept.accents}</div>
          </div>
          <div style={conceptSectionCardStyle}>
            <div style={conceptSectionTitleStyle}>Хранение</div>
            <div style={aiFieldValueStyle}>{resultData.concept.storage}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
