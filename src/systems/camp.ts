/**
 * Frontier — Camp System
 *
 * Pure function. Resolves camp activity effects for one evening/full-day camp.
 * Imports only from types/. No side effects.
 */

import { CampActivity } from '@/types/camp';
import type { CampInput, CampResults, CampActivitySelection } from '@/types/camp';
import type { Supplies, Equipment } from '@/types/game-state';
import type { CompanionId } from '@/types/companions';

// ============================================================
// CONSTANTS
// ============================================================

/** When player health is below this, camp Cook healing is multiplied. */
const CAMP_COOK_CRISIS_THRESHOLD = 30;
const CAMP_COOK_CRISIS_MULTIPLIER = 1.5;

const CAMP_EFFECTS = {
  rest: {
    fatigueDelta: { evening: -10, fullDay: -20 },
    moraleDelta: { evening: 2, fullDay: 3 },
  },
  cook: {
    healthDelta: { evening: 5, fullDay: 8 },
    foodCost: 1,
    coffeeMoraleBonus: { evening: 2, fullDay: 3 },
  },
  repair: {
    durabilityDelta: { evening: 15, fullDay: 25 },
    repairCost: 1,
  },
  companionChat: {
    loyaltyDelta: { evening: 5, fullDay: 10 },
  },
} as const;

// ============================================================
// MAIN ENTRY POINT
// ============================================================

/**
 * Resolve camp activity effects for one camp phase.
 * Returns deltas to merge into DayResults.
 */
export function resolveCamp(input: CampInput): CampResults {
  const tier = input.isFullDay ? 'fullDay' : 'evening';
  const results: CampResults = {
    fatigueDelta: 0,
    moraleDelta: 0,
    healthDelta: 0,
    supplyDeltas: {},
    equipmentRepairs: [],
    companionLoyaltyDeltas: [],
    campEvents: [],
    summaryLines: [],
  };

  // Base camp benefit: minor fatigue recovery just for stopping
  results.fatigueDelta -= 5;
  results.campEvents.push({
    type: 'camp',
    description: input.isFullDay
      ? 'The party rested for a full day in camp.'
      : 'The party made camp for the evening.',
    severity: 'minor',
  });

  // Process each selected activity
  for (const selection of input.activities) {
    resolveActivity(selection, input, tier, results);
  }

  return results;
}

// ============================================================
// ACTIVITY RESOLUTION
// ============================================================

function resolveActivity(
  selection: CampActivitySelection,
  input: CampInput,
  tier: 'evening' | 'fullDay',
  results: CampResults,
): void {
  switch (selection.activity) {
    case CampActivity.Rest:
      resolveRest(tier, results);
      break;
    case CampActivity.Cook:
      resolveCook(input, tier, results);
      break;
    case CampActivity.Repair:
      resolveRepair(input, tier, results);
      break;
    case CampActivity.CompanionChat:
      resolveCompanionChat(selection, input, tier, results);
      break;
  }
}

function resolveRest(
  tier: 'evening' | 'fullDay',
  results: CampResults,
): void {
  const fx = CAMP_EFFECTS.rest;
  results.fatigueDelta += fx.fatigueDelta[tier];
  results.moraleDelta += fx.moraleDelta[tier];
  results.summaryLines.push(
    tier === 'fullDay'
      ? 'Extended rest eased weary bones.'
      : 'A short rest by the fire.',
  );
  results.campEvents.push({
    type: 'camp',
    description: 'Rested by the campfire.',
    severity: 'minor',
  });
}

function resolveCook(
  input: CampInput,
  tier: 'evening' | 'fullDay',
  results: CampResults,
): void {
  const fx = CAMP_EFFECTS.cook;
  const currentFood = input.supplies.food + (results.supplyDeltas.food ?? 0);

  if (currentFood < 2) {
    results.summaryLines.push('Not enough food to cook.');
    return;
  }

  results.supplyDeltas.food = (results.supplyDeltas.food ?? 0) - fx.foodCost;
  let healthBonus: number = fx.healthDelta[tier];
  if (input.playerHealth < CAMP_COOK_CRISIS_THRESHOLD) {
    healthBonus = Math.round(healthBonus * CAMP_COOK_CRISIS_MULTIPLIER);
  }
  results.healthDelta += healthBonus;
  results.summaryLines.push('Prepared a warm meal.');
  results.campEvents.push({
    type: 'camp',
    description: 'Cooked a meal over the campfire.',
    severity: 'minor',
  });

  // Coffee bonus if available
  const currentCoffee = input.supplies.coffee + (results.supplyDeltas.coffee ?? 0);
  if (currentCoffee > 0) {
    results.moraleDelta += fx.coffeeMoraleBonus[tier];
    results.summaryLines.push('Coffee brewed. Spirits lifted.');
    results.campEvents.push({
      type: 'camp',
      description: 'Coffee was brewed, lifting spirits.',
      severity: 'minor',
    });
  }
}

function resolveRepair(
  input: CampInput,
  tier: 'evening' | 'fullDay',
  results: CampResults,
): void {
  const fx = CAMP_EFFECTS.repair;
  const currentRepair = input.supplies.repair + (results.supplyDeltas.repair ?? 0);

  if (currentRepair < 1) {
    results.summaryLines.push('No repair supplies available.');
    return;
  }

  // Find lowest-durability item not already at 100
  const repairable = [...input.equipment]
    .filter((e) => e.durability < 100)
    .sort((a, b) => a.durability - b.durability);

  if (repairable.length === 0) {
    results.summaryLines.push('All equipment in good condition.');
    return;
  }

  const target = repairable[0];
  const delta = Math.min(fx.durabilityDelta[tier], 100 - target.durability);

  results.supplyDeltas.repair = (results.supplyDeltas.repair ?? 0) - fx.repairCost;
  results.equipmentRepairs.push({ slot: target.slot, durabilityDelta: delta });
  results.summaryLines.push(`Repaired ${target.slot} (+${delta} durability).`);
  results.campEvents.push({
    type: 'camp',
    description: `Repaired ${target.slot} by the firelight.`,
    severity: 'minor',
  });
}

function resolveCompanionChat(
  selection: CampActivitySelection,
  input: CampInput,
  tier: 'evening' | 'fullDay',
  results: CampResults,
): void {
  const fx = CAMP_EFFECTS.companionChat;
  const targetId = selection.targetCompanionId;

  if (!targetId || !input.activeCompanionIds.includes(targetId)) {
    results.summaryLines.push('No companion available to speak with.');
    return;
  }

  results.companionLoyaltyDeltas.push({
    companionId: targetId,
    loyaltyDelta: fx.loyaltyDelta[tier],
  });
  results.summaryLines.push('Shared words by the fire. Trust deepened.');
  results.campEvents.push({
    type: 'camp',
    description: 'Spoke with companion around the campfire.',
    severity: 'minor',
  });
}

// ============================================================
// AVAILABILITY CHECKS
// ============================================================

/**
 * Check if a camp activity is available given current state.
 * Used by store action for validation.
 */
export function isCampActivityAvailable(
  activity: CampActivity,
  supplies: Supplies,
  equipment: Equipment[],
  activeCompanionIds: CompanionId[],
): boolean {
  switch (activity) {
    case CampActivity.Rest:
      return true;
    case CampActivity.Cook:
      return supplies.food >= 2;
    case CampActivity.Repair:
      return supplies.repair >= 1 && equipment.some((e) => e.durability < 100);
    case CampActivity.CompanionChat:
      return activeCompanionIds.length > 0;
  }
}
