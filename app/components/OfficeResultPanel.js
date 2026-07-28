/**
 * Additive Office result surface for Slice 1.
 * Renders Spec Assembler / Designer Summary output only — no discovery, basket, or estimate store.
 */

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function panelStyle(isDark, isMobile) {
  return {
    width: "100%",
    boxSizing: "border-box",
    marginBottom: isMobile ? 14 : 18,
    padding: isMobile ? "14px 14px 16px" : "16px 18px 18px",
    borderRadius: 16,
    border: isDark ? "1px solid rgba(243,238,231,0.14)" : "1px solid rgba(40,36,32,0.12)",
    background: isDark ? "rgba(28,26,24,0.72)" : "rgba(255,255,255,0.86)",
  };
}

function titleStyle(isDark) {
  return {
    margin: "0 0 8px",
    fontSize: 13,
    fontWeight: 650,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    color: isDark ? "rgba(243,238,231,0.72)" : "rgba(70,66,62,0.78)",
  };
}

function bodyStyle(isDark) {
  return {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.45,
    color: isDark ? "rgba(243,238,231,0.92)" : "rgba(40,36,32,0.9)",
    whiteSpace: "pre-wrap",
  };
}

function metaStyle(isDark) {
  return {
    margin: "10px 0 0",
    fontSize: 13,
    lineHeight: 1.4,
    color: isDark ? "rgba(243,238,231,0.7)" : "rgba(70,66,62,0.78)",
  };
}

function Field({ label, value, isDark }) {
  const text = asString(value);
  if (!text) return null;
  return (
    <div style={metaStyle(isDark)}>
      <strong style={{ fontWeight: 600 }}>{label}:</strong> {text}
    </div>
  );
}

/**
 * @param {{
 *   result?: object | null,
 *   loading?: boolean,
 *   error?: string,
 *   isDark?: boolean,
 *   isMobile?: boolean,
 * }} props
 */
export function OfficeResultPanel({
  result = null,
  loading = false,
  error = "",
  isDark = false,
  isMobile = false,
}) {
  if (!loading && !error && !result) return null;

  const status = asString(result?.status);
  const evidence = result?.evidence && typeof result.evidence === "object" ? result.evidence : null;
  const evidenceCandidates = Array.isArray(evidence?.candidates) ? evidence.candidates : [];
  const summaryText =
    asString(result?.DesignerSummary?.text) ||
    (Array.isArray(result?.DesignerSummary?.lines)
      ? result.DesignerSummary.lines.filter(Boolean).join("\n")
      : "");
  const product = result?.product && typeof result.product === "object" ? result.product : {};
  const specification =
    result?.specification && typeof result.specification === "object" ? result.specification : {};
  const estimateLine =
    result?.estimate?.line && typeof result.estimate.line === "object" ? result.estimate.line : null;

  const manufacturer =
    asString(specification.manufacturer) ||
    asString(result?.manufacturer?.brandName) ||
    asString(product.manufacturer);
  const article = asString(specification.article) || asString(product.article);
  const url = asString(specification.url) || asString(product.url);
  const priceRaw = specification.price ?? product.price ?? estimateLine?.price;
  const currency =
    asString(specification.currency) || asString(product.currency) || asString(estimateLine?.currency);
  const priceMissing =
    Array.isArray(result?.missing_fields) && result.missing_fields.includes("price");
  const hasPrice =
    priceRaw !== "" &&
    priceRaw != null &&
    Number.isFinite(Number(priceRaw)) &&
    !priceMissing;
  const priceLabel = hasPrice
    ? `${Number(priceRaw)}${currency ? ` ${currency}` : ""}`
    : article
      ? "не указана в источнике"
      : "";

  return (
    <section
      className="osa-office-result-panel"
      aria-label="OSA Office result"
      style={panelStyle(isDark, isMobile)}
    >
      <h3 style={titleStyle(isDark)}>OSA Office</h3>

      {loading ? (
        <p style={bodyStyle(isDark)}>Идёт поиск официального продукта…</p>
      ) : null}

      {!loading && error ? (
        <p style={bodyStyle(isDark)}>{error}</p>
      ) : null}

      {!loading && !error && status === "needs_human" ? (
        <>
          <p style={bodyStyle(isDark)}>
            {asString(result?.reason) || "Требуется решение человека."}
          </p>
          {summaryText ? <p style={{ ...bodyStyle(isDark), marginTop: 10 }}>{summaryText}</p> : null}
          <Field label="HITL" value={asString(result?.hitl)} isDark={isDark} />
          <Field label="Manufacturer" value={manufacturer} isDark={isDark} />
          <Field label="Article" value={article || null} isDark={isDark} />
          {!article ? (
            <p style={metaStyle(isDark)}>Артикул не подтверждён — значение не подставляется.</p>
          ) : null}
          {evidenceCandidates.length ? (
            <div style={{ marginTop: 10 }}>
              <p style={metaStyle(isDark)}>Evidence candidates (не истина):</p>
              {evidenceCandidates.slice(0, 7).map((cand) => (
                <p key={cand.manufacturer_id || cand.manufacturer_name} style={metaStyle(isDark)}>
                  {asString(cand.manufacturer_name) || asString(cand.manufacturer_id)} ·{" "}
                  {Math.round(Number(cand.confidence) * 100) || 0}% · {asString(cand.source)}
                </p>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {!loading && !error && status === "ok" ? (
        <>
          {summaryText ? <p style={bodyStyle(isDark)}>{summaryText}</p> : null}
          <Field label="Manufacturer" value={manufacturer} isDark={isDark} />
          <Field label="Article" value={article} isDark={isDark} />
          <Field label="URL" value={url} isDark={isDark} />
          <Field label="Price" value={priceLabel} isDark={isDark} />
          {estimateLine ? (
            <Field
              label="Estimate"
              value={`${asString(estimateLine.article) || article || "—"} · qty ${
                estimateLine.quantity ?? 1
              } ${asString(estimateLine.unit) || "pcs"} · ${
                Number.isFinite(Number(estimateLine.line_total))
                  ? estimateLine.line_total
                  : "—"
              }${currency ? ` ${currency}` : ""}`}
              isDark={isDark}
            />
          ) : null}
        </>
      ) : null}

      {!loading && !error && result && status && status !== "ok" && status !== "needs_human" ? (
        <p style={bodyStyle(isDark)}>
          {summaryText || asString(result?.reason) || `Статус: ${status}`}
        </p>
      ) : null}
    </section>
  );
}
