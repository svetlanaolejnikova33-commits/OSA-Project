'use client';

function hashStringToInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list[Math.floor(rng() * list.length)];
}

function pickMany(rng, list, count) {
  const src = Array.isArray(list) ? list.slice() : [];
  const out = [];
  while (src.length && out.length < count) {
    const i = Math.floor(rng() * src.length);
    out.push(src.splice(i, 1)[0]);
  }
  return out;
}

function moodHintToProfile(mood) {
  const m = (typeof mood === "string" ? mood : "").toLowerCase();
  if (!m) return "neutral";
  if (m.includes("japandi") || m.includes("zen") || m.includes("calm")) return "calm";
  if (m.includes("lux") || m.includes("тихий") || m.includes("premium")) return "lux";
  if (m.includes("scandi") || m.includes("nordic")) return "scandi";
  if (m.includes("bauhaus") || m.includes("arch")) return "architectural";
  if (m.includes("gallery") || m.includes("editorial")) return "editorial";
  return "neutral";
}

const STYLE_SETS = {
  calm: ["Japandi", "Contemporary Minimal", "Soft Bauhaus", "Scandinavian", "Wabi-soft"],
  lux: ["Quiet Luxury", "Contemporary Minimal", "Soft Modern", "Warm Minimal", "Italian Calm"],
  scandi: ["Scandinavian", "Nordic Minimal", "Soft Bauhaus", "Contemporary Minimal", "Japandi"],
  architectural: ["Soft Bauhaus", "Contemporary Minimal", "Architectural Minimal", "Gallery Modern", "Monolithic Warm"],
  editorial: ["Quiet Luxury", "Gallery Modern", "Soft Bauhaus", "Contemporary Minimal", "Parisian Minimal"],
  neutral: ["Contemporary Minimal", "Scandinavian", "Japandi", "Soft Bauhaus", "Quiet Luxury"],
};

const MATERIAL_SETS = {
  calm: ["travertine", "oak veneer", "microcement", "boucle textile", "smoked glass", "linen textile", "warm plaster"],
  lux: ["travertine", "walnut veneer", "matte black steel", "smoked glass", "brushed brass", "stone slab", "suede textile"],
  scandi: ["oak veneer", "birch veneer", "limewash paint", "boucle textile", "matte white lacquer", "linen textile", "blackened steel"],
  architectural: ["microcement", "matte black steel", "ribbed wall panels", "stone slab", "smoked glass", "oak veneer", "plaster"],
  editorial: ["travertine", "lacquered wood", "matte black steel", "smoked glass", "boucle textile", "bronze mirror", "stone beige plaster"],
  neutral: ["travertine", "oak veneer", "matte black steel", "boucle textile", "smoked glass"],
};

const PALETTE_SETS = {
  calm: ["warm ivory", "stone beige", "muted olive", "soft walnut", "graphite"],
  lux: ["warm ivory", "stone beige", "graphite", "soft walnut", "champagne"],
  scandi: ["warm ivory", "stone beige", "mist grey", "muted olive", "soft walnut"],
  architectural: ["warm ivory", "stone beige", "graphite", "charcoal", "muted olive"],
  editorial: ["warm ivory", "stone beige", "graphite", "muted olive", "dusty mauve"],
  neutral: ["warm ivory", "stone beige", "graphite", "muted olive", "soft walnut"],
};

const OBJECT_SETS = {
  calm: ["modular sofa", "wall panels", "pendant lights", "dining table", "track lighting", "low coffee table", "built-in cabinetry"],
  lux: ["modular sofa", "stone coffee table", "wall panels", "pendant lights", "dining table", "accent armchair", "gallery shelving"],
  scandi: ["modular sofa", "dining table", "pendant lights", "track lighting", "open shelving", "area rug", "sideboard"],
  architectural: ["wall panels", "track lighting", "linear pendant", "built-in cabinetry", "stone plinth table", "modular sofa", "glass partition"],
  editorial: ["modular sofa", "gallery wall", "pendant lights", "wall panels", "dining table", "sculptural chair", "track lighting"],
  neutral: ["modular sofa", "wall panels", "pendant lights", "dining table", "track lighting"],
};

const ATMOSPHERE_SETS = {
  calm: ["calm", "architectural", "gallery mood", "soft contrast", "quiet"],
  lux: ["editorial", "quiet luxury", "soft contrast", "gallery mood", "warm premium"],
  scandi: ["calm", "daylight", "soft contrast", "clean", "cozy minimal"],
  architectural: ["architectural", "gallery mood", "editorial", "precise", "soft contrast"],
  editorial: ["editorial", "gallery mood", "architectural", "soft contrast", "dramatic calm"],
  neutral: ["calm", "editorial", "architectural", "gallery mood", "soft contrast"],
};

/**
 * @param {{
 *  fileName: string,
 *  width: number,
 *  height: number,
 *  mood: string,
 *  projectKey: string,
 *  paletteFamily?: string
 * }} input
 */
export function runMockSemanticAnalysis(input) {
  const fileName = typeof input?.fileName === "string" ? input.fileName : "image";
  const width = Number.isFinite(input?.width) ? input.width : 0;
  const height = Number.isFinite(input?.height) ? input.height : 0;
  const mood = typeof input?.mood === "string" ? input.mood : "";
  const projectKey = typeof input?.projectKey === "string" ? input.projectKey : "";
  const seedBase = `${projectKey}::${fileName}::${width}x${height}::${mood}`;
  const rng = mulberry32(hashStringToInt(seedBase));

  const profile = moodHintToProfile(mood);
  const styles = STYLE_SETS[profile] || STYLE_SETS.neutral;
  const materials = MATERIAL_SETS[profile] || MATERIAL_SETS.neutral;
  const palettes = PALETTE_SETS[profile] || PALETTE_SETS.neutral;
  const objects = OBJECT_SETS[profile] || OBJECT_SETS.neutral;
  const atmos = ATMOSPHERE_SETS[profile] || ATMOSPHERE_SETS.neutral;

  const aspect = width && height ? width / height : 1.5;
  const isWide = aspect > 1.45;
  const isTall = aspect < 0.85;
  const composition = isTall ? "vertical emphasis" : isWide ? "panoramic zoning" : "balanced framing";

  const style = pick(rng, styles);
  const result = {
    style,
    materials: pickMany(rng, materials, 5),
    palette: pickMany(rng, palettes, 5),
    objects: pickMany(rng, objects, 5),
    atmosphere: pick(rng, atmos),
    meta: {
      profile,
      composition,
      confidence: Math.round((0.78 + rng() * 0.17) * 100) / 100,
    },
  };

  // Small controlled variation to avoid “same-every-time” when filename is generic.
  if (!fileName || fileName.toLowerCase().includes("image")) {
    if (rng() > 0.6) result.palette = pickMany(rng, palettes, 5);
  }

  return result;
}

