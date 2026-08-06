// ==================== GUIDE WORKFLOW DATA ====================
// All text content for the 5 use-case workflows.
// To add a real screenshot: set the `screenshot` field to the image path
// (e.g. "/images/guide/home-screen.png") — ScreenshotSlot renders it automatically.
// No component changes are needed.

export type AppTarget = "mobile" | "pwa" | "both";

export interface WorkflowStep {
  /** Display name of the screen, e.g. "PWA › Publish" */
  screen: string;
  /** Main instruction shown prominently */
  action: string;
  /** Which app this step is performed in */
  app: AppTarget;
  /** Optional extra paragraph below the action */
  detail?: string;
  /** Collapsible 💡 tip text */
  tip?: string;
  /** Path to screenshot image. Omit to show placeholder. */
  screenshot?: string;
  /** Always required — shown in placeholder box and used as alt text */
  screenshotLabel: string;
  /** Aspect ratio of the screenshot slot */
  screenshotAspect: "mobile" | "desktop";
}

export interface Workflow {
  slug: string;
  title: string;
  tagline: string;
  icon: string;
  /** One-sentence description of who this workflow is for */
  who: string;
  /** Bullet list of things you need before starting */
  needs: string[];
  steps: WorkflowStep[];
  /** "You'll end up with…" summary */
  outcome: string;
}

// ==================== WORKFLOW 1: SINGLE DAY ====================

const singleDay: Workflow = {
  slug: "single-day",
  title: "Single Person, Single Day",
  tagline: "You're going solo, you have a plan, you want to track it in real time.",
  icon: "🎢",
  who: "Best for: one person visiting for a single day with a pre-built list of rides, dining, and shows.",
  needs: [
    "ParQwish Planner (PWA) open on your desktop or tablet",
    "ParQwish Pal (mobile app) installed on your phone",
    "A trip created in the PWA covering today's date",
  ],
  steps: [
    {
      screen: "PWA › Plan",
      app: "pwa",
      action: "Add everything you want to do — rides, dining reservations, shows, and wishes — to your Plan.",
      detail: "Click '+Add New' to create a new Wish or click Catalog to find previously selected Wishes and tap the star to add them. Set a priority (A thru E, just like the OG tickets) and a max wait time for each ride so you know when to skip.",
      tip: "Sort your wish list by priority before you export so the most important items appear at the top of your phone's Home screen.",
      screenshot: "/images/guide/pwa-plan-wish-list.png",
      screenshotLabel: "PWA Plan — Wish List",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Prepare",
      app: "pwa",
      action: "Run through your packing checklist and mark off everything you're bringing.",
      tip: "Add custom items for anything not in the default list — sunscreen brand, specific snacks, portable charger model.",
      screenshot: "/images/guide/pwa-prepare-packing.png",
      screenshotLabel: "PWA Prepare — Packing Checklist",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Preview",
      app: "pwa",
      action: "Drag your wishes onto the day timeline to set a rough schedule.",
      detail: "Dining reservations with a set time should be pinned first. Rides and shows can be arranged around them. Use the park map panel to check that your route makes geographic sense.",
      tip: "You don't need a minute-by-minute plan — blocking out morning, midday, and evening sections is enough to avoid criss-crossing the park.",
      screenshot: "/images/guide/pwa-preview-timeline.gif",
      screenshotLabel: "PWA Preview — Day Timeline",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Play",
      app: "pwa",
      action: "Export your plan as a sync file and transfer it to your phone.",
      detail: "Tap Export, choose the categories you want (wishes, dining, packing), then share the file via AirDrop, email, or Files. A 6-digit verification code is shown — you'll enter this on your phone.",
      screenshot: "/images/guide/pwa-play-export.gif",
      screenshotLabel: "PWA Play — Export Screen",
      screenshotAspect: "desktop",
    },
    {
      screen: "Mobile › Sync",
      app: "mobile",
      action: "Import the sync file on your phone and enter the 6-digit code to verify.",
      tip: "If you're using AirDrop, tap the incoming file notification — it opens ParQwish Pal directly to the Import tab.",
      screenshot: "/images/guide/mobile-sync-import.gif",
      screenshotLabel: "Mobile Sync — Import Tab",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Settings",
      app: "mobile",
      action: "Enable GPS trail recording before you enter the park.",
      detail: "On the Home screen as the bottom of the list tap the Trail Off button . Choose Medium resolution for a good balance of battery life and accuracy. The trail runs in the background — you don't need to keep the app open.",
      tip: "Charge your phone to 100% and bring a portable charger. GPS recording uses roughly 10–15% extra battery per hour.",
      screenshot: "/images/guide/mobile-settings-gps.gif",
      screenshotLabel: "Mobile Settings — GPS Trail",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Home",
      app: "mobile",
      action: "Work through your day. Check live wait times, mark items complete as you go, and add photos.",
      detail: "The Home screen shows your ready-now items (rides under your max wait) at the top. Switch to Timeline view to see your scheduled items on a time axis. Tap any item to mark it done or add a photo.",
      tip: "Use Lightning Lane tracking to mark LL reservations and log actual boarding times.",
      screenshot: "/images/guide/mobile-home-timeline.gif",
      screenshotLabel: "Mobile Home — Timeline View",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Sync",
      app: "mobile",
      action: "At the end of the day, export from your phone back to the PWA.",
      detail: "This captures everything you marked complete, all photos, and your GPS trail. Share the file back to your desktop via AirDrop or email.",
      screenshot: "/images/guide/mobile-sync-export.gif",
      screenshotLabel: "Mobile Sync — Export Tab",
      screenshotAspect: "mobile",
    },
    {
      screen: "PWA › Play",
      app: "pwa",
      action: "Import the end-of-day file on your desktop.",
      screenshot: "/images/guide/pwa-play-import.gif",
      screenshotLabel: "PWA Play — Import Screen",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Publish",
      app: "pwa",
      action: "View your trip recap — stats, photos, GPS trail, and completion breakdown — then export a PDF keepsake.",
      screenshot: "/images/guide/pwa-publish-recap.gif",
      screenshotLabel: "PWA Publish — Recap Page",
      screenshotAspect: "desktop",
    },
  ],
  outcome: "A fully documented single-day visit: every ride timed and checked off, photos attached, GPS trail recorded, and a PDF recap ready to share or print.",
};

