'use client';

function Chips({ items, chipStyle }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {items.map((x) => (
        <span key={String(x)} style={chipStyle}>
          {x}
        </span>
      ))}
    </div>
  );
}

export function SemanticAnalysisCards({
  result,
  revealStyle,
  cardStyle,
  labelStyle,
  valueStyle,
  chipStyle,
}) {
  if (!result) return null;
  return (
    <div style={{ ...revealStyle, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '12px' }}>
      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <div style={labelStyle}>STYLE</div>
        <div style={{ ...valueStyle, fontSize: '16px' }}>{result.style}</div>
      </div>

      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <div style={labelStyle}>MATERIALS</div>
        <Chips items={result.materials} chipStyle={chipStyle} />
      </div>

      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <div style={labelStyle}>PALETTE</div>
        <Chips items={result.palette} chipStyle={chipStyle} />
      </div>

      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <div style={labelStyle}>OBJECTS</div>
        <Chips items={result.objects} chipStyle={chipStyle} />
      </div>

      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <div style={labelStyle}>ATMOSPHERE</div>
        <div style={valueStyle}>{result.atmosphere}</div>
      </div>
    </div>
  );
}

