import { getOfficialSourceBinding } from "../registry/manufacturerRegistry";

/**
 * Backward-compatible CCN façade over the unified Manufacturer Registry contract.
 * Manufacturer and official-source data are owned by Registry, not CCN.
 */
export function resolveManufacturerCatalog(manufacturerId) {
  return getOfficialSourceBinding(manufacturerId);
}