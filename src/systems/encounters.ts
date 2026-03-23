/**
 * Frontier — Encounter System
 *
 * Pure functions for encounter generation and resolution.
 * Per GDD §6: Encounters are generated and resolved by Game Logic.
 * The Narrator never generates encounters — only narrates them.
 *
 * Imports: @/types/ and @/data/encounter-templates only.
 */

import { EncounterType } from '@/types/encounters';
import type {
  Encounter,
  EncounterChoice,
  EncounterRequirement,
  EncounterEffect,
  EncounterOutcome,
} from '@/types/encounters';
import type { DayEvent, CompanionEvent } from '@/types/narrative';
import type { Supplies, Equipment } from '@/types/game-state';
import { Act, Biome, Terrain, Weather, DiscretionaryAction } from '@/types/game-state';
import type { EncounterTrigger } from '@/types/encounters';
import type { CompanionInstance } from '@/types/companions';
import {
  ENCOUNTER_TEMPLATES,
  ENCOUNTER_OUTCOMES,
} from '@/data/encounter-templates';
import type { EncounterTemplate } from '@/data/encounter-templates';

// ============================================================
// ENCOUNTER GATE CONSTANTS
// ============================================================

/** Base probability that any encounter occurs on a given day (Stage 1). */
export const ENCOUNTER_GATE_BASE = 0.18;

/** Multiplicative modifiers applied to the master gate probability. */
export const ENCOUNTER_GATE_MODIFIERS = {
  lowMorale: 1.3,
  scouting: 1.2,
  settlementTerrain: 1.3,
  nearWaypoint: 1.2,
  severeWeather: 1.15,
} as const;

/** Hard cap on gate probability after all modifiers. */
export const ENCOUNTER_GATE_MAX = 0.95;

/** When player health < 25, multiply gate by this to suppress encounters during crisis. */
export const ENCOUNTER_CRISIS_SUPPRESSION = 0.4;

/** Per-act multiplier for encounter gate — creates difficulty curve. */
export const ENCOUNTER_ACT_SCALING: Record<string, number> = {
  act1: 0.75,  // Gentle opening — buffer-building period
  act2: 1.0,   // Baseline
  act3: 1.15,  // Rising tension through the wilderness
  act4: 1.25,  // Climax — mountain approach (terrain already penalizes)
  act5: 1.0,   // Denouement (if used)
};

/** Per consecutive calm day, gate probability increases by this amount.
 *  Resets to 0 when an encounter occurs. Prevents boring long streaks. */
export const ENCOUNTER_CALM_RAMP = 0.03;

/** Maximum additive contribution from calm ramp (caps after ~4 calm days). */
export const ENCOUNTER_CALM_RAMP_CAP = 0.12;

// ============================================================
// DELTA RESOLUTION
// ============================================================

/**
 * Resolve an EncounterEffect delta value to a numeric change.
 *
 * Handles:
 *   - number: return as-is
 *   - 'zero': return -currentValue (sets to 0)
 *   - 'set:N': return N - currentValue (sets to N)
 *   - 'true'/'false': return 1/0 (flag effects)
 *   - string numeric: parseFloat
 */
export function resolveDelta(
  delta: number | string,
  currentValue: number,
): number {
  if (typeof delta === 'number') return delta;
  if (delta === 'zero') return -currentValue;
  if (delta.startsWith('set:')) return parseFloat(delta.slice(4)) - currentValue;
  if (delta === 'true') return 1;
  if (delta === 'false') return 0;
  return parseFloat(delta) || 0;
}

// ============================================================
// ENCOUNTER GENERATION
// ============================================================

export interface EncounterCheckInput {
  day: number;
  act: Act;
  biome: Biome;
  terrain: Terrain;
  morale: number;
  supplies: Supplies;
  companions: CompanionInstance[];
  equipment: Equipment[];
  discretionaryAction: DiscretionaryAction;
  previousEncounterIds: string[];
  /** Current weather for trigger evaluation */
  weather?: Weather;
  /** Distance to current waypoint */
  distanceToWaypoint?: number;
  /** Total miles traveled */
  totalMiles?: number;
  /** Whether a waypoint was just reached this day */
  waypointReached?: boolean;
  /** Player health for critical trigger evaluation */
  playerHealth?: number;
  /** Horse health for critical trigger evaluation */
  horseHealth?: number;
  /** Player skills for skill-gated choices */
  skills?: Record<string, number>;
  /** Consecutive days without an encounter (for calm-day tension ramp) */
  calmDayStreak?: number;
  rng?: () => number;
}

// ============================================================
// TRIGGER EVALUATION
// ============================================================

