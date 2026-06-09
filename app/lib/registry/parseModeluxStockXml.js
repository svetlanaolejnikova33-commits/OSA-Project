function parsePrice(raw) {
  const value = String(raw || "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function readTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function matchesKeywords(text, keywords) {
  const hay = String(text || "").toLowerCase();
  if (!hay) return false;
  return keywords.some((keyword) => hay.includes(String(keyword).toLowerCase()));
}

/**
 * Parse Modelux stock.xml and return up to `limit` matching items (on-demand, no full catalog store).
 */
export function parseModeluxStockXml(xmlText, { keywords = [], limit = 5 } = {}) {
  const text = String(xmlText || "");
  if (!text.trim()) return [];

  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match = itemRe.exec(text);

  while (match && items.length < limit) {
    const block = match[1];
    const productName = readTag(block, "item_name");
    if (!matchesKeywords(productName, keywords)) {
      match = itemRe.exec(text);
      continue;
    }

    const article = readTag(block, "article");
    const unitPrice = parsePrice(readTag(block, "price"));
    const stock = readTag(block, "stock");

    if (article && productName && unitPrice !== null) {
      items.push({
        article,
        productName,
        unitPrice,
        stock: stock || "",
      });
    }

    match = itemRe.exec(text);
  }

  return items;
}
