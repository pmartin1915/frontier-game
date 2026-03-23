/**
 * Frontier — Health System
 *
 * Pure function. Processes health conditions, fatigue, and injury
 * for player and horse over one day.
 *
 * Phase 1 scope: fatigue, dehydration, basic horse health.
 * Full 10-condition system with death timers deferred to Phase 1.5.
 *
 * Imports only from types/. No side effects.
 */

import {
  Pace,
  HealthCondition,
  DiscretionaryAction,
  PACE_CONFIG,
  NIGHT_TRAVEL_MODIFIERS,
} from '@/types/game-state';
import type { PlayerState, HorseState, ActiveCondition } from '@/types/game-state';
import type { HealthEvent } from '@/types/narrative';

// ============================================================
// INTERFACE
// ============================================================

export interface HealthInput {
  player: PlayerState;
  horse: HorseState;
  pace: Pace;
  waterDepleted: boolean;
  foodDepleted: boolean;
  nightTravel: boolean;
  horseInjuryRisk: boolean;
  temperature: number;
  discretionaryAction: DiscretionaryAction;
  /** Injectable RNG for testing. Defaults to Math.random. */
  rng?: () => number;
}

export interface HealthResult {
  playerHealthDelta: number;
  playerFatigueDelta: number;
  horseHealthDelta: number;
  horseFatigueDelta: number;
  horseThirstDelta: number;
  horseHungerDelta: number;
  newConditions: ActiveCondition[];
  resolvedConditions: string[];
  healthEvents: HealthEvent[];
}

// ============================================================
// CONSTANTS
// ============================================================

const DEHYDRATION_HEALTH_PENALTY = -5;
const STARVATION_HEALTH_PENALTY = -3;
const PASSIVE_HEALTH_RECOVERY = 1;
const REST_FATIGUE_RECOVERY = -20;
const HORSE_BASE_THIRST_INCREASE = 8;
const HORSE_BASE_HUNGER_INCREASE = 5;
const HORSE_LAMENESS_CHANCE = 0.1;

/** When health is below this threshold, recovery scales up to break death spirals. */
const CRISIS_HEALTH_THRESHOLD = 40;
/** Bonus recovery per point below CRISIS_HEALTH_THRESHOLD (e.g., at health 25: +0.75). */
const CRISIS_RECOVERY_PER_POINT = 0.05;
/** Partial recovery when only ONE of water/food is depleted (not both). */
const PARTIAL_DEPLETION_RECOVERY = 0;

// ============================================================
// CALCULATION
// ============================================================

