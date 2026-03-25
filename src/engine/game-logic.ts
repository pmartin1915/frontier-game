/**
 * Frontier — Layer 1: Game Logic
 *
 * Pure TypeScript. Calculates ALL mechanical outcomes for one in-game day.
 * Produces an EventRecord and DayResults. Never calls the API.
 * Never generates prose.
 *
 * This is the canonical source of truth. If this module says water = 12,
 * then water = 12. The Narrator cannot override it.
 *
 * Delegates to individual systems in src/systems/ for specific mechanics.
 */

import type { GameState, Supplies, ActiveCondition } from '@/types/game-state';
import {
  TimeOfDay,
  DiscretionaryAction,
} from '@/types/game-state';
import type { EventRecord, DayEvent, CompanionEvent } from '@/types/narrative';
import { NarrativeEventType } from '@/types/narrative';
import type { Encounter } from '@/types/encounters';
import { EncounterType } from '@/types/encounters';
import type { DayResults } from '@/types/game-state';
import { calculateMovement } from '@/systems/movement';
import { calculateSupplyConsumption } from '@/systems/supplies';
import { calculateHealth } from '@/systems/health';
import { calculateMorale } from '@/systems/morale';
import { calculateEquipment } from '@/systems/equipment';
import { checkEncounter } from '@/systems/encounters';
import { processCompanionDay } from '@/systems/companions';
import { checkWaypointProgression } from '@/systems/waypoint';
import type { WaypointTransition } from '@/systems/waypoint';
import { TRAIL_WAYPOINTS } from '@/data/trail-route';
import { rollWeather } from '@/data/weather-tables';

// ============================================================
// MAIN ENTRY POINT
// ============================================================

/**
 * Resolve all outcomes for a single in-game day.
 * Returns the structured EventRecord (for Director), DayResults (for store),
 * and an optional Encounter (for UI decision overlay).
 */
