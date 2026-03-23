/**
 * Frontier — Equipment System
 *
 * Pure function. Calculates equipment degradation and repair for one day.
 *
 * Imports only from types/. No side effects.
 */

import {
  Pace,
  Terrain,
  DiscretionaryAction,
  EquipmentSlot,
  PACE_CONFIG,
} from '@/types/game-state';
import type { Equipment } from '@/types/game-state';
import type { EquipmentEvent } from '@/types/narrative';

// ============================================================
// INTERFACE
// ============================================================

export interface EquipmentInput {
  equipment: Equipment[];
  pace: Pace;
  terrain: Terrain;
  discretionaryAction: DiscretionaryAction;
  repairSupplies: number;
}

export interface EquipmentResult {
  updatedEquipment: Equipment[];
  equipmentEvents: EquipmentEvent[];
  repairSuppliesUsed: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const BASE_DEGRADATION = -1.0;
const REPAIR_AMOUNT = 25;

/** Terrain types that cause extra wear on boots and saddle */
const ROUGH_TERRAIN: Set<Terrain> = new Set([
  Terrain.Canyon,
  Terrain.Mountain,
]);

const ROUGH_TERRAIN_MULTIPLIER = 1.5;

/** Slots affected by rough terrain */
const TERRAIN_SENSITIVE_SLOTS: Set<EquipmentSlot> = new Set([
  EquipmentSlot.Boots,
  EquipmentSlot.Saddle,
]);

// ============================================================
// CALCULATION
// ============================================================

export function calculateEquipment(input: EquipmentInput): EquipmentResult {
  const paceConfig = PACE_CONFIG[input.pace];
  const events: EquipmentEvent[] = [];
  let repairUsed = 0;

  // Copy equipment for mutation
  const updated = input.equipment.map((e) => ({ ...e }));

  // --- Degradation ---
  for (const item of updated) {
    if (item.durability <= 0) continue; // already broken

    let degradation = BASE_DEGRADATION * paceConfig.equipmentWearMultiplier;

    // Rough terrain extra wear
    if (
      ROUGH_TERRAIN.has(input.terrain) &&
      TERRAIN_SENSITIVE_SLOTS.has(item.slot)
    ) {
      degradation *= ROUGH_TERRAIN_MULTIPLIER;
    }

    // No integer rounding — fractional durability enables finer balance tuning
    // (e.g., Normal -1.5/day breaks at day 67 vs integer -2/day at day 50)
    item.durability = Math.max(0, item.durability + degradation);

    if (item.durability <= 0) {
      events.push({
        slot: item.slot,
        type: 'broken',
        durabilityDelta: degradation,
      });
    } else {
      events.push({
        slot: item.slot,
        type: 'degraded',
        durabilityDelta: degradation,
      });
    }
  }

  // --- Repair (discretionary action) ---
  if (
    input.discretionaryAction === DiscretionaryAction.Repair &&
    input.repairSupplies > 0
  ) {
    // Find the lowest-durability item that isn't already at 100
    const repairable = updated
      .filter((e) => e.durability < 100)
      .sort((a, b) => a.durability - b.durability);

    if (repairable.length > 0) {
      const target = repairable[0];
      const before = target.durability;
      target.durability = Math.min(100, target.durability + REPAIR_AMOUNT);
      repairUsed = 1;

      events.push({
        slot: target.slot,
        type: 'repaired',
        durabilityDelta: target.durability - before,
      });
    }
  }

  return {
    updatedEquipment: updated,
    equipmentEvents: events,
    repairSuppliesUsed: repairUsed,
  };
}
