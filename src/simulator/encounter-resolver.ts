/**
 * Frontier — Headless Encounter Resolution
 *
 * Pure-function equivalent of store.resolveEncounterChoice() and
 * store.resolveBargainChoice(). Merges encounter/bargain effects
 * into DayResults without Zustand.
 *
 * Imports from types/, systems/ only.
 */

import type { GameState, DayResults, Supplies, CarryCapacity } from '@/types/game-state';
import { TRANSPORT_CAPACITY } from '@/types/game-state';
import type { Encounter, EncounterEffect } from '@/types/encounters';
import type { EventRecord } from '@/types/narrative';
import { resolveEncounter, resolveDelta } from '@/systems/encounters';
import { findApplicableBargain, applyBargainEffects } from '@/systems/fail-forward';
import type { EncounterLogEntry } from './types';

export interface EncounterResolutionOutput {
  eventRecord: EventRecord;
  dayResults: DayResults;
  encounterLog: EncounterLogEntry;
}

/**
 * Resolve an encounter headlessly given a chosen choiceId and bargain decision.
 * Mirrors the effect-merging logic from store/index.ts lines 274-467.
 */
export function resolveEncounterHeadless(
  encounter: Encounter,
  choiceId: string,
  acceptBargain: boolean,
  eventRecord: EventRecord,
  dayResults: DayResults,
  state: GameState,
  rng?: () => number,
): EncounterResolutionOutput {
  // 1. Resolve encounter via existing pure function
  const result = resolveEncounter({
    encounter,
    choiceId,
    playerHealth: state.player.health,
    horseHealth: state.horse.health,
    companions: state.party.companions,
    rng,
  });

  // 2. Merge encounter events into EventRecord
  let updatedEventRecord: EventRecord = {
    ...eventRecord,
    events: [...eventRecord.events, ...result.events],
    companionEvents: [...eventRecord.companionEvents, ...result.companionEvents],
  };

  // 3. Merge encounter effects into DayResults
  let updatedDayResults = mergeEncounterEffects(
    result.effects, dayResults, state,
  );

  // 4. Track encounter in history
  const encounterHistory = [
    ...(state.journey.encounterHistory ?? []),
    result.encounter.id,
  ];
  updatedDayResults = {
    ...updatedDayResults,
    journey: { ...updatedDayResults.journey, encounterHistory },
  };

  // 5. Handle bargain if triggered
  let bargainOffered = false;
  let bargainAccepted = false;

  if (result.triggersBargain) {
    const bargain = findApplicableBargain({
      state,
      isLethal: result.isLethal,
      encounter: result.encounter,
    });

    if (bargain) {
      bargainOffered = true;
      const bargainResult = applyBargainEffects({
        bargain,
        state,
        accepted: acceptBargain,
      });

      updatedEventRecord = {
        ...updatedEventRecord,
        devilsBargain: bargainResult.bargainEvent,
      };

      if (bargainResult.accepted) {
        bargainAccepted = true;

        // Merge supply deltas
        const mergedSupplies = { ...updatedDayResults.supplies };
        for (const [key, delta] of Object.entries(bargainResult.supplyDeltas)) {
          const current = (mergedSupplies as Record<string, number>)[key] ?? 0;
          (mergedSupplies as Record<string, number>)[key] = current + (delta as number);
        }

        // Merge equipment deltas
        let mergedEquipment = updatedDayResults.player?.equipment ?? state.player.equipment;
        if (Object.keys(bargainResult.equipmentDeltas).length > 0) {
          mergedEquipment = mergedEquipment.map((e) => {
            const delta = bargainResult.equipmentDeltas[e.slot];
            if (delta !== undefined) {
              return { ...e, durability: Math.max(0, e.durability + delta) };
            }
            return e;
          });
        }

        updatedDayResults = {
          ...updatedDayResults,
          supplies: mergedSupplies,
          journey: {
            ...updatedDayResults.journey,
            failForwardsUsed: state.journey.failForwardsUsed + 1,
            ...(bargainResult.routeFlags.fortSumnerDebt ? { fortSumnerDebt: true } : {}),
            ...(bargainResult.routeFlags.detourMiles
              ? { detourMilesRemaining: state.journey.detourMilesRemaining + bargainResult.routeFlags.detourMiles }
              : {}),
          },
          player: {
            ...updatedDayResults.player,
            equipment: mergedEquipment,
            ...(bargainResult.moraleSet !== undefined ? { morale: bargainResult.moraleSet } : {}),
          },
        };
      }
    }
  }

  return {
    eventRecord: updatedEventRecord,
    dayResults: updatedDayResults,
    encounterLog: {
      day: state.journey.daysElapsed + 1,
      encounterId: encounter.id,
      encounterName: encounter.name,
      choiceId,
      bargainOffered,
      bargainAccepted,
    },
  };
}

/**
 * Merge encounter effects into DayResults.
 * Mirrors store/index.ts lines 297-371.
 */
function mergeEncounterEffects(
  effects: EncounterEffect[],
  dayResults: DayResults,
  state: GameState,
): DayResults {
  let updated = { ...dayResults };

  for (const effect of effects) {
    switch (effect.type) {
      case 'supply': {
        const key = effect.target as keyof Supplies;
        const pendingVal = (updated.supplies as Record<string, number>)[key]
          ?? state.supplies[key] ?? 0;
        const delta = resolveDelta(effect.delta, pendingVal);
        updated = {
          ...updated,
          supplies: { ...updated.supplies, [key]: Math.max(0, pendingVal + delta) },
        };
        break;
      }
      case 'health': {
        if (effect.target === 'player') {
          const pendingVal = updated.player?.health ?? state.player.health;
          const delta = resolveDelta(effect.delta, pendingVal);
          updated = {
            ...updated,
            player: { ...updated.player, health: Math.max(0, Math.min(100, pendingVal + delta)) },
          };
        } else if (effect.target === 'horse') {
          const pendingVal = updated.horse?.health ?? state.horse.health;
          const delta = resolveDelta(effect.delta, pendingVal);
          updated = {
            ...updated,
            horse: { ...updated.horse, health: Math.max(0, Math.min(100, pendingVal + delta)) },
          };
        }
        break;
      }
      case 'morale': {
        const pendingVal = updated.player?.morale ?? state.player.morale;
        const delta = resolveDelta(effect.delta, pendingVal);
        updated = {
          ...updated,
          player: { ...updated.player, morale: Math.max(0, Math.min(100, pendingVal + delta)) },
        };
        break;
      }
      case 'equipment': {
        const equip = (updated.player?.equipment ?? state.player.equipment).map((e) => {
          if (e.slot === effect.target) {
            const delta = resolveDelta(effect.delta, e.durability);
            return { ...e, durability: Math.max(0, e.durability + delta) };
          }
          return e;
        });
        updated = {
          ...updated,
          player: { ...updated.player, equipment: equip },
        };
        break;
      }
      case 'transport': {
        const newTransport = effect.target as CarryCapacity['transport'];
        const cap = TRANSPORT_CAPACITY[newTransport];
        if (cap) {
          const currentWater = (updated.supplies as Record<string, number>).water ?? state.supplies.water;
          const currentFood = (updated.supplies as Record<string, number>).food ?? state.supplies.food;
          updated = {
            ...updated,
            carryCapacity: { water: cap.water, food: cap.food, transport: newTransport },
            supplies: {
              ...updated.supplies,
              water: Math.min(currentWater, cap.water),
              food: Math.min(currentFood, cap.food),
            },
          };
        }
        break;
      }
    }
  }

  return updated;
}
