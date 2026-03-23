/**
 * Frontier — Trail Route Data
 *
 * Static waypoint table for the Goodnight-Loving Trail (1866).
 * Fort Belknap, TX → Denver, CO. ~700 miles over 60-90 days.
 *
 * Imports only from types/. No side effects.
 */

import { Act, Biome, Terrain } from '@/types/game-state';

// ============================================================
// WAYPOINT INTERFACE
// ============================================================

export interface TrailWaypoint {
  /** Unique waypoint identifier */
  id: string;
  /** Display name */
  name: string;
  /** Distance from Fort Belknap to this waypoint (cumulative miles) */
  cumulativeMiles: number;
  /** Distance from the previous waypoint to this one */
  segmentMiles: number;
  /** Biome of the segment approaching this waypoint */
  biome: Biome;
  /** Primary terrain of this segment */
  terrain: Terrain;
  /** Act that begins when arriving at (or passing) this waypoint */
  act: Act;
  /** Historical description for narrative context */
  landmark: string;
  /** Approximate x,y coordinates for SVG map (0-100 normalized) */
  mapPosition: { x: number; y: number };
  /** Whether this waypoint is a settlement */
  isSettlement: boolean;
}

// ============================================================
// THE GOODNIGHT-LOVING TRAIL
// ============================================================

export const TRAIL_WAYPOINTS: TrailWaypoint[] = [
  {
    id: 'fort_belknap',
    name: 'Fort Belknap',
    cumulativeMiles: 0,
    segmentMiles: 0,
    biome: Biome.CrossTimbers,
    terrain: Terrain.Settlement,
    act: Act.I,
    landmark:
      'Abandoned fort on the Brazos. Departure point for the Goodnight trail.',
    mapPosition: { x: 85, y: 90 },
    isSettlement: true,
  },
  {
    id: 'middle_concho',
    name: 'Middle Concho',
    cumulativeMiles: 130,
    segmentMiles: 130,
    biome: Biome.CrossTimbers,
    terrain: Terrain.River,
    act: Act.I,
    landmark:
      'Last reliable water before the Staked Plains. The Concho runs clear over limestone.',
    mapPosition: { x: 75, y: 78 },
    isSettlement: false,
  },
  {
    id: 'horsehead_crossing',
    name: 'Horsehead Crossing',
    cumulativeMiles: 240,
    segmentMiles: 110,
    biome: Biome.StakedPlains,
    terrain: Terrain.Desert,
    act: Act.II,
    landmark:
      'Named for the bleached horse skulls marking the Pecos crossing. Alkaline water. Many animals have died here.',
    mapPosition: { x: 55, y: 68 },
    isSettlement: false,
  },
  {
    id: 'castle_gap',
    name: 'Castle Gap',
    cumulativeMiles: 280,
    segmentMiles: 40,
    biome: Biome.DesertApproach,
    terrain: Terrain.Canyon,
    act: Act.II,
    landmark:
      'Narrow canyon passage through the Castle Mountains. Comanchero ambush point.',
    mapPosition: { x: 48, y: 62 },
    isSettlement: false,
  },
  {
    id: 'fort_sumner',
    name: 'Fort Sumner',
    cumulativeMiles: 400,
    segmentMiles: 120,
    biome: Biome.PecosValley,
    terrain: Terrain.Settlement,
    act: Act.III,
    landmark:
      'Bosque Redondo reservation. Comanchero territory. Government post on the Pecos.',
    mapPosition: { x: 35, y: 50 },
    isSettlement: true,
  },
  {
    id: 'santa_fe',
    name: 'Santa Fe',
    cumulativeMiles: 480,
    segmentMiles: 80,
    biome: Biome.HighDesert,
    terrain: Terrain.Settlement,
    act: Act.IV,
    landmark:
      'Ancient trading hub. Adobe walls, Spanish missions, the end of the Santa Fe Trail.',
    mapPosition: { x: 28, y: 38 },
    isSettlement: true,
  },
  {
    id: 'raton_pass',
    name: 'Raton Pass',
    cumulativeMiles: 560,
    segmentMiles: 80,
    biome: Biome.MountainPass,
    terrain: Terrain.Mountain,
    act: Act.IV,
    landmark:
      'The most dangerous crossing. 7,800 feet. Snow possible in any month. Uncle Dick Wootton charges toll.',
    mapPosition: { x: 22, y: 25 },
    isSettlement: false,
  },
  {
    id: 'trinidad',
    name: 'Trinidad',
    cumulativeMiles: 600,
    segmentMiles: 40,
    biome: Biome.ColoradoPlains,
    terrain: Terrain.Settlement,
    act: Act.V,
    landmark:
      'First Colorado settlement south of the pass. Coal country. The trail levels into plains.',
    mapPosition: { x: 18, y: 18 },
    isSettlement: true,
  },
  {
    id: 'denver',
    name: 'Denver',
    cumulativeMiles: 700,
    segmentMiles: 100,
    biome: Biome.ColoradoPlains,
    terrain: Terrain.Settlement,
    act: Act.V,
    landmark:
      'Cherry Creek. End of the trail. The city rises from the plains where the mountains begin.',
    mapPosition: { x: 12, y: 8 },
    isSettlement: true,
  },
];

// ============================================================
// UTILITIES
// ============================================================

/** Total trail distance in miles */
export const TOTAL_TRAIL_MILES =
  TRAIL_WAYPOINTS[TRAIL_WAYPOINTS.length - 1].cumulativeMiles;

/** Find a waypoint by its unique id */
export function getWaypointById(id: string): TrailWaypoint | undefined {
  return TRAIL_WAYPOINTS.find((w) => w.id === id);
}

/** Find a waypoint by display name */
export function getWaypointByName(name: string): TrailWaypoint | undefined {
  return TRAIL_WAYPOINTS.find((w) => w.name === name);
}

/** Get the index of a waypoint by display name. Returns -1 if not found. */
export function getWaypointIndex(name: string): number {
  return TRAIL_WAYPOINTS.findIndex((w) => w.name === name);
}

/** Get the next waypoint after a given name. Returns null at end of trail. */
export function getNextWaypoint(
  currentName: string,
): TrailWaypoint | null {
  const idx = getWaypointIndex(currentName);
  if (idx < 0 || idx >= TRAIL_WAYPOINTS.length - 1) return null;
  return TRAIL_WAYPOINTS[idx + 1];
}
