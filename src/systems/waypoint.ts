/**
 * Frontier — Waypoint Progression System
 *
 * Pure function. Checks whether the party has reached a waypoint
 * and returns transition data (new biome, terrain, act, etc.).
 *
 * Imports only from types/. Waypoint data is passed in as a parameter
 * to maintain the systems/ import boundary.
 */

import type { Biome, Terrain, Act } from '@/types/game-state';

// ============================================================
// INTERFACES
// ============================================================

/**
 * Minimal waypoint info passed in from trail-route data.
 * Mirrors TrailWaypoint but avoids importing from data/.
 */
export interface WaypointInfo {
  name: string;
  cumulativeMiles: number;
  segmentMiles: number;
  biome: Biome;
  terrain: Terrain;
  act: Act;
  landmark: string;
  isSettlement: boolean;
}

export interface WaypointProgressionInput {
  /** Current total miles traveled (before today's travel) */
  totalMiles: number;
  /** Distance remaining to the current target waypoint */
  distanceToWaypoint: number;
  /** Distance traveled today */
  distanceTraveled: number;
  /** Name of the current target waypoint */
  currentWaypointName: string;
  /** The full ordered waypoint table */
  waypoints: WaypointInfo[];
}

export interface WaypointTransition {
  /** Whether a waypoint was reached this day */
  reached: boolean;
  /** New target waypoint name (next waypoint to travel toward) */
  newWaypointName: string | null;
  /** Distance to the new target waypoint */
  newDistanceToWaypoint: number | null;
  /** New biome (if changed) */
  newBiome: Biome | null;
  /** New terrain (if changed) */
  newTerrain: Terrain | null;
  /** New act (if changed) */
  newAct: Act | null;
  /** Landmark description of the reached waypoint (for narration) */
  landmarkDescription: string | null;
  /** Whether the journey is complete (arrived at final destination) */
  journeyComplete: boolean;
  /** Whether the reached waypoint is a settlement */
  isSettlement: boolean;
  /** All waypoints passed this day (in order, for multi-skip) */
  waypointsReached: string[];
}

// ============================================================
// NO-OP RESULT
// ============================================================

const NO_TRANSITION: WaypointTransition = {
  reached: false,
  newWaypointName: null,
  newDistanceToWaypoint: null,
  newBiome: null,
  newTerrain: null,
  newAct: null,
  landmarkDescription: null,
  journeyComplete: false,
  isSettlement: false,
  waypointsReached: [],
};

// ============================================================
// CALCULATION
// ============================================================

/**
 * Check whether the party reached a waypoint this day.
 * Handles exact arrival, overshoot, and multi-waypoint skip.
 */
export function checkWaypointProgression(
  input: WaypointProgressionInput,
): WaypointTransition {
  const {
    distanceToWaypoint,
    distanceTraveled,
    currentWaypointName,
    waypoints,
  } = input;

  const remainingAfterTravel = distanceToWaypoint - distanceTraveled;

  // Did not reach the waypoint
  if (remainingAfterTravel > 0) {
    return NO_TRANSITION;
  }

  // Find the current target waypoint in the table
  const currentIdx = waypoints.findIndex(
    (w) => w.name === currentWaypointName,
  );
  if (currentIdx < 0) {
    // Unknown waypoint — defensive no-op
    return NO_TRANSITION;
  }

  const reachedWaypoint = waypoints[currentIdx];
  const waypointsReached: string[] = [reachedWaypoint.name];

  // Check for overshoot (how many miles past the waypoint)
  let overshoot = Math.abs(remainingAfterTravel);
  let targetIdx = currentIdx;

  // Consume overshoot through subsequent waypoints
  while (overshoot > 0 && targetIdx < waypoints.length - 1) {
    const nextWp = waypoints[targetIdx + 1];
    if (overshoot >= nextWp.segmentMiles) {
      overshoot -= nextWp.segmentMiles;
      targetIdx++;
      waypointsReached.push(nextWp.name);
    } else {
      break;
    }
  }

  // Determine the NEXT waypoint to travel toward
  const nextIdx = targetIdx + 1;
  const isFinal = nextIdx >= waypoints.length;

  if (isFinal) {
    // Journey complete — arrived at Denver (or past it)
    const finalWp = waypoints[targetIdx];
    return {
      reached: true,
      newWaypointName: finalWp.name,
      newDistanceToWaypoint: 0,
      newBiome: finalWp.biome,
      newTerrain: finalWp.terrain,
      newAct: finalWp.act,
      landmarkDescription: finalWp.landmark,
      journeyComplete: true,
      isSettlement: finalWp.isSettlement,
      waypointsReached,
    };
  }

  // Normal progression: set next waypoint as target
  const nextWaypoint = waypoints[nextIdx];
  const newDistance = nextWaypoint.segmentMiles - overshoot;

  return {
    reached: true,
    newWaypointName: nextWaypoint.name,
    newDistanceToWaypoint: Math.max(0, newDistance),
    newBiome: nextWaypoint.biome,
    newTerrain: nextWaypoint.terrain,
    newAct: nextWaypoint.act,
    landmarkDescription: reachedWaypoint.landmark,
    journeyComplete: false,
    isSettlement: reachedWaypoint.isSettlement,
    waypointsReached,
  };
}
