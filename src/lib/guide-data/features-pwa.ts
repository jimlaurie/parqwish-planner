// ==================== PWA FEATURE REFERENCE DATA ====================
// Callout positions are percentages (0–100) of the screenshot dimensions.
// x=0 is left edge, y=0 is top edge.
// All positions measured from live app via getBoundingClientRect() / viewport percentage.

export interface Callout {
  id: number;
  x: number;        // % from left
  y: number;        // % from top
  title: string;
  description: string;
}

export interface PwaScreen {
  slug: string;
  title: string;
  subtitle: string;
  screenshot: string;   // path relative to /public
  callouts: Callout[];
}

export const PWA_SCREENS: PwaScreen[] = [

  // ── HOME ──────────────────────────────────────────────────────────────────
  {
    slug: "home",
    title: "Home",
    subtitle: "Your trip dashboard — select a trip, launch any phase, and manage your travel party.",
    screenshot: "/images/guide/pwa-home-clean.png",
    callouts: [
      {
        id: 1,
        x: 9, y: 3,
        title: "ParQwish Logo & Trip Name",
        description: "Tap to return to the home screen from anywhere in the app. The active trip name and date range appear next to the logo.",
      },
      {
        id: 2,
        x: 55, y: 3,
        title: "Phase Navigation",
        description: "One-tap access to Plan, Preview, Prepare, Play, Publish, and Catalog. The active phase is highlighted. Phases that require a trip selected are dimmed until you pick one.",
      },
      {
        id: 3,
        x: 93, y: 3,
        title: "Day / Night Toggle",
        description: "Switch between dark (deep purple) and light (warm parchment) themes. Your preference is saved across sessions.",
      },
      {
        id: 4,
        x: 8, y: 13,
        title: "Star Compass",
        description: "The golden compass shows your active trip is selected. When no trip is selected it appears dimmed.",
      },
      {
        id: 5,
        x: 8, y: 26,
        title: "Future Trips",
        description: "Your upcoming trips are listed here, grouped by Future / Recent / Archived / Templates. Tap a trip to make it active — all phases will load its data.",
      },
      {
        id: 6,
        x: 35, y: 42,
        title: "Phase Portals",
        description: "Plan, Preview, Prepare, and Play — tap any card to enter that phase. The gold badge in the corner shows your item count for that phase (7 wishes, 4 packing items here).",
      },
      {
        id: 7,
        x: 55, y: 65,
        title: "Catalog & Publish",
        description: "Quick access to your reusable item catalog and your trip recap/stats page. Always available regardless of active trip.",
      },
      {
        id: 8,
        x: 8, y: 78,
        title: "Family Group",
        description: "Shows all travel party members with their colour indicators. The active user (you) is highlighted in gold. Click a member to filter all phases to show only their items.",
      },
      {
        id: 9,
        x: 8, y: 88,
        title: "+ New Trip",
        description: "Creates a new trip with a name and date range. You can also create a reusable Template (no dates) to carry forward your standard wish list and packing list.",
      },
    ],
  },

  // ── PLAN ──────────────────────────────────────────────────────────────────
  {
    slug: "plan",
    title: "Plan",
    subtitle: "Build your wish list — rides, shows, dining, and more — organised by priority.",
    screenshot: "/images/guide/pwa-plan-wish-list-full.png",
    callouts: [
      {
        id: 1,
        x: 8, y: 15,
        title: "Search",
        description: "Filter your wish list by name or notes in real time. Searches across all categories.",
      },
      {
        id: 2,
        x: 8, y: 21,
        title: "Category Filter",
        description: "Tap Rides, Shows, Dining, Shopping, Places, or Other to show only that type. The number badge next to each category is your wish count for that type.",
      },
      {
        id: 3,
        x: 8, y: 43,
        title: "Hide Completed",
        description: "Toggle to hide wishes you've already marked done. Useful mid-visit to focus only on what's left.",
      },
      {
        id: 4,
        x: 34, y: 15,
        title: "Trip Name & Stats",
        description: "Shows your active trip name, total wish count, completed count, and pending count at a glance — 7 wishes, 0 done, 7 pending here.",
      },
      {
        id: 5,
        x: 41, y: 26,
        title: "Wish Card",
        description: "Tap anywhere on a card to open the edit form. Each card shows the attraction name, park and land, and any linked tags.",
      },
      {
        id: 6,
        x: 27, y: 27,
        title: "Park & Land Tags",
        description: "Shows which park and land the wish is linked to. When linked to a park data entity, the Preview map will pin its exact location.",
      },
      {
        id: 7,
        x: 56, y: 23,
        title: "Type Icon",
        description: "Shows the wish's category at a glance — this ride icon marks it as a Ride. Dining, Shows, Shopping, and Places each get their own icon.",
      },
      {
        id: 8,
        x: 63, y: 27,
        title: "Priority Badge",
        description: "A = Must Do, B = Want To, C = Nice If. Wishes sort by priority then alphabetically. Tap the wish to change priority.",
      },
      {
        id: 9,
        x: 37, y: 82,
        title: "+ Add New",
        description: "Add a blank wish and fill in the details manually. Use this for anything not in the park catalog — custom notes, character meets, photo spots.",
      },
      {
        id: 10,
        x: 45, y: 82,
        title: "From Catalog",
        description: "Browse the full database of rides, shows, restaurants, shops, and places. Selecting an item links it to the park entity for map placement and wait time tracking.",
      },
    ],
  },

  // ── PREPARE ───────────────────────────────────────────────────────────────
  {
    slug: "prepare",
    title: "Prepare",
    subtitle: "Your packing checklist — outfits, gear, sundries, shopping, and dining reservations.",
    screenshot: "/images/guide/pwa-prepare-packing-list.png",
    callouts: [
      {
        id: 1,
        x: 8, y: 22,
        title: "Category Sidebar",
        description: "Tap Outfits, Equipment, Sundries, Shopping, or Dining to filter the list. Tap more than one to view several categories together — each shows its own item count.",
      },
      {
        id: 2,
        x: 62, y: 14,
        title: "Progress Ring",
        description: "Shows the percentage of items you've packed out of your total for this trip. Fills as you check items off.",
      },
      {
        id: 3,
        x: 21, y: 17,
        title: "Packed Count",
        description: "X of Y packed — updates live as you check items. Gives a quick sense of how much you have left to do.",
      },
      {
        id: 4,
        x: 41, y: 22,
        title: "Item Card",
        description: "Tap anywhere on a card to edit it. Each card shows the item name, category badge (Day Wear, Electronics, Toiletries, etc.), and priority level.",
      },
      {
        id: 5,
        x: 6, y: 35,
        title: "Select All",
        description: "Quickly select all items in the visible categories. Useful to mark everything packed at once before a trip.",
      },
      {
        id: 6,
        x: 12, y: 40,
        title: "Clear",
        description: "Deselects every category filter at once — a fast way to jump back to viewing just one category.",
      },
      {
        id: 7,
        x: 6, y: 45,
        title: "Hide Completed",
        description: "Hides packed items so you can focus on what's left. Packed items are still counted in the progress bar.",
      },
      {
        id: 8,
        x: 37, y: 49,
        title: "+ Add New",
        description: "Create a custom item not in the catalog. When more than one category is selected, you'll be asked which group to add it to.",
      },
      {
        id: 9,
        x: 45, y: 49,
        title: "From Catalog",
        description: "Browse items you've used on previous trips. Reusing catalog items keeps your packing lists consistent across trips.",
      },
    ],
  },

  // ── PREVIEW ───────────────────────────────────────────────────────────────
  {
    slug: "preview",
    title: "Preview",
    subtitle: "Your day-of itinerary — drag items onto a timeline and see their locations on the park map.",
    screenshot: "/images/guide/pwa-preview-day-planning.png",
    callouts: [
      {
        id: 1,
        x: 6, y: 16,
        title: "Date Tabs",
        description: "Shows every day of your trip. Tap a date to switch which day you're planning — each day has its own independent timeline.",
      },
      {
        id: 2,
        x: 9, y: 12,
        title: "Scheduled / Done",
        description: "Counts how many wishes are scheduled on the timeline and how many are marked complete. Updates live as you drag and check items.",
      },
      {
        id: 3,
        x: 9, y: 21,
        title: "Available Items Pool",
        description: "All your wishes for this trip, grouped by type (Wishes, Rides, etc.) with a count badge. Drag an item from here onto the timeline to schedule it.",
      },
      {
        id: 4,
        x: 14, y: 32,
        title: "Item in Pool",
        description: "Drag to the timeline to schedule it, or tap to jump to that wish in the Plan view. Shows the attraction name, park, and priority badge.",
      },
      {
        id: 5,
        x: 37, y: 23,
        title: "ANYTIME Section",
        description: "Items you want to do but haven't assigned a time to. Drag here from the pool, or drag from here to the timeline when you're ready to commit to a time.",
      },
      {
        id: 6,
        x: 39, y: 49,
        title: "Timeline",
        description: "30-minute slots from 7 AM to midnight. Drag items from the pool to a slot to schedule them. Drag items already on the timeline to reschedule.",
      },
      {
        id: 7,
        x: 39, y: 38,
        title: "Time Slot",
        description: "Each slot represents 30 minutes. Scheduled items show their name and a coloured type indicator. Tap to edit an item's details.",
      },
      {
        id: 8,
        x: 72, y: 45,
        title: "Park Map",
        description: "Shows the Disneyland Resort with colour-coded lands. Items linked to park data appear as pins at their exact GPS location. Zoom and pan with the controls in the corner.",
      },
      {
        id: 9,
        x: 55, y: 79,
        title: "Map Legend",
        description: "Explains the pin colours: gold dots mark an attraction pin or a land with items, grey means no items in that land yet.",
      },
    ],
  },

  // ── PLAY ──────────────────────────────────────────────────────────────────
  {
    slug: "play",
    title: "Play",
    subtitle: "Transfer data between the mobile app and the web planner, manage your catalog, and handle templates.",
    screenshot: "/images/guide/pwa-play-pre-export.png",
    callouts: [
      {
        id: 1,
        x: 50, y: 14,
        title: "Cloud Sync",
        description: "Opt in to keep your wish catalog automatically synced across iPhone, iPad, and the planner. Data is end-to-end encrypted before it leaves your device. File-based transfer below always works without an account.",
      },
      {
        id: 2,
        x: 30, y: 25,
        title: "Trip Data — Export / Import / Archive",
        description: "Three tabs for the three transfer directions: Export (PWA → mobile) with a 6-digit code, Import (mobile → PWA) which merges completed items and GPS trails, and Archive (a full backup with no code or expiry).",
      },
      {
        id: 3,
        x: 50, y: 33,
        title: "Select Dates",
        description: "Choose which days to include in the export. For a pre-trip export, select all days. For mid-trip, select only the completed days.",
      },
      {
        id: 4,
        x: 50, y: 42,
        title: "Categories",
        description: "Select what data to include: Rides, Shows, Dining, Outfits, Equipment, Sundries, Shopping, Wishes, GPS Trail, Schedule (legacy), and Day Plan. Select All for a full export.",
      },
      {
        id: 5,
        x: 50, y: 49,
        title: "Download Export File",
        description: "Generates the sync file and downloads it (or opens the share sheet on mobile). The 6-digit code appears on screen — the mobile app needs it to verify the file.",
      },
      {
        id: 6,
        x: 50, y: 57,
        title: "Catalog",
        description: "Export or import your full wish and packing item catalog, including ensembles — PWA-only, useful when setting up a new device or backing up your reusable items.",
      },
      {
        id: 7,
        x: 50, y: 68,
        title: "Templates",
        description: "Export or import trip templates with their wish and packing selections already attached — PWA-only. Great for recreating a proven itinerary on a future trip.",
      },
      {
        id: 8,
        x: 50, y: 78,
        title: "Park Data",
        description: "Rides, shows, dining, shops, and places are cached locally for 24 hours. Tap Refresh Park Data to pull the latest catalog from Disney.",
      },
      {
        id: 9,
        x: 50, y: 90,
        title: "Transfer History",
        description: "A log of every export and import you've performed on this device, so you can confirm a transfer actually completed.",
      },
    ],
  },

  // ── PUBLISH ───────────────────────────────────────────────────────────────
  {
    slug: "publish",
    title: "Publish",
    subtitle: "Your trip recap — stats, GPS trail playback, photo gallery, and PDF export.",
    screenshot: "/images/guide/pwa-publish-stats.png",
    callouts: [
      {
        id: 1,
        x: 30, y: 9,
        title: "Trip Title & Dates",
        description: "Shows the active trip name, date range, and total number of days. Import your mobile sync data first to see complete stats.",
      },
      {
        id: 2,
        x: 30, y: 16,
        title: "Trip Overview",
        description: "The four stat cards: Wishes completed, Itinerary items done, Packing items checked off, and number of trip Days.",
      },
      {
        id: 3,
        x: 26, y: 23,
        title: "Wishes Stat",
        description: "How many wishes you completed vs. how many were on your list — 1 of 7 here.",
      },
      {
        id: 4,
        x: 42, y: 23,
        title: "Itinerary Stat",
        description: "How many scheduled timeline items you completed — rides, dining, and shows that were in your Preview timeline.",
      },
      {
        id: 5,
        x: 58, y: 23,
        title: "Packing Stat",
        description: "How many items you packed and checked off your Prepare checklist — 1 of 4 here.",
      },
      {
        id: 6,
        x: 19, y: 32,
        title: "Where You Walked",
        description: "GPS trail section — requires trail data to be imported from the mobile app. Shows distance, duration, and a playback map for each day.",
      },
      {
        id: 7,
        x: 19, y: 43,
        title: "Trip Photos",
        description: "All photos attached to wishes and packing items, displayed as a gallery. Add more photos here before generating the PDF.",
      },
      {
        id: 8,
        x: 50, y: 61,
        title: "Generate PDF Recap",
        description: "Exports a multi-page PDF: trip overview + stats on page 1, one trail map page per day, then the photo gallery. Great for sharing or printing.",
      },
    ],
  },

  // ── CATALOG ───────────────────────────────────────────────────────────────
  {
    slug: "catalog",
    title: "Catalog",
    subtitle: "Your reusable library of wishes and packing items — and the ensemble builder for grouping outfits.",
    screenshot: "/images/guide/pwa-catalog-wishes.png",
    callouts: [
      {
        id: 1,
        x: 71, y: 3,
        title: "Catalog Nav Link",
        description: "Access the Catalog from the top navigation bar. It's always available regardless of which trip is active.",
      },
      {
        id: 2,
        x: 8, y: 14,
        title: "Category Sidebar",
        description: "Switch between Outfits, Equipment, Sundries, Shopping, Dining, and Wishes. Outfits and Shopping show a visual grid view when items have photos; others show a list.",
      },
      {
        id: 3,
        x: 8, y: 41,
        title: "Ensembles",
        description: "Reusable groupings of catalog items. Drag items onto an ensemble to build outfits or curated lists you can reuse across trips.",
      },
      {
        id: 4,
        x: 50, y: 12,
        title: "Search Bar",
        description: "Filter the catalog by name in real time. Useful when your catalog grows large across many trips.",
      },
      {
        id: 5,
        x: 86, y: 12,
        title: "+ Add",
        description: "Add a new item directly to the catalog. Items added here exist globally — add them to any trip via 'From Catalog' in the Plan or Prepare pages.",
      },
      {
        id: 6,
        x: 22, y: 17,
        title: "Sort & Item Count",
        description: "Sort the grid by Priority, Newest, or Oldest. The count below (e.g. '2 outfits') shows the total in this category across your entire catalog, not just the current trip.",
      },
      {
        id: 7,
        x: 27, y: 34,
        title: "Catalog Item",
        description: "Tap to edit name, notes, priority, photos, or links. Cards without a photo show a placeholder icon until you add one.",
      },
      {
        id: 8,
        x: 15, y: 27,
        title: "Creator Badge",
        description: "The coloured letter badge shows which family member added this item — matches their colour on the Home screen's Family Group.",
      },
      {
        id: 9,
        x: 83, y: 20,
        title: "Right-click Hint",
        description: "On Outfits and Shopping, right-clicking a grid card opens a context menu to quickly add it to an ensemble without dragging.",
      },
    ],
  },
];

// Lookup helper
export function getPwaScreen(slug: string): PwaScreen | undefined {
  return PWA_SCREENS.find((s) => s.slug === slug);
}
