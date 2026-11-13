"use client";

// ==================== SAVE PAGES TO PARQWISH ====================
// /share with nothing shared (and Help › Save pages to ParQwish): how to send
// a page here from anywhere. A bookmarklet for a computer's bookmarks bar, a
// Shortcut for iPhone and iPad (Safari there can't share to a web app), and
// the installed app's own Share entry on Android and in Chrome or Edge. The
// links point at this Planner (src/lib/share-bookmarklet.ts).

import { useEffect, useRef, useState } from "react";
import { bookmarkletCode, shortcutAddress } from "@/lib/share-bookmarklet";

const PRODUCTION = "https://app.parqwish.com";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("[ShareHelp] copy failed:", err);
    }
  }
  return (
    <button type="button" onClick={copy} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
      style={{ color: "var(--color-gold)", border: "1px solid var(--color-gold)" }}>
      {copied ? "Copied" : label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-bold mb-2" style={{ color: "var(--color-heading)" }}>{title}</h2>
      <div className="text-sm leading-relaxed flex flex-col gap-2" style={{ color: "var(--color-text-secondary)" }}>{children}</div>
    </section>
  );
}

/** The bookmarklet as a link to drag; React refuses javascript: in href, so it's set after mounting. */
function BookmarkletLink({ code }: { code: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => { ref.current?.setAttribute("href", code); }, [code]);
  return (
    <a ref={ref} onClick={(e) => e.preventDefault()} draggable data-testid="bookmarklet"
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-grab"
      style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
      title="Drag me to your bookmarks bar">
      ⭐ Save to ParQwish
    </a>
  );
}

export default function ShareHelp() {
  const [origin, setOrigin] = useState(PRODUCTION);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const code = bookmarkletCode(origin);
  const address = shortcutAddress(origin);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-heading)", textWrap: "balance" }}>Save pages to ParQwish</h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Found ears on shopDisney, a pin you&apos;re hunting or a dining spot? Send the page here from your browser and
        save it as a wish, a shopping or packing item, a dining idea or a collection Want. You pick which, name it,
        and its editor opens.
      </p>

      <Section title="On a computer: a bookmark">
        <p>Drag this to your browser&apos;s bookmarks bar. On any page, click it to save that page here.</p>
        <div className="flex items-center gap-3 flex-wrap">
          <BookmarkletLink code={code} />
          <CopyButton text={code} label="Copy the code" />
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Can&apos;t drag? Bookmark any page, then edit the bookmark and paste the copied code as its address.
        </p>
      </Section>

      <Section title="On iPhone or iPad: a Shortcut">
        <p>Safari there can&apos;t share to a web app, so a Shortcut takes the page here. Make it once in the Shortcuts app:</p>
        <ol className="list-decimal pl-5 flex flex-col gap-1.5">
          <li>Tap <b>+</b> and name the shortcut <b>Save to ParQwish</b>.</li>
          <li>Open its details (<b>ⓘ</b>), turn on <b>Show in Share Sheet</b>, and leave only <b>Safari web pages</b> and <b>URLs</b> as its types.</li>
          <li>Add the action <b>Get URLs from Input</b>, then <b>URL Encode</b>.</li>
          <li>
            Add <b>Text</b>, paste this, and put the <b>URL Encoded Text</b> variable right after it:
            <span className="flex items-center gap-2 flex-wrap mt-1">
              <code className="px-2 py-1 rounded text-xs break-all" style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-primary)" }}>{address}</code>
              <CopyButton text={address} label="Copy" />
            </span>
          </li>
          <li>Add <b>Open URLs</b>.</li>
        </ol>
        <p>Then in Safari tap <b>Share</b> › <b>Save to ParQwish</b>. The name comes from the page&apos;s address; change it before you add.</p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          The page opens in Safari. If you use ParQwish from your Home Screen, turn on Cloud Sync (Play) in both so what
          you save reaches it. With ParQwish Pal, Safari&apos;s Share › ParQwish Pal saves to Pal, and Cloud Sync brings it here.
        </p>
      </Section>

      <Section title="On Android, or in Chrome or Edge">
        <p>
          Install ParQwish (your browser&apos;s <b>Install app</b> or <b>Add to Home screen</b>), and it appears in the
          Share menu: share a page to ParQwish and it opens here.
        </p>
      </Section>
    </div>
  );
}
