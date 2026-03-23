import { describe, it, expect } from 'vitest';
import { checkWaypointProgression } from '@/systems/waypoint';
import type { WaypointInfo } from '@/systems/waypoint';
import { Act, Biome, Terrain } from '@/types/game-state';

// Minimal waypoint data mirroring TRAIL_WAYPOINTS structure
const WAYPOINTS: WaypointInfo[] = [
  {
    name: 'Fort Belknap',
    cumulativeMiles: 0,
    segmentMiles: 0,
    biome: Biome.CrossTimbers,
    terrain: Terrain.Settlement,
    act: Act.I,
    landmark: 'Start',
    isSettlement: true,
  },
  {
    name: 'Middle Concho',
    cumulativeMiles: 130,
    segmentMiles: 130,
    biome: Biome.CrossTimbers,
    terrain: Terrain.River,
    act: Act.I,
    landmark: 'Last water',
    isSettlement: false,
  },
  {
    name: 'Horsehead Crossing',
    cumulativeMiles: 240,
    segmentMiles: 110,
    biome: Biome.StakedPlains,
    terrain: Terrain.Desert,
    act: Act.II,
    landmark: 'Bleached skulls',
    isSettlement: false,
  },
  {
    name: 'Castle Gap',
    cumulativeMiles: 280,
    segmentMiles: 40,
    biome: Biome.DesertApproach,
    terrain: Terrain.Canyon,
    act: Act.II,
    landmark: 'Canyon passage',
    isSettlement: false,
  },
  {
    name: 'Fort Sumner',
    cumulativeMiles: 400,
    segmentMiles: 120,
    biome: Biome.PecosValley,
    terrain: Terrain.Settlement,
    act: Act.III,
    landmark: 'Bosque Redondo',
    isSettlement: true,
  },
  {
    name: 'Denver',
    cumulativeMiles: 700,
    segmentMiles: 300,
    biome: Biome.ColoradoPlains,
    terrain: Terrain.Settlement,
    act: Act.V,
    landmark: 'End',
    isSettlement: true,
  },
];

describe('checkWaypointProgression', () => {
  it('returns no transition when not reaching waypoint', () => {
    const result = checkWaypointProgression({
      totalMiles: 27.5,
      distanceToWaypoint: 130,
      distanceTraveled: 27.5,
      currentWaypointName: 'Middle Concho',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(false);
    expect(result.waypointsReached).toEqual([]);
    expect(result.newWaypointName).toBeNull();
    expect(result.journeyComplete).toBe(false);
  });

  it('detects exact arrival at waypoint', () => {
    const result = checkWaypointProgression({
      totalMiles: 130,
      distanceToWaypoint: 30,
      distanceTraveled: 30,
      currentWaypointName: 'Middle Concho',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    expect(result.waypointsReached).toContain('Middle Concho');
    expect(result.newWaypointName).toBe('Horsehead Crossing');
    expect(result.newDistanceToWaypoint).toBe(110);
    expect(result.newBiome).toBe(Biome.StakedPlains);
    expect(result.newTerrain).toBe(Terrain.Desert);
    expect(result.newAct).toBe(Act.II);
    expect(result.journeyComplete).toBe(false);
  });

  it('handles overshoot into next segment', () => {
    // 35 miles travel with 30 remaining = 5 miles overshoot
    const result = checkWaypointProgression({
      totalMiles: 135,
      distanceToWaypoint: 30,
      distanceTraveled: 35,
      currentWaypointName: 'Middle Concho',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    expect(result.newWaypointName).toBe('Horsehead Crossing');
    // Next segment is 110 miles, minus 5 overshoot = 105
    expect(result.newDistanceToWaypoint).toBe(105);
  });

  it('handles multi-waypoint skip (overshoot past Castle Gap)', () => {
    // At Horsehead (240mi), traveling enough to pass Castle Gap (280mi, +40 segment)
    // 50 miles travel from 10 remaining = 40 overshoot, Castle Gap is only 40 away
    const result = checkWaypointProgression({
      totalMiles: 290,
      distanceToWaypoint: 10,
      distanceTraveled: 50,
      currentWaypointName: 'Horsehead Crossing',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    expect(result.waypointsReached).toContain('Horsehead Crossing');
    expect(result.waypointsReached).toContain('Castle Gap');
    expect(result.waypointsReached).toHaveLength(2);
    expect(result.newWaypointName).toBe('Fort Sumner');
    expect(result.newBiome).toBe(Biome.PecosValley);
    expect(result.newAct).toBe(Act.III);
  });

  it('detects journey completion when reaching final waypoint', () => {
    const result = checkWaypointProgression({
      totalMiles: 700,
      distanceToWaypoint: 50,
      distanceTraveled: 50,
      currentWaypointName: 'Denver',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    expect(result.journeyComplete).toBe(true);
    expect(result.waypointsReached).toContain('Denver');
    expect(result.newDistanceToWaypoint).toBe(0);
  });

  it('detects journey completion when overshooting past final waypoint', () => {
    const result = checkWaypointProgression({
      totalMiles: 720,
      distanceToWaypoint: 40,
      distanceTraveled: 60,
      currentWaypointName: 'Denver',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    expect(result.journeyComplete).toBe(true);
  });

  it('returns no transition for unknown waypoint name', () => {
    const result = checkWaypointProgression({
      totalMiles: 100,
      distanceToWaypoint: 0,
      distanceTraveled: 30,
      currentWaypointName: 'Nonexistent',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(false);
  });

  it('reports settlement status of reached waypoint', () => {
    const result = checkWaypointProgression({
      totalMiles: 400,
      distanceToWaypoint: 10,
      distanceTraveled: 10,
      currentWaypointName: 'Fort Sumner',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    expect(result.isSettlement).toBe(true);
  });

  it('reports non-settlement status correctly', () => {
    const result = checkWaypointProgression({
      totalMiles: 130,
      distanceToWaypoint: 10,
      distanceTraveled: 10,
      currentWaypointName: 'Middle Concho',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    expect(result.isSettlement).toBe(false);
  });

  it('provides landmark description for reached waypoint', () => {
    const result = checkWaypointProgression({
      totalMiles: 130,
      distanceToWaypoint: 10,
      distanceTraveled: 10,
      currentWaypointName: 'Middle Concho',
      waypoints: WAYPOINTS,
    });

    expect(result.landmarkDescription).toBe('Last water');
  });

  it('biome and act transition from I to II at Horsehead Crossing', () => {
    const result = checkWaypointProgression({
      totalMiles: 240,
      distanceToWaypoint: 5,
      distanceTraveled: 5,
      currentWaypointName: 'Horsehead Crossing',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    // Next waypoint is Castle Gap
    expect(result.newBiome).toBe(Biome.DesertApproach);
    expect(result.newAct).toBe(Act.II);
  });

  it('newDistanceToWaypoint is never negative', () => {
    // Large overshoot
    const result = checkWaypointProgression({
      totalMiles: 160,
      distanceToWaypoint: 10,
      distanceTraveled: 40,
      currentWaypointName: 'Middle Concho',
      waypoints: WAYPOINTS,
    });

    expect(result.reached).toBe(true);
    expect(result.newDistanceToWaypoint).toBeGreaterThanOrEqual(0);
  });
});