// ==================== WORKFLOW 2: FAMILY MULTI-DAY ====================

const family: Workflow = {
  slug: "family",
  title: "Family Multi-Day Trip",
  tagline: "Multiple people, multiple days — everyone has their own wishlist.",
  icon: "👨‍👩‍👧‍👦",
  who: "Best for: 2–6 people visiting over several days, each with their own priorities and packing needs.",
  needs: [
    "ParQwish Planner (PWA) open on your desktop or tablet",
    "ParQwish Pal installed on each person's phone (or share one device)",
    "A trip created in the PWA with the correct start and end dates",
  ],
  steps: [
    {
      screen: "PWA › Home",
      app: "pwa",
      action: "Open the family member panel and add everyone going on the trip.",
      detail: "Tap the people icon in the sidebar. Add up to 6 members, each with a name and a colour. The primary user is created automatically — add guests for each additional person.",
      tip: "Assign colours that match something visual, like the colour of each person's park lanyard or favourite character.",
      screenshot: "/images/guide/pwa-home-family-panel.png",
      screenshotLabel: "PWA Home — Family Member Panel",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Plan",
      app: "pwa",
      action: "Add wishes for each family member. Use the user filter to see one person's list at a time.",
      detail: "Switch the active user in the sidebar before adding wishes — new items are stamped with that user's colour. Filter by user to review each person's list in isolation.",
      tip: "Star rides that overlap between family members so they show in everyone's list. You only need to add them once.",
      screenshot: "/images/guide/pwa-plan-wish-list.png",
      screenshotLabel: "PWA Plan — Per-Person Wish List",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Prepare",
      app: "pwa",
      action: "Assign packing items to each person. Each person can own their own checklist.",
      screenshot: "/images/guide/pwa-prepare-packing-list.png",
      screenshotLabel: "PWA Prepare — Family Packing List",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Preview",
      app: "pwa",
      action: "Build the timeline for each day of the trip.",
      detail: "Select each date in the date picker bar and drag items onto the timeline. Schedule shared activities (like a character dinner) once — they appear for all users. Individual rides can be scheduled per person.",
      tip: "Plan the busiest day first — typically the first full park day. Use the park map to group nearby attractions and avoid wasteful back-and-forth.",
      screenshot: "/images/guide/pwa-preview-day-planning.png",
      screenshotLabel: "PWA Preview — Multi-Day Timeline",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Play",
      app: "pwa",
      action: "Export, selecting which family members to include. Each person gets their own sync file.",
      detail: "On the Export tab, check the boxes next to each family member you want to include in the file. If everyone is sharing one phone, export all users together. For separate phones, export one user at a time.",
      screenshot: "/images/guide/pwa-play-pre-export.png",
      screenshotLabel: "PWA Play — Export with User Selection",
      screenshotAspect: "desktop",
    },
    {
      screen: "Mobile › Sync",
      app: "mobile",
      action: "Each person imports their own sync file and verifies with the 6-digit code.",
      tip: "The importer auto-matches users by name. If a name doesn't match, use 'Assign to User' to pick the right person or create a new one.",
      screenshot: "/images/guide/mobile-sync-multi-user-import.png",
      screenshotLabel: "Mobile Sync — Multi-User Import",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Home",
      app: "mobile",
      action: "Each person uses their own phone to track their day — wait times, completions, photos.",
      detail: "Shared dining reservations show on everyone's timeline at the same time. Individual ride preferences stay separate.",
      screenshot: "/images/guide/mobile-home-in-park-tracking.png",
      screenshotLabel: "Mobile Home — In-Park Tracking",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Sync",
      app: "mobile",
      action: "At the end of each day (or the whole trip), each person exports their data back.",
      screenshot: "/images/guide/mobile-sync-end-of-day-export.png",
      screenshotLabel: "Mobile Sync — End-of-Day Export",
      screenshotAspect: "mobile",
    },
    {
      screen: "PWA › Play",
      app: "pwa",
      action: "Import each person's sync file. Choose Merge to combine everyone's data without overwriting.",
      tip: "Import in any order — Merge mode is safe to run multiple times. Duplicate items are detected by ID and skipped automatically.",
      screenshot: "/images/guide/pwa-play-import.png",
      screenshotLabel: "PWA Play — Merge Import",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Publish",
      app: "pwa",
      action: "View the combined family recap with per-person stats, all photos, and everyone's GPS trails.",
      detail: "The Publish page aggregates across all users. The PDF export includes one map page per day showing all trails and completed attractions.",
      screenshot: "/images/guide/pwa-publish-stats.png",
      screenshotLabel: "PWA Publish — Family Recap",
      screenshotAspect: "desktop",
    },
  ],
  outcome: "A combined family trip record with each person's achievements tracked separately, all photos in one gallery, and a multi-day PDF recap.",
};

