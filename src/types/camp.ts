/**
 * Frontier — Camp System Interfaces
 *
 * Types for the evening camp and full-day rest camp phases.
 * Camp occurs every day between encounter resolution and the Director layer.
 */

import type { Equipment, Supplies } from './game-state';
import { EquipmentSlot } from './game-state';
import type { DayEvent } from './narrative';
import { CompanionId } from './companions';

// ============================================================
// CAMP ACTIVITY ENUM
// ============================================================

export enum CampActivity {
  Rest = 'rest',
  Cook = 'cook',
  Repair = 'repair',
  CompanionChat = 'companionChat',
}

// ============================================================
// CAMP INPUT / OUTPUT
// ============================================================

export interface CampActivitySelection {
  activity: CampActivity;
  /** For CompanionChat: which companion to chat with */
  targetCompanionId?: CompanionId;
}

export interface CampInput {
  /** Activities the player selected (1 for evening, 2 for full-day) */
  activities: CampActivitySelection[];
  /** True when discretionaryAction === Rest (full-day camp) */
  isFullDay: boolean;
  /** Current player fatigue 0–100 */
  playerFatigue: number;
  /** Current player morale 0–100 */
  playerMorale: number;
  /** Current player health 0–100 */
  playerHealth: number;
  /** Current equipment array */
  equipment: Equipment[];
  /** Current supply levels */
  supplies: Supplies;
  /** Active companion IDs */
  activeCompanionIds: CompanionId[];
  /** Camp pet adopted and not lost */
  hasCampPet: boolean;
  /** Injectable RNG for testing */
  rng?: () => number;
}

export interface CampResults {
  /** Fatigue delta (negative = less fatigued) */
  fatigueDelta: number;
  /** Morale delta */
  moraleDelta: number;
  /** Health delta */
  healthDelta: number;
  /** Supply consumption/changes */
  supplyDeltas: Partial<Record<keyof Supplies, number>>;
  /** Equipment repairs applied */
  equipmentRepairs: { slot: EquipmentSlot; durabilityDelta: number }[];
  /** Companion loyalty changes */
  companionLoyaltyDeltas: { companionId: CompanionId; loyaltyDelta: number }[];
  /** Events to merge into EventRecord for the Narrator */
  campEvents: DayEvent[];
  /** Summary text for the CampOverlay result display */
  summaryLines: string[];
}

// ============================================================
// CAMP ACTIVITY DEFINITIONS (for UI display)
// ============================================================

export interface CampActivityDef {
  activity: CampActivity;
  name: string;
  description: string;
  /** Specific mechanical effects shown as tooltip */
  effectLabel: string;
  /** Description of benefit when isFullDay */
  fullDayBonus: string;
  /** Requirement label shown when unavailable */
  requirementLabel: string;
}

export const CAMP_ACTIVITY_DEFS: CampActivityDef[] = [
  {
    activity: CampActivity.Rest,
    name: 'Rest by the Fire',
    description: 'Ease fatigue and lift spirits.',
    effectLabel: '-10 fatigue, +2 morale',
    fullDayBonus: 'Extended rest: -20 fatigue, +3 morale.',
    requirementLabel: '',
  },
  {
    activity: CampActivity.Cook,
    name: 'Prepare a Meal',
    description: 'Cook food for healing. Coffee if available.',
    effectLabel: '+5 health, costs 1 food. Coffee: +2 morale',
    fullDayBonus: 'Hearty meal: +8 health, +3 morale with coffee.',
    requirementLabel: 'Requires 2+ food',
  },
  {
    activity: CampActivity.Repair,
    name: 'Mend Equipment',
    description: 'Repair the most damaged gear.',
    effectLabel: '+15 durability on worst item, costs 1 repair',
    fullDayBonus: 'Thorough repair: +25 durability on worst item.',
    requirementLabel: 'Requires 1+ repair supplies',
  },
  {
    activity: CampActivity.CompanionChat,
    name: 'Speak with Companion',
    description: 'Build trust around the campfire.',
    effectLabel: '+5 loyalty with chosen companion',
    fullDayBonus: 'Long conversation: +10 loyalty.',
    requirementLabel: 'Requires an active companion',
  },
];
