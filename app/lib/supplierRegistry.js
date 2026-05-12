export const UNKNOWN_REGISTRY_CATEGORY_ID = "unknown";

function category({
  id,
  labelRu,
  labelEn,
  parentId = null,
  type,
  budgetRole,
  bimRelevant,
  skuRelevant,
  children = [],
}) {
  return {
    id,
    labelRu,
    labelEn,
    parentId,
    type,
    budgetRole,
    bimRelevant,
    skuRelevant,
    children,
  };
}

function child(parentId, parentType, parentBudgetRole, parentBim, parentSku, id, labelRu, labelEn, overrides = {}) {
  return category({
    id,
    labelRu,
    labelEn,
    parentId,
    type: parentType,
    budgetRole: overrides.budgetRole || parentBudgetRole,
    bimRelevant: overrides.bimRelevant ?? parentBim,
    skuRelevant: overrides.skuRelevant ?? parentSku,
    children: [],
  });
}

export const SUPPLIER_REGISTRY = [
  category({
    id: "floor_finish",
    labelRu: "Отделка пола",
    labelEn: "Floor finish",
    type: "finish",
    budgetRole: "major",
    bimRelevant: true,
    skuRelevant: true,
    children: [
      child("floor_finish", "finish", "major", true, true, "floor_finish.porcelain_tile", "Керамогранит", "Porcelain tile"),
      child("floor_finish", "finish", "major", true, true, "floor_finish.parquet", "Паркет", "Parquet"),
      child("floor_finish", "finish", "major", true, true, "floor_finish.engineered_board", "Инженерная доска", "Engineered board"),
      child("floor_finish", "finish", "major", true, true, "floor_finish.laminate", "Ламинат", "Laminate"),
      child("floor_finish", "finish", "major", true, true, "floor_finish.microcement", "Микроцемент", "Microcement"),
      child("floor_finish", "finish", "major", true, true, "floor_finish.concrete", "Бетон", "Concrete"),
      child("floor_finish", "finish", "medium", true, true, "floor_finish.carpet", "Ковролин", "Carpet"),
    ],
  }),
  category({
    id: "wall_finish",
    labelRu: "Отделка стен",
    labelEn: "Wall finish",
    type: "finish",
    budgetRole: "major",
    bimRelevant: true,
    skuRelevant: true,
    children: [
      child("wall_finish", "finish", "major", true, true, "wall_finish.paint", "Краска", "Paint"),
      child("wall_finish", "finish", "major", true, true, "wall_finish.wallpaper", "Обои", "Wallpaper"),
      child("wall_finish", "finish", "major", true, true, "wall_finish.decorative_plaster", "Декоративная штукатурка", "Decorative plaster"),
      child("wall_finish", "finish", "major", true, true, "wall_finish.wall_panels", "Стеновые панели", "Wall panels"),
      child("wall_finish", "finish", "major", true, true, "wall_finish.brick", "Кирпич", "Brick"),
      child("wall_finish", "finish", "major", true, true, "wall_finish.stone", "Камень", "Stone"),
      child("wall_finish", "finish", "major", true, true, "wall_finish.tile", "Плитка", "Tile"),
      child("wall_finish", "finish", "medium", true, true, "wall_finish.mural", "Фреска / роспись", "Mural"),
    ],
  }),
  category({
    id: "ceiling",
    labelRu: "Потолочные системы",
    labelEn: "Ceiling systems",
    type: "finish",
    budgetRole: "major",
    bimRelevant: true,
    skuRelevant: true,
    children: [
      child("ceiling", "finish", "major", true, true, "ceiling.painted_ceiling", "Окрашенный потолок", "Painted ceiling"),
      child("ceiling", "finish", "major", true, true, "ceiling.stretch_ceiling", "Натяжной потолок", "Stretch ceiling"),
      child("ceiling", "finish", "major", true, true, "ceiling.drywall", "Гипсокартон", "Drywall"),
      child("ceiling", "finish", "medium", true, true, "ceiling.beams", "Балки", "Beams"),
      child("ceiling", "finish", "medium", true, true, "ceiling.moldings_cornices", "Молдинги / карнизы", "Moldings / cornices"),
      child("ceiling", "finish", "medium", true, true, "ceiling.coffers", "Кессоны", "Coffers"),
      child("ceiling", "finish", "major", true, true, "ceiling.concrete_ceiling", "Бетон", "Concrete ceiling"),
    ],
  }),
  category({
    id: "furniture",
    labelRu: "Мебель",
    labelEn: "Furniture",
    type: "furniture",
    budgetRole: "major",
    bimRelevant: false,
    skuRelevant: true,
    children: [
      child("furniture", "furniture", "major", false, true, "furniture.sofas", "Диваны", "Sofas"),
      child("furniture", "furniture", "major", false, true, "furniture.armchairs", "Кресла", "Armchairs"),
      child("furniture", "furniture", "major", false, true, "furniture.beds", "Кровати", "Beds"),
      child("furniture", "furniture", "major", false, true, "furniture.tables", "Столы", "Tables"),
      child("furniture", "furniture", "medium", false, true, "furniture.chairs", "Стулья", "Chairs"),
      child("furniture", "furniture", "medium", false, true, "furniture.nightstands", "Тумбы", "Nightstands"),
      child("furniture", "furniture", "major", false, true, "furniture.wardrobes", "Шкафы", "Wardrobes"),
      child("furniture", "furniture", "major", false, true, "furniture.kitchens", "Кухни", "Kitchens"),
      child("furniture", "furniture", "major", false, true, "furniture.storage_systems", "Системы хранения", "Storage systems"),
    ],
  }),
  category({
    id: "lighting",
    labelRu: "Освещение",
    labelEn: "Lighting",
    type: "lighting",
    budgetRole: "medium",
    bimRelevant: true,
    skuRelevant: true,
    children: [
      child("lighting", "lighting", "medium", true, true, "lighting.pendants", "Подвесные светильники", "Pendant lights"),
      child("lighting", "lighting", "medium", true, true, "lighting.chandeliers", "Люстры", "Chandeliers"),
      child("lighting", "lighting", "medium", true, true, "lighting.wall_sconces", "Бра", "Wall sconces"),
      child("lighting", "lighting", "medium", true, true, "lighting.floor_lamps", "Торшеры", "Floor lamps"),
      child("lighting", "lighting", "minor", true, true, "lighting.table_lamps", "Настольные лампы", "Table lamps"),
      child("lighting", "lighting", "medium", true, true, "lighting.track_systems", "Трековые системы", "Track systems"),
      child("lighting", "lighting", "medium", true, true, "lighting.recessed_lights", "Встроенные светильники", "Recessed lights"),
      child("lighting", "lighting", "medium", true, true, "lighting.hidden_led", "Скрытая LED-подсветка", "Hidden LED lighting"),
    ],
  }),
  category({
    id: "textile",
    labelRu: "Текстиль",
    labelEn: "Textiles",
    type: "textile",
    budgetRole: "medium",
    bimRelevant: false,
    skuRelevant: true,
    children: [
      child("textile", "textile", "medium", false, true, "textile.curtains", "Шторы", "Curtains"),
      child("textile", "textile", "minor", false, true, "textile.tulle", "Тюль", "Tulle"),
      child("textile", "textile", "medium", false, true, "textile.rugs", "Ковры", "Rugs"),
      child("textile", "textile", "minor", false, true, "textile.bedspreads", "Покрывала", "Bedspreads"),
      child("textile", "textile", "minor", false, true, "textile.decorative_pillows", "Декоративные подушки", "Decorative pillows"),
      child("textile", "textile", "medium", false, true, "textile.upholstery_fabrics", "Обивочные ткани", "Upholstery fabrics"),
      child("textile", "textile", "medium", false, true, "textile.textile_panels", "Текстильные панели", "Textile panels"),
    ],
  }),
  category({
    id: "decor",
    labelRu: "Декор",
    labelEn: "Decor",
    type: "decor",
    budgetRole: "minor",
    bimRelevant: false,
    skuRelevant: true,
    children: [
      child("decor", "decor", "minor", false, true, "decor.paintings", "Картины", "Paintings"),
      child("decor", "decor", "minor", false, true, "decor.mirrors", "Зеркала", "Mirrors"),
      child("decor", "decor", "minor", false, true, "decor.vases", "Вазы", "Vases"),
      child("decor", "decor", "minor", false, true, "decor.plants", "Растения", "Plants"),
      child("decor", "decor", "minor", false, true, "decor.sculpture", "Скульптура", "Sculpture"),
      child("decor", "decor", "minor", false, true, "decor.books_accessories", "Книги / аксессуары", "Books / accessories"),
    ],
  }),
  category({
    id: "sanitary",
    labelRu: "Сантехника",
    labelEn: "Sanitary",
    type: "sanitary",
    budgetRole: "major",
    bimRelevant: true,
    skuRelevant: true,
    children: [
      child("sanitary", "sanitary", "major", true, true, "sanitary.sinks", "Раковины", "Sinks"),
      child("sanitary", "sanitary", "medium", true, true, "sanitary.faucets", "Смесители", "Faucets"),
      child("sanitary", "sanitary", "major", true, true, "sanitary.bathtubs", "Ванны", "Bathtubs"),
      child("sanitary", "sanitary", "major", true, true, "sanitary.shower_systems", "Душевые системы", "Shower systems"),
      child("sanitary", "sanitary", "major", true, true, "sanitary.toilets", "Унитазы / инсталляции", "Toilets / installations"),
      child("sanitary", "sanitary", "medium", true, true, "sanitary.towel_warmers", "Полотенцесушители", "Towel warmers"),
    ],
  }),
  category({
    id: "appliance",
    labelRu: "Техника",
    labelEn: "Appliances",
    type: "appliance",
    budgetRole: "major",
    bimRelevant: true,
    skuRelevant: true,
    children: [
      child("appliance", "appliance", "major", true, true, "appliance.refrigerators", "Холодильники", "Refrigerators"),
      child("appliance", "appliance", "major", true, true, "appliance.ovens", "Духовые шкафы", "Ovens"),
      child("appliance", "appliance", "major", true, true, "appliance.cooktops", "Варочные панели", "Cooktops"),
      child("appliance", "appliance", "medium", true, true, "appliance.hoods", "Вытяжки", "Hoods"),
      child("appliance", "appliance", "major", true, true, "appliance.dishwashers", "Посудомоечные машины", "Dishwashers"),
      child("appliance", "appliance", "major", true, true, "appliance.washing_machines", "Стиральные машины", "Washing machines"),
    ],
  }),
  category({
    id: "doors_partitions",
    labelRu: "Двери / перегородки",
    labelEn: "Doors / partitions",
    type: "construction",
    budgetRole: "major",
    bimRelevant: true,
    skuRelevant: true,
    children: [],
  }),
  category({
    id: "storage",
    labelRu: "Хранение",
    labelEn: "Storage",
    type: "construction",
    budgetRole: "medium",
    bimRelevant: true,
    skuRelevant: true,
    children: [],
  }),
  category({
    id: "windows_curtains",
    labelRu: "Окна / шторы",
    labelEn: "Windows / curtains",
    type: "construction",
    budgetRole: "medium",
    bimRelevant: true,
    skuRelevant: true,
    children: [],
  }),
  category({
    id: UNKNOWN_REGISTRY_CATEGORY_ID,
    labelRu: "Неопределённая категория",
    labelEn: "Unknown category",
    type: "construction",
    budgetRole: "minor",
    bimRelevant: false,
    skuRelevant: false,
    children: [],
  }),
];

const REGISTRY_INDEX = new Map();

function indexCategory(node, parent = null) {
  REGISTRY_INDEX.set(node.id, { node, parent });
  for (const childNode of node.children || []) {
    indexCategory(childNode, node);
  }
}

for (const root of SUPPLIER_REGISTRY) {
  indexCategory(root, null);
}

export function getRegistryCategoryById(id) {
  const key = typeof id === "string" ? id.trim() : "";
  if (!key) return null;
  return REGISTRY_INDEX.get(key)?.node || null;
}

export function getRegistryParentCategory(id) {
  const key = typeof id === "string" ? id.trim() : "";
  if (!key) return null;
  return REGISTRY_INDEX.get(key)?.parent || null;
}

export function getAllRegistryCategoriesFlat() {
  return [...REGISTRY_INDEX.values()].map(({ node, parent }) => ({
    ...node,
    parentLabelRu: parent?.labelRu || null,
    parentLabelEn: parent?.labelEn || null,
  }));
}
