import type { PublishData, DayData } from "@/hooks/use-publish-data";
import db, { type DayItemRecord } from "@/lib/db";
import { buildResortTrailSVG, type MapMarker, type LandOverlayFeature } from "./resort-map-svg";
import { getAttractionCoords, type CoordMaps } from "./park-data";
import { LAND_COORDINATES } from "./map-data";
import type { TrailTimeRanges } from "@/components/publish/TrailGallery";

// ==================== HELPERS ====================

const SOURCE_ICONS: Record<string, string> = {
  ride:          "🎢",
  show:          "🎭",
  wish:          "⭐",
  dining:        "🍽️",
  shopping:      "🛍️",
  outfit:        "👗",
  equipment:     "🎒",
  sundry:        "🧣",
  place:         "📍",
  lightning_lane:"⚡",
  custom:        "📌",
};

function formatTime12(time24: string): string {
  if (!time24 || !time24.includes(":")) return "";
  const [hh, mm] = time24.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return "";
  const period  = hh >= 12 ? "PM" : "AM";
  const hour12  = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${hour12}:${mm.toString().padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const date   = new Date(dateStr + "T12:00:00");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// ==================== TRAIL FILTERING ====================

type RawPoint = { timestamp: number; latitude: number; longitude: number; accuracy?: number | undefined };

function filterPointsByRange(points: RawPoint[], from: string, to: string): RawPoint[] {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const fromMins = fh * 60 + fm;
  const toMins   = th * 60 + tm;
  return points.filter((p) => {
    const d    = new Date(p.timestamp);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins >= fromMins && mins <= toMins;
  });
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcDistanceMiles(points: RawPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMiles(
      points[i-1].latitude, points[i-1].longitude,
      points[i].latitude,   points[i].longitude,
    );
  }
  return total;
}

function calcDurationMinutes(points: RawPoint[]): number {
  if (points.length < 2) return 0;
  return Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 60_000);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ==================== MAP MARKER HELPERS ====================

const MARKER_COLORS: Record<string, string> = {
  ride:          "#1976D2",
  show:          "#7B1FA2",
  dining:        "#E65100",
  wish:          "#996515",
  lightning_lane:"#F57C00",
  shopping:      "#E91E63",
  place:         "#2E7D32",
  equipment:     "#546E7A",
  outfit:        "#8D6E63",
  custom:        "#757575",
  sundry:        "#757575",
};

function findCoordForItem(item: DayItemRecord, coordMaps: CoordMaps): { lat: number; lng: number } | null {
  if (item.parkDataId && coordMaps.byId[item.parkDataId]) {
    const c = coordMaps.byId[item.parkDataId];
    if (isFinite(c.latitude) && isFinite(c.longitude)) return { lat: c.latitude, lng: c.longitude };
  }
  const key    = item.title.toLowerCase().trim();
  const byName = coordMaps.byName[key];
  if (byName && isFinite(byName.latitude) && isFinite(byName.longitude)) {
    return { lat: byName.latitude, lng: byName.longitude };
  }
  for (const [name, coord] of Object.entries(coordMaps.byName)) {
    if (key.length >= 3 && name.includes(key) && isFinite(coord.latitude)) {
      return { lat: coord.latitude, lng: coord.longitude };
    }
  }
  if (item.land) {
    const lc = LAND_COORDINATES[item.land];
    if (lc && isFinite(lc.lat) && isFinite(lc.lng)) return { lat: lc.lat, lng: lc.lng };
  }
  return null;
}

function buildMarkersForItems(items: DayItemRecord[], coordMaps: CoordMaps): MapMarker[] {
  const markers: MapMarker[] = [];
  for (const item of items) {
    if (!item.completed) continue;
    const coord = findCoordForItem(item, coordMaps);
    if (!coord) continue;
    const time = item.scheduledTime ? formatTime12(item.scheduledTime) : "";
    markers.push({
      lat:   coord.lat,
      lng:   coord.lng,
      color: MARKER_COLORS[item.itemType] ?? "#757575",
      icon:  SOURCE_ICONS[item.itemType]  ?? "📌",
      label: time ? `${time}|${item.title}` : `|${item.title}`,
    });
  }
  return markers;
}

// ==================== HTML BUILDERS ====================

function buildDaySection(day: DayData): string {
  const isComplete = day.total > 0 && day.completed === day.total;
  const items = day.items.map((item) => `
    <div style="display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:6px;
                background:${item.completed ? "rgba(34,197,94,0.08)" : "#F7F5F2"};">
      <span style="font-size:11px;font-family:monospace;width:65px;color:#6E7180;flex-shrink:0;">
        ${formatTime12(item.scheduledTime ?? "")}
      </span>
      <span style="font-size:13px;">${SOURCE_ICONS[item.itemType] ?? "📌"}</span>
      <span style="font-size:12px;flex:1;color:${item.completed ? "#6E7180" : "#1C1C28"};
                   ${item.completed ? "text-decoration:line-through;" : ""}">
        ${item.title}
      </span>
      ${item.land ? `<span style="font-size:10px;color:#6E7180;">${item.land}</span>` : ""}
      ${item.completed ? '<span style="font-size:11px;color:#22c55e;">✓</span>' : ""}
    </div>`).join("");

  return `
    <div style="margin-bottom:12px;border:1px solid ${isComplete ? "rgba(34,197,94,0.3)" : "#E5E2DD"};
                border-left:3px solid #996515;border-radius:10px;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F7F5F2;">
        <span style="font-size:13px;font-weight:600;color:#1C1C28;">${day.displayDate}</span>
        <div style="flex:1;height:4px;border-radius:2px;background:#E5E2DD;overflow:hidden;">
          <div style="width:${day.percentComplete}%;height:100%;border-radius:2px;
                       background:${isComplete ? "#22c55e" : "#1976D2"};"></div>
        </div>
        <span style="font-size:10px;font-family:monospace;color:${isComplete ? "#22c55e" : "#4A4A5A"};">
          ${day.total > 0 ? `${day.completed}/${day.total} (${day.percentComplete}%)` : "No items"}
        </span>
        ${isComplete ? '<span style="font-size:12px;">✅</span>' : ""}
      </div>
      ${day.items.length > 0 ? `
        <div style="padding:6px 14px 10px;border-top:1px solid #E5E2DD;">${items}</div>
      ` : ""}
    </div>`;
}

function buildParkBar(name: string, count: number, maxCount: number, color: string): string {
  const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:4px 0;">
      <span style="font-size:11px;width:140px;text-align:right;color:#4A4A5A;flex-shrink:0;
                   overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
      <div style="flex:1;height:16px;border-radius:8px;background:#E5E2DD;overflow:hidden;">
        <div style="width:${Math.max(widthPercent, 8)}%;height:100%;border-radius:8px;
                     background:${color};opacity:0.85;"></div>
      </div>
      <span style="font-size:10px;font-family:monospace;color:#6E7180;width:30px;flex-shrink:0;">${count}</span>
    </div>`;
}

/** Page 1 — Trip overview, day breakdown, park analytics. No photos. */
function buildMainHTML(data: PublishData): string {
  const { trip, days, totalWishes, completedWishes, totalItineraryItems,
          completedItineraryItems, totalPackingItems, completedPackingItems,
          parkBreakdown, landBreakdown } = data;

  const overallPercent = totalItineraryItems > 0
    ? Math.round((completedItineraryItems / totalItineraryItems) * 100) : 0;

  const statsHTML = [
    { label: "Wishes",    icon: "⭐",      completed: completedWishes,          total: totalWishes },
    { label: "Itinerary", icon: "📅", completed: completedItineraryItems, total: totalItineraryItems },
    { label: "Packing",   icon: "🎒", completed: completedPackingItems,   total: totalPackingItems },
    { label: "Days",      icon: "☀️", completed: days.length,             total: days.length },
  ].map((s) => `
    <div style="flex:1;min-width:120px;padding:14px;border-radius:10px;background:#F7F5F2;border:1px solid #E5E2DD;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <span style="font-size:14px;">${s.icon}</span>
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E7180;font-weight:600;">${s.label}</span>
      </div>
      <div style="font-size:22px;font-weight:700;color:#1976D2;">
        ${s.completed}${s.label !== "Days" ? `<span style="font-size:12px;color:#4A4A5A;font-weight:400;"> / ${s.total}</span>` : ""}
      </div>
      ${s.total > 0 && s.label !== "Days" ? `
        <div style="height:4px;border-radius:2px;background:#E5E2DD;margin-top:6px;overflow:hidden;">
          <div style="width:${Math.round((s.completed / s.total) * 100)}%;height:100%;border-radius:2px;
                       background:${s.completed === s.total ? "#22c55e" : "#1976D2"};"></div>
        </div>` : ""}
    </div>`).join("");

  const parkEntries  = Object.entries(parkBreakdown).sort((a, b) => b[1].count - a[1].count);
  const maxParkCount = parkEntries.reduce((m, [, d]) => Math.max(m, d.count), 0);
  const landEntries  = Object.entries(landBreakdown).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  const maxLandCount = landEntries.reduce((m, [, d]) => Math.max(m, d.count), 0);

  return `
    <div id="pdf-main" style="width:800px;padding:40px;background:#FFFFFF;color:#1C1C28;
                               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <span style="font-size:28px;font-weight:700;color:#1976D2;">${trip.name}</span>
          <span style="font-size:24px;">🏰</span>
        </div>
        <p style="font-size:11px;color:#6E7180;margin:0 0 10px 0;">
          ${formatDate(trip.startDate)} — ${formatDate(trip.endDate)} · ${days.length} ${days.length === 1 ? "day" : "days"}
        </p>
        ${totalItineraryItems > 0 ? `
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:1;height:6px;border-radius:3px;background:#E5E2DD;overflow:hidden;">
              <div style="width:${overallPercent}%;height:100%;border-radius:3px;
                           background:${overallPercent === 100 ? "#22c55e" : "#1976D2"};"></div>
            </div>
            <span style="font-size:11px;font-weight:600;color:${overallPercent === 100 ? "#22c55e" : "#1976D2"};">
              ${overallPercent}% complete
            </span>
          </div>` : ""}
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px;">${statsHTML}</div>

      ${days.some((d) => d.total > 0) ? `
        <div style="margin-bottom:28px;">
          <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#996615;
                     font-weight:700;margin:0 0 12px 0;border-left:3px solid #996615;padding-left:8px;">
            Day-by-Day Breakdown
          </h2>
          ${days.map(buildDaySection).join("")}
        </div>` : ""}

      ${parkEntries.length > 0 || landEntries.length > 0 ? `
        <div style="margin-bottom:28px;">
          <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#996615;
                     font-weight:700;margin:0 0 12px 0;border-left:3px solid #996615;padding-left:8px;">
            Park Analytics
          </h2>
          <div style="display:flex;gap:16px;">
            ${parkEntries.length > 0 ? `
              <div style="flex:1;padding:14px;border-radius:10px;background:#F7F5F2;border:1px solid #E5E2DD;">
                <h3 style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E7180;font-weight:600;margin:0 0 8px 0;">By Park</h3>
                ${parkEntries.map(([name, d]) => buildParkBar(name, d.count, maxParkCount, "#1976D2")).join("")}
              </div>` : ""}
            ${landEntries.length > 0 ? `
              <div style="flex:1;padding:14px;border-radius:10px;background:#F7F5F2;border:1px solid #E5E2DD;">
                <h3 style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E7180;font-weight:600;margin:0 0 8px 0;">Top Lands</h3>
                ${landEntries.map(([name, d]) => buildParkBar(name, d.count, maxLandCount, "#1976D2")).join("")}
              </div>` : ""}
          </div>
        </div>` : ""}

      <div style="text-align:center;padding-top:16px;border-top:1px solid #E5E2DD;">
        <p style="font-size:10px;color:#6E7180;margin:0;">Generated by ParQwish · ${new Date().toLocaleDateString()}</p>
      </div>
    </div>`;
}

/** Per-day trail page — where you walked stats + resort map SVG. */
function buildDayTrailHTML(
  mapImageUrl:  string | undefined,
  landGeoJSON:  { features: LandOverlayFeature[] } | null,
  markers:      MapMarker[],
  trailPoints:  Array<{ lat: number; lng: number }>,
  dayLabel:     string,
  trailStats:   { distanceMiles: number; durationMinutes: number; pointCount: number } | null,
  timeRange:    { from: string; to: string } | null,
): string {
  const hasTrail  = trailPoints.length >= 2;
  const statsHTML = trailStats && hasTrail ? `
    <div style="display:flex;gap:20px;margin-bottom:10px;">
      <div>
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E7180;font-weight:600;">Distance</span>
        <div style="font-size:18px;font-weight:700;color:#1976D2;">${trailStats.distanceMiles.toFixed(1)} <span style="font-size:11px;color:#6E7180;">mi</span></div>
      </div>
      <div>
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E7180;font-weight:600;">Duration</span>
        <div style="font-size:18px;font-weight:700;color:#1976D2;">${formatDuration(trailStats.durationMinutes)}</div>
      </div>
      <div>
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E7180;font-weight:600;">GPS Points</span>
        <div style="font-size:18px;font-weight:700;color:#1976D2;">${trailStats.pointCount.toLocaleString()}</div>
      </div>
      ${timeRange ? `
        <div>
          <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6E7180;font-weight:600;">Time Range</span>
          <div style="font-size:13px;font-weight:600;color:#1C1C28;margin-top:3px;">
            ${formatTime12(timeRange.from)} – ${formatTime12(timeRange.to)}
          </div>
        </div>` : ""}
    </div>` : "";

  const noteHTML = markers.length > 0
    ? `<p style="font-size:9px;color:#6E7180;margin:8px 0 0 0;">${markers.length} completed item${markers.length !== 1 ? "s" : ""} shown on map</p>`
    : "";

  const mapSVG = buildResortTrailSVG(trailPoints, {
    width: 720,
    mapImageUrl: mapImageUrl ?? "/images/resort-map.svg",
    showLands: true,
    landGeoJSON: landGeoJSON ?? undefined,
    markers,
  });

  return `
    <div id="pdf-map" style="width:800px;padding:40px;background:#FFFFFF;color:#1C1C28;
                              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:14px;">
        <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#996615;
                   font-weight:700;margin:0;border-left:3px solid #996615;padding-left:8px;">
          Where You Walked
        </h2>
        <span style="font-size:13px;font-weight:600;color:#1C1C28;">${dayLabel}</span>
      </div>
      ${statsHTML}
      <div style="border:1px solid #E5E2DD;border-radius:10px;overflow:hidden;">${mapSVG}</div>
      ${noteHTML}
    </div>`;
}

/** Last pages — photo grid, 6 photos per page. */
function buildPhotosHTML(photos: PublishData["allPhotos"]): string {
  if (photos.length === 0) return "";
  const photoItems = photos.map((p) => `
    <div style="width:calc(33.33% - 6px);aspect-ratio:1;border-radius:8px;overflow:hidden;background:#E5E2DD;">
      <img src="${p.url}" alt="${p.caption}"
           style="width:100%;height:100%;object-fit:cover;" />
      <div style="font-size:9px;color:#6E7180;padding:3px 6px;white-space:nowrap;
                  overflow:hidden;text-overflow:ellipsis;background:#F7F5F2;">
        ${p.caption}
      </div>
    </div>`).join("");

  return `
    <div id="pdf-photos" style="width:800px;padding:40px;background:#FFFFFF;color:#1C1C28;
                                 font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <h2 style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#996615;
                 font-weight:700;margin:0 0 16px 0;border-left:3px solid #996615;padding-left:8px;">
        Trip Photos (${photos.length})
      </h2>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">${photoItems}</div>
    </div>`;
}

// ==================== MAIN EXPORT ====================

export async function generateTripPDF(
  data:            PublishData,
  trailTimeRanges: TrailTimeRanges = {},
): Promise<void> {
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF }  = await import("jspdf");

  // 1. Fetch map assets + coords + raw trails in parallel
  const [mapImageUrl, landGeoJSON, coordMaps, rawTrails] = await Promise.all([
    fetch("/images/resort-map.svg")
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => text ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}` : undefined)
      .catch(() => undefined),
    fetch("/data/land-overlays.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null) as Promise<{ features: LandOverlayFeature[] } | null>,
    getAttractionCoords(),
    db.trails.where("tripId").equals(data.trip.id).toArray().catch(() => []),
  ]);

  // 2. Group and sort raw trail points by date, applying time range filters
  const trailByDate: Record<string, Array<{ lat: number; lng: number; ts: number }>> = {};
  const trailStatsByDate: Record<string, { distanceMiles: number; durationMinutes: number; pointCount: number }> = {};

  for (const trail of rawTrails) {
    const sorted = [...trail.points].sort((a, b) => a.timestamp - b.timestamp);
    const range  = trailTimeRanges[trail.date];
    const pts    = range ? filterPointsByRange(sorted, range.from, range.to) : sorted;
    if (!trailByDate[trail.date]) trailByDate[trail.date] = [];
    for (const p of pts) {
      trailByDate[trail.date].push({ lat: p.latitude, lng: p.longitude, ts: p.timestamp });
    }
  }

  for (const [date, pts] of Object.entries(trailByDate)) {
    pts.sort((a, b) => a.ts - b.ts);
    const rawPts = pts.map((p) => ({ timestamp: p.ts, latitude: p.lat, longitude: p.lng }));
    trailStatsByDate[date] = {
      distanceMiles:   calcDistanceMiles(rawPts),
      durationMinutes: calcDurationMinutes(rawPts),
      pointCount:      pts.length,
    };
  }

  // 3. Build HTML sections
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";

  // Page 1: overview
  const mainDiv = document.createElement("div");
  mainDiv.innerHTML = buildMainHTML(data);
  wrapper.appendChild(mainDiv);

  // Pages 2–N: one per day with trail or completed items
  const mapDivs: HTMLDivElement[] = [];
  for (const day of data.days) {
    const rawPts    = trailByDate[day.date] ?? [];
    const dayTrail  = rawPts.map((p) => ({ lat: p.lat, lng: p.lng }));
    const dayMarkers = buildMarkersForItems(day.items, coordMaps);
    if (dayTrail.length < 2 && dayMarkers.length === 0) continue;

    const stats     = trailStatsByDate[day.date] ?? null;
    const range     = trailTimeRanges[day.date] ?? null;
    const div       = document.createElement("div");
    div.innerHTML   = buildDayTrailHTML(mapImageUrl, landGeoJSON, dayMarkers, dayTrail, day.displayDate, stats, range);
    wrapper.appendChild(div);
    mapDivs.push(div);
  }

  // Last pages: photos
  let photosDiv: HTMLDivElement | null = null;
  if (data.allPhotos.length > 0) {
    photosDiv = document.createElement("div");
    photosDiv.innerHTML = buildPhotosHTML(data.allPhotos);
    wrapper.appendChild(photosDiv);
  }

  document.body.appendChild(wrapper);

  try {
    const mainEl = mainDiv.querySelector("#pdf-main") as HTMLElement;
    if (!mainEl) throw new Error("PDF main element not found");

    const canvasOpts = { scale: 2, backgroundColor: "#FFFFFF", useCORS: true, logging: false };
    const pdf        = new jsPDF("p", "mm", "a4");
    const imgWidth   = 210;
    const pageHeight = 297;
    let totalPages   = 0;

    function addCanvasPages(canvas: HTMLCanvasElement): void {
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData   = canvas.toDataURL("image/jpeg", 0.92);
      if (totalPages > 0) pdf.addPage();
      totalPages++;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      let remaining = imgHeight - pageHeight;
      let offset    = -pageHeight;
      while (remaining > 0) {
        pdf.addPage();
        totalPages++;
        pdf.addImage(imgData, "JPEG", 0, offset, imgWidth, imgHeight);
        offset    -= pageHeight;
        remaining -= pageHeight;
      }
    }

    // Page 1: main overview
    addCanvasPages(await html2canvas(mainEl, canvasOpts));

    // Pages 2–N: per-day trail maps
    for (const div of mapDivs) {
      const mapEl = div.querySelector("#pdf-map") as HTMLElement;
      if (!mapEl) continue;
      addCanvasPages(await html2canvas(mapEl, canvasOpts));
    }

    // Last pages: photos
    if (photosDiv) {
      const photosEl = photosDiv.querySelector("#pdf-photos") as HTMLElement;
      if (photosEl) addCanvasPages(await html2canvas(photosEl, canvasOpts));
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(`Page ${i} of ${totalPages}`, imgWidth - 25, pageHeight - 5);
    }

    const safeName = data.trip.name.replace(/[^a-zA-Z0-9]/g, "-");
    pdf.save(`ParQ-Wish-${safeName}-Recap.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}
