/**
 * Frontier — Movement System
 *
 * Pure function. Calculates distance traveled in one day based on
 * pace, terrain, horse condition, night travel, and navigation skill.
 *
 * Imports only from types/. No side effects.
 */

import {
  Pace,
  Terrain,
  PACE_CONFIG,
  NIGHT_TRAVEL_MODIFIERS,
} from '@/types/game-state';

// ============================================================
// TERRAIN MULTIPLIERS
// ============================================================

/**
 * Fort Sumner debt applies a per-day progress penalty (miles lost)
 * until the player reaches Fort Sumner. Represents being forced
 * onto a longer, less efficient route.
 */
const FORT_SUMNER_PENALTY_PER_DAY = 10;

const TERRAIN_MULTIPLIER: Record<Terrain, number> = {
  [Terrain.Prairie]: 1.0,
  [Terrain.Forest]: 0.75,
  [Terrain.Desert]: 0.85,
  [Terrain.River]: 0.0, // river crossing day — no forward progress
  [Terrain.Canyon]: 0.6,
  [Terrain.Mountain]: 0.65,
  [Terrain.Plains]: 1.0,
  [Terrain.Settlement]: 0.9,
};

// ============================================================
// INTERFACE
// ============================================================

export interface MovementInput {
  pace: Pace;
  terrain: Terrain;
  nightTravel: boolean;
  horseFatigue: number;
  horseLameness: boolean;
  tackCondition: number;
  navigationSkill: number;
  distanceToWaypoint: number;
  /** Remaining detour miles from Devil's Bargain. Consumed before regular progress. */
  detourMilesRemaining?: number;
  /** Fort Sumner debt flag. Adds a one-time distance penalty. */
  fortSumnerDebt?: boolean;
  /** Injectable RNG for testing. Defaults to Math.random. */
  rng?: () => number;
}

export interface MovementResult {
  distanceTraveled: number;
  gotLost: boolean;
  lostMiles: number;
  nightTravelActive: boolean;
  horseInjuryRisk: boolean;
  /** How many detour miles were consumed this day */
  detourMilesConsumed: number;
}

// ============================================================
// CALCULATION
// ============================================================

export function calculateMovement(input: MovementInput): MovementResult {
  const rng = input.rng ?? Math.random;
  const paceConfig = PACE_CONFIG[input.pace];
  const detourRemaining = input.detourMilesRemaining ?? 0;

  // Base distance: random within pace range
  const baseDistance =
    paceConfig.baseDistanceMin +
    rng() * (paceConfig.baseDistanceMax - paceConfig.baseDistanceMin);

  // Terrain multiplier
  const terrainMult = TERRAIN_MULTIPLIER[input.terrain];

  // Horse fatigue penalty: degrades speed as fatigue increases
  // At 0 fatigue = 1.0x, at 80 fatigue = 0.6x (floor)
  const horseFatigueMult = Math.max(0.6, 1.0 - input.horseFatigue / 200);

  // Lameness: flat 50% penalty
  const lamenessMult = input.horseLameness ? 0.5 : 1.0;

  // Tack condition: mild degradation at low condition
  const tackMult = Math.max(0.8, input.tackCondition / 100);

  // Night travel bonus distance (partial extra travel) with penalty
  const nightMult = input.nightTravel
    ? NIGHT_TRAVEL_MODIFIERS.distanceMultiplier
    : 1.0;

  // Compute raw distance
  let distance =
    baseDistance * terrainMult * horseFatigueMult * lamenessMult * tackMult * nightMult;

  // Getting-lost check (only on night travel)
  let gotLost = false;
  let lostMiles = 0;

  if (input.nightTravel) {
    const baseChance = NIGHT_TRAVEL_MODIFIERS.gettingLostChance;
    // Navigation skill reduces getting-lost chance (100 skill = 0 chance)
    const adjustedChance = baseChance * (1.0 - input.navigationSkill / 100);
    if (rng() < adjustedChance) {
      gotLost = true;
      // Lose 20-50% of distance when lost
      const lossFraction = 0.2 + rng() * 0.3;
      lostMiles = Math.round(distance * lossFraction);
      distance -= lostMiles;
    }
  }

  // Detour miles: travel burns through detour before making real progress.
  // Distance traveled goes toward clearing the detour first.
  let detourMilesConsumed = 0;
  if (detourRemaining > 0) {
    detourMilesConsumed = Math.min(distance, detourRemaining);
    distance -= detourMilesConsumed;
  }

  // Fort Sumner debt: daily penalty that reduces effective progress until cleared.
  // Applied each day fortSumnerDebt is active, reducing net progress by up to 10 miles.
  // Represents being forced onto a longer, less efficient route.
  if (input.fortSumnerDebt && distance > 0) {
    const debtPenalty = Math.min(distance, FORT_SUMNER_PENALTY_PER_DAY);
    distance -= debtPenalty;
  }

  // Cap to waypoint distance (cannot overshoot).
  // When the player reaches the waypoint, use the EXACT distanceToWaypoint
  // (no rounding) so the waypoint check sees exactly 0 remaining.
  // Rounding a capped value can leave a floating-point epsilon that
  // prevents the waypoint from ever being "reached".
  if (distance >= input.distanceToWaypoint) {
    distance = input.distanceToWaypoint;
  } else {
    // Round to 1 decimal only when mid-segment
    distance = Math.round(distance * 10) / 10;
  }
  detourMilesConsumed = Math.round(detourMilesConsumed * 10) / 10;

  // Horse injury risk flag for health system
  const horseInjuryRisk = input.nightTravel;

  return {
    distanceTraveled: Math.max(0, distance),
    gotLost,
    lostMiles,
    nightTravelActive: input.nightTravel,
    horseInjuryRisk,
    detourMilesConsumed,
  };
}
