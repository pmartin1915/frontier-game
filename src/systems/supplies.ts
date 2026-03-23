/**
 * Frontier — Supplies System
 *
 * Pure function. Calculates supply consumption and yields for one day.
 *
 * Imports only from types/. No side effects.
 */

import {
  Pace,
  Weather,
  DiscretionaryAction,
  PACE_CONFIG,
  NIGHT_TRAVEL_MODIFIERS,
} from '@/types/game-state';
import type { Supplies } from '@/types/game-state';

// ============================================================
// INTERFACE
// ============================================================

export interface SupplyInput {
  pace: Pace;
  nightTravel: boolean;
  weather: Weather;
  temperature: number;
  discretionaryAction: DiscretionaryAction;
  currentSupplies: Supplies;
  companionCount: number;
  /** Survival skill 0-100, affects hunt success */
  survivalSkill: number;
  /** Max water capacity from transport mode. Undefined = no cap. */
  waterCapacity?: number;
  /** Max food capacity from transport mode. Undefined = no cap. */
  foodCapacity?: number;
  /** Injectable RNG for testing. Defaults to Math.random. */
  rng?: () => number;
}

export interface SupplyWarning {
  supply: keyof Supplies;
  level: 'low' | 'critical' | 'depleted';
}

export interface SupplyResult {
  deltas: Partial<Record<keyof Supplies, number>>;
  warnings: SupplyWarning[];
}

// ============================================================
// CONSTANTS
// ============================================================

const BASE_WATER_CONSUMPTION = -3.5;
const BASE_FOOD_CONSUMPTION = -3.5;
const BASE_COFFEE_CONSUMPTION = -1;
const FOOD_PER_COMPANION = -1;

const HUNT_FOOD_YIELD = 4;
const HUNT_AMMO_COST = -1;
const FORAGE_WATER_BASE = 1;
const FORAGE_FOOD_BASE = 1;
const FORAGE_SKILL_SCALING = 0.03;

const WARNING_LOW = 5;
const WARNING_CRITICAL = 2;

// ============================================================
// CALCULATION
// ============================================================

export function calculateSupplyConsumption(input: SupplyInput): SupplyResult {
  const rng = input.rng ?? Math.random;
  const paceConfig = PACE_CONFIG[input.pace];
  const deltas: Partial<Record<keyof Supplies, number>> = {};

  // --- Water consumption ---
  let waterDelta = BASE_WATER_CONSUMPTION * paceConfig.waterMultiplier;

  // Night travel reduces water consumption (cooler temperatures)
  if (input.nightTravel) {
    waterDelta *= NIGHT_TRAVEL_MODIFIERS.waterMultiplier;
  }

  // Hot conditions increase water use
  if (input.weather === Weather.Heatwave || input.temperature > 100) {
    waterDelta -= 1;
  }

  deltas.water = Math.round(waterDelta * 10) / 10;

  // --- Food consumption ---
  let foodDelta = BASE_FOOD_CONSUMPTION * paceConfig.foodMultiplier;
  foodDelta += FOOD_PER_COMPANION * input.companionCount;
  deltas.food = Math.round(foodDelta * 10) / 10;

  // --- Coffee consumption ---
  if (input.currentSupplies.coffee > 0) {
    deltas.coffee = BASE_COFFEE_CONSUMPTION;
  }

  // --- Discretionary action yields ---
  if (input.discretionaryAction === DiscretionaryAction.Hunt) {
    if (input.currentSupplies.ammo > 0) {
      // Hunt success: base 50% + survival skill bonus
      const huntChance = 0.5 + (input.survivalSkill / 200);
      if (rng() < huntChance) {
        deltas.food = (deltas.food ?? 0) + HUNT_FOOD_YIELD;
      }
      deltas.ammo = HUNT_AMMO_COST;
    }
  }

  if (input.discretionaryAction === DiscretionaryAction.Forage) {
    const skillBonus = 1 + input.survivalSkill * FORAGE_SKILL_SCALING;
    deltas.water = (deltas.water ?? 0) + Math.round(FORAGE_WATER_BASE * skillBonus * 10) / 10;
    deltas.food = (deltas.food ?? 0) + Math.round(FORAGE_FOOD_BASE * skillBonus * 10) / 10;
  }

  // --- Enforce carry capacity limits ---
  if (input.waterCapacity !== undefined) {
    const resultingWater = input.currentSupplies.water + (deltas.water ?? 0);
    if (resultingWater > input.waterCapacity) {
      deltas.water = input.waterCapacity - input.currentSupplies.water;
    }
  }
  if (input.foodCapacity !== undefined) {
    const resultingFood = input.currentSupplies.food + (deltas.food ?? 0);
    if (resultingFood > input.foodCapacity) {
      deltas.food = input.foodCapacity - input.currentSupplies.food;
    }
  }

  // --- Calculate resulting supply levels for warnings ---
  const warnings: SupplyWarning[] = [];
  const supplyKeys: (keyof Supplies)[] = ['water', 'food', 'coffee', 'medical', 'ammo'];

  for (const key of supplyKeys) {
    const delta = deltas[key] ?? 0;
    const resulting = input.currentSupplies[key] + delta;

    if (resulting <= 0) {
      warnings.push({ supply: key, level: 'depleted' });
    } else if (resulting <= WARNING_CRITICAL) {
      warnings.push({ supply: key, level: 'critical' });
    } else if (resulting <= WARNING_LOW) {
      warnings.push({ supply: key, level: 'low' });
    }
  }

  return { deltas, warnings };
}
