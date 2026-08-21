function unique(values, limit = 16) {
  return [...new Set(values.flat(Infinity).map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean))].slice(0, limit);
}

export function buildRetrievalBrief(item) {
  if (!item?.inventory_item_id || !item?.category) return null;
  const must = unique(item.must || []);
  const should = unique(item.should || []);
  const must_not = unique(item.must_not || []);
  const semantic_query = [
    `Category: ${item.category}`,
    item.subcategory && `Subcategory: ${item.subcategory}`,
    item.form && `Form: ${item.form}`,
    item.geometry && `Geometry: ${item.geometry}`,
    item.construction && `Construction: ${item.construction}`,
    item.materials?.length && `Materials: ${item.materials.join(", ")}`,
    item.material_hypotheses?.length && `Material hypotheses: ${item.material_hypotheses.join(", ")}`,
    item.colors?.length && `Colors: ${item.colors.join(", ")}`,
    item.textures?.length && `Textures: ${item.textures.join(", ")}`,
    item.patterns?.length && `Patterns: ${item.patterns.join(", ")}`,
    item.finish?.length && `Finish: ${item.finish.join(", ")}`,
    item.mounting?.length && `Mounting: ${item.mounting.join(", ")}`,
    item.hardware?.length && `Hardware: ${item.hardware.join(", ")}`,
    item.components?.length && `Visible components: ${item.components.join(", ")}`,
    `Quantity: ${item.quantity} ${item.quantity_unit || "item"}`,
    item.grouping && `Grouping: ${item.grouping}`,
    item.arrangement && `Arrangement: ${item.arrangement}`,
    item.visual_features?.length && `Visual features: ${item.visual_features.join(", ")}`,
    must.length && `MUST: ${must.join("; ")}`,
    should.length && `SHOULD: ${should.join("; ")}`,
    must_not.length && `MUST NOT: ${must_not.join("; ")}`,
  ].filter(Boolean).join(". ");
  return Object.freeze({
    inventory_item_id: item.inventory_item_id,
    source_node_id: item.source_node_id || item.source_object_id || "",
    node_kind: item.node_kind || "object",
    order: Number(item.order) || 0,
    category: item.category,
    subcategory: item.subcategory || "",
    form: item.form || "",
    geometry: item.geometry || "",
    construction: item.construction || "",
    materials: Object.freeze(unique(item.materials || [])),
    material_hypotheses: Object.freeze(unique(item.material_hypotheses || [])),
    colors: Object.freeze(unique(item.colors || [])),
    textures: Object.freeze(unique(item.textures || [])),
    patterns: Object.freeze(unique(item.patterns || [])),
    finish: Object.freeze(unique(item.finish || [])),
    mounting: Object.freeze(unique(item.mounting || [])),
    hardware: Object.freeze(unique(item.hardware || [])),
    components: Object.freeze(unique(item.components || [])),
    visual_features: Object.freeze(unique(item.visual_features || [])),
    must: Object.freeze(must),
    should: Object.freeze(should),
    must_not: Object.freeze(must_not),
    registry_category_id: item.registry_category_id || "",
    quantity: Math.max(1, Number(item.quantity) || 1),
    quantity_unit: item.quantity_unit || "item",
    grouping: item.grouping || "single",
    arrangement: item.arrangement || "",
    relations: Object.freeze(Array.isArray(item.relations) ? [...item.relations] : []),
    evidence: item.evidence || null,
    uncertainty: item.uncertainty || null,
    semantic_query,
  });
}

export function buildRetrievalBriefQueue(sceneInventory) {
  return Object.freeze(
    (Array.isArray(sceneInventory?.items) ? sceneInventory.items : [])
      .filter((item) => item.budget_relevant && (item.sku_relevant || item.bim_relevant || item.registry_category_id))
      .map(buildRetrievalBrief)
      .filter(Boolean)
      .sort((left, right) => left.order - right.order || left.inventory_item_id.localeCompare(right.inventory_item_id))
  );
}

export function selectLightingRetrievalBrief(sceneInventory) {
  return buildRetrievalBriefQueue(sceneInventory).find((brief) =>
    brief.category === "lighting" || brief.category.endsWith("_lighting")) || null;
}