export function calculateHealth(input: HealthInput): HealthResult {
  const rng = input.rng ?? Math.random;
  const paceConfig = PACE_CONFIG[input.pace];

  let playerHealthDelta = 0;
  let playerFatigueDelta = 0;
  let horseHealthDelta = 0;
  let horseFatigueDelta = 0;
  let horseThirstDelta = HORSE_BASE_THIRST_INCREASE;
  let horseHungerDelta = HORSE_BASE_HUNGER_INCREASE;
  const newConditions: ActiveCondition[] = [];
  const resolvedConditions: string[] = [];
  const healthEvents: HealthEvent[] = [];

  // --- Player fatigue ---
  // fatigueChange: conservative = +5 (recovery), normal = 0, hardPush = -15 (negative means more fatigue)
  // In our system, higher fatigue = worse, so we negate the config value
  playerFatigueDelta = -paceConfig.fatigueChange;

  if (input.nightTravel) {
    playerFatigueDelta *= NIGHT_TRAVEL_MODIFIERS.fatigueMultiplier;
  }

  // Rest discretionary action
  if (input.discretionaryAction === DiscretionaryAction.Rest) {
    playerFatigueDelta += REST_FATIGUE_RECOVERY;
  }

  playerFatigueDelta = Math.round(playerFatigueDelta);

  // --- Player health from conditions ---
  const hasDehydration = input.player.conditions.some(
    (c) => c.condition === HealthCondition.Dehydration,
  );

  if (input.waterDepleted && !hasDehydration) {
    // Acquire dehydration
    newConditions.push({
      condition: HealthCondition.Dehydration,
      dayAcquired: 0, // will be set by game-logic with actual day
      daysUntilCritical: 3,
      treated: false,
    });
    healthEvents.push({
      target: 'player',
      condition: HealthCondition.Dehydration,
      type: 'acquired',
    });
  }

  if (hasDehydration) {
    if (!input.waterDepleted) {
      // Water restored — resolve dehydration
      resolvedConditions.push(HealthCondition.Dehydration);
      healthEvents.push({
        target: 'player',
        condition: HealthCondition.Dehydration,
        type: 'treated',
      });
    } else {
      // Still dehydrated — take damage
      playerHealthDelta += DEHYDRATION_HEALTH_PENALTY;
      healthEvents.push({
        target: 'player',
        condition: HealthCondition.Dehydration,
        type: 'worsened',
      });
    }
  }

  // Starvation damage
  if (input.foodDepleted) {
    playerHealthDelta += STARVATION_HEALTH_PENALTY;
    healthEvents.push({
      target: 'player',
      condition: 'starvation',
      type: 'worsened',
    });
  }

  // High fatigue health penalty
  if (input.player.fatigue + playerFatigueDelta > 80) {
    playerHealthDelta -= 2;
  }

  // Passive health recovery — graduated to break death spirals
  if (!input.waterDepleted && !input.foodDepleted) {
    // Full recovery: base + crisis bonus when health is low
    let recovery = PASSIVE_HEALTH_RECOVERY;
    const currentHealth = input.player.health + playerHealthDelta;
    if (currentHealth < CRISIS_HEALTH_THRESHOLD) {
      recovery += (CRISIS_HEALTH_THRESHOLD - currentHealth) * CRISIS_RECOVERY_PER_POINT;
    }
    playerHealthDelta += recovery;
  } else if (!input.waterDepleted || !input.foodDepleted) {
    // Partial recovery: one resource available — breaks the binary cliff
    playerHealthDelta += PARTIAL_DEPLETION_RECOVERY;
  }

  // --- Horse fatigue ---
  horseFatigueDelta = -paceConfig.fatigueChange;
  if (input.nightTravel) {
    horseFatigueDelta *= NIGHT_TRAVEL_MODIFIERS.fatigueMultiplier;
  }
  if (input.discretionaryAction === DiscretionaryAction.Rest) {
    horseFatigueDelta += REST_FATIGUE_RECOVERY;
  }
  horseFatigueDelta = Math.round(horseFatigueDelta);

  // --- Horse lameness risk (night travel) ---
  if (input.horseInjuryRisk && !input.horse.lameness) {
    const lamenessChance = HORSE_LAMENESS_CHANCE * NIGHT_TRAVEL_MODIFIERS.horseInjuryMultiplier;
    if (rng() < lamenessChance) {
      healthEvents.push({
        target: 'horse',
        condition: HealthCondition.HorseLameness,
        type: 'acquired',
      });
      // Lameness is handled as a boolean on HorseState, not as ActiveCondition
    }
  }

  // --- Horse thirst/hunger ---
  // Reduced if water/food supply is available (not depleted)
  if (!input.waterDepleted) {
    horseThirstDelta = Math.max(-5, horseThirstDelta - 8); // net recovery if watered
  }
  if (!input.foodDepleted) {
    horseHungerDelta = Math.max(-5, horseHungerDelta - 8); // net recovery if fed
  }

  // Horse health from high thirst/hunger
  if (input.horse.thirst > 70) {
    horseHealthDelta -= 2;
  }
  if (input.horse.hunger > 70) {
    horseHealthDelta -= 1;
  }

  // Passive horse recovery: +1 when properly fed and watered
  if (!input.waterDepleted && !input.foodDepleted && input.horse.thirst <= 70 && input.horse.hunger <= 70) {
    horseHealthDelta += 1;
  }

  return {
    playerHealthDelta,
    playerFatigueDelta,
    horseHealthDelta,
    horseFatigueDelta,
    horseThirstDelta,
    horseHungerDelta,
    newConditions,
    resolvedConditions,
    healthEvents,
  };
}
