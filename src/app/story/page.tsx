import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story — ParQwish",
  description: "How ParQwish went from a blank app scaffold to two shipping apps — a dated, honest timeline pulled from the real commit history.",
};

// ==================== CONTENT ====================
// Dates and milestones below are pulled from the actual git history of the
// project (dland-wishes, before the PWA repo split) — not a marketing
// narrative, the real one.

interface Entry {
  date: string;
  title: string;
  body: string;
  major?: boolean;
}

interface Chapter {
  title: string;
  range: string;
  accent: string;
  entries: Entry[];
}

const CHAPTERS: Chapter[] = [
  {
    title: "The idea",
    range: "Oct 2025 — Jan 2026",
    accent: "var(--color-accent-plan)",
    entries: [
      {
        date: "Oct 15, 2025",
        title: "A blank scaffold",
        body: "Ran create-expo-app, got a default tab layout and a placeholder icon, and then didn't touch it again for three months. No plan yet — just a name on a folder.",
      },
      {
        date: "Jan 5, 2026",
        title: "DLand Wishes, for real this time",
        body: "Started building an actual wish list for Disneyland trips — rides, dining, shows, all in one place instead of scattered across Notes and half-remembered plans.",
      },
      {
        date: "Jan 14, 2026",
        title: "In my own pocket",
        body: "Nine days after the first real commit, a TestFlight build was on my phone at the actual parks. Rough, but mine, and working.",
        major: true,
      },
    ],
  },
  {
    title: "Learning to walk",
    range: "Feb — Apr 2026",
    accent: "var(--color-accent-prepare)",
    entries: [
      {
        date: "Feb 9, 2026",
        title: "Building for more than just me",
        body: "First pass at multi-user support, so a family could plan one shared trip instead of everyone keeping their own separate list and comparing notes at breakfast.",
      },
      {
        date: "Mar 9, 2026",
        title: "A companion on the web",
        body: "Started a browser-based planning app to go with the mobile one — a bigger canvas for the trip-planning part, meant to live on a laptop the weeks before a trip. This eventually became ParQ Wish Planner.",
        major: true,
      },
      {
        date: "Mar 11, 2026",
        title: "One way to sync, not three",
        body: "Had accumulated three different half-working ways to move data between the phone and the web app. Threw all of them out for one file-based transfer system that just works, no account required.",
      },
      {
        date: "Apr 6 – 27, 2026",
        title: "A real name",
        body: "DLand Wishes became ParQ Wish — the mobile app is Pal, the web planner is Planner. Small thing, but it stopped feeling like a prototype and started feeling like a thing other people might actually want.",
        major: true,
      },
      {
        date: "Apr 17 – 18, 2026",
        title: "Walking the parks, digitally",
        body: "Added GPS trail recording, so the app remembers where you actually walked that day — not just what you'd planned to do.",
      },
    ],
  },
  {
    title: "Getting serious",
    range: "May — Jul 2026",
    accent: "var(--color-accent-preview)",
    entries: [
      {
        date: "May 10, 2026",
        title: "Starting to feel real",
        body: "v1.1.0 — proper onboarding, a drag-and-drop day timeline, a trip report at the end. This is roughly when it stopped feeling like a side project and started feeling like an app.",
      },
      {
        date: "Jun 2026",
        title: "The unglamorous App Store prep",
        body: "Screenshots, a real description, a privacy policy, version numbers that actually mean something. None of it fun, all of it necessary before anyone besides me could install this.",
      },
      {
        date: "Jun 24 – 29, 2026",
        title: "Cloud Sync, opt-in and encrypted",
        body: "Your data can sync across your own devices now, if you turn it on — end-to-end encrypted the whole way, off by default. Nothing leaves your phone unless you say so.",
        major: true,
      },
      {
        date: "Jul 8, 2026",
        title: "Seven bugs from one park day",
        body: "Took the app to Disneyland and actually used it, start to finish. Came home and fixed seven things it got wrong — timezones, wait times, a filter that lagged. The best bug reports are the ones you find yourself, standing in line.",
      },
      {
        date: "Jul 17 – 30, 2026",
        title: "Everything syncs now",
        body: "GPS trails, photos, the day's schedule — all of it flowing between devices and family members. Trip planning finally works the way it should've from the start.",
      },
    ],
  },
  {
    title: "Today",
    range: "Aug 2026",
    accent: "var(--color-accent-publish)",
    entries: [
      {
        date: "Aug 5 – 8, 2026",
        title: "Getting ready to share it",
        body: "Real App Store screenshots, a description that leads with what actually matters, a proper guide explaining how it all fits together.",
      },
      {
        date: "Aug 14, 2026",
        title: "Splitting in two",
        body: "The web planner became its own public, open-source repository — separate from the mobile app's code, free to look at.",
      },
      {
        date: "Aug 16 – 17, 2026",
        title: "Where I am right now",
        body: "A trip map that shows your actual path with GPS correction, an AI export for turning a day at the parks into a recap post, and a way to pull photos straight from your camera roll into the trip. Still shipping, roughly every day it's true to write that.",
        major: true,
      },
    ],
  },
];

