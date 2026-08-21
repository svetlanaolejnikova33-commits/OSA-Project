function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asStrings(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(asString).filter(Boolean))];
}

export function validateSceneInventoryItem(input) {
  if (!input || typeof input !== "object") return null;
  const inventory_item_id = asString(input.inventory_item_id);
  const source_object_id = asString(input.source_object_id);
  const category = asString(input.category);
  if (!inventory_item_id || !source_object_id || !category) return null;
  return Object.freeze({
    inventory_item_id,
    source_node_id: asString(input.source_node_id) || source_object_id,
    source_object_id,
    node_kind: input.node_kind === "surface" ? "surface" : "object",
    zone_id: asString(input.zone_id),
    order: Number.isFinite(input.order) ? input.order : 999,
    category,
    subcategory: asString(input.subcategory),
    form: asString(input.form),
    geometry: asString(input.geometry),
    construction: asString(input.construction),
    materials: Object.freeze(asStrings(input.materials)),
    material_hypotheses: Object.freeze(asStrings(input.material_hypotheses)),
    colors: Object.freeze(asStrings(input.colors)),
    textures: Object.freeze(asStrings(input.textures)),
    patterns: Object.freeze(asStrings(input.patterns)),
    finish: Object.freeze(asStrings(input.finish)),
    mounting: Object.freeze(asStrings(input.mounting)),
    hardware: Object.freeze(asStrings(input.hardware)),
    components: Object.freeze(asStrings(input.components)),
    visual_features: Object.freeze(asStrings(input.visual_features)),
    quantity_unit: asString(input.quantity_unit) || "item",
    grouping: asString(input.grouping) || "single",
    arrangement: asString(input.arrangement),
    relations: Object.freeze((Array.isArray(input.relations) ? input.relations : []).map((relation) => Object.freeze({
      direction: relation?.direction === "incoming" ? "incoming" : "outgoing",
      relation: asString(relation?.relation),
      target_node_id: asString(relation?.target_node_id),
      evidence: asString(relation?.evidence),
      confidence: Math.max(0, Math.min(1, Number(relation?.confidence) || 0)),
    })).filter((relation) => relation.relation && relation.target_node_id)),
    evidence: Object.freeze({
      region_description: asString(input.evidence?.region_description),
      visible_features: Object.freeze(asStrings(input.evidence?.visible_features)),
      confidence: Math.max(0, Math.min(1, Number(input.evidence?.confidence) || 0)),
    }),
    uncertainty: Object.freeze({
      unknown_fields: Object.freeze(asStrings(input.uncertainty?.unknown_fields)),
      hypotheses: Object.freeze(asStrings(input.uncertainty?.hypotheses)),
    }),
    must: Object.freeze(asStrings(input.must)),
    should: Object.freeze(asStrings(input.should)),
    must_not: Object.freeze(asStrings(input.must_not)),
    registry_category_id: asString(input.registry_category_id),
    quantity: Math.max(1, Number(input.quantity) || 1),
    confidence: Math.max(0, Math.min(1, Number(input.confidence) || 0)),
    sku_relevant: Boolean(input.sku_relevant),
    bim_relevant: Boolean(input.bim_relevant),
    budget_relevant: Boolean(input.budget_relevant),
  });
}

export function validateSceneInventory(input) {
  if (!input || typeof input !== "object") return null;
  const items = (Array.isArray(input.items) ? input.items : [])
    .map(validateSceneInventoryItem)
    .filter(Boolean)
    .sort((left, right) => left.order - right.order || left.inventory_item_id.localeCompare(right.inventory_item_id));
  return Object.freeze({
    version: asString(input.version) || "1.0",
    source: "CVO",
    scene_context: Object.freeze({
      space_type: asString(input.scene_context?.space_type),
      style: asString(input.scene_context?.style),
      color_palette: Object.freeze(asStrings(input.scene_context?.color_palette)),
    }),
    items: Object.freeze(items),
    confidence: Math.max(0, Math.min(1, Number(input.confidence) || 0)),
  });
}
