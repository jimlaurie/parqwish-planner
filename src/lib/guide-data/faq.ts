// ==================== GUIDE FAQ DATA ====================

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSection {
  section: string;
  items: FaqItem[];
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    section: "Getting Started",
    items: [
      {
        question: "Do I need the mobile app to use the web planner?",
        answer:
          "No — the web planner (PWA) works completely standalone for trip planning, packing lists, and building your itinerary. You only need the mobile app when you're in the park and want live wait times, GPS trail recording, and in-park item tracking. The two apps stay in touch either via file-based sync (export/import, no account needed) or the optional real-time Cloud Sync (free, requires signing in with your Apple ID).",
      },
      {
        question: "Does the app connect to Disney's systems or require a Disney login?",
        answer:
          "No. ParQwish is an unofficial fan app and has no connection to Disney's IT systems. Live wait time data comes from the ThemeParks.wiki open API (the same source used by many fan sites). Your wishlist, packing list, and itinerary are stored entirely on your own devices — no Disney account is needed and no data is sent to Disney.",
      },
      {
        question: "Where is my data stored? Is it private?",
        answer:
          "All your personal data (wishes, packing list, itinerary, photos, GPS trails) is stored locally on each device — in IndexedDB in the browser (PWA) and AsyncStorage on your phone (mobile). None of your personal trip data is ever uploaded to a server. Park data (ride names, wait times, dining info) is fetched from a public read-only CDN — it contains no personal information.",
      },
      {
        question: "What happens if I lose my phone — is my data gone?",
        answer:
          "If you export regularly via the Sync screen, you have a backup file on whatever device you exported to (desktop, cloud drive, email). If you have Cloud Sync enabled (free, sign in with Apple), your wish catalog, day plan, and GPS trail are also stored encrypted in the cloud and recoverable by signing in again on a new device — full-resolution photos still need a manual export though. Without either, data on the phone only exists on that device.",
      },
    ],
  },
  {
    section: "Sync & Data Transfer",
    items: [
      {
        question: "How does the sync between mobile and PWA work?",
        answer:
          "ParQwish's main method is file-based sync — no Wi-Fi pairing or account required. You export a JSON file from one device and import it on another. The most common method is AirDrop (iPhone to Mac is instant), but email, iCloud Drive, or any file-sharing app works just as well. A 6-digit verification code prevents importing the wrong file by accident. There's also an optional real-time Cloud Sync — free, but requires signing in with your Apple ID — that keeps your wish catalog and day plan in sync automatically with no manual export/import.",
      },
      {
        question: "What's the difference between Merge and Replace when importing?",
        answer:
          "This applies to file-based import specifically (Cloud Sync merges changes automatically in real time, with no choice to make). Merge adds imported items alongside your existing data, skipping anything that already exists (matched by ID). Use Merge when you're combining data from multiple people or doing a mid-trip update. Replace clears the existing data for the selected categories before importing. Use Replace only for a clean first import or when you want the imported file to be the definitive record.",
      },
      {
        question: "I imported a sync file but my wishes didn't appear — what went wrong?",
        answer:
          "Check that the 'wishes' category was selected on the export screen before the file was created. Also confirm you're viewing the correct trip in the PWA — imports always go into the currently active trip. If wishes still don't appear after a correct import, try a Replace import (instead of Merge) to rule out a duplicate-detection issue.",
      },
      {
        question: "Can I sync between two phones without using a desktop?",
        answer:
          "Yes, two ways. File-based: export from Phone A and AirDrop or share the file directly to Phone B, then import on Phone B — the mobile app's Sync screen handles both, and the file can also go through iCloud Drive. Or, if both phones sign in with the same Apple ID and enable Cloud Sync, they stay in sync automatically with no manual export/import at all.",
      },
    ],
  },
  {
    section: "In-Park Use",
    items: [
      {
        question: "How accurate are the wait times?",
        answer:
          "Wait times come from ThemeParks.wiki, which aggregates data from multiple sources and updates every few minutes. They're generally reliable for planning purposes but may lag 5–10 minutes behind actual posted times during periods of rapid change (e.g. right after a park opens or when a ride comes back online after downtime).",
      },
      {
        question: "The GPS trail stopped recording — why?",
        answer:
          "iOS may suspend background location access when the app hasn't been opened for a while or when Low Power Mode is active. If you notice the trail has a gap, open the app and check the GPS status indicator in Settings. Tapping 'Resume Recording' picks up from where it left off — the trail stitches the segments together automatically.",
      },
      {
        question: "What does 'Ready Now' on the Home screen mean?",
        answer:
          "'Ready Now' shows rides from your wish list where the current wait time is at or below the max wait time you set in the Plan phase. It updates in real time so you always have a short list of actionable rides. If you haven't set a max wait time for a ride, it won't appear in the Ready Now list.",
      },
      {
        question: "Can I use the app offline inside the park?",
        answer:
          "Most features work offline — your wish list, itinerary, packing list, and photo capture all function without a connection. Live wait times require an internet connection (cellular or park Wi-Fi). GPS trail recording works offline; the trail is stored locally and exported with your day file.",
      },
    ],
  },
  {
    section: "Subscriptions & Free Tier",
    items: [
      {
        question: "What's included in the free tier?",
        answer:
          "The free tier gives you access to 1 item per section (rides, shows, dining, outfits, shopping) per day, plus unlimited wish list management. The web planner (PWA) is completely free with no limits. The free tier is designed to let you fully evaluate the app before committing to a subscription.",
      },
      {
        question: "What does VIP unlock?",
        answer:
          "VIP removes the per-day item limits on the mobile app, giving you unlimited rides, shows, dining entries, outfits, and shopping items per day. It also unlocks file-based Sync export and import on mobile. Cloud Sync (the real-time, account-based option) is free at every tier, including Free — VIP only affects the manual file export/import path. The web planner remains fully free regardless of subscription status.",
      },
      {
        question: "What happens to my data if my subscription lapses?",
        answer:
          "Your data is never deleted. If your subscription lapses, the mobile app enters read-only mode — you can view your existing data and GPS trail but can't add new items or export via file-based Sync until you resubscribe. If you have Cloud Sync enabled, it keeps working through a lapse — only file export/import and adding new items are affected. All your data remains on the device and becomes fully accessible again when you renew.",
      },
    ],
  },
  {
    section: "Publishing & PDF",
    items: [
      {
        question: "Why is the GPS trail not showing in my PDF?",
        answer:
          "The PDF map only shows GPS trail data that has reached the PWA — either via a file-based Sync import, or automatically if you have Cloud Sync enabled (trails sync in real time, no manual step needed). If neither has happened yet, do a final Sync export from your phone and import it in PWA › Play, or check that Cloud Sync is turned on, then regenerate the PDF.",
      },
      {
        question: "The map in my PDF is blank — what happened?",
        answer:
          "The PDF generator fetches the resort map image at the time of PDF creation. If your browser blocked the fetch (e.g. due to a content security policy or offline state), the map image won't load. Try generating the PDF while online and on the same domain (parqwish.com). If the map is still missing, a hard refresh (Cmd+Shift+R) clears any cached assets that may be causing the issue.",
      },
      {
        question: "Can I customise what appears in the PDF?",
        answer:
          "Currently the PDF includes everything: stats, day breakdown, photos, and per-day maps. Selective sections (e.g. stats only, or map only) are planned for a future release. In the meantime, you can edit the downloaded PDF with any PDF editor to remove pages you don't want to share.",
      },
    ],
  },
];
