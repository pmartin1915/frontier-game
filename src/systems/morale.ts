/**
 * Frontier — Morale System
 *
 * Pure functions. Calculates morale changes and derives MoraleState
 * from numeric morale value.
 *
 * Imports only from types/. No side effects.
 */

import { MoraleState, MORALE_THRESHOLDS, Pace } from '@/types/game-state';
import type { CampPet } from '@/types/game-state';
import type { DayEvent } from '@/types/narrative';

// ============================================================
// INTERFACE
// ============================================================

export interface MoraleInput {
  currentMorale: number;
  coffeeAvailable: boolean;
  campPet: CampPet;
  events: DayEvent[];
  /** Supply keys that are critical or depleted */
  criticalSupplies: string[];
  restDay: boolean;
  pace: Pace;
}

export interface MoraleResult {
  moraleDelta: number;
  newMorale: number;
  moraleState: MoraleState;
}

// ============================================================
// CONSTANTS
// ============================================================

const COFFEE_BONUS = 2;
const COFFEE_PENALTY = -3;
const CAMP_PET_BONUS = 1;
const REST_BONUS = 5;
const HARD_PUSH_PENALTY = -3;
const CRITICAL_SUPPLY_PENALTY = -3;

const EVENT_SEVERITY_IMPACT: Record<DayEvent['severity'], number> = {
  minor: 1,
  moderate: 3,
  major: 5,
  critical: 8,
};

// ============================================================
// CALCULATION
// ============================================================

export function calculateMorale(input: MoraleInput): MoraleResult {
  let delta = 0;

  // Coffee effect
  delta += input.coffeeAvailable ? COFFEE_BONUS : COFFEE_PENALTY;

  // Camp pet bonus
  if (input.campPet.adopted && !input.campPet.lost) {
    delta += CAMP_PET_BONUS;
  }

  // Rest day bonus
  if (input.restDay) {
    delta += REST_BONUS;
  }

  // Hard push penalty
  if (input.pace === Pace.HardPush) {
    delta += HARD_PUSH_PENALTY;
  }

  // Critical supply penalties
  delta += input.criticalSupplies.length * CRITICAL_SUPPLY_PENALTY;

  // Events — negative events reduce morale, positive events not modeled in Phase 1
  // Most day events are negative (health issues, equipment breaks, supply warnings)
  for (const event of input.events) {
    const impact = EVENT_SEVERITY_IMPACT[event.severity];
    // Negative events: health, supply, equipment issues reduce morale
    if (
      event.type === 'health' ||
      event.type === 'supply' ||
      event.type === 'equipment'
    ) {
      delta -= impact;
    }
    // Navigation events are mild negative
    if (event.type === 'navigation') {
      delta -= Math.ceil(impact / 2);
    }
  }

  const newMorale = clamp(input.currentMorale + delta, 0, 100);
  const moraleState = getMoraleState(newMorale);

  return { moraleDelta: delta, newMorale, moraleState };
}

/**
 * Derive MoraleState from numeric morale value.
 * Uses MORALE_THRESHOLDS from game-state types.
 */
export function getMoraleState(morale: number): MoraleState {
  const clamped = clamp(morale, 0, 100);
  for (const [state, [min, max]] of Object.entries(MORALE_THRESHOLDS)) {
    if (clamped >= min && clamped <= max) {
      return state as MoraleState;
    }
  }
  // Fallback (should never reach here with valid thresholds)
  return MoraleState.Steady;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
