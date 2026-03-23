/**
 * Frontier — Canonical Starting GameState
 *
 * Returns a fresh deep copy of the default starting state.
 * Matches the store defaults in store/index.ts.
 *
 * Imports only from types/.
 */

import {
  Act,
  Biome,
  DiscretionaryAction,
  EquipmentSlot,
  Pace,
  Terrain,
  TimeOfDay,
  Weather,
} from '@/types/game-state';
import type { GameState } from '@/types/game-state';
import { AuthorVoice } from '@/types/narrative';

export function createInitialState(): GameState {
  return {
    world: {
      date: '1866-06-06',
      timeOfDay: TimeOfDay.Dawn,
      weather: Weather.Clear,
      biome: Biome.CrossTimbers,
      terrain: Terrain.Prairie,
      distanceToWaypoint: 130,
      totalMiles: 0,
      currentAct: Act.I,
      windSpeed: 15,
      temperature: 78,
    },
    player: {
      name: 'Martin',
      health: 100,
      conditions: [],
      fatigue: 0,
      morale: 65,
      skills: { survival: 40, navigation: 30, combat: 35, barter: 25 },
      equipment: [
        { slot: EquipmentSlot.Saddle, durability: 100 },
        { slot: EquipmentSlot.Boots, durability: 100 },
        { slot: EquipmentSlot.Rifle, durability: 100 },
        { slot: EquipmentSlot.Canteen, durability: 100 },
        { slot: EquipmentSlot.Bedroll, durability: 100 },
      ],
    },
    horse: {
      name: 'Horse',
      health: 100,
      fatigue: 0,
      lameness: false,
      thirst: 0,
      hunger: 0,
      tackCondition: 100,
    },
    party: { companions: [], maxCompanions: 4 },
    supplies: {
      water: 55,
      food: 45,
      coffee: 10,
      medical: 5,
      repair: 10,
      ammo: 20,
      tradeGoods: 15,
      funds: 50,
    },
    carryCapacity: { water: 80, food: 60, transport: 'wagon' as const },
    campPet: {
      adopted: false,
      name: null,
      dayAdopted: null,
      lost: false,
      dayLost: null,
    },
    narrative: {
      structuredLedger: [],
      chapterSummaries: [],
      previousEntry: '',
      activeThreads: [],
      currentVoice: AuthorVoice.Adams,
    },
    journey: {
      currentAct: Act.I,
      waypoint: 'Middle Concho',
      routeChoices: [],
      daysElapsed: 0,
      failForwardsUsed: 0,
      fortSumnerDebt: false,
      nightTravel: false,
      pace: Pace.Normal,
      discretionaryAction: DiscretionaryAction.None,
      encounterHistory: [],
      detourMilesRemaining: 0,
    },
    meta: {
      saveSlot: 0,
      timestamp: '1970-01-01T00:00:00.000Z',
      hash: '',
      version: 1,
      playtimeMs: 0,
    },
  };
}
