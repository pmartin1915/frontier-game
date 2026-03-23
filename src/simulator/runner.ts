/**
 * Frontier — Headless Simulation Runner
 *
 * Core loop: resolveDay → encounter → camp → applyResults → repeat.
 * No Zustand, no Phaser, no API calls. Pure game logic.
 */

import type { GameState, DayResults, Supplies, Equipment } from '@/types/game-state';
import { DiscretionaryAction } from '@/types/game-state';
import type { CampInput } from '@/types/camp';
import { resolveDay } from '@/engine/game-logic';
import { resolveCamp } from '@/systems/camp';
import { createSeededRng } from './rng';
import { createInitialState } from './initial-state';
import { applyDayResults } from './state-applicator';
import { resolveEncounterHeadless } from './encounter-resolver';
import { getStrategy } from './strategies';
import type {
  SimulationConfig,
  RunResult,
  RunMetrics,
  DaySnapshot,
  EncounterLogEntry,
} from './types';

// ============================================================
// SINGLE RUN
// ============================================================

export function executeRun(config: SimulationConfig, runIndex: number): RunResult {
  const seed = config.baseSeed + runIndex;
  const rng = createSeededRng(seed);
  const strategy = getStrategy(config.strategy);

  let state = createInitialState();
  const snapshots: DaySnapshot[] = [];
  const encounterLog: EncounterLogEntry[] = [];
  let causeOfDeath: string | null = null;
  let journeyComplete = false;

  for (let day = 0; day < config.maxDaysPerRun; day++) {
    // 1. Strategy selects day actions
    const decisions = strategy.decideDayActions(state, rng);
    state = {
      ...state,
      journey: {
        ...state.journey,
        pace: decisions.pace,
        discretionaryAction: decisions.action,
        nightTravel: decisions.nightTravel,
      },
    };

    // 2. Game Logic resolves the day
    const { eventRecord, dayResults, encounter } = resolveDay(state, rng);

    let finalEventRecord = eventRecord;
    let finalDayResults = dayResults;

    // 3. Resolve encounter if present
    if (encounter) {
      const decision = strategy.decideEncounter(encounter, state, rng);
      const resolved = resolveEncounterHeadless(
        encounter,
        decision.choiceId,
        decision.acceptBargain,
        eventRecord,
        dayResults,
        state,
        rng,
      );
      finalEventRecord = resolved.eventRecord;
      finalDayResults = resolved.dayResults;
      encounterLog.push(resolved.encounterLog);
    }

    // 4. Resolve camp
    const isFullDay = decisions.action === DiscretionaryAction.Rest;
    const campActivities = strategy.decideCamp(state, isFullDay, rng);

    // Build camp input from merged state + dayResults
    const mergedSupplies: Supplies = {
      ...state.supplies,
      ...finalDayResults.supplies,
    } as Supplies;
    const mergedEquipment: Equipment[] =
      finalDayResults.player?.equipment ?? state.player.equipment;
    const mergedFatigue = finalDayResults.player?.fatigue ?? state.player.fatigue;
    const mergedMorale = finalDayResults.player?.morale ?? state.player.morale;
    const mergedHealth = finalDayResults.player?.health ?? state.player.health;
    const mergedCompanions =
      finalDayResults.party?.companions ?? state.party.companions;

    const campInput: CampInput = {
      activities: campActivities,
      isFullDay,
      playerFatigue: mergedFatigue,
      playerMorale: mergedMorale,
      playerHealth: mergedHealth,
      equipment: mergedEquipment,
      supplies: mergedSupplies,
      activeCompanionIds: mergedCompanions
        .filter((c) => c.status === 'active')
        .map((c) => c.id),
      hasCampPet: state.campPet.adopted && !state.campPet.lost,
      rng,
    };

    const campResults = resolveCamp(campInput);

    // 5. Merge camp results into dayResults
    finalDayResults = mergeCampIntoDayResults(
      finalDayResults, campResults, state,
    );

    // 6. Apply results to state
    state = applyDayResults(state, finalDayResults);

    // 7. Take snapshot (calmDayStreak is now tracked in state via game-logic)
    const equipDurabilities = state.player.equipment.map((e) => e.durability);
    snapshots.push({
      day: state.journey.daysElapsed,
      totalMiles: state.world.totalMiles,
      health: state.player.health,
      horseHealth: state.horse.health,
      morale: state.player.morale,
      water: state.supplies.water,
      food: state.supplies.food,
      fatigue: state.player.fatigue,
      equipmentMinDurability: equipDurabilities.length > 0
        ? Math.min(...equipDurabilities) : 100,
      weather: state.world.weather,
      biome: state.world.biome,
      waypoint: state.journey.waypoint,
      encounterId: encounter?.id ?? null,
      dominantEvent: finalEventRecord.dominantEvent,
      pace: decisions.pace,
      action: decisions.action,
      campActivities: campActivities.map((a) => a.activity),
      calmDayStreak: state.journey.calmDayStreak ?? 0,
    });

    // 9. Check termination
    if (state.player.health <= 0) {
      causeOfDeath = 'Player death';
      break;
    }
    if (finalEventRecord.waypointArrival?.journeyComplete) {
      journeyComplete = true;
      break;
    }
  }

  return {
    seed,
    daysElapsed: state.journey.daysElapsed,
    survived: state.player.health > 0,
    reachedDenver: journeyComplete || state.world.totalMiles >= 700,
    causeOfDeath,
    finalState: state,
    snapshots,
    encounterLog,
    metrics: collectRunMetrics(state, snapshots, encounterLog),
  };
}

