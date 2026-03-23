/**
 * Frontier — Headless Simulator Strategies
 *
 * Each strategy implements day-action decisions, encounter choices,
 * and camp activity selection for automated play.
 *
 * Imports from types/ only.
 */

import { Pace, DiscretionaryAction } from '@/types/game-state';
import type { GameState, Equipment } from '@/types/game-state';
import { EncounterType, type Encounter, type EncounterChoice } from '@/types/encounters';
import { CampActivity } from '@/types/camp';
import type { CampActivitySelection } from '@/types/camp';
import type { StrategyName } from './types';

// ============================================================
// STRATEGY INTERFACE
// ============================================================

export interface DayDecisions {
  pace: Pace;
  action: DiscretionaryAction;
  nightTravel: boolean;
}

export interface EncounterDecision {
  choiceId: string;
  acceptBargain: boolean;
}

export interface Strategy {
  decideDayActions(state: GameState, rng: () => number): DayDecisions;
  decideEncounter(encounter: Encounter, state: GameState, rng: () => number): EncounterDecision;
  decideCamp(state: GameState, isFullDay: boolean, rng: () => number): CampActivitySelection[];
}

// ============================================================
// HELPERS
// ============================================================

function getAvailableChoices(encounter: Encounter): EncounterChoice[] {
  return encounter.choices.filter((c) => c.available);
}

