import { describe, it, expect } from 'vitest';
import { calculateMovement } from '@/systems/movement';
import { Pace, Terrain } from '@/types/game-state';

const BASE_INPUT = {
  pace: Pace.Normal,
  terrain: Terrain.Prairie,
  nightTravel: false,
  horseFatigue: 0,
  horseLameness: false,
  tackCondition: 100,
  navigationSkill: 30,
  distanceToWaypoint: 200,
  rng: () => 0.5,
};

describe('calculateMovement', () => {
  it('normal pace, prairie, healthy horse → mid-range distance', () => {
    const result = calculateMovement(BASE_INPUT);
    // baseDistanceMin=25, max=30, rng=0.5 → 27.5, terrain=1.0, all mults=1.0
    expect(result.distanceTraveled).toBe(27.5);
    expect(result.gotLost).toBe(false);
    expect(result.horseInjuryRisk).toBe(false);
  });

  it('conservative pace → lower distance', () => {
    const result = calculateMovement({ ...BASE_INPUT, pace: Pace.Conservative });
    // baseDistanceMin=15, max=20, rng=0.5 → 17.5
    expect(result.distanceTraveled).toBe(17.5);
  });

  it('hard push → higher distance', () => {
    const result = calculateMovement({ ...BASE_INPUT, pace: Pace.HardPush });
    // baseDistanceMin=35, max=45, rng=0.5 → 40
    expect(result.distanceTraveled).toBe(40);
  });

  it('desert terrain → 0.85x', () => {
    const result = calculateMovement({ ...BASE_INPUT, terrain: Terrain.Desert });
    expect(result.distanceTraveled).toBeCloseTo(27.5 * 0.85, 1);
  });

  it('river terrain → 0 distance', () => {
    const result = calculateMovement({ ...BASE_INPUT, terrain: Terrain.River });
    expect(result.distanceTraveled).toBe(0);
  });

  it('horse lameness → 0.5x', () => {
    const result = calculateMovement({ ...BASE_INPUT, horseLameness: true });
    // 27.5 * 0.5 = 13.75, rounded to 1 decimal = 13.8
    expect(result.distanceTraveled).toBe(13.8);
  });

  it('high horse fatigue reduces distance', () => {
    const result = calculateMovement({ ...BASE_INPUT, horseFatigue: 80 });
    // horseFatigueMult = max(0.6, 1.0 - 80/200) = 0.6
    expect(result.distanceTraveled).toBeCloseTo(27.5 * 0.6, 1);
  });

  it('low tack condition reduces distance', () => {
    const result = calculateMovement({ ...BASE_INPUT, tackCondition: 50 });
    // tackMult = max(0.8, 50/100) = 0.8
    expect(result.distanceTraveled).toBeCloseTo(27.5 * 0.8, 1);
  });

  it('night travel → 0.85x and injury risk', () => {
    // rng=0.5 is above gettingLostChance (0.15 * (1 - 0.3) = 0.105), so no getting lost
    const result = calculateMovement({ ...BASE_INPUT, nightTravel: true });
    expect(result.distanceTraveled).toBeCloseTo(27.5 * 0.85, 1);
    expect(result.horseInjuryRisk).toBe(true);
    expect(result.gotLost).toBe(false);
  });

  it('night travel + getting lost (low rng)', () => {
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 1) return 0.5; // base distance
      if (callCount === 2) return 0.01; // getting lost check (below 0.105)
      return 0.5; // loss fraction
    };
    const result = calculateMovement({ ...BASE_INPUT, nightTravel: true, rng });
    expect(result.gotLost).toBe(true);
    expect(result.lostMiles).toBeGreaterThan(0);
    expect(result.distanceTraveled).toBeLessThan(27.5 * 0.85);
  });

  it('caps distance to waypoint', () => {
    const result = calculateMovement({ ...BASE_INPUT, distanceToWaypoint: 10 });
    expect(result.distanceTraveled).toBe(10);
  });

  // ---- DETOUR MILES ----

  it('detour miles consume travel distance before real progress', () => {
    const result = calculateMovement({
      ...BASE_INPUT,
      detourMilesRemaining: 10,
    });
    // Base distance 27.5, detour consumes 10, leaving 17.5
    expect(result.detourMilesConsumed).toBe(10);
    expect(result.distanceTraveled).toBeCloseTo(17.5, 1);
  });

  it('detour miles larger than distance consume all travel', () => {
    const result = calculateMovement({
      ...BASE_INPUT,
      detourMilesRemaining: 50,
    });
    // Base distance 27.5, all consumed by detour
    expect(result.detourMilesConsumed).toBe(27.5);
    expect(result.distanceTraveled).toBe(0);
  });

  it('zero detour miles has no effect', () => {
    const result = calculateMovement({
      ...BASE_INPUT,
      detourMilesRemaining: 0,
    });
    expect(result.detourMilesConsumed).toBe(0);
    expect(result.distanceTraveled).toBe(27.5);
  });

  // ---- FORT SUMNER DEBT ----

  it('Fort Sumner debt reduces progress by up to 10 miles', () => {
    const result = calculateMovement({
      ...BASE_INPUT,
      fortSumnerDebt: true,
    });
    // Base distance 27.5, debt penalty min(27.5, 10) = 10, leaving 17.5
    expect(result.distanceTraveled).toBe(17.5);
  });

  it('Fort Sumner debt does not reduce below zero', () => {
    const result = calculateMovement({
      ...BASE_INPUT,
      pace: Pace.Conservative,
      horseLameness: true,
      fortSumnerDebt: true,
    });
    // Conservative + lame: 17.5 * 0.5 = 8.75, debt would remove all but cannot go negative
    expect(result.distanceTraveled).toBeGreaterThanOrEqual(0);
  });

  it('detour miles and Fort Sumner debt stack', () => {
    const result = calculateMovement({
      ...BASE_INPUT,
      detourMilesRemaining: 10,
      fortSumnerDebt: true,
    });
    // Base 27.5, detour consumes 10 → 17.5 remaining, debt takes 10 → 7.5
    expect(result.detourMilesConsumed).toBe(10);
    expect(result.distanceTraveled).toBe(7.5);
  });
});
