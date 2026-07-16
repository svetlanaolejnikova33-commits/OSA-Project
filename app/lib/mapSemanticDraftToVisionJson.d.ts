import type { VisionJson } from "./visionJsonContract";

/**
 * Map existing analyze-image semanticDraft → Vision JSON candidate.
 */
export function mapSemanticDraftToVisionJson(
  semanticDraft: Record<string, unknown> | null | undefined,
): VisionJson | null;
