/**
 * Persisted vision analysis documents and budget draft placeholders (localStorage).
 */

export const OSA_ANALYSIS_RECORDS_KEY = "osa-analysis-records-v1";
export const OSA_BUDGET_DRAFTS_KEY = "osa-budget-drafts-v1";

function safeParseArray(raw) {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readStoredAnalysisRecords() {
  if (typeof localStorage === "undefined") return [];
  return safeParseArray(localStorage.getItem(OSA_ANALYSIS_RECORDS_KEY));
}

export function writeStoredAnalysisRecords(list) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(OSA_ANALYSIS_RECORDS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("OSA: analysis records write failed", e);
  }
}

export function upsertAnalysisRecord(record) {
  if (!record?.id) return null;
  const next = [record, ...readStoredAnalysisRecords().filter((row) => row && row.id !== record.id)];
  writeStoredAnalysisRecords(next);
  return record;
}

export function readAnalysisRecordsForProject(projectKey) {
  const key = typeof projectKey === "string" ? projectKey.trim() : "";
  if (!key) return [];
  return readStoredAnalysisRecords()
    .filter((row) => row && row.projectKey === key)
    .sort((left, right) => String(right?.updatedAt || right?.createdAt || "").localeCompare(String(left?.updatedAt || left?.createdAt || "")));
}

export function getAnalysisRecordById(recordId) {
  const id = typeof recordId === "string" ? recordId.trim() : "";
  if (!id) return null;
  return readStoredAnalysisRecords().find((row) => row && row.id === id) || null;
}

export function readStoredBudgetDrafts() {
  if (typeof localStorage === "undefined") return [];
  return safeParseArray(localStorage.getItem(OSA_BUDGET_DRAFTS_KEY));
}

export function writeStoredBudgetDrafts(list) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(OSA_BUDGET_DRAFTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("OSA: budget drafts write failed", e);
  }
}

export function upsertBudgetDraft(draft) {
  if (!draft?.id) return null;
  const next = [draft, ...readStoredBudgetDrafts().filter((row) => row && row.id !== draft.id)];
  writeStoredBudgetDrafts(next);
  return draft;
}

export function readBudgetDraftsForProject(projectKey) {
  const key = typeof projectKey === "string" ? projectKey.trim() : "";
  if (!key) return [];
  return readStoredBudgetDrafts()
    .filter((row) => row && row.projectKey === key)
    .sort((left, right) => String(right?.createdAt || "").localeCompare(String(left?.createdAt || "")));
}

export function getBudgetDraftForAnalysisRecord(analysisRecordId) {
  const id = typeof analysisRecordId === "string" ? analysisRecordId.trim() : "";
  if (!id) return null;
  return readStoredBudgetDrafts().find((row) => row && row.analysisRecordId === id) || null;
}

export function relinkBudgetDraftsFromPending(pendingId, analysisRecordId) {
  const pending = typeof pendingId === "string" ? pendingId.trim() : "";
  const nextId = typeof analysisRecordId === "string" ? analysisRecordId.trim() : "";
  if (!pending || !nextId) return;
  const rows = readStoredBudgetDrafts().map((row) => {
    if (!row || row.analysisRecordId !== pending) return row;
    return { ...row, analysisRecordId: nextId };
  });
  writeStoredBudgetDrafts(rows);
}
