/**
 * Frontier — Companion System
 *
 * Pure functions for companion daily processing: morale drift,
 * loyalty changes, health from supply conditions, desertion,
 * death, and skill bonus calculation.
 *
 * Per GDD §5: max 4 companions, each with health/morale/loyalty (0–100).
 * Imports: @/types/ only.
 */

import type { CompanionInstance } from '@/types/companions';
import { CompanionSkill, CHARACTER_BIBLES } from '@/types/companions';
import type { CompanionEvent } from '@/types/narrative';
import type { Supplies } from '@/types/game-state';
import { Pace } from '@/types/game-state';

// ============================================================
// COMPANION DAY PROCESSING
// ============================================================

export interface CompanionDayInput {
  companions: CompanionInstance[];
  playerMorale: number;
  supplies: Supplies;
  pace: Pace;
  dayNumber: number;
  /** Loyalty deltas from encounter resolution */
  encounterEffects: { companionId: string; loyaltyDelta: number }[];
  rng?: () => number;
}

export interface CompanionDayResult {
  updatedCompanions: CompanionInstance[];
  companionEvents: CompanionEvent[];
  skillBonuses: CompanionSkillBonuses;
}

export interface CompanionSkillBonuses {
  navigationBonus: number;
  medicineBonus: number;
  huntingBonus: number;
}

/**
 * Process all companion state changes for one day.
 *
 * Per companion:
 *   - Morale drifts toward player morale (~2 pts/day max)
 *   - Loyalty adjusts based on supply adequacy and pace
 *   - Health decreases if supplies are depleted
 *   - Encounter effects applied
 *   - Desertion check if loyalty and morale both critically low
 *   - Death check if health reaches 0
 *   - Skill bonuses calculated from active companions
 */
export function processCompanionDay(
  input: CompanionDayInput,
): CompanionDayResult {
  const roll = input.rng ?? Math.random;
  const events: CompanionEvent[] = [];
  const updated: CompanionInstance[] = [];

  for (const companion of input.companions) {
    if (companion.status !== 'active') {
      updated.push({ ...companion });
      continue;
    }

    let { health, morale, loyalty } = companion;

    // --- Morale drift toward player morale ---
    const moraleDelta = clamp(
      (input.playerMorale - morale) * 0.1,
      -2,
      2,
    );
    morale = clamp(morale + moraleDelta, 0, 100);

    // --- Loyalty based on supply conditions ---
    const suppliesAdequate = input.supplies.water > 5 && input.supplies.food > 5;
    const suppliesCritical = input.supplies.water <= 2 || input.supplies.food <= 2;

    if (suppliesAdequate) {
      loyalty = clamp(loyalty + 1, 0, 100);
    } else if (suppliesCritical) {
      loyalty = clamp(loyalty - 2, 0, 100);
    }

    // Hard push pace penalty
    if (input.pace === Pace.HardPush) {
      loyalty = clamp(loyalty - 1, 0, 100);
    }

    // --- Health from depleted supplies ---
    if (input.supplies.water <= 0) {
      health = clamp(health - 3, 0, 100);
    }
    if (input.supplies.food <= 0) {
      health = clamp(health - 2, 0, 100);
    }

    // --- Apply encounter loyalty effects ---
    for (const effect of input.encounterEffects) {
      if (effect.companionId === companion.id || effect.companionId === 'all') {
        loyalty = clamp(loyalty + effect.loyaltyDelta, 0, 100);
        if (effect.loyaltyDelta !== 0) {
          events.push({
            companion: CHARACTER_BIBLES[companion.id].name,
            type: 'loyaltyChange',
            detail: effect.loyaltyDelta > 0
              ? `Loyalty increased by ${effect.loyaltyDelta}`
              : `Loyalty decreased by ${Math.abs(effect.loyaltyDelta)}`,
            loyaltyDelta: effect.loyaltyDelta,
          });
        }
      }
    }

    // --- Desertion check ---
    let status: CompanionInstance['status'] = companion.status;
    if (loyalty <= 15 && morale <= 20) {
      const desertionChance = (20 - loyalty) / 100;
      if (roll() < desertionChance) {
        status = 'deserted';
        events.push({
          companion: CHARACTER_BIBLES[companion.id].name,
          type: 'deserted',
          detail: `${CHARACTER_BIBLES[companion.id].fullName} left in the night. The trail was too much.`,
        });
      }
    }

    // --- Death check ---
    if (health <= 0 && status === 'active') {
      status = 'dead';
      health = 0;
      events.push({
        companion: CHARACTER_BIBLES[companion.id].name,
        type: 'death',
        detail: `${CHARACTER_BIBLES[companion.id].fullName} did not survive.`,
      });
    }

    updated.push({
      ...companion,
      health,
      morale,
      loyalty,
      status,
    });
  }

  // Calculate skill bonuses from active companions
  const skillBonuses = calculateSkillBonuses(updated);

  return {
    updatedCompanions: updated,
    companionEvents: events,
    skillBonuses,
  };
}

// ============================================================
// SKILL BONUSES
// ============================================================

/**
 * Calculate aggregate skill bonuses from all active companions.
 * Bonus scales with loyalty: base 10 + loyalty/10 (max ~20 at loyalty 100).
 */
function calculateSkillBonuses(
  companions: CompanionInstance[],
): CompanionSkillBonuses {
  const bonuses: CompanionSkillBonuses = {
    navigationBonus: 0,
    medicineBonus: 0,
    huntingBonus: 0,
  };

  for (const c of companions) {
    if (c.status !== 'active') continue;

    const bible = CHARACTER_BIBLES[c.id];
    const bonus = 10 + Math.floor(c.loyalty / 10);

    switch (bible.skill) {
      case CompanionSkill.Navigation:
        bonuses.navigationBonus += bonus;
        break;
      case CompanionSkill.Medicine:
        bonuses.medicineBonus += bonus;
        break;
      case CompanionSkill.Hunting:
        bonuses.huntingBonus += bonus;
        break;
    }
  }

  return bonuses;
}

// ============================================================
// RECRUITMENT
// ============================================================

/**
 * Check whether the party has room for another companion.
 */
export function canRecruitCompanion(
  companions: CompanionInstance[],
  maxCompanions: number,
): boolean {
  return companions.filter((c) => c.status === 'active').length < maxCompanions;
}

/**
 * Get the skill bonus for a specific skill from active companions.
 */
export function getCompanionSkillBonus(
  companions: CompanionInstance[],
  skill: CompanionSkill,
): number {
  for (const c of companions) {
    if (c.status !== 'active') continue;
    const bible = CHARACTER_BIBLES[c.id];
    if (bible.skill === skill) {
      return 10 + Math.floor(c.loyalty / 10);
    }
  }
  return 0;
}

// ============================================================
// HELPERS
// ============================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
