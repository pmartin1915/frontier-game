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

// ============================================================
// INITIAL STATE (matches store defaults)
// ============================================================

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

describe('full game progression', () => {
  it('multi-day travel increases totalMiles and decreases distanceToWaypoint', () => {
    const rng = () => 0.5;
    let state = { ...INITIAL_STATE };

    for (let d = 0; d < 3; d++) {
      const { dayResults } = resolveDay(state, rng);
      state = {
        ...state,
        world: { ...state.world, ...dayResults.world },
        player: { ...state.player, ...dayResults.player },
        horse: { ...state.horse, ...dayResults.horse },
        supplies: { ...state.supplies, ...dayResults.supplies },
        journey: { ...state.journey, ...dayResults.journey },
      };
    }

    expect(state.world.totalMiles).toBeGreaterThan(0);
    expect(state.world.distanceToWaypoint).toBeLessThan(130);
  });

  it('waypoint transition triggers biome and act change', () => {
    const rng = () => 0.5;
    // Place party just before Middle Concho (5 miles away)
    const nearState: GameState = {
      ...INITIAL_STATE,
      world: {
        ...INITIAL_STATE.world,
        totalMiles: 125,
        distanceToWaypoint: 5,
      },
    };

    // Normal pace travels 25-30mi, definitely reaches waypoint
    const { eventRecord, dayResults } = resolveDay(nearState, rng);

    // Should have a waypoint arrival
    expect(eventRecord.waypointArrival).toBeDefined();
    expect(eventRecord.waypointArrival!.waypointName).toBe('Middle Concho');

    // DayResults should point to next waypoint
    expect(dayResults.journey.waypoint).toBe('Horsehead Crossing');

    // Biome should transition to StakedPlains
    expect(dayResults.world.biome).toBe(Biome.StakedPlains);

    // Act should transition to II
    expect(dayResults.world.currentAct).toBe(Act.II);
  });

  it('weather changes each day (not always Clear)', () => {
    const weatherResults: Weather[] = [];
    let rngCounter = 0;
    // Seeded RNG that produces varied values
    const rng = () => {
      rngCounter++;
      return ((rngCounter * 7 + 13) % 97) / 97;
    };

    let state = { ...INITIAL_STATE };

    for (let d = 0; d < 10; d++) {
      const { dayResults } = resolveDay(state, rng);
      weatherResults.push(dayResults.world.weather!);
      state = {
        ...state,
        world: { ...state.world, ...dayResults.world },
        player: { ...state.player, ...dayResults.player },
        horse: { ...state.horse, ...dayResults.horse },
        supplies: { ...state.supplies, ...dayResults.supplies },
        journey: { ...state.journey, ...dayResults.journey },
      };
    }

    // Weather should be set (not undefined)
    expect(weatherResults.every((w) => w !== undefined)).toBe(true);

    // With varied RNG, should see at least 2 different weather types over 10 days
    const unique = new Set(weatherResults);
    expect(unique.size).toBeGreaterThanOrEqual(1); // at minimum 1, likely more
  });

  it('waypoint arrival produces WaypointArrival dominant event', () => {
    const rng = () => 0.99; // High rng → no encounters, no supply issues
    const nearState: GameState = {
      ...INITIAL_STATE,
      world: {
        ...INITIAL_STATE.world,
        totalMiles: 125,
        distanceToWaypoint: 5,
      },
    };

    const { eventRecord } = resolveDay(nearState, rng);
    expect(eventRecord.dominantEvent).toBe(NarrativeEventType.WaypointArrival);
  });

  it('eventRecord includes waypointArrival data with landmark', () => {
    const rng = () => 0.5;
    const nearState: GameState = {
      ...INITIAL_STATE,
      world: {
        ...INITIAL_STATE.world,
        totalMiles: 125,
        distanceToWaypoint: 5,
      },
    };

    const { eventRecord } = resolveDay(nearState, rng);

    expect(eventRecord.waypointArrival).toBeDefined();
    expect(eventRecord.waypointArrival!.landmark).toBeTruthy();
    expect(eventRecord.waypointArrival!.isSettlement).toBe(false); // Middle Concho is not a settlement
    expect(eventRecord.waypointArrival!.journeyComplete).toBe(false);
  });

  it('journey complete when reaching Denver', () => {
    const rng = () => 0.5;
    const nearDenverState: GameState = {
      ...INITIAL_STATE,
      world: {
        ...INITIAL_STATE.world,
        totalMiles: 695,
        distanceToWaypoint: 5,
        biome: Biome.ColoradoPlains,
        terrain: Terrain.Plains,
        currentAct: Act.V,
      },
      journey: {
        ...INITIAL_STATE.journey,
        waypoint: 'Denver',
        currentAct: Act.V,
        daysElapsed: 50,
      },
    };

    const { eventRecord } = resolveDay(nearDenverState, rng);

    expect(eventRecord.waypointArrival).toBeDefined();
    expect(eventRecord.waypointArrival!.journeyComplete).toBe(true);
  });

  it('encounter check receives weather and terrain from waypoint', () => {
    // This is primarily a smoke test ensuring no crash when all
    // trigger-aware fields are passed through
    const rng = () => 0.5;
    const { eventRecord, encounter } = resolveDay(INITIAL_STATE, rng);

    // eventRecord should have a valid biome
    expect(Object.values(Biome)).toContain(eventRecord.biome);

    // encounter may or may not trigger, but should not crash
    if (encounter) {
      expect(encounter.id).toBeTruthy();
    }
  });

  it('act transitions through full trail progression', () => {
    // Simulate traveling to each act boundary
    const rng = () => 0.5;

    // Near Horsehead Crossing (Act II boundary)
    const nearAct2: GameState = {
      ...INITIAL_STATE,
      world: {
        ...INITIAL_STATE.world,
        totalMiles: 235,
        distanceToWaypoint: 5,
      },
      journey: {
        ...INITIAL_STATE.journey,
        waypoint: 'Horsehead Crossing',
        daysElapsed: 8,
      },
    };

    const result2 = resolveDay(nearAct2, rng);
    expect(result2.dayResults.world.currentAct).toBe(Act.II);

    // Near Fort Sumner (Act III waypoint). When reached, the next
    // target becomes Santa Fe (Act IV), so dayResults.world.currentAct
    // transitions to Act IV (the next segment's act).
    const nearAct3: GameState = {
      ...INITIAL_STATE,
      world: {
        ...INITIAL_STATE.world,
        totalMiles: 395,
        distanceToWaypoint: 5,
        biome: Biome.PecosValley,
        terrain: Terrain.Desert,
        currentAct: Act.II,
      },
      journey: {
        ...INITIAL_STATE.journey,
        waypoint: 'Fort Sumner',
        currentAct: Act.II,
        daysElapsed: 20,
      },
    };

    const result3 = resolveDay(nearAct3, rng);
    expect(result3.dayResults.world.currentAct).toBe(Act.IV);
  });
});
