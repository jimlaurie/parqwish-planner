import {
  buildCollectionZipManifest,
  collectionItemsToExport,
  collectionPhotoExtension,
  collectionZipFileName,
  collectionZipPhotoName,
  parseCollectionZipManifest,
  planCollectionImport,
  type CollectionZipManifest,
} from "../collection-zip";
import type { CollectionItem, CollectionSettings } from "../types/collection";

const T = Date.parse("2026-11-10T20:00:00Z");
const NOW = T + 60_000;

function settings(extra: Partial<CollectionSettings> = {}): CollectionSettings {
  return { enabled: ["pins"], userCategories: [], firstRunDone: true, createdAt: T, updatedAt: T, ...extra };
}
function item(id: string, extra: Partial<CollectionItem> = {}): CollectionItem {
  return { id, name: id, category: "pins", state: "have", createdAt: T, updatedAt: T, ...extra };
}
const photo = (p: string) => ({ thumbnail: p, display: p, full: p });

function manifest(s: CollectionSettings, items: CollectionItem[], photos: Record<string, string[]> = {}): CollectionZipManifest {
  return parseCollectionZipManifest(JSON.stringify(buildCollectionZipManifest(s, items, photos, "Pal", T)));
}

describe("exporting", () => {
  it("names photo files by item and type", () => {
    expect(collectionZipPhotoName("col_ab/1", 0, "jpg")).toBe("photos/col_ab_1-1.jpg");
    expect(collectionPhotoExtension("data:image/png;base64,AAA")).toBe("png");
    expect(collectionPhotoExtension("data:image/svg+xml;utf8,<svg/>")).toBe("svg");
    expect(collectionPhotoExtension("file:///docs/photo_1.JPEG")).toBe("jpg");
    expect(collectionZipFileName(T)).toBe("ParQwish-Collection-2026-11-10.zip");
  });

  it("keeps the settings and items, with photo file names instead of photo data", () => {
    const m = buildCollectionZipManifest(settings(), [item("a", { photoSets: [photo("file:///a.jpg")] }), item("b")], { a: ["photos/a-1.jpg"] }, "Pal", T);
    expect(m.items).toEqual([{ ...item("a"), photos: ["photos/a-1.jpg"] }, item("b")]);
    expect(m.settings.enabled).toEqual(["pins"]);
  });

  it("can export one category or one state", () => {
    const items = [item("a"), item("b", { category: "plush" }), item("c", { state: "want" })];
    expect(collectionItemsToExport(items, { categoryId: "pins" }).map((i) => i.id)).toEqual(["a", "c"]);
    expect(collectionItemsToExport(items, { state: "want" }).map((i) => i.id)).toEqual(["c"]);
  });
});

describe("reading a file", () => {
  it("refuses files that aren't a collection export", () => {
    expect(() => parseCollectionZipManifest("nope")).toThrow("can't be read");
    expect(() => parseCollectionZipManifest(JSON.stringify({ type: "catalog" }))).toThrow("isn't a ParQwish collection export");
    expect(() => parseCollectionZipManifest(JSON.stringify({ type: "parqwish-collection", version: 9 }))).toThrow("newer version");
  });
});

describe("importing", () => {
  it("adds new items stamped now, with their photo files", () => {
    const m = manifest(settings(), [item("a", { photoSets: [photo("x")] })], { a: ["photos/a-1.jpg"] });
    const plan = planCollectionImport({ settings: settings(), items: [] }, m, "skip", NOW);
    expect(plan.save).toEqual([{ ...item("a"), updatedAt: NOW }]);
    expect(plan.photos).toEqual({ a: ["photos/a-1.jpg"] });
    expect([plan.added, plan.updated, plan.skipped]).toEqual([1, 0, 0]);
  });

  it("counts as the first visit done on a device that hadn't chosen yet", () => {
    const blank = settings({ enabled: [], firstRunDone: false });
    const plan = planCollectionImport({ settings: blank, items: [] }, manifest(settings(), [item("a")]), "skip", NOW);
    expect(plan.settings.firstRunDone).toBe(true);
    expect(plan.settings.enabled).toEqual(["pins"]);
  });

  it("skips duplicates by id or by name in the same category", () => {
    const local = [item("a"), item("mine", { name: "Figment 50th" })];
    const m = manifest(settings(), [item("a"), item("theirs", { name: "figment 50TH" }), item("other", { name: "Figment 50th", category: "plush" })]);
    const plan = planCollectionImport({ settings: settings(), items: local }, m, "skip", NOW);
    expect(plan.save.map((i) => i.id)).toEqual(["other"]);
    expect([plan.added, plan.skipped]).toEqual([1, 2]);
  });

  it("updates duplicates, keeping their own id, and their photos when the file has none", () => {
    const local = [item("mine", { name: "Figment", createdAt: T - 5, photoSets: [photo("file:///mine.jpg")] })];
    const m = manifest(settings(), [item("theirs", { name: "Figment", notes: "LE 2500" })]);
    const plan = planCollectionImport({ settings: settings(), items: local }, m, "update", NOW);
    expect(plan.save).toEqual([{ ...item("theirs", { name: "Figment", notes: "LE 2500" }), id: "mine", createdAt: T - 5, updatedAt: NOW, photoSets: [photo("file:///mine.jpg")] }]);
    expect(plan.updated).toBe(1);
  });

  it("switches on the categories the file uses and adds its own categories, matching by name", () => {
    const theirs = settings({
      enabled: ["plush", "user_mugs", "user_pens"],
      userCategories: [{ id: "user_mugs", name: "Mugs", icon: "☕", layout: "shelf", trades: false }, { id: "user_pens", name: "Pens", layout: "list", trades: false }],
    });
    const mine = settings({ userCategories: [{ id: "user_x1", name: "pens", layout: "list", trades: false }], enabled: ["pins"] });
    const m = manifest(theirs, [item("a", { category: "plush" }), item("b", { category: "user_mugs" }), item("c", { category: "user_pens" })]);
    const plan = planCollectionImport({ settings: mine, items: [] }, m, "skip", NOW);
    expect(plan.settings.enabled).toEqual(["pins", "plush", "user_mugs", "user_x1"]);
    expect(plan.settings.userCategories.map((c) => c.name)).toEqual(["pens", "Mugs"]);
    expect(plan.save.map((i) => i.category)).toEqual(["plush", "user_mugs", "user_x1"]);
  });

  it("brings the file's own fields and maps their values to fields here", () => {
    const theirs = settings({ customFields: { pins: [{ id: "field_size", name: "Size", type: "choice", choices: ["Small", "Large"] }] } });
    const mine = settings({ customFields: { pins: [{ id: "field_mine", name: "size", type: "choice", choices: ["Small", "Medium"] }] } });
    const m = manifest(theirs, [item("a", { details: { field_size: "Large", edition: "Open Edition" } })]);
    const plan = planCollectionImport({ settings: mine, items: [] }, m, "skip", NOW);
    expect(plan.save[0].details).toEqual({ field_mine: "Large", edition: "Open Edition" });
    expect(plan.settings.customFields?.pins?.[0].choices).toEqual(["Small", "Medium", "Large"]);
  });
});
