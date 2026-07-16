import type { VisionJson } from "./visionJsonContract";

export interface RichVisualFingerprint {
  category: string;
  subtype: string;
  mounting: string;
  construction: string;
  proportions: string;
  silhouette: string;
  material_combinations: string[];
  finish: string;
  material: string;
  distinctive_features: string[];
  functional_elements: string[];
  decorative_details: string[];
  style: string;
  shape: string;
  negative_constraints: string[];
}

export function buildRichVisualFingerprint(
  vision: VisionJson | null | undefined,
): RichVisualFingerprint;

export function richFingerprintKey(fingerprint: RichVisualFingerprint | Record<string, unknown>): string;

export function buildBasicVisualFingerprint(
  vision: VisionJson | null | undefined,
): Record<string, string>;
