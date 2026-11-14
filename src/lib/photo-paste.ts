// ==================== PHOTO PASTE ====================
// Pasting a copied image into an editor's photos (src/components/PhotoPicker.tsx,
// via src/hooks/use-photo-paste.ts): ⌘V / Ctrl+V anywhere in the open editor,
// or its Paste button, which reads the clipboard (the browser may ask first).
// A paste into a text field that carries text stays the field's: copying from
// a web page can put both text and an image on the clipboard.

/** The image files a paste carries. */
export function pastedImageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files = Array.from(data.files ?? []).filter((f) => f.type.startsWith("image/"));
  if (files.length > 0) return files;
  return Array.from(data.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((f): f is File => f !== null);
}

/** Whether a paste belongs to the text field it lands in rather than to the photos. */
export function pasteIsForTextField(target: EventTarget | null, data: DataTransfer | null): boolean {
  const el = target as HTMLElement | null;
  const editable = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true);
  return editable && (data?.getData("text/plain") ?? "").trim().length > 0;
}

/** Whether this browser lets a button read an image off the clipboard. */
export function canReadClipboardImages(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.read === "function";
}

export type ClipboardRead =
  | { ok: true; files: File[] }
  | { ok: false; reason: "denied" | "unsupported" | "failed" };

/** The clipboard's images, read for the Paste button; an empty list means none was copied. */
export async function readClipboardImages(): Promise<ClipboardRead> {
  if (!canReadClipboardImages()) return { ok: false, reason: "unsupported" };
  try {
    const items = await navigator.clipboard.read();
    const files: File[] = [];
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      files.push(new File([blob], `pasted.${type.split("/")[1] || "png"}`, { type }));
    }
    return { ok: true, files };
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") return { ok: false, reason: "denied" };
    console.error("[photo-paste] Could not read the clipboard:", error);
    return { ok: false, reason: "failed" };
  }
}

/** What the editor says after a Paste button press that added nothing. */
export function pasteNote(read: ClipboardRead): string {
  if (read.ok) return "There's no photo on the clipboard. Copy one first.";
  if (read.reason === "denied") return "The browser didn't allow reading the clipboard. Press ⌘V (Ctrl+V) instead.";
  if (read.reason === "unsupported") return "This browser can't paste from a button. Press ⌘V (Ctrl+V) instead.";
  return "Couldn't read the clipboard. Try ⌘V (Ctrl+V).";
}
