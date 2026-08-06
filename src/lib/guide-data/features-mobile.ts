// ==================== MOBILE FEATURE REFERENCE DATA ====================
// Screenshots are 1290x2796px (430x932 logical @ 3x Retina, iPhone).
// Callout positions are percentages (0–100) of the image dimensions.

export interface MobileCallout {
  id: number;
  x: number;
  y: number;
  title: string;
  description: string;
}

export interface MobileScreen {
  slug: string;
  title: string;
  subtitle: string;
  screenshot: string;
  callouts: MobileCallout[];
  /** Optional second screenshot (edit modal) with its own callouts */
  editScreenshot?: string;
  editTitle?: string;
  editCallouts?: MobileCallout[];
}

export const MOBILE_SCREENS: MobileScreen[] = [

  // ── HOME ────────────────────────────────────────────────────────────────
  {
    slug: "home",
    title: "Home",
    subtitle: "Your command centre for the day — live wait times, your schedule, and quick logging.",
    screenshot: "/images/guide/mobile-feature-home.png",
    callouts: [
      {
        id: 1,
        x: 50, y: 8,
        title: "My Day at the Park",
        description: "The main title. Tap the date badge to change the active date. Tap the gear to open Settings.",
      },
      {
        id: 2,
        x: 50, y: 11.5,
        title: "Park Hours Bar",
        description: "Today's operating hours for Disneyland and California Adventure. A Special Ticketed Event indicator appears when an evening event is scheduled.",
      },
      {
        id: 3,
        x: 41, y: 15,
        title: "Ready / Timeline Tabs",
        description: "Switch between Ready (a filtered list of what to do now) and Timeline (a time-based view of your scheduled items).",
      },
      {
        id: 4,
        x: 88, y: 15,
        title: "Trail Toggle",
        description: "Start or stop GPS trail recording for the day, right in the mode-toggle row. The dot pulses red while recording. Your walking route can be viewed in the PWA Publish page after syncing.",
      },
      {
        id: 5,
        x: 50, y: 18.6,
        title: "Status Filter Chips",
        description: "Filter the Ready list by item status: Now (under your max wait, or scheduled soon), Later (wait too long, or scheduled later), Past Due (missed window), Other (closed/down rides, items above your wait target, and non-park items like outfits and wishes), or Done. Tap multiple to combine.",
      },
      {
        id: 6,
        x: 35, y: 23.5,
        title: "Ready Item",
        description: "Each card shows a priority badge, the item name, and its status. Rides show current wait vs. your target; scheduled shows and dining show the time and when to leave. Tap the checkbox to mark it done, or swipe left to remove it from today.",
      },
      {
        id: 7,
        x: 88.5, y: 22.7,
        title: "Status Badge",
        description: "Green 'Now' means ready to act on right now. Yellow 'Later' means the wait is too long or it's scheduled later. Red 'Past Due' means a scheduled window was missed. Blue 'Other' covers closed/down rides, items above your wait target, and non-park items like outfits and wishes.",
      },
      {
        id: 8,
        x: 50, y: 95.5,
        title: "Bottom Navigation",
        description: "Home, Rides, Events, Outfit, Shop, and Wishes switch screens. Filter opens a sheet with category, guest, shortcut, and restriction toggles — a gold dot appears when any filter is active. Map opens the interactive park map.",
      },
    ],
  },

  // ── RIDES ────────────────────────────────────────────────────────────────
  {
    slug: "rides",
    title: "Rides",
    subtitle: "Browse all attractions with live wait times, add them to your day, or save as wishes.",
    screenshot: "/images/guide/mobile-feature-rides.png",
    callouts: [
      {
        id: 1,
        x: 50, y: 8,
        title: "Rides & Attractions",
        description: "The full ride catalog for both parks, grouped by land. Each park section header shows the total attraction count. Tap the gear to open Settings.",
      },
      {
        id: 2,
        x: 50, y: 17,
        title: "Status Filters",
        description: "Show only Selected (added to today), Operating, Down, or Closed attractions. Combine filters by tapping multiple chips.",
      },
      {
        id: 3,
        x: 18, y: 21,
        title: "Show by Lands",
        description: "Groups rides by land (Adventureland, Fantasyland, etc.) so you can plan a route without backtracking across the park.",
      },
      {
        id: 4,
        x: 78, y: 21,
        title: "Show LL Only",
        description: "Filters to only rides that offer Lightning Lane. Useful for planning your Lightning Lane strategy for the day.",
      },
      {
        id: 5,
        x: 35, y: 40,
        title: "Ride Card",
        description: "Shows the attraction name and current wait time (or Closed/Down/Rehab status). A green left border means it's already added to today; a red-tinted card means it's closed.",
      },
      {
        id: 6,
        x: 84, y: 39,
        title: "Day Button",
        description: "Add this ride to today's Home screen Ready list — the button becomes a green ✓ Day once added. It updates with live wait times throughout the day.",
      },
      {
        id: 7,
        x: 85, y: 41.5,
        title: "+ Wish Button",
        description: "Save this ride to your Wishes list. Wishes carry across visits — useful for rides you didn't get to this trip.",
      },
      {
        id: 8,
        x: 50, y: 46.5,
        title: "Max Wait Row",
        description: "Appears once a ride is added to today. Shows your personal max wait threshold — tap to adjust it. The Home screen uses this to determine 'Now' vs. 'Other' status.",
      },
      {
        id: 9,
        x: 75, y: 57.5,
        title: "Lightning Lane Badge",
        description: "Green 'LL Scheduled' shows a booking you've already made. Blue 'LL Current' shows the return time you'd get if you booked right now. Tap to manage your Lightning Lane booking.",
      },
    ],
  },

  // ── DINING & EVENTS ──────────────────────────────────────────────────────
  {
    slug: "dining",
    title: "Food / Events",
    subtitle: "Your scheduled dining and shows for the day, plus browse all shows to add to your schedule.",
    screenshot: "/images/guide/mobile-feature-dining.png",
    callouts: [
      {
        id: 1,
        x: 50, y: 8,
        title: "Dining & Events",
        description: "Combines your scheduled dining reservations, shows, and places-to-visit for today. Tap the gear to open Settings.",
      },
      {
        id: 2,
        x: 50, y: 15.3,
        title: "Scheduled Shows",
        description: "Shows you've added to today's schedule with a specific time. Tap the header to collapse the section; tap an item to edit the time or mark as completed.",
      },
      {
        id: 3,
        x: 50, y: 21.1,
        title: "Scheduled Show Item",
        description: "Shows the name, scheduled time, and estimated travel time from your current location. The travel time helps you know when to leave.",
      },
      {
        id: 4,
        x: 50, y: 28.9,
        title: "Scheduled Dining",
        description: "Your dining reservations and mobile orders for the day, sorted by time. Shows reservation type (reservation, walk-up, or mobile-order) and travel time.",
      },
      {
        id: 5,
        x: 50, y: 35,
        title: "Dining Item",
        description: "Shows restaurant name, time, dining type, and travel estimate. Tap to edit or mark as completed. Swipe left to remove.",
      },
      {
        id: 6,
        x: 40, y: 48.7,
        title: "Places for Today",
        description: "Photo spots, landmarks, and points of interest you've added for the day. The ✕ removes a place from today's list.",
      },
      {
        id: 7,
        x: 50, y: 62,
        title: "Shows Browse Section",
        description: "The full list of shows at both parks, grouped by park and land. Tap 'Schedule' to add a show to your day at a specific time.",
      },
      {
        id: 8,
        x: 84, y: 74.2,
        title: "Schedule Button",
        description: "Tap to add a show to your scheduled list. You'll pick the performance time from the available show times for the day.",
      },
    ],
    editScreenshot: "/images/guide/mobile-feature-dining-edit.png",
    editTitle: "Edit Dining Item",
    editCallouts: [
      {
        id: 1,
        x: 50, y: 8.6,
        title: "Edit Dining",
        description: "The edit form for a dining entry, shown as a modal over the current screen. Open it by tapping any dining item in the Scheduled Dining list.",
      },
      {
        id: 2,
        x: 50, y: 13.9,
        title: "Mark as Completed",
        description: "Tap to log this dining experience as done. Completed items show a checkmark and are counted in your trip stats.",
      },
      {
        id: 3,
        x: 40, y: 21.5,
        title: "Event Name",
        description: "The restaurant or dining location. This comes from the park catalog when you add dining via the Food/Events screen.",
      },
      {
        id: 4,
        x: 50, y: 33.4,
        title: "Time Picker",
        description: "Set your reservation or mobile order time. This controls when the item appears in your daily schedule and triggers your travel reminder.",
      },
      {
        id: 5,
        x: 50, y: 46.9,
        title: "Travel Time",
        description: "Estimated minutes to walk from your current park location to this restaurant. Used to calculate when you'll need to start heading over.",
      },
      {
        id: 6,
        x: 50, y: 58.1,
        title: "Notes",
        description: "Personal notes about the reservation — confirmation number, what to order, special requests, or reminders.",
      },
      {
        id: 7,
        x: 50, y: 73.3,
        title: "Type",
        description: "Choose Reservation, Walk-up, or Mobile Order for this dining entry.",
      },
      {
        id: 8,
        x: 50, y: 86,
        title: "Photos",
        description: "Add photos before or after your meal — up to 10 per item. Photos sync to the PWA and appear in the Publish photo gallery.",
      },
      {
        id: 9,
        x: 50, y: 90.5,
        title: "Cancel / Remove / Save",
        description: "Cancel closes without saving. Remove deletes this dining entry permanently. Save commits your changes.",
      },
    ],
  },

  // ── OUTFITTING ───────────────────────────────────────────────────────────
  {
    slug: "outfitting",
    title: "Outfitting",
    subtitle: "Your packing checklist — outfits, equipment, and sundries for the day.",
    screenshot: "/images/guide/mobile-feature-outfitting.png",
    callouts: [
      {
        id: 1,
        x: 50, y: 8,
        title: "Outfitting",
        description: "Your personal packing checklist. Items carry over from the PWA Prepare page when you sync. Tap the gear to open Settings.",
      },
      {
        id: 2,
        x: 50, y: 14.4,
        title: "Category Filter Chips",
        description: "Multi-select filters for Outfits, Gear, and Sundries — all three are on by default, showing every item together. Tap a chip to narrow the list to just that category.",
      },
      {
        id: 3,
        x: 14, y: 19.5,
        title: "Show Done",
        description: "Toggle to show or hide items you've already packed. Useful to see your full list or focus on what's left.",
      },
      {
        id: 4,
        x: 50, y: 19.5,
        title: "Item Count",
        description: "Total items matching your current category filter.",
      },
      {
        id: 5,
        x: 89, y: 19.5,
        title: "+ Add",
        description: "Add a new item directly on the mobile app. The item is also added to your catalog for use on future trips.",
      },
      {
        id: 6,
        x: 2, y: 26.8,
        title: "Colour Bar",
        description: "The coloured bar on the left indicates the item's priority: green = high, yellow = medium, grey = low.",
      },
      {
        id: 7,
        x: 30, y: 26.8,
        title: "Outfitting Item",
        description: "Tap to edit the item, add photos, change priority, or link it to the day's timeline. When multiple categories are shown together, a subtitle (e.g. 'Accessories', 'Health') shows which one this item belongs to.",
      },
      {
        id: 8,
        x: 87, y: 25.3,
        title: "Day Button",
        description: "Add this item to today's Home screen Ready list — the button becomes a green ✓ Day once added.",
      },
      {
        id: 9,
        x: 87, y: 28.1,
        title: "+ Wish Button",
        description: "Save this outfit or item to your Wishes list as a reminder to buy or bring it on a future trip.",
      },
    ],
    editScreenshot: "/images/guide/mobile-feature-outfitting-edit.png",
    editTitle: "Edit Outfit",
    editCallouts: [
      {
        id: 1,
        x: 50, y: 15.5,
        title: "Edit Outfit",
        description: "The edit form for an outfit or packing item, shown as a modal over the current screen. Open by tapping any item in the Outfitting list.",
      },
      {
        id: 2,
        x: 50, y: 20.8,
        title: "Mark as Completed",
        description: "Marks the item as packed for today. Syncs back to the PWA so your packing stats are accurate.",
      },
      {
        id: 3,
        x: 50, y: 29.8,
        title: "Name",
        description: "The item name. Editable here and in the PWA Prepare page.",
      },
      {
        id: 4,
        x: 50, y: 41,
        title: "Notes",
        description: "Any notes about the item — size, where you packed it, a reminder to bring a specific accessory.",
      },
      {
        id: 5,
        x: 20, y: 54.5,
        title: "Photos",
        description: "Add up to 10 photos per item — a running count (e.g. '3/10 photos') appears once you've added at least one. Great for outfit planning — photograph the outfit laid out so you remember exactly what goes together.",
      },
      {
        id: 6,
        x: 27, y: 65.7,
        title: "Add to Timeline",
        description: "Link this outfit to a specific time on your day's timeline — useful for costume changes or themed outfit moments during the visit.",
      },
      {
        id: 7,
        x: 50, y: 74.9,
        title: "Priority A–E",
        description: "Sets how important this item is. A = must have, E = nice to have. Items sort by priority in the list.",
      },
      {
        id: 8,
        x: 50, y: 83.5,
        title: "Cancel / Remove / Save",
        description: "Cancel closes without saving. Remove deletes the item from your catalog entirely. Save commits your changes.",
      },
    ],
  },

  // ── TAKE HOME / SHOPPING ─────────────────────────────────────────────────
  {
    slug: "shopping",
    title: "Take Home",
    subtitle: "Your shopping list — track what you want to buy, where, and how much you've spent.",
    screenshot: "/images/guide/mobile-feature-shopping.png",
    callouts: [
      {
        id: 1,
        x: 50, y: 8,
        title: "Things to Take Home",
        description: "Your shopping list for the visit. Items are organised by shop, so you can pick up everything from one location in a single stop.",
      },
      {
        id: 2,
        x: 21, y: 16.5,
        title: "Purchased Counter",
        description: "How many items you've marked as bought today vs your total list. Updates as you check items off.",
      },
      {
        id: 3,
        x: 48, y: 16.5,
        title: "Remaining",
        description: "Items still to buy. A quick glance tells you if you've got everything before leaving a shop.",
      },
      {
        id: 4,
        x: 77, y: 16.5,
        title: "Spent",
        description: "Running total of what you've spent, based on the prices set on each item. Helps you stay on budget.",
      },
      {
        id: 5,
        x: 15, y: 23.5,
        title: "Show Bought",
        description: "Toggle to show or hide items you've already purchased. Hides the clutter so you focus on what's left.",
      },
      {
        id: 6,
        x: 61, y: 23.5,
        title: "Category / Shop Filter",
        description: "Toggle between grouping the list by Category or by Shop. Useful in a large park where shops are spread across different lands.",
      },
      {
        id: 7,
        x: 86, y: 23.5,
        title: "+ Add Item",
        description: "Add a new shopping item on the spot. Set the name, shop, price, and priority. The item is also added to your catalog for future trips.",
      },
      {
        id: 8,
        x: 70, y: 28.4,
        title: "Shop Header",
        description: "Groups items by shop. The count shows how many items you have from this shop. Tap ▼ to collapse the group.",
      },
      {
        id: 9,
        x: 30, y: 34.5,
        title: "Shopping Item",
        description: "Shows the item name and price. Tap the checkbox to mark it purchased — the item gets a strikethrough and green border. Tap the item itself to edit details.",
      },
      {
        id: 10,
        x: 87, y: 34.5,
        title: "+ Day / + Wish",
        description: "Add to today's Home screen (to remind yourself to stop at this shop) or save as a Wish for a future visit — once wished, the button becomes a gold star.",
      },
    ],
  },

  // ── WISHES ───────────────────────────────────────────────────────────────
  {
    slug: "wishes",
    title: "Wishes",
    subtitle: "Your personal bucket list — things you want to do or experience at the park.",
    screenshot: "/images/guide/mobile-feature-wishes.png",
    callouts: [
      {
        id: 1,
        x: 50, y: 8,
        title: "My Wishes",
        description: "Your personal wish list — rides, shows, dining, character meets, photo spots, and more. Wishes carry across all trips.",
      },
      {
        id: 2,
        x: 50, y: 14.3,
        title: "Stats Row",
        description: "Total wishes, how many are done, and how many are still pending. Updates as you complete items during your visit.",
      },
      {
        id: 3,
        x: 50, y: 21.8,
        title: "Filter by Tags",
        description: "Filter your wish list by type: Rides, Shows, Dining, Shopping, Places, or Other. The number shows how many wishes of each type you have. Tap multiple to combine; Clear All resets the filter.",
      },
      {
        id: 4,
        x: 21, y: 28.5,
        title: "Show Completed",
        description: "Toggle to include or exclude wishes you've already achieved. Great for reviewing your accomplishments at the end of a visit.",
      },
      {
        id: 5,
        x: 58, y: 28.5,
        title: "Select",
        description: "Enter multi-select mode to bulk-add several wishes to today at once, instead of tapping each one individually.",
      },
      {
        id: 6,
        x: 87, y: 28.5,
        title: "+ Add",
        description: "Add a new wish — anything you want to do or experience. Set a tag, priority, notes, and link it directly to a park attraction. When you link an attraction, the tag sets automatically based on its type (ride, show, dining, or place).",
      },
      {
        id: 7,
        x: 30, y: 34,
        title: "Wish Item",
        description: "Tap to edit. Each wish can have a tag, priority, photos, notes, a linked park attraction, and a timeline time. Swipe left to delete.",
      },
      {
        id: 8,
        x: 82, y: 34,
        title: "Type Icon",
        description: "The icon reflects the wish tag — 🎢 rides, 🎭 shows, 🍽️ dining, 📍 places, 🛍️ shopping, ⭐ other. Auto-set when you link a park attraction.",
      },
      {
        id: 9,
        x: 90, y: 34,
        title: "+ Button",
        description: "Tap to select this wish for today's Home screen without opening the edit form — the button becomes a gold ✓ once added. Selected wishes appear in the Wishes section of your Home screen all-day list.",
      },
    ],
  },

  // ── SETTINGS ─────────────────────────────────────────────────────────────
  {
    slug: "settings",
    title: "Settings",
    subtitle: "App configuration, data management, family members, and account information.",
    screenshot: "/images/guide/mobile-feature-settings.png",
    callouts: [
      {
        id: 1,
        x: 50, y: 8,
        title: "Settings",
        description: "Access from the gear icon on any screen. Settings apply to the current active date.",
      },
      {
        id: 2,
        x: 50, y: 14.5,
        title: "Trip Users",
        description: "Manage the family members or friends sharing this visit. Each user gets their own colour and can own rides, dining, outfits, and shopping items.",
      },
      {
        id: 3,
        x: 50, y: 24.3,
        title: "Preferences",
        description: "Set your default travel time between attractions, autocomplete suggestions for the park map, and other display preferences.",
      },
      {
        id: 4,
        x: 50, y: 34,
        title: "Data & Sync",
        description: "Everything about moving data in and out of the app, grouped in one place: Cloud Sync (opt-in end-to-end encrypted sync across devices via Apple/Google/email sign-in), Transfer & Share (export/import/archive via file, Share My Day PDF, Photo Gallery), and a Danger Zone toggle you open separately to permanently delete data.",
      },
      {
        id: 5,
        x: 50, y: 43.9,
        title: "Park Data",
        description: "Shows the version and timestamp of the park data (rides, shows, dining) downloaded from the server. Tap to refresh if data seems outdated.",
      },
      {
        id: 6,
        x: 50, y: 53.65,
        title: "What's New",
        description: "Release notes and park updates. Check here after an app update to see new features, or when Disney announces changes like attraction renames.",
      },
      {
        id: 7,
        x: 50, y: 63.5,
        title: "Legal",
        description: "Privacy policy, terms of service, and contact information. Also contains the Disney disclaimer (unofficial fan app).",
      },
      {
        id: 8,
        x: 50, y: 73.25,
        title: "About",
        description: "App version, credits, data source, and quick access to Help & Tips.",
      },
    ],
  },
];

export function getMobileScreen(slug: string): MobileScreen | undefined {
  return MOBILE_SCREENS.find((s) => s.slug === slug);
}
