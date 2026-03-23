/**
 * Frontier — Pure State Applicator
 *
 * Mirrors the store's applyDayResults() logic (store/index.ts:582-591)
 * as a pure function operating on plain GameState objects.
 *
 * No Zustand. No mutation. Returns a new GameState.
 */

import type { GameState, DayResults } from '@/types/game-state';

export function applyDayResults(
  state: GameState,
  results: DayResults,
): GameState {
  return {
    ...state,
    world: { ...state.world, ...results.world },
    player: { ...state.player, ...results.player },
    horse: { ...state.horse, ...results.horse },
    supplies: { ...state.supplies, ...results.supplies },
    party: { ...state.party, ...results.party },
    journey: { ...state.journey, ...results.journey },
    campPet: results.campPet
      ? { ...state.campPet, ...results.campPet }
      : state.campPet,
    carryCapacity: results.carryCapacity
      ? { ...state.carryCapacity, ...results.carryCapacity }
      : state.carryCapacity,
  };
}
