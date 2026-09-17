"use client";

// ==================== RESORT MASK ====================
// A soft-edged "donut" (annulus) dimming wash around the resort, rendered on
// every Leaflet trip map (ParkMap, TrailMiniMap, TripMapView) so the resort
// itself reads as the clear subject against the surrounding city instead of
// blending into a wash of Anaheim streets and building labels. Fully
// transparent hole over the resort's own footprint, a soft ramp up to a
// dimming wash, a flat opaque ring, then a soft ramp back down to
// transparent. This also naturally covers street-name labels underneath the
// dimmed ring — no tile-provider change needed for that.
//
// Built with react-leaflet's SVGOverlay (a real <svg> bound to a geographic
// LatLngBounds, auto-repositioned/rescaled by Leaflet on pan/zoom) rather
// than a GeoJSON polygon, since a GeoJSON shape only supports a single flat
// fill — no gradient. The "oblong" look comes from binding a symmetric
// radial gradient to a deliberately non-square bounds rectangle with
// preserveAspectRatio="none" — a visual choice, not a geodesic one (Web
// Mercator distortion over a ~3mi span at this latitude is an accepted
// simplification for a soft dimming wash, not precision mapping).
//
// MASK_COLOR is a raw hex constant, not a CSS var — matches this file's
// CLAUDE.md-documented Gotcha ("SVG fill/stroke attributes don't resolve
// CSS vars") and the existing precedent in every map component that renders
// this (TRAIL_COLOR, FLAG_COLOR, MARKER_COLORS, LAND_COLORS are all raw hex
// for the same reason).

import { useId, useMemo } from "react";
import { Pane, SVGOverlay } from "react-leaflet";
import { RESORT_CENTER } from "@/lib/map-data";
import { MILES_PER_DEGREE_LAT, MILES_PER_DEGREE_LNG_AT_EQUATOR } from "@/lib/trail-geo";

const MASK_COLOR = "#0A0A12";

export interface ResortMaskProps {
  center?: { lat: number; lng: number };
  /** Fully transparent up to this radius — the resort's own clear "hole". */
  innerRadiusMiles?: number;
  /** Width of the transparent-to-opaque ramp starting at innerRadiusMiles. */
  innerFadeMiles?: number;
  /** Radius where the flat opaque ring ends and the outward ramp begins. */
  ringOuterMiles?: number;
  /** Radius by which the mask has faded fully back to transparent. */
  fadeOutMiles?: number;
  /** East-west (lng) : north-south (lat) axis ratio — >1 stretches east-west. */
  oblongRatio?: number;
  /** Opacity of the flat ring at its most opaque. */
  peakOpacity?: number;
}

export default function ResortMask({
  center = RESORT_CENTER,
  innerRadiusMiles = 0.45,
  innerFadeMiles = 0.35,
  ringOuterMiles = 2.5,
  fadeOutMiles = 3.5,
  oblongRatio = 1.4,
  peakOpacity = 0.55,
}: ResortMaskProps) {
  const rawId = useId();
  const gradientId = `resort-mask-gradient-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Two MapContainers can be mounted simultaneously (TrailMiniMap's inline
  // card + its own fullscreen-modal expand), each with an independent
  // ResortMask instance — the per-instance id above keeps their gradients
  // from colliding in the shared document.

  const bounds = useMemo((): [[number, number], [number, number]] => {
    const latSpanDeg = fadeOutMiles / MILES_PER_DEGREE_LAT;
    const lngSpanDeg =
      (fadeOutMiles * oblongRatio) / (MILES_PER_DEGREE_LNG_AT_EQUATOR * Math.cos((center.lat * Math.PI) / 180));
    return [
      [center.lat - latSpanDeg, center.lng - lngSpanDeg],
      [center.lat + latSpanDeg, center.lng + lngSpanDeg],
    ];
  }, [center.lat, center.lng, fadeOutMiles, oblongRatio]);

  const stops = useMemo(() => {
    const pct = (miles: number) => Math.min(100, Math.max(0, (miles / fadeOutMiles) * 100));
    return {
      holeEdge: pct(innerRadiusMiles),
      rampInEnd: pct(innerRadiusMiles + innerFadeMiles),
      ringEnd: pct(ringOuterMiles),
    };
  }, [innerRadiusMiles, innerFadeMiles, ringOuterMiles, fadeOutMiles]);

  return (
    <Pane name="resort-mask" style={{ zIndex: 250, pointerEvents: "none" }}>
      <SVGOverlay
        bounds={bounds}
        interactive={false}
        attributes={{ viewBox: "0 0 100 100", preserveAspectRatio: "none" }}
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MASK_COLOR} stopOpacity={0} />
            <stop offset={`${stops.holeEdge}%`} stopColor={MASK_COLOR} stopOpacity={0} />
            <stop offset={`${stops.rampInEnd}%`} stopColor={MASK_COLOR} stopOpacity={peakOpacity} />
            <stop offset={`${stops.ringEnd}%`} stopColor={MASK_COLOR} stopOpacity={peakOpacity} />
            <stop offset="100%" stopColor={MASK_COLOR} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gradientId})`} />
      </SVGOverlay>
    </Pane>
  );
}
