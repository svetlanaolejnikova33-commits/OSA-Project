'use client';

const DB_NAME = "OSA_IMAGE_DB";
const STORE_NAME = "visualImages";
const ANALYSIS_STORE_NAME = "semanticAnalyses";
const DB_VERSION = 2;

export function isIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error("IndexedDB недоступна в этом браузере."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error("Не удалось открыть IndexedDB."));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ANALYSIS_STORE_NAME)) {
        const store = db.createObjectStore(ANALYSIS_STORE_NAME, { keyPath: "id" });
        store.createIndex("projectKey", "projectKey", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      } else {
        const store = req.transaction?.objectStore(ANALYSIS_STORE_NAME);
        if (store) {
          if (!store.indexNames.contains("projectKey")) {
            store.createIndex("projectKey", "projectKey", { unique: false });
          }
          if (!store.indexNames.contains("createdAt")) {
            store.createIndex("createdAt", "createdAt", { unique: false });
          }
        }
      }
    };
  });
}

/**
 * @param {string} id
 * @param {string} imageBase64 raw base64 without data: prefix
 */
export async function saveImageToDB(id, imageBase64) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Ошибка транзакции IndexedDB."));
    };
    tx.oncomplete = () => {
      db.close();
      resolve(undefined);
    };
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ id: String(id), imageBase64: String(imageBase64) });
    req.onerror = () => reject(req.error || new Error("Не удалось сохранить изображение."));
  });
}

/**
 * @param {string} id
 * @returns {Promise<string | null>} base64 or null if missing
 */
export async function getImageFromDB(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Ошибка чтения IndexedDB."));
    };
    tx.oncomplete = () => db.close();
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(String(id));
    req.onerror = () => reject(req.error || new Error("Не удалось прочитать изображение."));
    req.onsuccess = () => {
      const row = req.result;
      resolve(row && typeof row.imageBase64 === "string" ? row.imageBase64 : null);
    };
  });
}

/**
 * @param {string} id
 */
export async function deleteImageFromDB(id) {
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.oncomplete = () => db.close();
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(String(id));
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(undefined);
    });
  } catch (e) {
    console.warn("OSA: deleteImageFromDB failed:", e);
  }
}

/**
 * @returns {Promise<Array<{ id: string, imageBase64: string }>>}
 */
export async function getAllImagesFromDB() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Ошибка чтения IndexedDB."));
    };
    tx.oncomplete = () => db.close();
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onerror = () => reject(req.error || new Error("Не удалось получить список изображений."));
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
  });
}

/**
 * @returns {Promise<Array<{ id: string, projectKey: string, createdAt: string, imageId: string }>>}
 */
export async function getAllSemanticAnalysesFromDB() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ANALYSIS_STORE_NAME, "readonly");
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Ошибка чтения IndexedDB (semantic)."));
    };
    tx.oncomplete = () => db.close();
    const store = tx.objectStore(ANALYSIS_STORE_NAME);
    const req = store.getAll();
    req.onerror = () => reject(req.error || new Error("Не удалось получить semantic analyses."));
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
  });
}

/**
 * @typedef {Object} SemanticAnalysisRecord
 * @property {string} id
 * @property {string} projectKey
 * @property {string} createdAt ISO string
 * @property {string} imageId
 * @property {string} fileName
 * @property {string} mimeType
 * @property {number} width
 * @property {number} height
 * @property {any} result
 */

/**
 * @param {SemanticAnalysisRecord} record
 */
export async function saveSemanticAnalysisToDB(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ANALYSIS_STORE_NAME, "readwrite");
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Ошибка транзакции IndexedDB (semantic)."));
    };
    tx.oncomplete = () => {
      db.close();
      resolve(undefined);
    };
    const store = tx.objectStore(ANALYSIS_STORE_NAME);
    const req = store.put(record);
    req.onerror = () => reject(req.error || new Error("Не удалось сохранить semantic analysis."));
  });
}

/**
 * @param {string} projectKey
 * @param {number} limit
 * @returns {Promise<SemanticAnalysisRecord[]>}
 */
export async function getSemanticAnalysesByProjectKey(projectKey, limit = 20) {
  const key = typeof projectKey === "string" ? projectKey.trim() : "";
  if (!key) return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ANALYSIS_STORE_NAME, "readonly");
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Ошибка чтения IndexedDB (semantic)."));
    };
    tx.oncomplete = () => db.close();

    const store = tx.objectStore(ANALYSIS_STORE_NAME);
    /** @type {SemanticAnalysisRecord[]} */
    const out = [];
    let req;
    try {
      const idx = store.index("projectKey");
      req = idx.openCursor(IDBKeyRange.only(key));
    } catch (e) {
      reject(e);
      return;
    }
    req.onerror = () => reject(req.error || new Error("Не удалось прочитать semantic analysis."));
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        resolve(out.slice(0, Math.max(0, limit)));
        return;
      }
      if (cursor.value && cursor.value.projectKey === key) {
        out.push(cursor.value);
      }
      cursor.continue();
    };
  });
}

/**
 * @param {string} projectKey
 * @returns {Promise<SemanticAnalysisRecord | null>}
 */
export async function getLatestSemanticAnalysis(projectKey) {
  const rows = await getSemanticAnalysesByProjectKey(projectKey, 1);
  return rows.length ? rows[0] : null;
}

/**
 * @param {string} id
 */
export async function deleteSemanticAnalysisFromDB(id) {
  if (!isIndexedDbAvailable()) return;
  const key = typeof id === "string" ? id.trim() : "";
  if (!key) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ANALYSIS_STORE_NAME, "readwrite");
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.oncomplete = () => db.close();
      const store = tx.objectStore(ANALYSIS_STORE_NAME);
      const req = store.delete(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(undefined);
    });
  } catch (e) {
    console.warn("OSA: deleteSemanticAnalysisFromDB failed:", e);
  }
}
