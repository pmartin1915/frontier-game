/**
 * Frontier — Devil's Bargain System
 *
 * Pure functions for fail-forward mechanics (per GDD §3.9).
 * When a lethal outcome occurs, players may accept a costly bargain
 * instead of death. Limited to MAX_FAIL_FORWARDS (3) per playthrough.
 *
 * Imports: @/types/ and resolveDelta from encounters only.
 */

import {
  DEVILS_BARGAIN_TABLE,
  MAX_FAIL_FORWARDS,
} from '@/types/encounters';
import type {
  DevilsBargainEntry,
  EncounterEffect,
  Encounter,
} from '@/types/encounters';
import type { DevilsBargainEvent } from '@/types/narrative';
import type { GameState, Supplies } from '@/types/game-state';
import { EquipmentSlot } from '@/types/game-state';
import { resolveDelta } from '@/systems/encounters';

// ============================================================
// BARGAIN LOOKUP
// ============================================================

export interface BargainCheckInput {
  state: GameState;
  isLethal: boolean;
  encounter: Encounter | null;
}

/**
 * Find the first applicable Devil's Bargain entry for the current crisis.
 * Returns null if no bargain is available (max used, or no matching crisis).
 */
export function findApplicableBargain(
  input: BargainCheckInput,
): DevilsBargainEntry | null {
  const { state, isLethal } = input;

  // Cannot use bargains if limit reached
  if (state.journey.failForwardsUsed >= MAX_FAIL_FORWARDS) return null;

  // Only offer bargains for lethal outcomes
  if (!isLethal) return null;

  const { supplies, horse, player } = state;
  const hasRifle = player.equipment.some(
    (e) => e.slot === EquipmentSlot.Rifle && e.durability > 0,
  );

  // Match crisis conditions in priority order (first match wins)
  for (const entry of DEVILS_BARGAIN_TABLE) {
    switch (entry.crisis) {
      case 'Water zero, distant from source':
        if (supplies.water <= 0 && hasRifle) return entry;
        break;

      case 'Water zero, no rifle':
        if (supplies.water <= 0 && !hasRifle) return entry;
        break;

      case 'Horse death':
        if (horse.health <= 0) return entry;
        break;

      case 'Critical injury, no medical':
        if (player.health <= 15 && supplies.medical <= 0) return entry;
        break;

      case 'Party morale zero':
        if (player.morale <= 0) return entry;
        break;
    }
  }

  // No matching crisis condition — no bargain available
  return null;
}

// ============================================================
// BARGAIN RESOLUTION
// ============================================================

export interface BargainResolutionInput {
  bargain: DevilsBargainEntry;
  state: GameState;
  accepted: boolean;
}

export interface BargainResolutionResult {
  accepted: boolean;
  effects: EncounterEffect[];
  bargainEvent: DevilsBargainEvent;
  supplyDeltas: Partial<Record<keyof Supplies, number>>;
  equipmentDeltas: Partial<Record<string, number>>;
  routeFlags: { fortSumnerDebt?: boolean; detourMiles?: number };
  moraleSet?: number;
  timeCost?: number;
}

/**
 * Apply or decline a Devil's Bargain.
 * If declined, the lethal outcome stands.
 * If accepted, the bargain costs are applied and the player survives.
 */
export function applyBargainEffects(
  input: BargainResolutionInput,
): BargainResolutionResult {
  const { bargain, state, accepted } = input;

  const bargainEvent: DevilsBargainEvent = {
    crisis: bargain.crisis,
    encounter: bargain.encounter,
    cost: accepted ? bargain.cost.description : 'Declined',
    accepted,
  };

  if (!accepted) {
    return {
      accepted: false,
      effects: [],
      bargainEvent,
      supplyDeltas: {},
      equipmentDeltas: {},
      routeFlags: {},
    };
  }

  // Resolve each effect
  const supplyDeltas: Partial<Record<keyof Supplies, number>> = {};
  const equipmentDeltas: Partial<Record<string, number>> = {};
  const routeFlags: { fortSumnerDebt?: boolean; detourMiles?: number } = {};
  let moraleSet: number | undefined;
  let timeCost: number | undefined;

  for (const effect of bargain.cost.effects) {
    const currentValue = getCurrentValue(effect, state);
    const resolvedDelta = resolveDelta(effect.delta, currentValue);

    switch (effect.type) {
      case 'supply':
        supplyDeltas[effect.target as keyof Supplies] = resolvedDelta;
        break;

      case 'equipment':
        equipmentDeltas[effect.target] = resolvedDelta;
        break;

      case 'route':
        if (effect.target === 'fortSumnerDebt') {
          routeFlags.fortSumnerDebt = true;
        } else if (effect.target === 'detour') {
          routeFlags.detourMiles = typeof effect.delta === 'string'
            ? parseFloat(effect.delta)
            : effect.delta;
        }
        break;

      case 'morale':
        if (typeof effect.delta === 'string' && effect.delta.startsWith('set:')) {
          moraleSet = parseFloat(effect.delta.slice(4));
        } else {
          // Treat as delta
          moraleSet = state.player.morale + resolvedDelta;
        }
        break;

      case 'time':
        timeCost = typeof effect.delta === 'string'
          ? parseFloat(effect.delta)
          : effect.delta;
        break;
    }
  }

  return {
    accepted: true,
    effects: bargain.cost.effects,
    bargainEvent,
    supplyDeltas,
    equipmentDeltas,
    routeFlags,
    moraleSet,
    timeCost,
  };
}

// ============================================================
// HELPERS
// ============================================================

function getCurrentValue(effect: EncounterEffect, state: GameState): number {
  switch (effect.type) {
    case 'supply':
      return state.supplies[effect.target as keyof Supplies] ?? 0;
    case 'equipment': {
      const equip = state.player.equipment.find((e) => e.slot === effect.target);
      return equip?.durability ?? 0;
    }
    case 'morale':
      return state.player.morale;
    case 'health':
      return effect.target === 'horse' ? state.horse.health : state.player.health;
    default:
      return 0;
  }
}