// ==================== WORKFLOW 3: AD-HOC (NO PLAN) ====================

const adhoc: Workflow = {
  slug: "adhoc",
  title: "Ad-Hoc Visit — Just Record the Day",
  tagline: "You're already at the park. No prior planning. Just capture everything as it happens.",
  icon: "📍",
  who: "Best for: spontaneous or last-minute visits where you want to document the day without any upfront setup.",
  needs: [
    "ParQwish Pal (mobile app) installed on your phone",
    "A few minutes at the park entrance to create a quick trip",
  ],
  steps: [
    {
      screen: "Mobile › Settings",
      app: "mobile",
      action: "Set today's date and add yourself as a trip user.",
      detail: "Open Settings and use the date picker to select today. Add your name as a trip user if you haven't already — this stamps your rides, dining, and photos for the day.",
      screenshot: "/images/guide/mobile-settings-gps.gif",
      screenshotLabel: "Mobile Settings — Set Date & User",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Settings",
      app: "mobile",
      action: "Enable GPS trail recording immediately.",
      detail: "Settings › GPS Trail › Start Recording. Choose Low resolution if you're worried about battery — it still gives a clear park trail. The app records in the background while you enjoy the park.",
      tip: "You can pause and resume recording at any time. The trail stitches back together automatically.",
      screenshot: "/images/guide/mobile-home-gps-recording.png",
      screenshotLabel: "Mobile Settings — GPS Recording",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Rides",
      app: "mobile",
      action: "Browse live wait times and tap a ride to add it to your day as you decide to ride it.",
      detail: "No pre-built wish list needed. The Rides screen shows all current wait times. When you join a queue, tap the ride and hit 'Add to Today' — it appears on your Home timeline.",
      screenshot: "/images/guide/mobile-rides-wait-times.png",
      screenshotLabel: "Mobile Rides — Live Wait Times",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Home",
      app: "mobile",
      action: "Mark each activity complete as you finish it and add photos on the spot.",
      detail: "Tap any item on your timeline and hit the checkmark. Tap the camera icon to attach a photo right away — in-park photos are easiest to capture while the memory is fresh.",
      tip: "Use the 'Add Item' button to log anything not on the list — a snack, a spontaneous show, a character meet.",
      screenshot: "/images/guide/mobile-home-quick-logging.png",
      screenshotLabel: "Mobile Home — Quick Logging",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Dining",
      app: "mobile",
      action: "If you score a walk-up dining spot, log it with the time so it appears on your timeline.",
      screenshot: "/images/guide/mobile-dining-walk-up.png",
      screenshotLabel: "Mobile Dining — Walk-Up Log",
      screenshotAspect: "mobile",
    },
    {
      screen: "Mobile › Sync",
      app: "mobile",
      action: "Export your day file when you leave the park.",
      screenshot: "/images/guide/mobile-sync-day-export.png",
      screenshotLabel: "Mobile Sync — Day Export",
      screenshotAspect: "mobile",
    },
    {
      screen: "PWA › Play",
      app: "pwa",
      action: "Import your day file on your desktop.",
      screenshot: "/images/guide/pwa-play-import.png",
      screenshotLabel: "PWA Play — Import",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Publish",
      app: "pwa",
      action: "Explore your day — GPS trail, photos, and everything you logged — then export a recap PDF.",
      tip: "Even without a pre-built plan, the Publish page shows your trail, logged items, and photos in a shareable format.",
      screenshot: "/images/guide/pwa-publish-stats.png",
      screenshotLabel: "PWA Publish — Ad-Hoc Recap",
      screenshotAspect: "desktop",
    },
  ],
  outcome: "A spontaneous day fully documented: GPS trail of everywhere you went, photos and ride completions logged in real time, recap PDF ready to share.",
};

