// ==================== RESOLUTION PRESETS ====================

export interface PhotoResolutions {
  thumbnail: string;  // 300px — card thumbnails, grid views
  display: string;    // 800px — lightbox, detail views
  full: string;       // 1600px — full-size viewing, export
}

const RESOLUTIONS = {
  thumbnail: { maxSize: 300, quality: 0.6 },
  display:   { maxSize: 800, quality: 0.75 },
  full:      { maxSize: 1600, quality: 0.85 },
} as const;

// ==================== CORE RESIZE ====================

/**
 * Resize an image element to a base64 data URL.
 * Resizes to maxSize px on longest side with given JPEG quality.
 */
function resizeToDataURL(
  img: HTMLImageElement,
  maxSize: number,
  quality: number
): string {
  const canvas = document.createElement("canvas");
  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Load a File into an HTMLImageElement.
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ==================== PUBLIC API ====================

/**
 * Compress an image file to a base64 data URL (single resolution).
 * Backward-compatible — used by legacy callers.
 * Resizes to maxSize px on longest side, JPEG quality 0.7.
 */
export function compressImage(
  file: File,
  maxSize = 300,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(resizeToDataURL(img, maxSize, quality));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress an image file into multiple resolutions simultaneously.
 * Returns thumbnail (300px), display (800px), and full (1600px) variants.
 * All three are generated from a single image load for efficiency.
 */
export async function compressImageMultiRes(
  file: File
): Promise<PhotoResolutions> {
  const img = await loadImageFromFile(file);
  return {
    thumbnail: resizeToDataURL(img, RESOLUTIONS.thumbnail.maxSize, RESOLUTIONS.thumbnail.quality),
    display: resizeToDataURL(img, RESOLUTIONS.display.maxSize, RESOLUTIONS.display.quality),
    full: resizeToDataURL(img, RESOLUTIONS.full.maxSize, RESOLUTIONS.full.quality),
  };
}

/**
 * Re-compress an existing base64 data URL to a target resolution.
 * Useful for generating missing resolutions from existing photos.
 */
export function recompressDataURL(
  dataURL: string,
  maxSize: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(resizeToDataURL(img, maxSize, quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataURL;
  });
}

/**
 * Compress an already-decoded dataUri into multiple resolutions, matching
 * compressImageMultiRes's output shape. Used when the source is already a
 * data URI (e.g. a zip-imported photo) rather than a File.
 */
export async function compressDataURLMultiRes(
  dataUri: string
): Promise<PhotoResolutions> {
  const [thumbnail, display, full] = await Promise.all([
    recompressDataURL(dataUri, RESOLUTIONS.thumbnail.maxSize, RESOLUTIONS.thumbnail.quality),
    recompressDataURL(dataUri, RESOLUTIONS.display.maxSize, RESOLUTIONS.display.quality),
    recompressDataURL(dataUri, RESOLUTIONS.full.maxSize, RESOLUTIONS.full.quality),
  ]);
  return { thumbnail, display, full };
}

// ==================== PHOTO RESOLUTION HELPERS ====================

/**
 * Get photos at a specific resolution from an item that may have
 * multi-res photoSets, legacy photos[], or both.
 * Falls back gracefully: photoSets preferred, then legacy photos.
 */
export function getPhotos(
  item: { photos?: string[]; photoSets?: PhotoResolutions[] },
  resolution: "thumbnail" | "display" | "full" = "display"
): string[] {
  if (item.photoSets && item.photoSets.length > 0) {
    return item.photoSets.map((ps) => ps[resolution]);
  }
  // Fall back to legacy single-res photos
  return item.photos ?? [];
}

/**
 * Get the thumbnail URL for the first photo of an item.
 * Returns undefined if no photos exist.
 */
export function getFirstThumbnail(
  item: { photos?: string[]; photoSets?: PhotoResolutions[] }
): string | undefined {
  if (item.photoSets && item.photoSets.length > 0) {
    return item.photoSets[0].thumbnail;
  }
  return item.photos?.[0];
}

/**
 * Get the total photo count for an item (from either storage format).
 */
export function getPhotoCount(
  item: { photos?: string[]; photoSets?: PhotoResolutions[] }
): number {
  if (item.photoSets && item.photoSets.length > 0) {
    return item.photoSets.length;
  }
  return item.photos?.length ?? 0;
}
