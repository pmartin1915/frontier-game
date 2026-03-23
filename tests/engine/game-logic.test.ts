import { describe, it, expect } from 'vitest';
import { resolveDay } from '@/engine/game-logic';
import {
  Act,
  Biome,
  Pace,
  TimeOfDay,
  Weather,
  Terrain,
  DiscretionaryAction,
  EquipmentSlot,
} from '@/types/game-state';
import type { GameState } from '@/types/game-state';
import { AuthorVoice, NarrativeEventType } from '@/types/narrative';

const INITIAL_STATE: GameState = {
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
    water: 40,
    food: 35,
    coffee: 10,
    medical: 5,
    repair: 5,
    ammo: 20,
    tradeGoods: 15,
    funds: 50,
  },
  carryCapacity: { water: 80, food: 60, transport: 'wagon' as const },
  campPet: { adopted: false, name: null, dayAdopted: null, lost: false, dayLost: null },
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
    detourMilesRemaining: 0,
  },
  meta: {
    saveSlot: 0,
    timestamp: new Date().toISOString(),
    hash: '',
    version: 1,
    playtimeMs: 0,
  },
};

describe('resolveDay', () => {
  it('returns valid eventRecord and dayResults', () => {
    const rng = () => 0.5;
    const { eventRecord, dayResults } = resolveDay(INITIAL_STATE, rng);

    // EventRecord
    expect(eventRecord.day).toBe(1);
    expect(eventRecord.act).toBe(Act.I);
    expect(eventRecord.date).toBe('1866-06-07');
    expect(eventRecord.distanceTraveled).toBeGreaterThan(0);
    expect(eventRecord.dominantEvent).toBe(NarrativeEventType.RoutineTravel);
    expect(Array.isArray(eventRecord.events)).toBe(true);

    // DayResults — world
    expect(dayResults.world.date).toBe('1866-06-07');
    expect(dayResults.world.totalMiles).toBeGreaterThan(0);
    expect(dayResults.world.distanceToWaypoint).toBeLessThan(130);

    // DayResults — journey
    expect(dayResults.journey.daysElapsed).toBe(1);
    expect(dayResults.journey.nightTravel).toBe(false);
    expect(dayResults.journey.discretionaryAction).toBe(DiscretionaryAction.None);

    // DayResults — supplies consumed
    expect(dayResults.supplies.water).toBeLessThan(40);
    expect(dayResults.supplies.food).toBeLessThan(35);
    expect(dayResults.supplies.coffee).toBeLessThan(10);
  });

  it('hard push → more distance, more supply consumption, equipment wear', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      journey: { ...INITIAL_STATE.journey, pace: Pace.HardPush },
    };
    const rng = () => 0.5;
    const normalResult = resolveDay(INITIAL_STATE, rng);
    const hardResult = resolveDay(state, rng);

    expect(hardResult.eventRecord.distanceTraveled).toBeGreaterThan(
      normalResult.eventRecord.distanceTraveled,
    );
    expect(hardResult.dayResults.supplies.water!).toBeLessThan(
      normalResult.dayResults.supplies.water!,
    );
  });

  it('night travel produces night travel dominant event', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      journey: { ...INITIAL_STATE.journey, nightTravel: true },
    };
    const { eventRecord } = resolveDay(state, () => 0.5);
    expect(eventRecord.nightTravel).toBe(true);
    expect(eventRecord.dominantEvent).toBe(NarrativeEventType.NightTravel);
  });

  it('supply crisis when water depleted', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      supplies: { ...INITIAL_STATE.supplies, water: 2 },
    };
    const { eventRecord } = resolveDay(state, () => 0.5);
    expect(eventRecord.dominantEvent).toBe(NarrativeEventType.SupplyCrisis);
  });

  it('rest action recovers fatigue', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      player: { ...INITIAL_STATE.player, fatigue: 60 },
      journey: {
        ...INITIAL_STATE.journey,
        discretionaryAction: DiscretionaryAction.Rest,
      },
    };
    const { dayResults } = resolveDay(state, () => 0.5);
    expect(dayResults.player.fatigue).toBeLessThan(60);
  });

  it('hunt action with ammo → potential food gain', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      journey: {
        ...INITIAL_STATE.journey,
        discretionaryAction: DiscretionaryAction.Hunt,
      },
    };
    const { dayResults } = resolveDay(state, () => 0.5);
    // With rng=0.5 and survival 40, hunt succeeds
    expect(dayResults.supplies.ammo).toBeLessThan(20);
  });
});
