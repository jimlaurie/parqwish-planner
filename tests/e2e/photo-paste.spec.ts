// Pasting a copied image into an editor's photos (src/lib/photo-paste.ts,
// src/components/PhotoPicker.tsx): ⌘V adds it, a paste of text into a text
// field stays the field's, and the Paste button reads the clipboard.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime } from "./helpers";

async function openWishEditor(page: Page) {
  await atParkTime(page);
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/plan");
  await page.getByRole("heading", { name: "Space Mountain", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit Wish" });
  await expect(editor.getByPlaceholder(/Ride Space Mountain/)).toHaveValue("Space Mountain");
  return editor;
}

/** Dispatches a paste carrying a small PNG (and optional text) at the element `selector` names, or the page. */
async function pasteImage(page: Page, opts: { text?: string; selector?: string } = {}) {
  await page.evaluate(async ({ text, selector }) => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 30;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#c33";
    ctx.fillRect(0, 0, 40, 30);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    const data = new DataTransfer();
    data.items.add(new File([blob], "copied.png", { type: "image/png" }));
    if (text) data.setData("text/plain", text);
    const target = selector ? document.querySelector(selector)! : document.body;
    target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, opts);
}

test("⌘V in the wish editor adds the copied image to its photos", async ({ page }) => {
  const editor = await openWishEditor(page);
  await expect(editor.getByRole("img", { name: "Photo 1" })).toHaveCount(0);
  await pasteImage(page);
  await expect(editor.getByRole("img", { name: "Photo 1" })).toBeVisible();
});

test("A paste with text into a text field stays the field's", async ({ page }) => {
  const editor = await openWishEditor(page);
  await pasteImage(page, { text: "From a web page", selector: '[role="dialog"] input, [role="dialog"] textarea' });
  await page.waitForTimeout(300);
  await expect(editor.getByRole("img", { name: "Photo 1" })).toHaveCount(0);
});

test("The Paste button adds the clipboard's image", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Only Chromium lets a test grant clipboard access");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const editor = await openWishEditor(page);
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    canvas.getContext("2d")!.fillRect(0, 0, 20, 20);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  });
  await editor.getByRole("button", { name: "Paste photo" }).click();
  await expect(editor.getByRole("img", { name: "Photo 1" })).toBeVisible();
});
