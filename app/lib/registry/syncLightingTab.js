import { normalizeLightingSheetRows } from "./normalizeSheetRow";
import { readLightingSheetRows } from "./sheetsClient";
import { setRegistryCache } from "./registryCache";

export async function syncLightingTab() {
  const { rows, sheetName, source } = await readLightingSheetRows();
  const { manufacturers, skipped } = normalizeLightingSheetRows(rows, { sheetName });

  const snapshot = setRegistryCache({
    manufacturers,
    skipped,
    sheetName,
    source,
    syncedAt: new Date().toISOString(),
  });

  return {
    ok: true,
    count: snapshot.count,
    skipped: snapshot.skipped,
    sheetName: snapshot.sheetName,
    source: snapshot.source,
    syncedAt: snapshot.syncedAt,
    brands: snapshot.manufacturers.map((entry) => entry.brandName),
  };
}
