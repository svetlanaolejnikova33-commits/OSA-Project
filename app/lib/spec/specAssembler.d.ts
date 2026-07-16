export const OSA_PIPELINE_VERSION: string;

export const FIELD_SOURCES: {
  readonly VISION: "Vision";
  readonly LIVE_PRODUCT: "Live Product";
  readonly MEMORY: "Memory";
  readonly REGISTRY: "Registry";
  readonly CCN: "CCN";
  readonly CALCULATED: "Calculated";
  readonly UNKNOWN: "Unknown";
};

export function validateSpecificationPackage(pkg: unknown): {
  ok: boolean;
  errors: string[];
  missing_fields: string[];
};

export function buildEstimateLine(input: {
  specification?: object;
  product?: object;
  manufacturer?: object;
  position?: number;
}): Record<string, unknown>;

export function assembleSpecification(input?: {
  vision?: object | null;
  product?: object | null;
  manufacturer?: object | null;
  placement?: object | null;
  gates?: { g1?: object; g3?: object } | null;
  human_overrides?: unknown[];
  memory?: object | null;
  livePath?: boolean;
  partial?: boolean;
}): {
  ok: boolean;
  specification: Record<string, unknown>;
  estimate: { line_items: object[]; line: object };
  audit: Record<string, unknown>;
  missing_fields: string[];
  DesignerSummary: import("./buildDesignerSummary").DesignerSummary;
};

export function assemblePartialSpecification(
  input?: Parameters<typeof assembleSpecification>[0],
): ReturnType<typeof assembleSpecification>;
