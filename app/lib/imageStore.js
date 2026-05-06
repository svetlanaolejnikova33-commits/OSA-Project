'use client';

const DB_NAME = "OSA_IMAGE_DB";
const STORE_NAME = "visualImages";
const DB_VERSION = 1;

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
