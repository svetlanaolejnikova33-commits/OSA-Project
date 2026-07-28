/**
 * Slice 1 UI helpers for OSA Office (additive).
 * Does not change Office pipeline contracts.
 */

/**
 * Feature flag: NEXT_PUBLIC_OSA_OFFICE
 * "1" = ON, anything else (including unset) = OFF
 */
export function isOsaOfficeEnabled() {
  return String(process.env.NEXT_PUBLIC_OSA_OFFICE || "0").trim() === "1";
}

/**
 * Return manufacturer_id only when already reliably known.
 * Never invent or default a manufacturer (including modelux).
 *
 * @param {{ manufacturer_id?: unknown } | null | undefined} sources
 * @returns {string}
 */
export function resolveKnownManufacturerId(sources = {}) {
  const raw = sources?.manufacturer_id;
  if (typeof raw !== "string") return "";
  const id = raw.trim();
  return id || "";
}
