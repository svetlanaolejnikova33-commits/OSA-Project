function rgbToHex(r, g, b) {
  const toHex = (channel) => channel.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function relativeLuminance(r, g, b) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

function quantizeChannel(value) {
  return Math.min(255, (value >> 3) << 3);
}

function isNearWhite(r, g, b) {
  const lum = relativeLuminance(r, g, b);
  const sat = saturation(r, g, b);
  return lum > 0.92 && sat < 0.08;
}

function isGlarePixel(r, g, b) {
  const lum = relativeLuminance(r, g, b);
  const sat = saturation(r, g, b);
  return lum > 0.97 && sat < 0.05;
}

function brightnessLabel(luminance) {
  if (luminance < 0.28) return "тёмная";
  if (luminance > 0.72) return "светлая";
  return "средняя";
}

function contrastLabel(values) {
  if (!values.length) return "средний";
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length, 1);
  const spread = Math.sqrt(variance);
  if (spread < 0.12) return "низкий";
  if (spread > 0.24) return "высокий";
  return "средний";
}

function buildPaletteEntry(r, g, b) {
  return {
    hex: rgbToHex(r, g, b),
    labelRu: "",
  };
}

export function analyzeImageData(data, width, height) {
  if (!data || !width || !height) return null;

  const buckets = new Map();
  const luminances = [];
  let warmthSum = 0;
  let warmthCount = 0;
  let totalWeight = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 128) continue;

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    if (isGlarePixel(r, g, b)) continue;

    const lum = relativeLuminance(r, g, b);
    const sat = saturation(r, g, b);
    const qr = quantizeChannel(r);
    const qg = quantizeChannel(g);
    const qb = quantizeChannel(b);
    const key = `${qr},${qg},${qb}`;
    const weight = 1 + sat * 0.75;
    const bucket = buckets.get(key) || {
      r: qr,
      g: qg,
      b: qb,
      weight: 0,
      nearWhite: isNearWhite(qr, qg, qb),
    };
    bucket.weight += weight;
    buckets.set(key, bucket);

    totalWeight += weight;
    luminances.push(lum);
    warmthSum += (r - b) / 255;
    warmthCount += 1;
  }

  if (!buckets.size || totalWeight <= 0) return null;

  const ranked = [...buckets.values()]
    .map((bucket) => {
      const share = bucket.weight / totalWeight;
      let score = bucket.weight;
      if (bucket.nearWhite && share < 0.12) score *= 0.12;
      if (bucket.nearWhite && share < 0.05) score *= 0.05;
      return { ...bucket, share, score };
    })
    .sort((left, right) => right.score - left.score);

  const dominant = [];
  const usedKeys = new Set();

  for (const bucket of ranked) {
    if (dominant.length >= 5) break;
    if (bucket.nearWhite && bucket.share < 0.08) continue;
    const key = `${bucket.r},${bucket.g},${bucket.b}`;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    dominant.push(buildPaletteEntry(bucket.r, bucket.g, bucket.b));
  }

  if (!dominant.length) {
    const fallback = ranked[0];
    if (fallback) dominant.push(buildPaletteEntry(fallback.r, fallback.g, fallback.b));
  }

  const accents = [];
  for (const bucket of ranked) {
    if (accents.length >= 4) break;
    const key = `${bucket.r},${bucket.g},${bucket.b}`;
    if (usedKeys.has(key)) continue;
    const sat = saturation(bucket.r, bucket.g, bucket.b);
    const lum = relativeLuminance(bucket.r, bucket.g, bucket.b);
    if (sat < 0.18) continue;
    if (lum > 0.95 && sat < 0.12) continue;
    usedKeys.add(key);
    accents.push(buildPaletteEntry(bucket.r, bucket.g, bucket.b));
  }

  const averageWarmth =
    warmthCount > 0
      ? warmthSum / warmthCount > 0.08
        ? "теплая"
        : warmthSum / warmthCount < -0.08
          ? "холодная"
          : "нейтральная"
      : "нейтральная";
  const averageBrightness = brightnessLabel(
    luminances.reduce((sum, value) => sum + value, 0) / Math.max(luminances.length, 1)
  );
  const contrastLevel = contrastLabel(luminances);

  return {
    dominant,
    accents,
    averageWarmth,
    averageBrightness,
    contrastLevel,
    source: "extracted",
  };
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode image for palette extraction."));
    image.src = dataUrl;
  });
}

export async function extractImagePalette(imageBase64, mimeType = "image/jpeg") {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const raw = typeof imageBase64 === "string" ? imageBase64.trim() : "";
  if (!raw) return null;

  const dataUrl = raw.startsWith("data:")
    ? raw
    : `data:${mimeType || "image/jpeg"};base64,${raw}`;

  try {
    const image = await loadImage(dataUrl);
    const maxSide = 160;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height, 1));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    return analyzeImageData(imageData.data, width, height);
  } catch {
    return null;
  }
}