/**
 * Match a territory trigger condition against current biome/terrain.
 */
function matchTerritory(condition: string, biome: Biome, terrain: Terrain): boolean {
  const c = condition.toLowerCase();
  if (c.includes('river') || c.includes('creek')) return terrain === Terrain.River;
  if (c.includes('mountain') || c.includes('pass')) return terrain === Terrain.Mountain;
  if (c.includes('canyon')) return terrain === Terrain.Canyon;
  if (c.includes('settlement') || c.includes('abandoned')) return terrain === Terrain.Settlement;
  if (c.includes('comancheria')) return biome === Biome.StakedPlains || biome === Biome.HighDesert;
  if (c.includes('desert')) return terrain === Terrain.Desert;
  if (c.includes('forest')) return terrain === Terrain.Forest;
  // Generic conditions ('trail obstruction', 'lawless territory', 'skill test', etc.) always match
  return true;
}

/**
 * Match a weather trigger condition against current weather.
 */
function matchWeather(condition: string, weather: Weather): boolean {
  const c = condition.toLowerCase();
  if (c.includes('dust') || c.includes('sand')) return weather === Weather.Dust;
  if (c.includes('storm')) return weather === Weather.Storm;
  if (c.includes('heat') || c.includes('extreme')) return weather === Weather.Heatwave;
  if (c.includes('flood') || c.includes('rain')) return weather === Weather.Rain || weather === Weather.Storm;
  if (c.includes('fire')) return weather === Weather.Clear || weather === Weather.Heatwave;
  if (c.includes('snow') || c.includes('cold')) return weather === Weather.Snow;
  return true;
}

/**
 * Evaluate whether a template's trigger condition is currently met.
 */
function evaluateTrigger(trigger: EncounterTrigger, input: EncounterCheckInput): boolean {
  switch (trigger.type) {
    case 'distance':
      return true;

    case 'territory':
      return matchTerritory(trigger.condition, input.biome, input.terrain);

    case 'waypoint':
      return (input.waypointReached ?? false) || (input.distanceToWaypoint ?? 999) < 15;

    case 'weather':
      return input.weather ? matchWeather(trigger.condition, input.weather) : true;

    case 'morale': {
      const c = trigger.condition.toLowerCase();
      if (c.includes('low')) return input.morale < 30;
      if (c.includes('high') || c.includes('trust')) return input.morale > 60;
      return true;
    }

    case 'scout':
      return input.discretionaryAction === DiscretionaryAction.Scout;

    case 'critical': {
      const c = trigger.condition.toLowerCase();
      if (c.includes('horse')) return (input.horseHealth ?? 100) < 20;
      if (c.includes('supply')) {
        return input.supplies.water < 3 && input.supplies.food < 3;
      }
      return false;
    }

    default:
      return true;
  }
}

// ============================================================
// ENCOUNTER CHECK
// ============================================================

/**
 * Check whether an encounter occurs this day and return it (or null).
 *
 * Two-stage algorithm:
 *   1. Filter templates by biome/act/minDay/maxOccurrences/trigger
 *   2. Stage 1 — Master gate: single roll with multiplicative modifiers
 *   3. Stage 2 — Weighted selection: pick one template by baseProbability weight
 *   4. Instantiate template into full Encounter
 */
