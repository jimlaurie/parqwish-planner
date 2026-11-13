// The /share page (the installed app's share target, or a link from a
// bookmarklet or Shortcut): the site suggests a choice, Add saves the page as
// that kind of item, and its editor opens on the Catalog or Collection page.
// The choices match Pal's share sheet (@shared/share-targets) plus Dining.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, rows, SEED } from "./helpers";

type Packing = { id: string; type: string; name: string; notes?: string; url?: string; category: string; priority: string };
type Wish = { id: string; title: string; notes?: string; url?: string };
type CollectionItem = { id: string; name: string; category: string; state: string; externalUrl?: string; notes?: string };

const share = (params: Record<string, string>) => `/share?${new URLSearchParams(params).toString()}`;
const pressed = (page: Page) => page.getByRole("button", { pressed: true });

test("A shop's page suggests Shopping, and Add saves it with its link and opens its editor", async ({ page }) => {
  await seedTrip(page, SEED);
  await page.goto(share({ title: "Haunted Mansion Ear Hat", url: "https://www.shopdisney.com/haunted-mansion-ears-123.html" }));
  await expect(page.getByRole("heading", { name: "Add to ParQwish" })).toBeVisible();
  await expect(pressed(page)).toHaveText(/Shopping/);
  await expect(page.getByLabel("Name")).toHaveValue("Haunted Mansion Ear Hat");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const editor = page.getByRole("dialog", { name: "Edit Shopping" });
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("textbox").first()).toHaveValue("Haunted Mansion Ear Hat");
  const item = (await rows<Packing>(page, "packingItems")).find((p) => p.name === "Haunted Mansion Ear Hat");
  expect(item).toMatchObject({ type: "shopping", url: "https://www.shopdisney.com/haunted-mansion-ears-123.html", priority: "C" });
  expect(item?.id).toMatch(/^shopping_/);
});

test("Any other page suggests Wishes; a renamed wish keeps the page's link and opens in the wish editor", async ({ page }) => {
  await seedTrip(page, SEED);
  await page.goto(share({ title: "Oogie Boogie Bash tickets", text: "Halloween party nights", url: "https://example.com/bash" }));
  await expect(pressed(page)).toHaveText(/Wishes/);
  await page.getByLabel("Name").fill("Oogie Boogie Bash");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByRole("dialog", { name: "Edit Wish" })).toBeVisible();
  const wish = (await rows<Wish>(page, "wishes")).find((w) => w.title === "Oogie Boogie Bash");
  expect(wish).toMatchObject({ url: "https://example.com/bash", notes: "Halloween party nights" });
});

test("Gear keeps the link in its notes (only shopping has a link field) and opens on the Equipment tab", async ({ page }) => {
  await seedTrip(page, SEED);
  // Android puts the address in the text when there's no url
  await page.goto(share({ title: "Portable fan", text: "Clip-on fan https://example.com/fan" }));
  await page.getByRole("button", { name: /Gear/ }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByRole("dialog", { name: "Edit Equipment" })).toBeVisible();
  const item = (await rows<Packing>(page, "packingItems")).find((p) => p.name === "Portable fan");
  expect(item).toMatchObject({ type: "equipment", notes: "Clip-on fan\nhttps://example.com/fan" });
  expect(item?.url).toBeUndefined();
  expect(item?.id).toMatch(/^eq_/);
});

test("A reservation site suggests Dining", async ({ page }) => {
  await seedTrip(page, SEED);
  await page.goto(share({ title: "Carthay Circle", url: "https://www.opentable.com/r/carthay" }));
  await expect(pressed(page)).toHaveText(/Dining/);
});

test("A pin site suggests Collection; on the first visit the editor opens once the categories are picked", async ({ page }) => {
  await seedTrip(page, { ...SEED, collectionItems: [], collectionSettings: [] });
  await page.goto(share({ title: "Figment 50th pin", url: "https://pinpics.com/pin/12345" }));
  const collection = page.getByRole("button", { name: /Collection/ });
  if (!(await collection.count())) test.skip(true, "Collections are hidden: the dev server on :3000 was started without NEXT_PUBLIC_COLLECTIONS=1.");
  await expect(pressed(page)).toHaveText(/Collection/);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const picker = page.getByRole("dialog", { name: "What do you collect?" });
  await expect(picker).toBeVisible();
  const [saved] = await rows<CollectionItem>(page, "collectionItems");
  expect(saved).toMatchObject({ name: "Figment 50th pin", state: "want", externalUrl: "https://pinpics.com/pin/12345" });
  await picker.getByRole("checkbox", { name: /Pins/ }).click();
  await picker.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("dialog").getByRole("textbox").first()).toHaveValue("Figment 50th pin");
});

test("Opening /share with nothing shared explains the bookmark and the Shortcut, from Help too", async ({ page }) => {
  await seedTrip(page, SEED);
  await page.goto("/");
  await page.getByRole("button", { name: /^(Help|More)/ }).first().click();
  await page.getByRole("link", { name: /Save pages to ParQwish/ }).click();
  await expect(page.getByRole("heading", { name: "Save pages to ParQwish" })).toBeVisible();
  const origin = new URL(page.url()).origin;
  await expect(page.getByTestId("bookmarklet")).toHaveAttribute("href", new RegExp(`^javascript:.*${origin.replace(/[.:/]/g, "\\$&")}/share\\?`));
  await expect(page.getByText(`${origin}/share?url=`)).toBeVisible();
});

test("The bookmark sends the page it's clicked on: its og:title, address and selected text", async ({ page, context }) => {
  await seedTrip(page, SEED);
  await page.goto("/share");
  const code = await page.getByTestId("bookmarklet").getAttribute("href");
  const shop = "https://shop.example.test/haunted-mansion-ears-123.html";
  await context.route(shop, (route) => route.fulfill({
    contentType: "text/html",
    body: `<html><head><title>Haunted Mansion Ear Hat | Example Shop</title><meta property="og:title" content="Haunted Mansion Ear Hat"></head><body><p id="p">Glows in the dark</p></body></html>`,
  }));
  await page.goto(shop);
  await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById("p")!); getSelection()!.addRange(r); });
  const [shared] = await Promise.all([context.waitForEvent("page"), page.evaluate(code!.replace(/^javascript:/, ""))]);
  await expect(shared.getByLabel("Name")).toHaveValue("Haunted Mansion Ear Hat");
  const params = new URL(shared.url()).searchParams;
  expect(params.get("url")).toBe(shop);
  expect(params.get("text")).toBe("Glows in the dark");
});

test("A Shortcut's address-only link is named from the address", async ({ page }) => {
  await seedTrip(page, SEED);
  await page.goto(share({ url: "https://www.shopdisney.com/haunted-mansion-ears-123.html" }));
  await expect(page.getByLabel("Name")).toHaveValue("Haunted mansion ears");
  await expect(pressed(page)).toHaveText(/Shopping/);
});
