import { buildOfficeResultViewModel } from "../lib/office/buildOfficeResultViewModel";

const palette = (isDark) => ({
  text: isDark ? "#f3eee7" : "#292521",
  muted: isDark ? "rgba(243,238,231,.68)" : "rgba(41,37,33,.65)",
  border: isDark ? "rgba(243,238,231,.14)" : "rgba(41,37,33,.12)",
  surface: isDark ? "rgba(28,26,24,.78)" : "rgba(255,255,255,.9)",
  soft: isDark ? "rgba(255,255,255,.055)" : "rgba(41,37,33,.035)",
  success: isDark ? "#b9dcbe" : "#2f6d3b",
  warning: isDark ? "#f0cf91" : "#875f16",
});

function Card({ title, children, colors, style = {} }) {
  return (
    <section style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 14, ...style }}>
      <h4 style={{ margin: "0 0 12px", fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: colors.muted }}>
        {title}
      </h4>
      {children}
    </section>
  );
}

function Rows({ rows, colors }) {
  if (!rows.length) return <p style={{ margin: 0, color: colors.muted }}>Нет подтверждённых данных.</p>;
  return (
    <dl style={{ display: "grid", gridTemplateColumns: "minmax(110px, .7fr) minmax(0, 1.3fr)", gap: "8px 14px", margin: 0 }}>
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} style={{ display: "contents" }}>
          <dt style={{ color: colors.muted }}>{row.label}</dt>
          <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function money(value, currency) {
  return value == null ? "Не указана в источнике" : `${value}${currency ? ` ${currency}` : ""}`;
}

function ProductCard({ view, colors, isMobile }) {
  const product = view.productCard;
  return (
    <Card title="Подтверждённый товар" colors={colors}>
      <div style={{ display: "grid", gridTemplateColumns: product.image && !isMobile ? "112px minmax(0, 1fr)" : "1fr", gap: 16 }}>
        {product.image ? (
          <img src={product.image} alt={product.name || product.article || "Товар"} style={{ width: "100%", maxHeight: 150, objectFit: "contain", borderRadius: 10, background: colors.soft }} />
        ) : null}
        <div>
          <div style={{ color: colors.success, fontWeight: 700, marginBottom: 8 }}>✓ Официально проверен CCN + G3</div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{product.name || product.article}</div>
          <div style={{ marginTop: 8 }}>{product.manufacturer}</div>
          <div style={{ marginTop: 4, color: colors.muted }}>Артикул: {product.article}</div>
          {product.confidence ? <div style={{ marginTop: 4, color: colors.muted }}>Уверенность: {product.confidence}</div> : null}
          {product.url ? <a href={product.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, color: "inherit" }}>Открыть официальный источник ↗</a> : null}
        </div>
      </div>
    </Card>
  );
}

function NeedsHuman({ view, colors }) {
  return (
    <Card title="Требуется проверка" colors={colors}>
      <div style={{ color: colors.warning, fontWeight: 700 }}>Товар не подтверждён</div>
      <p style={{ margin: "8px 0 0", lineHeight: 1.5 }}>{view.reason || "Нужна проверка пользователя."}</p>
      {view.hitl ? <p style={{ margin: "8px 0 0", color: colors.muted }}>Сценарий: {view.hitl}</p> : null}
      {view.summaryLines.map((line) => <p key={line} style={{ margin: "6px 0 0", lineHeight: 1.45 }}>{line}</p>)}
      {view.missingFields.length ? <p style={{ margin: "8px 0 0", color: colors.muted }}>Не хватает данных: {view.missingFields.join(", ")}</p> : null}
      {view.candidates.length ? (
        <div style={{ marginTop: 14 }}>
          <strong>Неподтверждённые кандидаты</strong>
          {view.candidates.slice(0, 7).map((candidate) => (
            <div key={candidate.id} style={{ marginTop: 8, padding: 10, borderRadius: 10, background: colors.soft }}>
              <div>{candidate.manufacturer}{candidate.article ? ` · ${candidate.article}` : ""}</div>
              <div style={{ marginTop: 3, fontSize: 13, color: colors.muted }}>
                {[candidate.confidence, candidate.source].filter(Boolean).join(" · ") || "Требует официальной проверки"}
              </div>
              {candidate.url ? <a href={candidate.url} target="_blank" rel="noreferrer" style={{ color: "inherit", fontSize: 13 }}>Посмотреть evidence ↗</a> : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function OfficeResultPanel({ result = null, loading = false, error = "", isDark = false, isMobile = false }) {
  if (!loading && !error && !result) return null;
  const colors = palette(isDark);
  const view = buildOfficeResultViewModel(result);
  const textStyle = { margin: 0, lineHeight: 1.5 };

  return (
    <section aria-label="OSA Office result" style={{ width: "100%", boxSizing: "border-box", marginBottom: isMobile ? 14 : 18, padding: isMobile ? 14 : 18, borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 14, letterSpacing: ".04em" }}>OSA Office</h3>
      {loading ? <p style={textStyle}>Идёт подготовка результата…</p> : null}
      {!loading && error ? <p role="alert" style={textStyle}>{error}</p> : null}
      {!loading && !error && view.kind === "needs_human" ? <NeedsHuman view={view} colors={colors} /> : null}
      {!loading && !error && view.kind === "unknown" ? <p style={textStyle}>{view.reason || `Статус: ${view.status || "неизвестен"}`}</p> : null}
      {!loading && !error && view.kind === "validated" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <ProductCard view={view} colors={colors} isMobile={isMobile} />
          <Card title="Спецификация" colors={colors}>
            <Rows rows={view.specification.rows} colors={colors} />
            {view.missingFields.length ? <p style={{ margin: "10px 0 0", color: colors.muted }}>Нет данных: {view.missingFields.join(", ")}</p> : null}
            {view.specification.dimensions.length ? <><h5 style={{ margin: "14px 0 8px" }}>Размеры</h5><Rows rows={view.specification.dimensions} colors={colors} /></> : null}
            {view.specification.technical.length ? <><h5 style={{ margin: "14px 0 8px" }}>Технические характеристики</h5><Rows rows={view.specification.technical} colors={colors} /></> : null}
          </Card>
          <Card title="Смета" colors={colors}>
            {view.estimate ? <Rows colors={colors} rows={[
              { label: "Артикул", value: view.estimate.article },
              { label: "Количество", value: `${view.estimate.quantity} ${view.estimate.unit}` },
              { label: "Цена", value: money(view.estimate.price, view.estimate.currency) },
              { label: "Сумма", value: money(view.estimate.lineTotal, view.estimate.currency) },
            ]} /> : <p style={{ margin: 0, color: colors.muted }}>Строка сметы не создана.</p>}
          </Card>
          <Card title="Резюме для дизайнера" colors={colors}>
            {view.summaryLines.length ? view.summaryLines.map((line) => <p key={line} style={{ margin: "4px 0", lineHeight: 1.45 }}>{line}</p>) : <p style={{ margin: 0, color: colors.muted }}>Резюме отсутствует.</p>}
          </Card>
        </div>
      ) : null}
    </section>
  );
}
