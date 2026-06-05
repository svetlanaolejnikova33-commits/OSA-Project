import { getRegistryCacheSnapshot, getRegistrySupplierSources, hasRegistryCache } from "../../../lib/registry/registryCache";
import { syncLightingTab } from "../../../lib/registry/syncLightingTab";

export async function POST() {
  try {
    const result = await syncLightingTab();
    return Response.json({
      ...result,
      supplierSources: getRegistrySupplierSources(),
    });
  } catch (error) {
    console.error("[registry/sync]", error);
    const message = error instanceof Error ? error.message : "Registry sync failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!hasRegistryCache()) {
      const result = await syncLightingTab();
      return Response.json({
        ...result,
        supplierSources: getRegistrySupplierSources(),
        autoSynced: true,
      });
    }

    const snapshot = getRegistryCacheSnapshot();
    return Response.json({
      ok: true,
      autoSynced: false,
      count: snapshot.count,
      skipped: snapshot.skipped,
      sheetName: snapshot.sheetName,
      source: snapshot.source,
      syncedAt: snapshot.syncedAt,
      brands: snapshot.manufacturers.map((entry) => entry.brandName),
      supplierSources: getRegistrySupplierSources(),
    });
  } catch (error) {
    console.error("[registry/sync][GET]", error);
    const message = error instanceof Error ? error.message : "Registry read failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