export function checkEncounter(input: EncounterCheckInput): Encounter | null {
  const roll = input.rng ?? Math.random;

  // 1. Filter to eligible templates
  const eligible = ENCOUNTER_TEMPLATES.filter((t) => {
    if (t.biomes.length > 0 && !t.biomes.includes(input.biome)) return false;
    if (t.acts.length > 0 && !t.acts.includes(input.act)) return false;
    if (input.day < t.minDay) return false;
    if (t.maxOccurrences > 0) {
      const occurrences = input.previousEncounterIds.filter((id) =>
        id.startsWith(t.id),
      ).length;
      if (occurrences >= t.maxOccurrences) return false;
    }
    // Evaluate trigger conditions
    if (!evaluateTrigger(t.trigger, input)) return false;
    // Party encounters require at least one active companion
    if (t.type === EncounterType.Party) {
      const activeCompanions = input.companions.filter((c) => c.status === 'active');
      if (activeCompanions.length === 0) return false;
    }
    return true;
  });

  if (eligible.length === 0) return null;

  // 2. Stage 1 — Master gate with multiplicative modifiers
  let gate = ENCOUNTER_GATE_BASE;

  // Act-based difficulty curve
  const actScale = ENCOUNTER_ACT_SCALING[input.act] ?? 1.0;
  gate *= actScale;

  // Situational modifiers
  if (input.morale < 30) gate *= ENCOUNTER_GATE_MODIFIERS.lowMorale;
  if (input.discretionaryAction === DiscretionaryAction.Scout) gate *= ENCOUNTER_GATE_MODIFIERS.scouting;
  if (input.terrain === Terrain.Settlement) gate *= ENCOUNTER_GATE_MODIFIERS.settlementTerrain;
  if ((input.distanceToWaypoint ?? 999) < 15) gate *= ENCOUNTER_GATE_MODIFIERS.nearWaypoint;
  if (input.weather === Weather.Storm || input.weather === Weather.Heatwave) gate *= ENCOUNTER_GATE_MODIFIERS.severeWeather;

  // Crisis suppression: ease encounter pressure when player is dying
  if ((input.playerHealth ?? 100) < 25) gate *= ENCOUNTER_CRISIS_SUPPRESSION;

  // Consecutive-calm tension ramp: prevents long boring stretches (capped)
  const calmStreak = input.calmDayStreak ?? 0;
  gate += Math.min(calmStreak * ENCOUNTER_CALM_RAMP, ENCOUNTER_CALM_RAMP_CAP);

  gate = Math.min(gate, ENCOUNTER_GATE_MAX);

  if (roll() >= gate) return null;

  // 3. Stage 2 — Weighted selection from eligible pool
  const totalWeight = eligible.reduce((sum, t) => sum + t.baseProbability, 0);
  if (totalWeight <= 0) return null;

  const pick = roll() * totalWeight;
  let cumulative = 0;
  let selected = eligible[0];
  for (const template of eligible) {
    cumulative += template.baseProbability;
    if (pick < cumulative) {
      selected = template;
      break;
    }
  }

  // 4. Instantiate into full Encounter
  return instantiateEncounter(selected, input);
}

// ============================================================
// REQUIREMENT EVALUATION
// ============================================================

/**
 * Check whether all requirements for a choice are met.
 */
export function evaluateRequirements(
  requirements: EncounterRequirement[],
  state: {
    supplies: Supplies;
    equipment: Equipment[];
    companions: CompanionInstance[];
    morale: number;
    skills?: Record<string, number>;
  },
): boolean {
  for (const req of requirements) {
    switch (req.type) {
      case 'supply': {
        const value = state.supplies[req.key as keyof Supplies];
        if (value === undefined || value < (req.minValue ?? 0)) return false;
        break;
      }
      case 'equipment': {
        const equip = state.equipment.find((e) => e.slot === req.key);
        if (!equip || equip.durability < (req.minValue ?? 1)) return false;
        break;
      }
      case 'companion': {
        const activeCompanions = state.companions.filter((c) => c.status === 'active');
        if (req.key === 'any') {
          if (activeCompanions.length === 0) return false;
        } else {
          if (!activeCompanions.some((c) => c.id === req.key)) return false;
        }
        break;
      }
      case 'morale': {
        if (state.morale < (req.minValue ?? 0)) return false;
        break;
      }
      case 'skill': {
        if (!state.skills) return false;
        const skillValue = state.skills[req.key];
        if (skillValue === undefined || skillValue < (req.minValue ?? 0)) return false;
        break;
      }
    }
  }
  return true;
}

// ============================================================
// ENCOUNTER RESOLUTION
// ============================================================

export interface EncounterResolutionInput {
  encounter: Encounter;
  choiceId: string;
  playerHealth: number;
  horseHealth: number;
  /** Active companions — needed for Party encounter companion event generation */
  companions?: CompanionInstance[];
  rng?: () => number;
}

export interface EncounterResolutionResult {
  encounter: Encounter;
  effects: EncounterEffect[];
  events: DayEvent[];
  companionEvents: CompanionEvent[];
  isLethal: boolean;
  triggersBargain: boolean;
}

/**
 * Resolve a player's encounter choice. Returns the outcome effects,
 * narrative events, and whether the outcome is lethal.
 */
