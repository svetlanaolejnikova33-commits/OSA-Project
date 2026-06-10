const MODELUX_STORAGE_PREFIX = "https://modelux.ru/storage/";

export function isModeluxStorageImageUrl(url) {
  return typeof url === "string" && url.startsWith(MODELUX_STORAGE_PREFIX);
}

/**
 * Same-origin proxy URL for Modelux product images (avoids browser hotlink/network quirks).
 * @param {string|null|undefined} imageUrl
 * @returns {string|null}
 */
export function getModeluxImageProxyUrl(imageUrl) {
  if (!isModeluxStorageImageUrl(imageUrl)) return imageUrl || null;
  return `/api/registry/modelux-image?src=${encodeURIComponent(imageUrl)}`;
}