// ==================== WORKFLOW 4: PLANNING AHEAD ====================

const planning: Workflow = {
  slug: "planning",
  title: "Planning Weeks Ahead",
  tagline: "Your trip is coming up. Use the web planner on desktop to organise everything before you arrive.",
  icon: "🗓️",
  who: "Best for: anyone who wants to research, prioritise, and schedule their visit in the weeks or days before the trip — especially useful for first-timers.",
  needs: [
    "ParQwish Planner (PWA) open on your desktop or tablet",
    "Your trip dates and any confirmed dining reservations",
  ],
  steps: [
    {
      screen: "PWA › Home",
      app: "pwa",
      action: "Create your trip — give it a name and set the start and end dates.",
      detail: "Click 'New Trip' on the home screen. If you've been before, consider starting from a template — saved templates carry over your standard packing list and any recurring wishes.",
      screenshot: "/images/guide/pwa-home-create-trip.png",
      screenshotLabel: "PWA Home — Create Trip",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Home",
      app: "pwa",
      action: "Add travel details: flights, hotel, and transportation.",
      detail: "Open the trip editor (pencil icon) and fill in the Flight, Hotel, and Transport tabs. These are for your reference — confirmation numbers, check-in times, shuttle details — all in one place.",
      tip: "Add all family members before you start building wish lists so items can be assigned to the right person from the start.",
      screenshot: "/images/guide/pwa-trip-editor-travel.png",
      screenshotLabel: "PWA Trip Editor — Travel Details",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Plan",
      app: "pwa",
      action: "Browse the ride, dining, and show catalog and add everything you want to do as a wish.",
      detail: "Use the search bar to find specific attractions or browse by land. Each wish gets a priority (Must Do / Want To / Nice If) and an optional max wait time for rides. Don't worry about order yet — you'll schedule on the Preview timeline.",
      tip: "Add more than you think you'll have time for. The 'Nice If' category is your buffer — things you'd love to do but won't be crushed to miss.",
      screenshot: "/images/guide/pwa-plan-catalog-search.png",
      screenshotLabel: "PWA Plan — Catalog Search",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Plan",
      app: "pwa",
      action: "Set a max wait time for each ride in your Must Do and Want To lists.",
      detail: "This is used on the mobile app's Home screen to show a 'Ready Now' list of rides currently under your threshold. It stops you wasting time waiting when there's a better moment later in the day.",
      screenshot: "/images/guide/pwa-plan-max-wait.png",
      screenshotLabel: "PWA Plan — Max Wait Settings",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Prepare",
      app: "pwa",
      action: "Build your packing list — select from the default categories or add your own items.",
      detail: "Categories include clothing, toiletries, park bag essentials, and electronics. Add custom items for anything specific to your trip (e.g. 'autograph book', 'kids' ear protectors').",
      screenshot: "/images/guide/pwa-prepare-packing-list.png",
      screenshotLabel: "PWA Prepare — Packing List",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Preview",
      app: "pwa",
      action: "Lay out each day on the timeline. Start with fixed commitments (dining reservations, shows with set times), then fill in rides around them.",
      detail: "Select a date using the date picker bar. Drag items from the pool on the left onto the timeline. The park map on the right shows where each item is located so you can group nearby attractions.",
      tip: "Schedule your Must Do rides early in the morning or in the evening when waits are typically shorter. Leave a 2-hour buffer in the middle of the day for meals and rest.",
      screenshot: "/images/guide/pwa-preview-day-planning.png",
      screenshotLabel: "PWA Preview — Day Planning",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Preview",
      app: "pwa",
      action: "Use the park map to check that your day's route makes geographic sense.",
      detail: "Each item on the timeline is plotted as a pin on the map. If you see a lot of back-and-forth between opposite ends of the park, rearrange items on the timeline to reduce walking.",
      screenshot: "/images/guide/pwa-preview-park-map.png",
      screenshotLabel: "PWA Preview — Park Map",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Play",
      app: "pwa",
      action: "Export your plan when you're ready to load it onto your phone.",
      detail: "You can re-export as many times as you like as your plan evolves — each import on the phone uses Merge mode to apply only the changes.",
      tip: "Do a final export the night before your visit so your phone has the most up-to-date plan, even if you've been tweaking things in the days leading up.",
      screenshot: "/images/guide/pwa-play-pre-export.png",
      screenshotLabel: "PWA Play — Pre-Trip Export",
      screenshotAspect: "desktop",
    },
  ],
  outcome: "A fully built trip plan — wish list prioritised, packing list ready, day-by-day timeline built — ready to load onto your phone the morning of your visit.",
};

