"use client";

/** Bump only with migration path — do not rename keys without migrating. */
export const OSA_STORAGE_VERSION_KEY = "osa-storage-version";
export const OSA_STORAGE_VERSION = "1";

export const OSA_ACTIVE_PROJECT_SESSION_KEY = "osa-active-project-session-v1";

const SCHEMA = 1;

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function ensureStorageVersion() {
  if (typeof localStorage === "undefined") return;
  try {
    const cur = localStorage.getItem(OSA_STORAGE_VERSION_KEY);
    if (cur !== OSA_STORAGE_VERSION) {
      localStorage.setItem(OSA_STORAGE_VERSION_KEY, OSA_STORAGE_VERSION);
    }
  } catch {
    // ignore
  }
}

export function readWorkspaceSessionRaw() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(OSA_ACTIVE_PROJECT_SESSION_KEY);
    if (!raw || !String(raw).trim()) return null;
    const o = safeJsonParse(raw);
    if (!o || typeof o !== "object") return null;
    return o;
  } catch {
    return null;
  }
}

/**
 * Soft-merge legacy flat shapes into the v1 envelope without deleting unknown fields.
 * @param {Record<string, unknown> | null} raw
 */
export function normalizeWorkspaceSessionEnvelope(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      storageSchemaVersion: SCHEMA,
      projectKey: null,
      createdAt: null,
      updatedAt: null,
      activeMode: "generate",
      createDraft: {},
      analyzeDraft: {},
      visuals: null,
      analysisRecords: null,
      budgetDrafts: null,
    };
  }
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : null;
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : null;
  const projectKey =
    typeof raw.projectKey === "string" && raw.projectKey.trim() ? raw.projectKey.trim() : null;
  const activeMode = raw.activeMode === "analyze" ? "analyze" : "generate";

  let createDraft = raw.createDraft && typeof raw.createDraft === "object" ? { ...raw.createDraft } : {};
  let analyzeDraft = raw.analyzeDraft && typeof raw.analyzeDraft === "object" ? { ...raw.analyzeDraft } : {};

  if (!Object.keys(createDraft).length && (raw.interiorDescription != null || raw.resultData != null)) {
    createDraft = {
      interiorDescription: typeof raw.interiorDescription === "string" ? raw.interiorDescription : "",
      atmosphereChoice: typeof raw.atmosphereChoice === "string" ? raw.atmosphereChoice : "",
      resultData: raw.resultData ?? null,
      sessionVisualGallery: Array.isArray(raw.sessionVisualGallery) ? raw.sessionVisualGallery : [],
      selectedSessionVisualId:
        raw.selectedSessionVisualId != null ? String(raw.selectedSessionVisualId) : null,
      activePromptVersionId:
        raw.activePromptVersionId != null ? String(raw.activePromptVersionId) : null,
      isGenerateResultVisible: raw.isGenerateResultVisible === true,
    };
  }
  if (
    !Object.keys(analyzeDraft).length &&
    (raw.semanticDraft != null || raw.selectedImageId != null)
  ) {
    analyzeDraft = {
      selectedAnalysisMode: typeof raw.selectedAnalysisMode === "string" ? raw.selectedAnalysisMode : "pro",
      resultAnalysisMode: typeof raw.resultAnalysisMode === "string" ? raw.resultAnalysisMode : "",
      semanticDraft: raw.semanticDraft ?? null,
      selectedImageFileName: typeof raw.selectedImageFileName === "string" ? raw.selectedImageFileName : "",
      selectedImageMimeType: typeof raw.selectedImageMimeType === "string" ? raw.selectedImageMimeType : "",
      selectedImageDimensions:
        raw.selectedImageDimensions && typeof raw.selectedImageDimensions === "object"
          ? raw.selectedImageDimensions
          : { width: 0, height: 0 },
      selectedImageId: typeof raw.selectedImageId === "string" ? raw.selectedImageId : "",
      activeAnalysisRecordId:
        typeof raw.activeAnalysisRecordId === "string" ? raw.activeAnalysisRecordId : "",
      activeSavedAnalysisRecordId:
        typeof raw.activeSavedAnalysisRecordId === "string" ? raw.activeSavedAnalysisRecordId : "",
      savedDocumentSnapshot: typeof raw.savedDocumentSnapshot === "string" ? raw.savedDocumentSnapshot : "",
      isAnalyzeResultVisible: raw.isAnalyzeResultVisible === true,
    };
  }

  return {
    ...raw,
    storageSchemaVersion: SCHEMA,
    projectKey,
    createdAt,
    updatedAt,
    activeMode,
    createDraft,
    analyzeDraft,
    visuals: raw.visuals ?? null,
    analysisRecords: raw.analysisRecords ?? null,
    budgetDrafts: raw.budgetDrafts ?? null,
  };
}

export function isSessionEnvelopeMeaningful(envelope) {
  if (!envelope || typeof envelope !== "object") return false;
  const pk = typeof envelope.projectKey === "string" ? envelope.projectKey.trim() : "";
  const cd = envelope.createDraft && typeof envelope.createDraft === "object" ? envelope.createDraft : {};
  const ad = envelope.analyzeDraft && typeof envelope.analyzeDraft === "object" ? envelope.analyzeDraft : {};
  const desc = typeof cd.interiorDescription === "string" ? cd.interiorDescription.trim() : "";
  const rd = cd.resultData && typeof cd.resultData === "object";
  const gal = Array.isArray(cd.sessionVisualGallery) && cd.sessionVisualGallery.length > 0;
  const sem = ad.semanticDraft && typeof ad.semanticDraft === "object";
  const img = typeof ad.selectedImageId === "string" && ad.selectedImageId.trim().length > 0;
  return Boolean(pk || desc || rd || gal || sem || img);
}

