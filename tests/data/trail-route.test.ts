import { describe, it, expect } from 'vitest';
import {
  TRAIL_WAYPOINTS,
  TOTAL_TRAIL_MILES,
  getWaypointById,
  getWaypointByName,
  getWaypointIndex,
  getNextWaypoint,
} from '@/data/trail-route';
import { Act, Biome, Terrain } from '@/types/game-state';

describe('TRAIL_WAYPOINTS', () => {
  it('has 9 waypoints', () => {
    expect(TRAIL_WAYPOINTS).toHaveLength(9);
  });

  it('starts at Fort Belknap with cumulativeMiles 0', () => {
    const first = TRAIL_WAYPOINTS[0];
    expect(first.id).toBe('fort_belknap');
    expect(first.name).toBe('Fort Belknap');
    expect(first.cumulativeMiles).toBe(0);
    expect(first.segmentMiles).toBe(0);
    expect(first.isSettlement).toBe(true);
  });

  it('ends at Denver with cumulativeMiles 700', () => {
    const last = TRAIL_WAYPOINTS[TRAIL_WAYPOINTS.length - 1];
    expect(last.id).toBe('denver');
    expect(last.name).toBe('Denver');
    expect(last.cumulativeMiles).toBe(700);
    expect(last.isSettlement).toBe(true);
  });

  it('waypoints are in ascending cumulative mile order', () => {
    for (let i = 1; i < TRAIL_WAYPOINTS.length; i++) {
      expect(TRAIL_WAYPOINTS[i].cumulativeMiles).toBeGreaterThan(
        TRAIL_WAYPOINTS[i - 1].cumulativeMiles,
      );
    }
  });

  it('segment miles match cumulative differences', () => {
    for (let i = 1; i < TRAIL_WAYPOINTS.length; i++) {
      const expected =
        TRAIL_WAYPOINTS[i].cumulativeMiles -
        TRAIL_WAYPOINTS[i - 1].cumulativeMiles;
      expect(TRAIL_WAYPOINTS[i].segmentMiles).toBe(expected);
    }
  });

  it('every waypoint has valid biome, terrain, and act values', () => {
    const biomes = Object.values(Biome);
    const terrains = Object.values(Terrain);
    const acts = Object.values(Act);

    for (const wp of TRAIL_WAYPOINTS) {
      expect(biomes).toContain(wp.biome);
      expect(terrains).toContain(wp.terrain);
      expect(acts).toContain(wp.act);
    }
  });

  it('every waypoint has a non-empty landmark', () => {
    for (const wp of TRAIL_WAYPOINTS) {
      expect(wp.landmark.length).toBeGreaterThan(0);
    }
  });

  it('map positions are within 0-100 normalized range', () => {
    for (const wp of TRAIL_WAYPOINTS) {
      expect(wp.mapPosition.x).toBeGreaterThanOrEqual(0);
      expect(wp.mapPosition.x).toBeLessThanOrEqual(100);
      expect(wp.mapPosition.y).toBeGreaterThanOrEqual(0);
      expect(wp.mapPosition.y).toBeLessThanOrEqual(100);
    }
  });

  it('acts progress from I to V along the trail', () => {
    const actOrder = [Act.I, Act.II, Act.III, Act.IV, Act.V];
    let lastActIndex = 0;
    for (const wp of TRAIL_WAYPOINTS) {
      const actIdx = actOrder.indexOf(wp.act);
      expect(actIdx).toBeGreaterThanOrEqual(lastActIndex);
      lastActIndex = actIdx;
    }
  });

  it('settlements are correctly marked', () => {
    const settlements = TRAIL_WAYPOINTS.filter((w) => w.isSettlement);
    const names = settlements.map((s) => s.name);
    expect(names).toContain('Fort Belknap');
    expect(names).toContain('Fort Sumner');
    expect(names).toContain('Santa Fe');
    expect(names).toContain('Trinidad');
    expect(names).toContain('Denver');
  });
});

describe('TOTAL_TRAIL_MILES', () => {
  it('equals 700', () => {
    expect(TOTAL_TRAIL_MILES).toBe(700);
  });
});

describe('utility functions', () => {
  it('getWaypointById finds by id', () => {
    const wp = getWaypointById('fort_sumner');
    expect(wp).toBeDefined();
    expect(wp!.name).toBe('Fort Sumner');
    expect(wp!.cumulativeMiles).toBe(400);
  });

  it('getWaypointById returns undefined for unknown id', () => {
    expect(getWaypointById('nonexistent')).toBeUndefined();
  });

  it('getWaypointByName finds by display name', () => {
    const wp = getWaypointByName('Horsehead Crossing');
    expect(wp).toBeDefined();
    expect(wp!.id).toBe('horsehead_crossing');
  });

  it('getWaypointByName returns undefined for unknown name', () => {
    expect(getWaypointByName('Nowhere')).toBeUndefined();
  });

  it('getWaypointIndex returns correct index', () => {
    expect(getWaypointIndex('Fort Belknap')).toBe(0);
    expect(getWaypointIndex('Denver')).toBe(8);
    expect(getWaypointIndex('Fort Sumner')).toBe(4);
  });

  it('getWaypointIndex returns -1 for unknown name', () => {
    expect(getWaypointIndex('Unknown')).toBe(-1);
  });

  it('getNextWaypoint returns the next waypoint', () => {
    const next = getNextWaypoint('Fort Belknap');
    expect(next).not.toBeNull();
    expect(next!.name).toBe('Middle Concho');
  });

  it('getNextWaypoint returns null at end of trail', () => {
    expect(getNextWaypoint('Denver')).toBeNull();
  });

  it('getNextWaypoint returns null for unknown name', () => {
    expect(getNextWaypoint('Nonexistent')).toBeNull();
  });
});
