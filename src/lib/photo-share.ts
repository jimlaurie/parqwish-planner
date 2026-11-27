// ==================== PHOTO SHARE ====================
// Share, download and copy one photo (the photo viewer's actions, from
// Catalog › Photos; 27 Nov 2026). Photos are data URIs (or URLs) of JPEGs
// or PNGs. Each action reports what happened rather than throwing, so the
// viewer can say so.

export type PhotoActionResult = "done" | "cancelled" | "unsupported" | "failed";

/** A file name from a caption: "Space Mountain" → "space-mountain.jpg". */
export function photoFileName(caption: string | undefined, mimeType: string): string {
  const base = (caption ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "parqwish-photo";
  return `${base}.${mimeType === "image/png" ? "png" : "jpg"}`;
}

/** The photo as a file (fetch reads a data URI as well as a URL). */
export async function photoFile(src: string, caption?: string): Promise<File> {
  const blob = await (await fetch(src)).blob();
  const type = blob.type === "image/png" ? "image/png" : "image/jpeg";
  return new File([blob], photoFileName(caption, type), { type });
}

/** Whether this browser can hand a photo file to the system share sheet. */
export function canSharePhotos(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([new Blob(["x"], { type: "image/jpeg" })], "x.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
}

/** Opens the system share sheet with the photo (Messages, Mail, Photos, AirDrop…). */
export async function sharePhoto(src: string, caption?: string): Promise<PhotoActionResult> {
  if (!canSharePhotos()) return "unsupported";
  try {
    const file = await photoFile(src, caption);
    await navigator.share({ files: [file], title: caption || "Photo", text: caption || undefined });
    return "done";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    console.error("[photo-share] Sharing failed:", err);
    return "failed";
  }
}

/** Saves the photo as a file, named after its caption. */
export async function downloadPhoto(src: string, caption?: string): Promise<PhotoActionResult> {
  try {
    const file = await photoFile(src, caption);
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "done";
  } catch (err) {
    console.error("[photo-share] Download failed:", err);
    return "failed";
  }
}

/** The photo as a PNG (what every browser's clipboard takes). */
async function asPng(src: string): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No PNG"))), "image/png"));
}

/** Copies the photo to the clipboard, to paste into a message or document. */
export async function copyPhoto(src: string): Promise<PhotoActionResult> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return "unsupported";
  try {
    // Safari needs the write started inside the click, with the image still to come
    await navigator.clipboard.write([new ClipboardItem({ "image/png": asPng(src) })]);
    return "done";
  } catch (err) {
    console.error("[photo-share] Copying failed:", err);
    return "failed";
  }
}
