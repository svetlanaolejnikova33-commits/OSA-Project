/**
 * Persisted edit request queue (iteration engine metadata). Stored in localStorage only.
 */

export const OSA_EDIT_REQUESTS_KEY = "osa-edit-requests-v1";

function safeParseArray(raw) {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readStoredEditRequests() {
  if (typeof localStorage === "undefined") return [];
  return safeParseArray(localStorage.getItem(OSA_EDIT_REQUESTS_KEY));
}

export function writeStoredEditRequests(list) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(OSA_EDIT_REQUESTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("OSA: editRequests write failed", e);
  }
}

export function appendEditRequest(record) {
  const next = [record, ...readStoredEditRequests().filter((r) => r && r.id !== record.id)];
  writeStoredEditRequests(next);
}

export function patchEditRequest(recordId, patch) {
  if (!recordId) return null;
  const rows = readStoredEditRequests().map((r) => {
    if (!r || r.id !== recordId) return r;
    return { ...r, ...patch };
  });
  writeStoredEditRequests(rows);
  return rows.find((r) => r && r.id === recordId) || null;
}
