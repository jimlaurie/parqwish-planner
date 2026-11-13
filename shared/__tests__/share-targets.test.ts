import { nameFromUrl, sharedTitle, withoutSiteSuffix } from "../share-targets";

describe("share names", () => {
  it("drops the site's name from the end of a page title", () => {
    expect(withoutSiteSuffix("Haunted Mansion Ear Hat | shopDisney", "https://www.shopdisney.com/x.html")).toBe("Haunted Mansion Ear Hat");
    expect(withoutSiteSuffix("Avengers Campus - Disneyland Resort", "https://disneyland.disney.go.com/x")).toBe("Avengers Campus");
    expect(withoutSiteSuffix("Mickey Ears : Clothing - Amazon.com", "https://www.amazon.com/dp/B0")).toBe("Mickey Ears : Clothing");
    // Only the last part, and only when it's the site
    expect(withoutSiteSuffix("Spider-Man - Web Slingers - Disneyland Resort", "https://disneyland.disney.go.com/x")).toBe("Spider-Man - Web Slingers");
    expect(withoutSiteSuffix("Spider-Man - Web Slingers", "https://disneyland.disney.go.com/x")).toBe("Spider-Man - Web Slingers");
    expect(withoutSiteSuffix("Figment", "https://pinpics.com/pin/1")).toBe("Figment");
  });

  it("makes a name from the address when there's no title, skipping ids", () => {
    expect(nameFromUrl("https://www.shopdisney.com/haunted-mansion-ears-123.html")).toBe("Haunted mansion ears");
    expect(nameFromUrl("https://example.com/products/mickey_spirit_jersey/4410023?color=red")).toBe("Mickey spirit jersey");
    expect(nameFromUrl("https://www.amazon.com/dp/B0CX12345")).toBe("amazon.com");
    expect(nameFromUrl("https://pinpics.com/pin/12345")).toBe("pinpics.com");
    expect(nameFromUrl("https://www.shopdisney.com/")).toBe("shopdisney.com");
    expect(nameFromUrl("https://example.com/Disney%20Pin%20Trading")).toBe("Disney pin trading");
  });

  it("names an item from the title, then the text, then the address", () => {
    expect(sharedTitle("Figment Ears | shopDisney", { url: "https://www.shopdisney.com/f.html", text: "" })).toBe("Figment Ears");
    expect(sharedTitle(null, { url: "https://a.b/x", text: "Look at this" })).toBe("Look at this");
    expect(sharedTitle(null, { url: "https://www.shopdisney.com/figment-ears-9.html", text: "" })).toBe("Figment ears");
    expect(sharedTitle(null, { url: "", text: "", image: "file:///p.jpg" })).toBe("Shared photo");
  });
});
