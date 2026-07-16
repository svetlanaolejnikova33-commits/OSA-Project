export interface ManufacturerExperience {
  manufacturer_id: string;
  success_count: number;
  last_seen: string | null;
  confidence: number;
}

export interface CatalogExperience {
  catalog_url: string;
  success_count: number;
  confidence: number;
}

export interface ExperienceMemory {
  seen_count: number;
  successful_matches: number;
  failed_matches: number;
  manufacturers_seen: ManufacturerExperience[];
  catalogs_seen: CatalogExperience[];
  last_success_at: string | null;
  confidence_growth: number;
}

export function createEmptyExperience(): ExperienceMemory;
export function normalizeExperience(raw: unknown): ExperienceMemory;
export function mergeExperience(
  left: ExperienceMemory | null | undefined,
  right: ExperienceMemory | null | undefined,
): ExperienceMemory;
export function recordExperienceSuccess(
  experience: ExperienceMemory | null | undefined,
  meta?: { manufacturer_id?: string; catalog_url?: string; at?: string },
): ExperienceMemory;
export function recordExperienceFailure(
  experience: ExperienceMemory | null | undefined,
  meta?: { manufacturer_id?: string; catalog_url?: string },
): ExperienceMemory;
export function recommendManufacturersByExperience(
  richFingerprint: Record<string, unknown>,
  options?: {
    store?: { list: () => object[] };
    minSimilarity?: number;
  },
): { manufacturer_id: string; score: number }[];