function lowestEquipDurability(equipment: Equipment[]): number {
  if (equipment.length === 0) return 100;
  return Math.min(...equipment.map((e) => e.durability));
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Type-aware encounter choice heuristic.
 * Discovery/Settlement/Desperate/Party: first choice (supplies, diplomacy, resources).
 * Hostile/Environmental/Trail: middle choice (balanced, avoids extremes).
 */
function pickSmartChoice(encounter: Encounter, available: EncounterChoice[]): EncounterChoice {
  switch (encounter.type) {
    case EncounterType.Discovery:
    case EncounterType.Settlement:
    case EncounterType.Desperate:
    case EncounterType.Party:
      // First choice: usually supply/diplomacy/recovery
      return available[0];
    case EncounterType.Environmental:
      // For environmental: index 1 = shelter/wait (trades time for safety)
      // For 3-choice: index 1 is the balanced middle option
      return available[Math.min(1, available.length - 1)];
    default:
      // Hostile, Trail: index 1 (middle/cautious) for 3+ choices, first for 2-choice
      return available.length <= 2 ? available[0] : available[Math.min(1, available.length - 1)];
  }
}

// ============================================================
// RANDOM STRATEGY
// ============================================================

const randomStrategy: Strategy = {
  decideDayActions(_state, rng) {
    const paces = [Pace.Conservative, Pace.Normal, Pace.HardPush];
    const actions = [
      DiscretionaryAction.None,
      DiscretionaryAction.Hunt,
      DiscretionaryAction.Forage,
      DiscretionaryAction.Repair,
      DiscretionaryAction.Rest,
      DiscretionaryAction.Scout,
    ];
    return {
      pace: pickRandom(paces, rng),
      action: pickRandom(actions, rng),
      nightTravel: rng() < 0.5,
    };
  },

  decideEncounter(encounter, _state, rng) {
    const available = getAvailableChoices(encounter);
    const choice = available.length > 0
      ? pickRandom(available, rng)
      : encounter.choices[0];
    return {
      choiceId: choice.id,
      acceptBargain: rng() < 0.5,
    };
  },

  decideCamp(_state, isFullDay, rng) {
    const activities = [
      CampActivity.Rest,
      CampActivity.Cook,
      CampActivity.Repair,
    ];
    const slots = isFullDay ? 2 : 1;
    const result: CampActivitySelection[] = [];
    for (let i = 0; i < slots; i++) {
      result.push({ activity: pickRandom(activities, rng) });
    }
    return result;
  },
};

// ============================================================
// CONSERVATIVE STRATEGY
// ============================================================

const conservativeStrategy: Strategy = {
  decideDayActions(state, _rng) {
    const { fatigue, morale } = state.player;
    const { food, water } = state.supplies;

    // Pace: Normal usually, HardPush if morale is high and supplies are good
    let pace = Pace.Normal;
    if (morale > 70 && water > 25 && food > 20) {
      pace = Pace.HardPush;
    } else if (fatigue > 60 || water < 10) {
      pace = Pace.Conservative;
    }

    // Action: Rest when fatigued, Hunt when low on food
    let action: DiscretionaryAction = DiscretionaryAction.None;
    if (fatigue > 50) {
      action = DiscretionaryAction.Rest;
    } else if (food < 15 && state.supplies.ammo > 0) {
      action = DiscretionaryAction.Hunt;
    } else if (water < 10) {
      action = DiscretionaryAction.Forage;
    } else if (lowestEquipDurability(state.player.equipment) < 30 && state.supplies.repair > 0) {
      action = DiscretionaryAction.Repair;
    } else if (state.player.health > 40) {
      action = DiscretionaryAction.Scout;
    }

    return { pace, action, nightTravel: false };
  },

  decideEncounter(encounter, _state, _rng) {
    const available = getAvailableChoices(encounter);
    if (available.length === 0) {
      return { choiceId: encounter.choices[0].id, acceptBargain: true };
    }
    // Type-aware choice: first for supply/social, middle for danger
    return {
      choiceId: pickSmartChoice(encounter, available).id,
      acceptBargain: true,
    };
  },

  decideCamp(state, isFullDay, _rng) {
    const slots = isFullDay ? 2 : 1;
    const result: CampActivitySelection[] = [];

    for (let i = 0; i < slots; i++) {
      if (state.player.fatigue > 40 && !result.some((r) => r.activity === CampActivity.Rest)) {
        result.push({ activity: CampActivity.Rest });
      } else if (state.supplies.food >= 2 && !result.some((r) => r.activity === CampActivity.Cook)) {
        result.push({ activity: CampActivity.Cook });
      } else if (
        lowestEquipDurability(state.player.equipment) < 60 &&
        state.supplies.repair > 0 &&
        !result.some((r) => r.activity === CampActivity.Repair)
      ) {
        result.push({ activity: CampActivity.Repair });
      } else {
        result.push({ activity: CampActivity.Rest });
      }
    }
    return result;
  },
};

// ============================================================
// AGGRESSIVE STRATEGY
// ============================================================

const aggressiveStrategy: Strategy = {
  decideDayActions(state, _rng) {
    return {
      pace: Pace.HardPush,
      action: state.supplies.ammo > 0
        ? DiscretionaryAction.Hunt
        : DiscretionaryAction.None,
      nightTravel: state.player.morale > 50,
    };
  },

  decideEncounter(encounter, _state, _rng) {
    const available = getAvailableChoices(encounter);
    // Pick first available (usually the boldest option)
    const choice = available.length > 0 ? available[0] : encounter.choices[0];
    return {
      choiceId: choice.id,
      acceptBargain: false, // Accept death rather than lose resources
    };
  },

  decideCamp(_state, isFullDay, _rng) {
    const slots = isFullDay ? 2 : 1;
    return Array.from({ length: slots }, () => ({
      activity: CampActivity.Rest,
    }));
  },
};

// ============================================================
// OPTIMAL STRATEGY
// ============================================================

const optimalStrategy: Strategy = {
  decideDayActions(state, _rng) {
    const { health, fatigue, morale } = state.player;
    const { water, food, ammo, repair } = state.supplies;

    // Pace: bias toward speed — HardPush whenever sustainable
    let pace = Pace.Normal;
    if (health < 25 || fatigue > 85 || water < 3) {
      pace = Pace.Conservative;
    } else if (water > 12 && food > 10 && fatigue < 65 && morale > 20) {
      pace = Pace.HardPush;
    }

    // Action: prioritize survival needs
    let action: DiscretionaryAction = DiscretionaryAction.Forage;
    if (fatigue >= 70) {
      action = DiscretionaryAction.Rest;
    } else if (food < 12 && ammo > 0) {
      action = DiscretionaryAction.Hunt;
    } else if (water < 15 || food < 12) {
      action = DiscretionaryAction.Forage;
    } else if (lowestEquipDurability(state.player.equipment) < 60 && repair > 0) {
      action = DiscretionaryAction.Repair;
    } else {
      // Default: Scout to boost encounter chance (supply discoveries)
      action = DiscretionaryAction.Scout;
    }

    // Night travel only when close to waypoint and in good shape
    const nightTravel =
      state.world.distanceToWaypoint < 40 &&
      fatigue < 45 &&
      morale > 35;

    return { pace, action, nightTravel };
  },

  decideEncounter(encounter, _state, _rng) {
    const available = getAvailableChoices(encounter);
    if (available.length === 0) {
      return { choiceId: encounter.choices[0].id, acceptBargain: true };
    }
    // Type-aware choice: first for supply/social, middle for danger
    return {
      choiceId: pickSmartChoice(encounter, available).id,
      acceptBargain: true, // Always survive
    };
  },

  decideCamp(state, isFullDay, _rng) {
    const slots = isFullDay ? 2 : 1;
    const result: CampActivitySelection[] = [];

    for (let i = 0; i < slots; i++) {
      // Priority: Repair early > Rest if fatigued > Cook for health > Cook > Rest
      if (
        lowestEquipDurability(state.player.equipment) < 80 &&
        state.supplies.repair > 0 &&
        !result.some((r) => r.activity === CampActivity.Repair)
      ) {
        result.push({ activity: CampActivity.Repair });
      } else if (state.player.fatigue > 50 && !result.some((r) => r.activity === CampActivity.Rest)) {
        result.push({ activity: CampActivity.Rest });
      } else if (
        state.player.health < 80 && state.supplies.food >= 2 &&
        !result.some((r) => r.activity === CampActivity.Cook)
      ) {
        result.push({ activity: CampActivity.Cook });
      } else if (state.supplies.food >= 2 && !result.some((r) => r.activity === CampActivity.Cook)) {
        result.push({ activity: CampActivity.Cook });
      } else {
        result.push({ activity: CampActivity.Rest });
      }
    }
    return result;
  },
};

// ============================================================
// REGISTRY
// ============================================================

const STRATEGIES: Record<StrategyName, Strategy> = {
  random: randomStrategy,
  conservative: conservativeStrategy,
  aggressive: aggressiveStrategy,
  optimal: optimalStrategy,
};

export function getStrategy(name: StrategyName): Strategy {
  return STRATEGIES[name];
}