// ============================================================
// BATCH
// ============================================================

export function executeBatch(config: SimulationConfig): RunResult[] {
  const results: RunResult[] = [];
  for (let i = 0; i < config.runs; i++) {
    results.push(executeRun(config, i));
  }
  return results;
}

// ============================================================
// CAMP MERGE
// ============================================================

import type { CampResults } from '@/types/camp';

function mergeCampIntoDayResults(
  dayResults: DayResults,
  campResults: CampResults,
  state: GameState,
): DayResults {
  const currentFatigue = dayResults.player?.fatigue ?? state.player.fatigue;
  const currentMorale = dayResults.player?.morale ?? state.player.morale;
  const currentHealth = dayResults.player?.health ?? state.player.health;

  let updated: DayResults = {
    ...dayResults,
    player: {
      ...dayResults.player,
      fatigue: Math.max(0, Math.min(100, currentFatigue + campResults.fatigueDelta)),
      morale: Math.max(0, Math.min(100, currentMorale + campResults.moraleDelta)),
      health: Math.max(0, Math.min(100, currentHealth + campResults.healthDelta)),
    },
  };

  // Merge supply deltas
  if (Object.keys(campResults.supplyDeltas).length > 0) {
    const mergedSupplies = { ...updated.supplies };
    for (const [key, delta] of Object.entries(campResults.supplyDeltas)) {
      const current = (mergedSupplies as Record<string, number>)[key] ?? 0;
      (mergedSupplies as Record<string, number>)[key] = Math.max(0, current + (delta as number));
    }
    updated = { ...updated, supplies: mergedSupplies };
  }

  // Merge equipment repairs
  if (campResults.equipmentRepairs.length > 0) {
    const equip = (updated.player?.equipment ?? state.player.equipment).map((e) => {
      const repair = campResults.equipmentRepairs.find((r) => r.slot === e.slot);
      if (repair) {
        return { ...e, durability: Math.min(100, e.durability + repair.durabilityDelta) };
      }
      return e;
    });
    updated = {
      ...updated,
      player: { ...updated.player, equipment: equip },
    };
  }

  // Merge companion loyalty deltas
  if (campResults.companionLoyaltyDeltas.length > 0) {
    const companions = (updated.party?.companions ?? state.party.companions).map((c) => {
      const delta = campResults.companionLoyaltyDeltas.find((d) => d.companionId === c.id);
      if (delta) {
        return { ...c, loyalty: Math.max(0, Math.min(100, c.loyalty + delta.loyaltyDelta)) };
      }
      return c;
    });
    updated = {
      ...updated,
      party: { ...updated.party, companions },
    };
  }

  return updated;
}

// ============================================================
// METRICS
// ============================================================

function collectRunMetrics(
  state: GameState,
  snapshots: DaySnapshot[],
  encounterLog: EncounterLogEntry[],
): RunMetrics {
  let waterDepletionEvents = 0;
  let foodDepletionEvents = 0;
  let equipmentBreakages = 0;
  let wasWaterZero = false;
  let wasFoodZero = false;

  for (const snap of snapshots) {
    // Count transitions to zero (not every day at zero)
    if (snap.water <= 0 && !wasWaterZero) {
      waterDepletionEvents++;
      wasWaterZero = true;
    } else if (snap.water > 0) {
      wasWaterZero = false;
    }

    if (snap.food <= 0 && !wasFoodZero) {
      foodDepletionEvents++;
      wasFoodZero = true;
    } else if (snap.food > 0) {
      wasFoodZero = false;
    }
  }

  // Count equipment breakages (durability hits 0)
  for (const equip of state.player.equipment) {
    if (equip.durability <= 0) {
      equipmentBreakages++;
    }
  }

  // Waypoints reached
  const waypointsReached = new Set<string>();
  for (const snap of snapshots) {
    waypointsReached.add(snap.waypoint);
  }

  return {
    totalMiles: state.world.totalMiles,
    daysElapsed: state.journey.daysElapsed,
    encounterCount: encounterLog.length,
    waterDepletionEvents,
    foodDepletionEvents,
    equipmentBreakages,
    waypointsReached: Array.from(waypointsReached),
    companionDesertions: 0, // No companions in default start
    bargainsUsed: encounterLog.filter((e) => e.bargainAccepted).length,
    finalHealth: state.player.health,
    finalHorseHealth: state.horse.health,
    finalMorale: state.player.morale,
  };
}
