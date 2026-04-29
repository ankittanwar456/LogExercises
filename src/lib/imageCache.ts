const CACHE_PREFIX = "excimg_";
const ASSET_BASE_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/";

const inFlightRequests = new Map<string, Promise<string | null>>();

export function getCachedImage(imageRelPath: string): string | null {
  if (!imageRelPath) return null;
  return localStorage.getItem(CACHE_PREFIX + imageRelPath) ?? null;
}

export async function fetchAndCacheImage(imageRelPath: string): Promise<string | null> {
  if (!imageRelPath) return null;

  const cached = getCachedImage(imageRelPath);
  if (cached) return cached;

  const existing = inFlightRequests.get(imageRelPath);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(ASSET_BASE_URL + imageRelPath);
      if (!response.ok) return null;

      const blob = await response.blob();
      const dataUrl = await blobToCompressedDataUrl(blob);

      try {
        localStorage.setItem(CACHE_PREFIX + imageRelPath, dataUrl);
      } catch {
        evictOldestCacheEntries(5);
        try {
          localStorage.setItem(CACHE_PREFIX + imageRelPath, dataUrl);
        } catch {
          // localStorage full even after eviction — return without caching
        }
      }

      return dataUrl;
    } catch {
      return null;
    } finally {
      inFlightRequests.delete(imageRelPath);
    }
  })();

  inFlightRequests.set(imageRelPath, promise);
  return promise;
}

const MAX_SIZE = 200;
const QUALITY = 0.7;

function blobToCompressedDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image"));
    };

    img.src = objectUrl;
  });
}

function evictOldestCacheEntries(count: number) {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keys.push(key);
    }
  }
  keys.slice(0, count).forEach((key) => localStorage.removeItem(key));
}