// ==================== COMPONENT ====================

export default function StoryPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 pb-24">
      {/* ==================== HERO ==================== */}
      <header className="pt-16 pb-14 md:pt-24 md:pb-16">
        <p
          className="text-xs uppercase tracking-[0.14em] mb-4"
          style={{ color: "var(--color-gold)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
        >
          A dev journal, mostly true to the commit log
        </p>
        <h1
          className="font-bold mb-6"
          style={{
            fontSize: "clamp(2.2rem, 6vw, 3.4rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.01em",
            color: "var(--color-heading)",
            textWrap: "balance",
          }}
        >
          Our Story
        </h1>
        <div className="flex flex-col gap-4 max-w-[62ch]">
          <p
            className="text-lg leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            I really like Disneyland — probably more than is reasonable.
          </p>
          <p
            className="text-lg leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            The name&rsquo;s a bit of a pun: <strong style={{ color: "var(--color-text-primary)" }}>ParQ Wish</strong>,
            built to cut down the time spent waiting around in the actual park
            Queue — standing in line, trying to remember what we&rsquo;d agreed to do
            that day, hunting through a text thread for a dining reservation time.
            That one annoyance turned into thinking about a Disney trip as three
            separate moments: planning before you go, the day itself in the park,
            and looking back on it after — which is roughly how this is organized
            today: ParQ Wish Planner for the before, ParQ Wish Pal for the during,
            and a Publish page (inside Planner for now, maybe its own app someday)
            for the after.
          </p>
          <p
            className="text-lg leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Trip data is personal — where you are, who you&rsquo;re with, photos of
            your kids — so keeping it secure mattered to me from the start, but so
            did being able to share it: with the people you&rsquo;re actually
            traveling with, or later, a recap you&rsquo;re proud to post. Everything
            lives on your device first; syncing is opt-in and end-to-end encrypted,
            private unless you decide otherwise.
          </p>
          <p
            className="text-lg leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            The other honest part: I&rsquo;d never actually built and shipped an app
            before this. I know a fair amount about how software should behave and
            how a real development process works — I just hadn&rsquo;t done the
            writing-and-deploying part myself. This project doubled as learning
            that, working alongside{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>Claude Code</strong>{" "}
            the whole way, closer to a genuine collaborator than autocomplete. Which
            is also why this story is dated as precisely as it is —{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              pulled straight from the actual commit history
            </strong>
            , and a lot of those commits are me figuring it out in real time.
          </p>
        </div>
        <p
          className="text-xs mt-6"
          style={{ color: "var(--color-text-dim)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
        >
          620 commits · one person · nights, weekends, and park days · Oct 2025 → today
        </p>
      </header>

      {/* ==================== TIMELINE ==================== */}
      <main className="relative">
        <div
          className="absolute w-[2px] top-1.5 bottom-1.5 left-[5px] opacity-60"
          style={{
            background:
              "linear-gradient(to bottom, var(--color-accent-plan), var(--color-accent-prepare), var(--color-accent-preview), var(--color-accent-publish))",
          }}
          aria-hidden="true"
        />

        {CHAPTERS.map((chapter) => (
          <section key={chapter.title} className="pl-11 relative">
            <h2
              className="italic font-normal text-xl mt-14 mb-1 first:mt-0"
              style={{ color: chapter.accent }}
            >
              {chapter.title}
            </h2>
            <p
              className="text-[11px] uppercase tracking-[0.06em] mb-7"
              style={{ color: "var(--color-text-dim)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
            >
              {chapter.range}
            </p>

            <ol className="list-none m-0 p-0">
              {chapter.entries.map((entry) => (
                <li key={entry.title} className="relative pb-8 last:pb-0">
                  <span
                    className="absolute rounded-full"
                    style={
                      entry.major
                        ? {
                            left: -46,
                            top: 4,
                            width: 12,
                            height: 12,
                            background: chapter.accent,
                            boxShadow: `0 0 0 3px color-mix(in srgb, ${chapter.accent} 22%, transparent), 0 0 14px 2px color-mix(in srgb, ${chapter.accent} 45%, transparent)`,
                          }
                        : {
                            left: -44,
                            top: 6,
                            width: 8,
                            height: 8,
                            background: "var(--color-border-strong)",
                            border: "2px solid var(--color-bg-deep)",
                          }
                    }
                    aria-hidden="true"
                  />
                  <time
                    className="block text-xs mb-1.5"
                    style={{ color: chapter.accent, fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
                  >
                    {entry.date}
                  </time>
                  <h3
                    className="text-lg font-semibold mb-1.5"
                    style={{ color: "var(--color-heading)", textWrap: "balance" }}
                  >
                    {entry.title}
                  </h3>
                  <p
                    className="text-[15px] leading-relaxed max-w-[56ch]"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {entry.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>

      {/* ==================== CLOSING ==================== */}
      <footer
        className="mt-16 p-7 md:p-9 rounded-2xl"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <h2 className="italic text-xl mb-3.5" style={{ color: "var(--color-gold)" }}>
          Where things stand
        </h2>

        <div className="flex flex-wrap gap-2.5 mb-5">
          <span
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
            style={{
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              border: "1px solid var(--color-border-default)",
              backgroundColor: "var(--color-surface-raised)",
              color: "var(--color-text-secondary)",
            }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{ background: "#6fcf7f", boxShadow: "0 0 6px 1px color-mix(in srgb, #6fcf7f 60%, transparent)" }}
            />
            ParQ Wish Planner — live, free, at parqwish.com
          </span>
          <span
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
            style={{
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              border: "1px solid var(--color-border-default)",
              backgroundColor: "var(--color-surface-raised)",
              color: "var(--color-text-secondary)",
            }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{ background: "var(--color-gold)", boxShadow: "0 0 6px 1px color-mix(in srgb, var(--color-gold) 60%, transparent)" }}
            />
            ParQ Wish Pal — in testing, App Store submission next
          </span>
        </div>

        <p className="text-[15px] leading-relaxed mb-3.5" style={{ color: "var(--color-text-secondary)" }}>
          The web planner works today, for real trips — everything on this page is
          already shipped and running, not a roadmap. The mobile app isn&rsquo;t in the
          App Store yet; that&rsquo;s the next real milestone, versioning it up properly
          and going through Apple&rsquo;s review.
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          This is still very much a{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>
            one-person, nights-and-weekends project
          </strong>
          , built because I wanted it to exist and figured other people planning a
          Disneyland trip might feel the same. I keep shipping and fixing things the
          same informal way it&rsquo;s happened so far — see what&rsquo;s new on the{" "}
          <a href="/blog" className="underline" style={{ color: "var(--color-gold)", textUnderlineOffset: 2 }}>
            blog
          </a>
          .
        </p>

        <div
          className="mt-9 pt-7 text-center italic text-base"
          style={{ borderTop: "1px solid var(--color-border-subtle)", color: "var(--color-text-dim)" }}
        >
          See you at the parks.
          <span
            className="block not-italic text-[11px] uppercase tracking-[0.08em] mt-2.5"
            style={{ color: "var(--color-gold)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
          >
            — Jim
          </span>
        </div>
      </footer>
    </div>
  );
}