// ==================== WORKFLOW 5: POST-TRIP RECAP ====================

const recap: Workflow = {
  slug: "recap",
  title: "Post-Trip Recap",
  tagline: "The trip is over. Review what you did, clean up the record, and export a keepsake.",
  icon: "🚀",
  who: "Best for: anyone who tracked their visit in the mobile app and wants to review, tidy up, and share a polished recap.",
  needs: [
    "ParQwish Pal (mobile app) with your trip data from the visit",
    "ParQwish Planner (PWA) open on your desktop",
  ],
  steps: [
    {
      screen: "Mobile › Sync",
      app: "mobile",
      action: "Do a final export from your phone to capture everything from the visit.",
      detail: "Include all categories: rides, shows, dining, wishes, photos, and GPS trail. Share the file to your desktop via AirDrop, email, or Files.",
      screenshot: "/images/guide/mobile-sync-final-export.png",
      screenshotLabel: "Mobile Sync — Final Export",
      screenshotAspect: "mobile",
    },
    {
      screen: "PWA › Play",
      app: "pwa",
      action: "Import the sync file into the PWA.",
      detail: "Use Merge mode if you've already imported partial data during the trip. Use Replace only if this is a clean first import and you want to start fresh.",
      screenshot: "/images/guide/pwa-play-import.png",
      screenshotLabel: "PWA Play — Post-Trip Import",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Preview",
      app: "pwa",
      action: "Cleanup: review and correct the timeline before publishing.",
      detail: "Open Preview and check each day's timeline. Fix any items that were logged at the wrong time, remove duplicates, or add notes to items you forgot to mark during the visit. This is your last chance to tidy the record before generating the recap.",
      tip: "Check that dining items have accurate times — they anchor the GPS trail story when you play it back on the map.",
      screenshot: "/images/guide/pwa-preview-day-planning.png",
      screenshotLabel: "PWA Preview — Timeline Cleanup",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Publish",
      app: "pwa",
      action: "Add, remove, or reorder trip photos in the photo gallery.",
      detail: "The photo gallery pulls in all photos attached to items during the visit. You can add additional photos from your camera roll, remove any you don't want in the recap, and reorder them. These photos appear in the PDF export.",
      tip: "Attach photos to specific items (rather than leaving them as unattached gallery entries) so they appear next to the right attraction in the PDF.",
      screenshot: "/images/guide/pwa-publish-photos.png",
      screenshotLabel: "PWA Publish — Photo Management",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Publish",
      app: "pwa",
      action: "Review your trip stats: completion rates, time spent per park, top lands visited.",
      detail: "The stats page shows how many items you completed vs. planned, a breakdown by park, and your top 8 most-visited lands. These pull from all imported data across all days.",
      screenshot: "/images/guide/pwa-publish-stats.png",
      screenshotLabel: "PWA Publish — Trip Stats",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Publish",
      app: "pwa",
      action: "Watch your GPS trail playback — see exactly where you walked each day.",
      detail: "Each day's trail plays back on the park map with a moving dot. Use the speed controls (1×, 2×, 5×, 10×) to fast-forward through quieter parts. Completed items appear as colour-coded pins at the point on the trail where you were when you logged them.",
      tip: "Switch to fullscreen mode for the best playback experience on desktop.",
      screenshot: "/images/guide/pwa-publish-trail.gif",
      screenshotLabel: "PWA Publish — Trail Playback",
      screenshotAspect: "desktop",
    },
    {
      screen: "PWA › Publish",
      app: "pwa",
      action: "Export your PDF recap — one map page per day, all completed items plotted.",
      detail: "The PDF includes: trip header with dates, stat cards, day-by-day item breakdown, park analytics, photo gallery, and one full resort map per day showing your GPS trail and every completed item as a colour-coded pin with its time and name.",
      tip: "The PDF is designed for A4/Letter printing. For a digital keepsake, share the PDF directly — it looks great on screen too.",
      screenshot: "/images/guide/pwa-publish-pdf.png",
      screenshotLabel: "PWA Publish — PDF Export",
      screenshotAspect: "desktop",
    },
  ],
  outcome: "A polished, corrected trip record with a shareable PDF featuring day-by-day breakdowns, the full photo gallery, and a resort map showing your complete trail.",
};

// ==================== WORKFLOW 6: PLANNING WEEKS AHEAD ====================

export const WORKFLOWS: Workflow[] = [singleDay, family, adhoc, planning, recap];

export const WORKFLOW_MAP: Record<string, Workflow> = Object.fromEntries(
  WORKFLOWS.map((w) => [w.slug, w])
);