export function resolveEncounter(
  input: EncounterResolutionInput,
): EncounterResolutionResult {
  const { encounter, choiceId, playerHealth, horseHealth } = input;

  // Look up the outcome
  const templateId = encounter.id.replace(/_day\d+$/, '');
  const outcomeKey = `${templateId}:${choiceId}`;
  const outcome: EncounterOutcome = ENCOUNTER_OUTCOMES[outcomeKey] ?? {
    choiceId,
    description: 'The moment passed without consequence.',
    effects: [],
  };

  // Build narrative events
  const events: DayEvent[] = [{
    type: 'encounter',
    description: outcome.description,
    severity: determineSeverity(outcome.effects),
  }];

  // Check lethality: does any health effect bring player or horse to 0?
  let isLethal = false;
  let projectedPlayerHealth = playerHealth;
  let projectedHorseHealth = horseHealth;

  for (const effect of outcome.effects) {
    if (effect.type === 'health' && effect.target === 'player') {
      projectedPlayerHealth += resolveDelta(effect.delta, projectedPlayerHealth);
    }
    if (effect.type === 'health' && effect.target === 'horse') {
      projectedHorseHealth += resolveDelta(effect.delta, projectedHorseHealth);
    }
  }

  if (projectedPlayerHealth <= 0 || projectedHorseHealth <= 0) {
    isLethal = true;
  }

  // Desperate encounters or lethal outcomes can trigger bargain
  const triggersBargain = isLethal || encounter.type === EncounterType.Desperate;

  // Generate companion events for Party encounters
  const companionEvents: CompanionEvent[] = [];
  if (encounter.type === EncounterType.Party && input.companions && input.companions.length > 0) {
    const rng = input.rng ?? Math.random;
    const activeCompanions = input.companions.filter((c) => c.status === 'active');

    if (activeCompanions.length > 0) {
      // Pick primary companion (random selection for the encounter)
      const primaryIdx = Math.floor(rng() * activeCompanions.length);
      const primary = activeCompanions[primaryIdx];
      const others = activeCompanions.filter((_, i) => i !== primaryIdx);

      for (const effect of outcome.effects) {
        if (effect.type === 'loyalty') {
          const delta = typeof effect.delta === 'number' ? effect.delta : parseFloat(String(effect.delta)) || 0;

          if (effect.target === 'all') {
            for (const c of activeCompanions) {
              companionEvents.push({
                companion: c.id,
                type: 'loyaltyChange',
                detail: `${c.id} loyalty ${delta >= 0 ? '+' : ''}${delta} from ${encounter.name}`,
                loyaltyDelta: delta,
              });
            }
          } else if (effect.target === 'favored' || effect.target === 'sick') {
            companionEvents.push({
              companion: primary.id,
              type: 'loyaltyChange',
              detail: `${primary.id} loyalty ${delta >= 0 ? '+' : ''}${delta} from ${encounter.name}`,
              loyaltyDelta: delta,
            });
          } else if (effect.target === 'other' && others.length > 0) {
            const otherIdx = Math.floor(rng() * others.length);
            companionEvents.push({
              companion: others[otherIdx].id,
              type: 'loyaltyChange',
              detail: `${others[otherIdx].id} loyalty ${delta >= 0 ? '+' : ''}${delta} from ${encounter.name}`,
              loyaltyDelta: delta,
            });
          }
        }

        if (effect.type === 'health' && effect.target === 'companion') {
          const delta = typeof effect.delta === 'number' ? effect.delta : parseFloat(String(effect.delta)) || 0;
          companionEvents.push({
            companion: primary.id,
            type: delta < -15 ? 'death' : 'loyaltyChange',
            detail: `${primary.id} health ${delta >= 0 ? '+' : ''}${delta} from ${encounter.name}`,
          });
        }
      }
    }
  }

  // Mark encounter resolved
  const resolvedEncounter: Encounter = {
    ...encounter,
    resolved: true,
    outcome,
  };

  return {
    encounter: resolvedEncounter,
    effects: outcome.effects,
    events,
    companionEvents,
    isLethal,
    triggersBargain,
  };
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function instantiateEncounter(
  template: EncounterTemplate,
  input: EncounterCheckInput,
): Encounter {
  const choices: EncounterChoice[] = template.choices.map((c) => ({
    ...c,
    available: evaluateRequirements(c.requirements ?? [], {
      supplies: input.supplies,
      equipment: input.equipment,
      companions: input.companions,
      morale: input.morale,
      skills: input.skills,
    }),
  }));

  return {
    id: `${template.id}_day${input.day}`,
    type: template.type,
    name: template.name,
    description: template.description,
    trigger: template.trigger,
    choices,
    resolved: false,
    outcome: null,
  };
}

function determineSeverity(
  effects: EncounterEffect[],
): 'minor' | 'moderate' | 'major' | 'critical' {
  let maxMagnitude = 0;
  for (const e of effects) {
    if (e.type === 'health') {
      const mag = typeof e.delta === 'number' ? Math.abs(e.delta) : 10;
      maxMagnitude = Math.max(maxMagnitude, mag);
    }
  }
  if (maxMagnitude >= 15) return 'critical';
  if (maxMagnitude >= 8) return 'major';
  if (maxMagnitude >= 3) return 'moderate';
  return 'minor';
}
