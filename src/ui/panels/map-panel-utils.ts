/**
 * Frontier — Map Panel Utilities
 *
 * Pure helper functions for the living map.
 * No imports from store/, engine/, or React runtime.
 */

import { TimeOfDay, Weather } from '@/types/game-state';
import { TOTAL_TRAIL_MILES } from '@/data/trail-route';
import type { TrailWaypoint } from '@/data/trail-route';

// ============================================================
// COORDINATE SYSTEM
// ============================================================

/**
 * Scale from 0-100 normalized coords to SVG viewBox (420×270).
 * +10 offset on each axis gives a 10px margin for the border frame.
 */
export function toSvg(pos: { x: number; y: number }): { x: number; y: number } {
  return { x: pos.x * 4 + 10, y: pos.y * 2.5 + 10 };
}

// ============================================================
// TRAIL PATH
// ============================================================

/**
 * Build a smooth Catmull-Rom cubic bezier SVG path string through all waypoints.
 * Uses uniform parameterization (tension = 1/6).
 */
export function buildTrailPath(waypoints: TrailWaypoint[]): string {
  const pts = waypoints.map((w) => toSvg(w.mapPosition));
  const n = pts.length;
  if (n < 2) return '';

  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < n - 1; i++) {
    const prev = i === 0
      ? { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y }
      : pts[i - 1];
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const next = i === n - 2
      ? { x: 2 * pts[n - 1].x - pts[n - 2].x, y: 2 * pts[n - 1].y - pts[n - 2].y }
      : pts[i + 2];

    const cp1x = (p0.x + (p1.x - prev.x) / 6).toFixed(1);
    const cp1y = (p0.y + (p1.y - prev.y) / 6).toFixed(1);
    const cp2x = (p1.x - (next.x - p0.x) / 6).toFixed(1);
    const cp2y = (p1.y - (next.y - p0.y) / 6).toFixed(1);

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Build SVG polyline points string for the traveled portion of the trail.
 * Interpolates a fractional endpoint for mid-segment positions.
 */
export function buildTraveledPoints(totalMiles: number, waypoints: TrailWaypoint[]): string {
  const pts: string[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const pos = toSvg(wp.mapPosition);

    if (wp.cumulativeMiles <= totalMiles) {
      pts.push(`${pos.x.toFixed(1)},${pos.y.toFixed(1)}`);
    } else if (i > 0) {
      const prev = waypoints[i - 1];
      const prevPos = toSvg(prev.mapPosition);
      const t = (totalMiles - prev.cumulativeMiles) / (wp.cumulativeMiles - prev.cumulativeMiles);
      const x = prevPos.x + (pos.x - prevPos.x) * t;
      const y = prevPos.y + (pos.y - prevPos.y) * t;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      break;
    }
  }

  return pts.join(' ');
}

/**
 * Interpolate exact player SVG position between waypoints.
 */
export function getPlayerPosition(
  totalMiles: number,
  waypoints: TrailWaypoint[],
): { x: number; y: number } {
  if (totalMiles <= 0) return toSvg(waypoints[0].mapPosition);
  if (totalMiles >= TOTAL_TRAIL_MILES) return toSvg(waypoints[waypoints.length - 1].mapPosition);

  for (let i = 1; i < waypoints.length; i++) {
    if (totalMiles <= waypoints[i].cumulativeMiles) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const t = (totalMiles - prev.cumulativeMiles) / (curr.cumulativeMiles - prev.cumulativeMiles);
      const prevSvg = toSvg(prev.mapPosition);
      const currSvg = toSvg(curr.mapPosition);
      return {
        x: prevSvg.x + (currSvg.x - prevSvg.x) * t,
        y: prevSvg.y + (currSvg.y - prevSvg.y) * t,
      };
    }
  }

  return toSvg(waypoints[waypoints.length - 1].mapPosition);
}

// ============================================================
// FOG OF WAR
// ============================================================

/** Fog reveal radius in SVG units. Grows from 28 at start to 230 at Denver. */
export function computeFogRadius(miles: number): number {
  return Math.max(28, (miles / TOTAL_TRAIL_MILES) * 230);
}

/**
 * Whether a waypoint is within the fog reveal zone (with a 22px grace buffer
 * so waypoints near the edge become legible before fully "entering" the circle).
 */
export function isWaypointRevealed(
  wp: TrailWaypoint,
  playerPos: { x: number; y: number },
  fogRadius: number,
): boolean {
  const pos = toSvg(wp.mapPosition);
  const dx = pos.x - playerPos.x;
  const dy = pos.y - playerPos.y;
  return Math.sqrt(dx * dx + dy * dy) <= fogRadius + 22;
}

// ============================================================
// TIME-OF-DAY
// ============================================================

