// Dialogs that fade out (src/components/DialogOverlay.tsx): while a closed
// dialog is still fading, it takes no clicks, so the next click reaches the
// page. Before 12 Nov 2026 the invisible overlay swallowed it (a card didn't
// open) and the old dialog's buttons could still be pressed.
import { test, expect, type Page } from "@playwright/test";
import { seedTrip, fakeParkData, atParkTime } from "./helpers";

const wishCard = (page: Page, title: string) => page.getByRole("heading", { name: title, exact: true });

test("Straight after the wish editor closes, the next wish opens in it", async ({ page }) => {
  await atParkTime(page);
  await fakeParkData(page);
  await seedTrip(page);
  await page.goto("/plan");
  await wishCard(page, "Space Mountain").click();
  const editor = page.getByRole("dialog", { name: "Edit Wish" });
  await expect(editor.getByPlaceholder(/Ride Space Mountain/)).toHaveValue("Space Mountain");
  await editor.getByRole("button", { name: "Cancel" }).click();
  // A person's next click comes while the editor is still fading out; force skips Playwright's wait for it
  await page.waitForTimeout(100);
  await wishCard(page, "The Dapper Dans").click({ force: true });
  await expect(editor.getByPlaceholder(/Ride Space Mountain/)).toHaveValue("The Dapper Dans");
  await expect(page.getByRole("dialog")).toHaveCount(1);
});
