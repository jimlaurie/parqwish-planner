// ==================== TRIP REPORT ====================
// Generates a print-ready HTML document for a trip's itinerary and opens it
// in a new window so the user can Save as PDF or print directly.
//
// Uses CSS Paged Media (@page margin boxes) for page numbers — supported by
// Chrome, which is the primary target for browser-based PDF export.
// A fixed-position header repeats the logo + generation timestamp on every page.

import type { Trip, FlightLeg, HotelStay, TransportLeg } from "@/lib/db";

// ==================== HELPERS ====================

function fmt(date?: string): string {
  if (!date) return "—";
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(): string {
  return new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function row(label: string, value?: string): string {
  if (!value) return "";
  return `<tr><td class="label">${label}</td><td class="value">${value}</td></tr>`;
}

function section(title: string, icon: string, content: string): string {
  if (!content.trim()) return "";
  return `
    <div class="section">
      <h2>${icon} ${title}</h2>
      ${content}
    </div>`;
}

// ==================== FLIGHT SECTION ====================

function renderFlights(flights?: FlightLeg[]): string {
  if (!flights?.length) return "";
  const cards = flights.map((f, i) => `
    <div class="card">
      <div class="card-title">Flight ${i + 1}${f.airline ? ` — ${f.airline}` : ""}${f.flightNumber ? ` ${f.flightNumber}` : ""}</div>
      <table class="data-table">
        ${row("Date", f.date ? fmt(f.date) : undefined)}
        ${row("Departure time", f.time)}
        ${row("From", f.from)}
        ${row("To", f.to)}
        ${row("Confirmation", f.confirmation)}
        ${row("Notes", f.notes)}
      </table>
    </div>`).join("");
  return section("Flights", "✈️", cards);
}

// ==================== HOTEL SECTION ====================

function renderHotels(hotels?: HotelStay[]): string {
  if (!hotels?.length) return "";
  const cards = hotels.map((h, i) => `
    <div class="card">
      <div class="card-title">Hotel ${i + 1}${h.name ? ` — ${h.name}` : ""}</div>
      <table class="data-table">
        ${row("Check-in", h.checkIn ? fmt(h.checkIn) : undefined)}
        ${row("Check-out", h.checkOut ? fmt(h.checkOut) : undefined)}
        ${row("Confirmation", h.confirmation)}
        ${row("Notes", h.notes)}
      </table>
    </div>`).join("");
  return section("Hotels", "🏨", cards);
}

// ==================== TRANSPORT SECTION ====================

function renderTransport(transports?: TransportLeg[]): string {
  if (!transports?.length) return "";
  const cards = transports.map((t, i) => `
    <div class="card">
      <div class="card-title">Transport ${i + 1}${t.type ? ` — ${t.type}` : ""}</div>
      <table class="data-table">
        ${row("Date", t.date ? fmt(t.date) : undefined)}
        ${row("Details", t.details)}
        ${row("Notes", t.notes)}
      </table>
    </div>`).join("");
  return section("Transportation", "🚗", cards);
}

// ==================== NOTES SECTION ====================

function renderNotes(notes?: string): string {
  if (!notes?.trim()) return "";
  const escaped = notes.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return section("Trip Notes", "📝", `<p class="notes-text">${escaped.replace(/\n/g, "<br>")}</p>`);
}

// ==================== HTML TEMPLATE ====================

function buildHtml(trip: Trip, logoUrl: string, generated: string): string {
  const flights   = renderFlights(trip.flights);
  const hotels    = renderHotels(trip.hotels);
  const transport = renderTransport(trip.transports);
  const notes     = renderNotes(trip.notes);
  const hasContent = flights || hotels || transport || notes;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${trip.name} — Trip Itinerary</title>
  <style>
    /* ── Page setup ── */
    @page {
      size: letter;
      margin: 28mm 15mm 22mm 15mm;
      @bottom-left {
        content: "ParQwish is not responsible for the accuracy of this information. Always verify details with service providers.";
        font-size: 7pt;
        color: #888;
        font-family: Georgia, serif;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #888;
        font-family: Georgia, serif;
      }
    }

    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 10pt;
      color: #1a1a1a;
      line-height: 1.5;
      background: white;
    }

    /* ── Fixed header (repeats every page) ── */
    .page-header {
      position: fixed;
      top: -20mm;
      left: -15mm;
      right: -15mm;
      height: 20mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 15mm;
      border-bottom: 1pt solid #d4af37;
      background: white;
    }
    .page-header img {
      height: 10mm;
      width: auto;
    }
    .page-header .generated {
      font-size: 7.5pt;
      color: #666;
      font-style: italic;
    }

    /* ── Cover / trip title ── */
    .trip-title {
      font-size: 22pt;
      font-weight: bold;
      color: #1a1a2e;
      margin-bottom: 4pt;
    }
    .trip-dates {
      font-size: 11pt;
      color: #555;
      margin-bottom: 24pt;
      padding-bottom: 10pt;
      border-bottom: 2pt solid #d4af37;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 20pt;
      page-break-inside: avoid;
    }
    .section h2 {
      font-size: 13pt;
      color: #1a1a2e;
      border-bottom: 1pt solid #e0d4a0;
      padding-bottom: 3pt;
      margin-bottom: 10pt;
    }

    /* ── Cards (one per flight/hotel/transport) ── */
    .card {
      margin-bottom: 10pt;
      padding: 8pt 10pt;
      border: 1pt solid #e5e5e5;
      border-left: 3pt solid #d4af37;
      border-radius: 3pt;
      page-break-inside: avoid;
    }
    .card-title {
      font-size: 10pt;
      font-weight: bold;
      color: #333;
      margin-bottom: 5pt;
    }

    /* ── Data table ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    .data-table td {
      padding: 2pt 4pt;
      vertical-align: top;
    }
    .data-table td.label {
      width: 32%;
      color: #777;
      font-style: italic;
      white-space: nowrap;
    }
    .data-table td.value {
      color: #1a1a1a;
    }

    /* ── Notes ── */
    .notes-text {
      font-size: 10pt;
      color: #333;
      line-height: 1.7;
      white-space: pre-wrap;
    }

    /* ── Empty state ── */
    .empty {
      font-style: italic;
      color: #888;
      font-size: 10pt;
      margin-top: 12pt;
    }
  </style>
</head>
<body>
  <!-- Fixed header: renders on every page -->
  <div class="page-header">
    <img src="${logoUrl}" alt="ParQwish">
    <span class="generated">Generated ${generated}</span>
  </div>

  <!-- Trip summary -->
  <div class="trip-title">${trip.name}</div>
  <div class="trip-dates">
    ${trip.startDate && trip.endDate
      ? `${fmt(trip.startDate)} &nbsp;→&nbsp; ${fmt(trip.endDate)}`
      : trip.startDate
        ? `From ${fmt(trip.startDate)}`
        : "Dates not set"}
  </div>

  ${hasContent
    ? flights + hotels + transport + notes
    : '<p class="empty">No travel details have been added to this trip yet.</p>'}

</body>
</html>`;
}

// ==================== PUBLIC API ====================

/**
 * Open a print-ready trip itinerary report in a new window.
 * The user can Save as PDF or print directly from the browser dialog.
 */
export function printTripReport(trip: Trip): void {
  const generated = fmtDateTime();
  // Absolute URL so the logo loads correctly in the new window
  const logoUrl = window.location.origin + "/images/parqwish-logo.png";
  const html = buildHtml(trip, logoUrl, generated);

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site and try again.");
    return;
  }
  win.document.write(html);
  win.document.close();
  // Slight delay lets images (logo) load before print dialog opens
  win.addEventListener("load", () => win.print());
}