/**
 * Arc angle (degrees) for sun/moon position on the day arc indicator.
 * 180° = left horizon (rising), 0° = right horizon (setting).
 * -1 = night (moon appears below horizon).
 */
export const TOD_ARC_ANGLE: Record<TimeOfDay, number> = {
  [TimeOfDay.Dawn]: 165,
  [TimeOfDay.Morning]: 135,
  [TimeOfDay.Midday]: 90,
  [TimeOfDay.Afternoon]: 45,
  [TimeOfDay.Sunset]: 15,
  [TimeOfDay.Night]: -1,
};

/** Full-map tint overlay per time-of-day (applied at low opacity over the SVG). */
export const TOD_OVERLAY: Record<TimeOfDay, { fill: string; opacity: number }> = {
  [TimeOfDay.Dawn]:      { fill: '#d46a20', opacity: 0.07 },
  [TimeOfDay.Morning]:   { fill: '#b8d4e8', opacity: 0.03 },
  [TimeOfDay.Midday]:    { fill: '#f0e8c0', opacity: 0.04 },
  [TimeOfDay.Afternoon]: { fill: '#d4a040', opacity: 0.07 },
  [TimeOfDay.Sunset]:    { fill: '#8a2010', opacity: 0.11 },
  [TimeOfDay.Night]:     { fill: '#0a0e28', opacity: 0.26 },
};

// ============================================================
// WEATHER PARTICLES
// ============================================================

export interface ParticleDescriptor {
  id: number;
  x: number;
  y: number;
  r?: number;
  rx?: number;
  ry?: number;
  len?: number;
  className: string;
  /** Computed animation duration in seconds (passed as --dur CSS var) */
  dur: string;
  /** Computed animation delay in seconds (passed as --delay CSS var) */
  delay: string;
}

/**
 * Deterministic pseudo-random value in [min, max] from a seed integer.
 * Uses sin-hash — stable across renders for the same seed.
 */
function seededRand(seed: number, min: number, max: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return min + (s - Math.floor(s)) * (max - min);
}

/**
 * Generate an array of weather particle descriptors for the given weather type.
 * Returns empty array for Clear / Overcast.
 * All animation is driven by CSS keyframes — no JS per-frame work.
 */
export function generateWeatherParticles(weather: Weather): ParticleDescriptor[] {
  if (weather === Weather.Clear || weather === Weather.Overcast) return [];

  const out: ParticleDescriptor[] = [];

  if (weather === Weather.Rain || weather === Weather.Storm) {
    const count = weather === Weather.Storm ? 30 : 20;
    const minDur = weather === Weather.Storm ? 0.8 : 1.2;
    const maxDur = weather === Weather.Storm ? 1.2 : 2.0;
    for (let i = 0; i < count; i++) {
      out.push({
        id: i,
        x: seededRand(i * 5 + 1, 10, 400),
        y: seededRand(i * 5 + 2, -20, 5),
        len: 8,
        className: weather === Weather.Storm ? 'map-particle-storm' : 'map-particle-rain',
        dur: `${seededRand(i * 5 + 3, minDur, maxDur).toFixed(2)}s`,
        delay: `-${seededRand(i * 5 + 4, 0, 1.8).toFixed(2)}s`,
      });
    }
  } else if (weather === Weather.Snow) {
    for (let i = 0; i < 20; i++) {
      out.push({
        id: i,
        x: seededRand(i * 5 + 1, 10, 400),
        y: seededRand(i * 5 + 2, -20, 5),
        r: seededRand(i * 5 + 3, 1.2, 3.0),
        className: 'map-particle-snow',
        dur: `${seededRand(i * 5 + 4, 4, 7).toFixed(2)}s`,
        delay: `-${seededRand(i * 5 + 5, 0, 5).toFixed(2)}s`,
      });
    }
  } else if (weather === Weather.Dust) {
    for (let i = 0; i < 15; i++) {
      out.push({
        id: i,
        x: seededRand(i * 5 + 1, -30, -5),
        y: seededRand(i * 5 + 2, 40, 220),
        rx: seededRand(i * 5 + 3, 8, 22),
        ry: seededRand(i * 5 + 4, 2, 5),
        className: 'map-particle-dust',
        dur: `${seededRand(i * 5 + 5, 3, 6).toFixed(2)}s`,
        delay: `-${seededRand(i * 5 + 6, 0, 3).toFixed(2)}s`,
      });
    }
  } else if (weather === Weather.Heatwave) {
    for (let i = 0; i < 8; i++) {
      out.push({
        id: i,
        x: 0,
        y: seededRand(i * 3 + 1, 100, 230),
        className: 'map-particle-heat',
        dur: `${seededRand(i * 3 + 2, 2.5, 4.5).toFixed(2)}s`,
        delay: `-${seededRand(i * 3 + 3, 0, 3).toFixed(2)}s`,
      });
    }
  }

  return out;
}
