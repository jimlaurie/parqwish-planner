import { defaultTradeScope, escapeTradeHtml, tradeCardLines, tradeListHtml, tradeLists } from "../collection-trade";
import type { CollectionFieldDef, CollectionItem } from "../types/collection";

const T = 1_700_000_000_000;
const DAY = "2026-12-03";
const FIELDS: CollectionFieldDef[] = [{ id: "edition", name: "Edition", type: "choice", choices: ["Open Edition", "Limited Edition"] }];
const item = (id: string, extra: Partial<CollectionItem> = {}): CollectionItem =>
  ({ id, name: id, category: "pins", state: "trade", createdAt: T, updatedAt: T, ...extra });

const ITEMS = [
  item("Stitch", { quantity: 3, forSale: true, days: [DAY] }),
  item("Ariel"),
  item("Figment", { state: "want", priority: "C", days: [DAY] }),
  item("Hatbox", { state: "want", priority: "E" }),
  item("Dumbo", { state: "want" }),
  item("Plush", { category: "plush" }),
  item("Kept", { state: "have", days: [DAY] }),
];

describe("tradeLists", () => {
  it("lists a category's Traders by name and its Wants most wanted first", () => {
    const all = tradeLists(ITEMS, "pins", "all", DAY);
    expect(all.trades.map((i) => i.id)).toEqual(["Ariel", "Stitch"]);
    expect(all.wants.map((i) => i.id)).toEqual(["Hatbox", "Figment", "Dumbo"]);
  });

  it("keeps to the day's items for Today", () => {
    const today = tradeLists(ITEMS, "pins", "today", DAY);
    expect(today.trades.map((i) => i.id)).toEqual(["Stitch"]);
    expect(today.wants.map((i) => i.id)).toEqual(["Figment"]);
  });

  it("opens on Today only when something is on the day", () => {
    expect(defaultTradeScope(ITEMS, "pins", DAY)).toBe("today");
    expect(defaultTradeScope(ITEMS, "pins", "2026-12-04")).toBe("all");
    expect(defaultTradeScope(ITEMS, "plush", DAY)).toBe("all");
  });
});

describe("tradeCardLines", () => {
  it("shows details, how many and for sale on a Trader, and how wanted on a Want", () => {
    expect(tradeCardLines(item("a", { quantity: 3, forSale: true, details: { edition: "Limited Edition" } }), FIELDS))
      .toEqual(["Limited Edition", "×3 · Also for sale"]);
    expect(tradeCardLines(item("b"), FIELDS)).toEqual([]);
    expect(tradeCardLines(item("c", { state: "want", priority: "E" }), FIELDS)).toEqual(["E · the grail"]);
    expect(tradeCardLines(item("d", { state: "want" }), FIELDS)).toEqual(["Want: A"]);
  });
});

describe("tradeListHtml", () => {
  it("makes both sections with photos or the category icon, escaping names", () => {
    const html = tradeListHtml({
      categoryName: "Pins", categoryIcon: "📌", fields: FIELDS, dateLabel: "Thursday, December 3, 2026", owner: "Mary",
      lists: { trades: [item("<b>Stitch</b>", { quantity: 2 })], wants: [item("Figment", { state: "want", priority: "E" })] },
      photoFor: (i) => (i.id === "Figment" ? "data:image/jpeg;base64,AAA" : undefined),
    });
    expect(html).toContain("📌 Pins trade list");
    expect(html).toContain("Mary · Thursday, December 3, 2026");
    expect(html).toContain("Up for trade <span class=\"count\">(1)</span>");
    expect(html).toContain("Looking for <span class=\"count\">(1)</span>");
    expect(html).toContain("&lt;b&gt;Stitch&lt;/b&gt;");
    expect(html).toContain('<img src="data:image/jpeg;base64,AAA"');
    expect(html).toContain("unofficial fan app");
  });

  it("says so when there's nothing to list", () => {
    const html = tradeListHtml({ categoryName: "Pins", fields: [], dateLabel: "", lists: { trades: [], wants: [] }, photoFor: () => undefined });
    expect(html).toContain("Nothing up for trade or wanted yet.");
    expect(escapeTradeHtml(`"Tom & Jerry's"`)).toBe("&quot;Tom &amp; Jerry&#39;s&quot;");
  });
});