/**
 * Strip heavy binary fields for localStorage; images stay in IndexedDB by id.
 * @param {unknown[]} gallery
 */
export function slimSessionVisualGalleryForStorage(gallery) {
  if (!Array.isArray(gallery)) return [];
  return gallery.map((item) => {
    if (!item || typeof item !== "object") return item;
    const { imageBase64, ...rest } = item;
    return {
      ...rest,
      imageStored: true,
    };
  });
}

export function buildWorkspaceSessionEnvelope({
  prevEnvelope,
  projectKey,
  activeMode,
  createDraft,
  analyzeDraft,
  validateSemanticDraft: validateDraft,
}) {
  const now = new Date().toISOString();
  const prev = prevEnvelope && typeof prevEnvelope === "object" ? prevEnvelope : {};
  const createdAt =
    typeof prev.createdAt === "string" && prev.createdAt ? prev.createdAt : now;

  const cd = createDraft && typeof createDraft === "object" ? createDraft : {};
  const ad = analyzeDraft && typeof analyzeDraft === "object" ? analyzeDraft : {};

  let semanticForStore = ad.semanticDraft ?? null;
  if (semanticForStore && typeof validateDraft === "function") {
    try {
      semanticForStore = validateDraft(semanticForStore, {
        languageMode: semanticForStore?.languageMode || "ru",
      });
    } catch {
      // keep raw object if validation throws
    }
  }

  return {
    storageSchemaVersion: SCHEMA,
    projectKey: projectKey != null && String(projectKey).trim() ? String(projectKey).trim() : null,
    createdAt,
    updatedAt: now,
    activeMode: activeMode === "analyze" ? "analyze" : "generate",
    createDraft: {
      interiorDescription: typeof cd.interiorDescription === "string" ? cd.interiorDescription : "",
      atmosphereChoice: typeof cd.atmosphereChoice === "string" ? cd.atmosphereChoice : "architectural_white",
      resultData: cd.resultData ?? null,
      sessionVisualGallery: slimSessionVisualGalleryForStorage(cd.sessionVisualGallery),
      selectedSessionVisualId:
        cd.selectedSessionVisualId != null ? String(cd.selectedSessionVisualId) : null,
      activePromptVersionId:
        cd.activePromptVersionId != null ? String(cd.activePromptVersionId) : null,
      isGenerateResultVisible: cd.isGenerateResultVisible === true,
    },
    analyzeDraft: {
      selectedAnalysisMode:
        typeof ad.selectedAnalysisMode === "string" ? ad.selectedAnalysisMode : "pro",
      resultAnalysisMode: typeof ad.resultAnalysisMode === "string" ? ad.resultAnalysisMode : "",
      semanticDraft: semanticForStore,
      selectedImageFileName: typeof ad.selectedImageFileName === "string" ? ad.selectedImageFileName : "",
      selectedImageMimeType: typeof ad.selectedImageMimeType === "string" ? ad.selectedImageMimeType : "",
      selectedImageDimensions:
        ad.selectedImageDimensions && typeof ad.selectedImageDimensions === "object"
          ? {
              width: Number.isFinite(ad.selectedImageDimensions.width) ? ad.selectedImageDimensions.width : 0,
              height: Number.isFinite(ad.selectedImageDimensions.height) ? ad.selectedImageDimensions.height : 0,
            }
          : { width: 0, height: 0 },
      selectedImageId: typeof ad.selectedImageId === "string" ? ad.selectedImageId : "",
      activeAnalysisRecordId:
        typeof ad.activeAnalysisRecordId === "string" ? ad.activeAnalysisRecordId : "",
      activeSavedAnalysisRecordId:
        typeof ad.activeSavedAnalysisRecordId === "string" ? ad.activeSavedAnalysisRecordId : "",
      savedDocumentSnapshot: typeof ad.savedDocumentSnapshot === "string" ? ad.savedDocumentSnapshot : "",
      isAnalyzeResultVisible: ad.isAnalyzeResultVisible === true,
      visualProductCandidates: Array.isArray(ad.visualProductCandidates) ? ad.visualProductCandidates : [],
      visualProductCandidatesError:
        typeof ad.visualProductCandidatesError === "string" ? ad.visualProductCandidatesError : "",
    },
    visuals: prev.visuals ?? null,
    analysisRecords: prev.analysisRecords ?? null,
    budgetDrafts: prev.budgetDrafts ?? null,
  };
}

export function writeWorkspaceSessionEnvelope(envelope) {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(OSA_ACTIVE_PROJECT_SESSION_KEY, JSON.stringify(envelope));
    return true;
  } catch (e) {
    console.warn("OSA: workspace session write failed", e);
    return false;
  }
}

export function clearWorkspaceSessionEnvelope() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(OSA_ACTIVE_PROJECT_SESSION_KEY);
  } catch {
    // ignore
  }
}