export function resolveDay(
  state: GameState,
  rng?: () => number,
): { eventRecord: EventRecord; dayResults: DayResults; encounter: Encounter | null } {
  const nextDay = state.journey.daysElapsed + 1;

  // 1. Movement
  const movementResult = calculateMovement({
    pace: state.journey.pace,
    terrain: state.world.terrain,
    nightTravel: state.journey.nightTravel,
    horseFatigue: state.horse.fatigue,
    horseLameness: state.horse.lameness,
    tackCondition: state.horse.tackCondition,
    navigationSkill: state.player.skills.navigation,
    distanceToWaypoint: state.world.distanceToWaypoint,
    detourMilesRemaining: state.journey.detourMilesRemaining,
    fortSumnerDebt: state.journey.fortSumnerDebt,
    rng,
  });

  // 1.5. Waypoint progression check
  const waypointTransition = checkWaypointProgression({
    totalMiles: state.world.totalMiles + movementResult.distanceTraveled,
    distanceToWaypoint: state.world.distanceToWaypoint,
    distanceTraveled: movementResult.distanceTraveled,
    currentWaypointName: state.journey.waypoint,
    waypoints: TRAIL_WAYPOINTS,
  });

  // 1.6. Weather roll (use updated biome if waypoint changed)
  const effectiveBiome = waypointTransition.newBiome ?? state.world.biome;
  const newWeather = rollWeather(effectiveBiome, rng ?? Math.random);

  // 2. Supply consumption
  const supplyResult = calculateSupplyConsumption({
    pace: state.journey.pace,
    nightTravel: state.journey.nightTravel,
    weather: state.world.weather,
    temperature: state.world.temperature,
    discretionaryAction: state.journey.discretionaryAction,
    currentSupplies: state.supplies,
    companionCount: state.party.companions.filter((c) => c.status === 'active').length,
    survivalSkill: state.player.skills.survival,
    waterCapacity: state.carryCapacity.water,
    foodCapacity: state.carryCapacity.food,
    rng,
  });

  // 2.5. Settlement resupply — arriving at a settlement grants free supplies
  if (waypointTransition.reached && waypointTransition.isSettlement) {
    supplyResult.deltas.water = (supplyResult.deltas.water ?? 0) + 6;
    supplyResult.deltas.food = (supplyResult.deltas.food ?? 0) + 4;
    supplyResult.deltas.medical = (supplyResult.deltas.medical ?? 0) + 1;
  }

  // Compute resulting supply levels for health checks
  const resultingWater = state.supplies.water + (supplyResult.deltas.water ?? 0);
  const resultingFood = state.supplies.food + (supplyResult.deltas.food ?? 0);

  // 3. Health
  const healthResult = calculateHealth({
    player: state.player,
    horse: state.horse,
    pace: state.journey.pace,
    waterDepleted: resultingWater <= 0,
    foodDepleted: resultingFood <= 0,
    nightTravel: state.journey.nightTravel,
    horseInjuryRisk: movementResult.horseInjuryRisk,
    temperature: state.world.temperature,
    discretionaryAction: state.journey.discretionaryAction,
    rng,
  });

  // 4. Equipment
  const equipResult = calculateEquipment({
    equipment: state.player.equipment,
    pace: state.journey.pace,
    terrain: state.world.terrain,
    discretionaryAction: state.journey.discretionaryAction,
    repairSupplies: state.supplies.repair,
  });

  // 5. Build DayEvent[] from all results
  const events: DayEvent[] = [];

  if (movementResult.gotLost) {
    events.push({
      type: 'navigation',
      description: `Got lost during night travel, losing ${movementResult.lostMiles} miles`,
      severity: 'moderate',
    });
  }

  if (movementResult.detourMilesConsumed > 0) {
    events.push({
      type: 'navigation',
      description: `Detour: ${movementResult.detourMilesConsumed} miles consumed, ${Math.max(0, (state.journey.detourMilesRemaining ?? 0) - movementResult.detourMilesConsumed)} remaining`,
      severity: 'minor',
    });
  }

  for (const w of supplyResult.warnings) {
    events.push({
      type: 'supply',
      description: `${w.supply} ${w.level}`,
      severity: w.level === 'depleted' ? 'major' : 'minor',
    });
  }

  for (const he of healthResult.healthEvents) {
    events.push({
      type: 'health',
      description: `${he.target}: ${he.condition} (${he.type})`,
      severity: he.type === 'death' ? 'critical' : 'moderate',
    });
  }

  for (const ee of equipResult.equipmentEvents) {
    if (ee.type === 'broken') {
      events.push({
        type: 'equipment',
        description: `${ee.slot} broken`,
        severity: 'major',
      });
    }
  }

  // 5.5. Waypoint arrival events
  if (waypointTransition.reached) {
    for (const wpName of waypointTransition.waypointsReached) {
      events.push({
        type: 'waypoint',
        description: `Arrived at ${wpName}`,
        severity: 'moderate',
      });
    }
    if (waypointTransition.isSettlement) {
      events.push({
        type: 'supply',
        description: 'Resupplied at settlement (+6 water, +4 food, +1 medical)',
        severity: 'minor',
      });
    }
  }

  // 6. Morale (needs events and supply warnings)
  const criticalSupplies = supplyResult.warnings
    .filter((w) => w.level === 'critical' || w.level === 'depleted')
    .map((w) => w.supply);

  const moraleResult = calculateMorale({
    currentMorale: state.player.morale,
    coffeeAvailable: (state.supplies.coffee + (supplyResult.deltas.coffee ?? 0)) > 0,
    campPet: state.campPet,
    events,
    criticalSupplies,
    restDay: state.journey.discretionaryAction === DiscretionaryAction.Rest,
    pace: state.journey.pace,
  });

  // 6.5. Companion processing
  const newSuppliesForCompanions: Supplies = {
    water: Math.max(0, state.supplies.water + (supplyResult.deltas.water ?? 0)),
    food: Math.max(0, state.supplies.food + (supplyResult.deltas.food ?? 0)),
    coffee: Math.max(0, state.supplies.coffee + (supplyResult.deltas.coffee ?? 0)),
    medical: Math.max(0, state.supplies.medical + (supplyResult.deltas.medical ?? 0)),
    repair: Math.max(0, state.supplies.repair + (supplyResult.deltas.repair ?? 0)),
    ammo: Math.max(0, state.supplies.ammo + (supplyResult.deltas.ammo ?? 0)),
    tradeGoods: Math.max(0, state.supplies.tradeGoods + (supplyResult.deltas.tradeGoods ?? 0)),
    funds: Math.max(0, state.supplies.funds + (supplyResult.deltas.funds ?? 0)),
  };

  const companionResult = processCompanionDay({
    companions: state.party.companions,
    playerMorale: moraleResult.newMorale,
    supplies: newSuppliesForCompanions,
    pace: state.journey.pace,
    dayNumber: nextDay,
    encounterEffects: [],
    rng,
  });

  // Add companion events to day events
  for (const ce of companionResult.companionEvents) {
    if (ce.type === 'deserted' || ce.type === 'death') {
      events.push({
        type: 'companion',
        description: ce.detail,
        severity: ce.type === 'death' ? 'critical' : 'major',
      });
    }
  }

  // 6.6. Encounter check (with trigger-aware fields)
  const effectiveTerrain = waypointTransition.newTerrain ?? state.world.terrain;
  const encounter = checkEncounter({
    day: nextDay,
    act: waypointTransition.newAct ?? state.journey.currentAct,
    biome: effectiveBiome,
    terrain: effectiveTerrain,
    morale: moraleResult.newMorale,
    supplies: state.supplies,
    companions: state.party.companions,
    equipment: state.player.equipment,
    discretionaryAction: state.journey.discretionaryAction,
    previousEncounterIds: state.journey.encounterHistory ?? [],
    weather: newWeather,
    distanceToWaypoint: waypointTransition.reached
      ? (waypointTransition.newDistanceToWaypoint ?? 0)
      : Math.max(0, state.world.distanceToWaypoint - movementResult.distanceTraveled),
    totalMiles: state.world.totalMiles + movementResult.distanceTraveled,
    waypointReached: waypointTransition.reached,
    playerHealth: state.player.health,
    horseHealth: state.horse.health,
    skills: { ...state.player.skills },
    calmDayStreak: state.journey.calmDayStreak ?? 0,
    rng,
  });

  // 7. Determine dominant event
  const dominantEvent = determineDominantEvent(
    events,
    state.journey.nightTravel,
    encounter,
    companionResult.companionEvents,
    waypointTransition,
  );

  // 8. Advance date
  const nextDate = advanceDate(state.world.date);

  // 9. Set condition dayAcquired to actual day
  for (const cond of healthResult.newConditions) {
    cond.dayAcquired = nextDay;
  }

  // 10. Check for horse lameness from health events
  const horseBecameLame = healthResult.healthEvents.some(
    (he) => he.target === 'horse' && he.condition === 'horseLameness' && he.type === 'acquired',
  );

  // 11. Build EventRecord
  const eventRecord: EventRecord = {
    day: nextDay,
    act: waypointTransition.newAct ?? state.journey.currentAct,
    date: nextDate,
    timeOfDay: TimeOfDay.Afternoon,
    biome: effectiveBiome,
    distanceTraveled: movementResult.distanceTraveled,
    nightTravel: state.journey.nightTravel,
    dominantEvent,
    events,
    supplyDeltas: supplyResult.deltas,
    healthEvents: healthResult.healthEvents,
    moraleChange: moraleResult.moraleDelta,
    moraleState: moraleResult.moraleState,
    companionEvents: companionResult.companionEvents,
    equipmentEvents: equipResult.equipmentEvents,
    devilsBargain: null,
    previousDayFallback: state.narrative.previousEntry === '',
    campPetEvent: null,
    ...(waypointTransition.reached
      ? {
          waypointArrival: {
            waypointName: waypointTransition.waypointsReached[0],
            landmark: waypointTransition.landmarkDescription ?? '',
            isSettlement: waypointTransition.isSettlement,
            journeyComplete: waypointTransition.journeyComplete,
          },
        }
      : {}),
  };

  // 12. Build DayResults
  const newSupplies = applySupplyDeltas(
    state.supplies,
    supplyResult.deltas,
    equipResult.repairSuppliesUsed,
    { water: state.carryCapacity.water, food: state.carryCapacity.food },
  );

  const dayResults: DayResults = {
    world: {
      date: nextDate,
      timeOfDay: TimeOfDay.Night,
      weather: newWeather,
      totalMiles: state.world.totalMiles + movementResult.distanceTraveled,
      distanceToWaypoint: waypointTransition.reached
        ? (waypointTransition.newDistanceToWaypoint ?? 0)
        : Math.max(0, state.world.distanceToWaypoint - movementResult.distanceTraveled),
      ...(waypointTransition.newBiome ? { biome: waypointTransition.newBiome } : {}),
      ...(waypointTransition.newTerrain ? { terrain: waypointTransition.newTerrain } : {}),
      ...(waypointTransition.newAct ? { currentAct: waypointTransition.newAct } : {}),
    },
    player: {
      health: clamp(state.player.health + healthResult.playerHealthDelta, 0, 100),
      fatigue: clamp(state.player.fatigue + healthResult.playerFatigueDelta, 0, 100),
      morale: moraleResult.newMorale,
      conditions: mergeConditions(
        state.player.conditions,
        healthResult.newConditions,
        healthResult.resolvedConditions,
      ),
      equipment: equipResult.updatedEquipment,
    },
    horse: {
      health: clamp(state.horse.health + healthResult.horseHealthDelta, 0, 100),
      fatigue: clamp(state.horse.fatigue + healthResult.horseFatigueDelta, 0, 100),
      thirst: clamp(state.horse.thirst + healthResult.horseThirstDelta, 0, 100),
      hunger: clamp(state.horse.hunger + healthResult.horseHungerDelta, 0, 100),
      lameness: state.horse.lameness || horseBecameLame,
    },
    supplies: newSupplies,
    party: {
      companions: companionResult.updatedCompanions,
    },
    journey: {
      daysElapsed: nextDay,
      nightTravel: false,
      discretionaryAction: DiscretionaryAction.None,
      detourMilesRemaining: Math.max(
        0,
        (state.journey.detourMilesRemaining ?? 0) - movementResult.detourMilesConsumed,
      ),
      calmDayStreak: encounter ? 0 : (state.journey.calmDayStreak ?? 0) + 1,
      ...(waypointTransition.newWaypointName ? { waypoint: waypointTransition.newWaypointName } : {}),
      ...(waypointTransition.newAct ? { currentAct: waypointTransition.newAct } : {}),
    },
  };

  return { eventRecord, dayResults, encounter };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Determine the dominant narrative event type for voice selection.
 * Encounter-based events take highest priority, then companion drama,
 * then supply crisis, night travel, and routine travel.
 */
function determineDominantEvent(
  events: DayEvent[],
  nightTravel: boolean,
  encounter: Encounter | null,
  companionEvents: CompanionEvent[],
  waypointTransition: WaypointTransition,
): NarrativeEventType {
  // Encounter-based dominance (highest priority)
  if (encounter) {
    if (encounter.type === EncounterType.Hostile) return NarrativeEventType.InjuryDeathLoss;
    if (encounter.type === EncounterType.Settlement) return NarrativeEventType.Settlement;
    if (encounter.type === EncounterType.Desperate) return NarrativeEventType.DevilsBargain;
    if (encounter.type === EncounterType.Environmental) return NarrativeEventType.SupplyCrisis;
  }

  // Companion drama
  if (companionEvents.some((e) => e.type === 'deserted' || e.type === 'death')) {
    return NarrativeEventType.CompanionDrama;
  }

  // Supply crisis
  const hasSupplyCrisis = events.some(
    (e) => e.type === 'supply' && e.severity === 'major',
  );
  if (hasSupplyCrisis) return NarrativeEventType.SupplyCrisis;

  // Waypoint arrival (below crisis events, above routine)
  if (waypointTransition.reached) return NarrativeEventType.WaypointArrival;

  if (nightTravel) return NarrativeEventType.NightTravel;
  return NarrativeEventType.RoutineTravel;
}

function advanceDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mergeConditions(
  existing: ActiveCondition[],
  newConditions: ActiveCondition[],
  resolvedConditions: string[],
): ActiveCondition[] {
  const resolvedSet = new Set(resolvedConditions);
  const filtered = existing.filter((c) => !resolvedSet.has(c.condition));
  return [...filtered, ...newConditions];
}

function applySupplyDeltas(
  current: Supplies,
  deltas: Partial<Record<keyof Supplies, number>>,
  repairUsed: number,
  capacity?: { water: number; food: number },
): Supplies {
  const result = { ...current };
  for (const key of Object.keys(current) as (keyof Supplies)[]) {
    const delta = deltas[key] ?? 0;
    let value = current[key] + delta;
    if (key === 'repair') {
      value -= repairUsed;
    }
    value = Math.max(0, Math.round(value * 10) / 10);
    // Enforce carry capacity
    if (capacity) {
      if (key === 'water') value = Math.min(value, capacity.water);
      if (key === 'food') value = Math.min(value, capacity.food);
    }
    result[key] = value;
  }
  return result;
}
