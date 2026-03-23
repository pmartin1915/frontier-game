import { describe, it, expect } from 'vitest';
import { findApplicableBargain, applyBargainEffects } from '@/systems/fail-forward';
import type { BargainCheckInput } from '@/systems/fail-forward';
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
import { AuthorVoice } from '@/types/narrative';
import { MAX_FAIL_FORWARDS } from '@/types/encounters';

// ============================================================
// BASE TEST STATE
// ============================================================

const BASE_STATE: GameState = {
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
    daysElapsed: 5,
    failForwardsUsed: 0,
    fortSumnerDebt: false,
    nightTravel: false,
    pace: Pace.Normal,
    discretionaryAction: DiscretionaryAction.None,
    detourMilesRemaining: 0,
  },
  meta: { saveSlot: 0, timestamp: '', hash: '', version: 1, playtimeMs: 0 },
};

// ============================================================
// findApplicableBargain
// ============================================================

describe('findApplicableBargain', () => {
  it('returns null when failForwardsUsed >= MAX_FAIL_FORWARDS', () => {
    const state = {
      ...BASE_STATE,
      journey: { ...BASE_STATE.journey, failForwardsUsed: MAX_FAIL_FORWARDS },
      supplies: { ...BASE_STATE.supplies, water: 0 },
    };
    const result = findApplicableBargain({ state, isLethal: true, encounter: null });
    expect(result).toBeNull();
  });

  it('returns null when outcome is not lethal', () => {
    const result = findApplicableBargain({
      state: BASE_STATE,
      isLethal: false,
      encounter: null,
    });
    expect(result).toBeNull();
  });

  it('matches "Water zero, distant from source" when water=0 and rifle present', () => {
    const state = {
      ...BASE_STATE,
      supplies: { ...BASE_STATE.supplies, water: 0 },
    };
    const result = findApplicableBargain({ state, isLethal: true, encounter: null });
    expect(result).not.toBeNull();
    expect(result!.crisis).toBe('Water zero, distant from source');
  });

  it('matches "Water zero, no rifle" when water=0 and rifle broken', () => {
    const state = {
      ...BASE_STATE,
      supplies: { ...BASE_STATE.supplies, water: 0 },
      player: {
        ...BASE_STATE.player,
        equipment: [
          { slot: EquipmentSlot.Rifle, durability: 0 },
          { slot: EquipmentSlot.Boots, durability: 100 },
        ],
      },
    };
    const result = findApplicableBargain({ state, isLethal: true, encounter: null });
    expect(result).not.toBeNull();
    expect(result!.crisis).toBe('Water zero, no rifle');
  });

  it('matches "Horse death" when horse health is 0', () => {
    const state = {
      ...BASE_STATE,
      horse: { ...BASE_STATE.horse, health: 0 },
    };
    const result = findApplicableBargain({ state, isLethal: true, encounter: null });
    expect(result).not.toBeNull();
    expect(result!.crisis).toBe('Horse death');
  });

  it('matches "Critical injury, no medical" when health low and no medical', () => {
    const state = {
      ...BASE_STATE,
      player: { ...BASE_STATE.player, health: 10 },
      supplies: { ...BASE_STATE.supplies, medical: 0 },
    };
    const result = findApplicableBargain({ state, isLethal: true, encounter: null });
    expect(result).not.toBeNull();
    expect(result!.crisis).toBe('Critical injury, no medical');
  });

  it('matches "Party morale zero" when morale is 0', () => {
    const state = {
      ...BASE_STATE,
      player: { ...BASE_STATE.player, morale: 0 },
    };
    const result = findApplicableBargain({ state, isLethal: true, encounter: null });
    expect(result).not.toBeNull();
    expect(result!.crisis).toBe('Party morale zero');
  });

  it('returns null when no specific crisis matches', () => {
    // Generic lethal state — no specific crisis condition met
    const result = findApplicableBargain({
      state: BASE_STATE,
      isLethal: true,
      encounter: null,
    });
    expect(result).toBeNull();
  });
});

// ============================================================
// applyBargainEffects
// ============================================================

describe('applyBargainEffects', () => {
  it('declined bargain returns empty effects', () => {
    const bargain = {
      crisis: 'Water zero, distant from source',
      encounter: 'Comanchero trader',
      cost: {
        description: 'LOSE: Rifle',
        effects: [{ type: 'equipment' as const, target: 'rifle', delta: -100 }],
      },
    };
    const result = applyBargainEffects({
      bargain,
      state: BASE_STATE,
      accepted: false,
    });
    expect(result.accepted).toBe(false);
    expect(result.effects.length).toBe(0);
    expect(result.bargainEvent.accepted).toBe(false);
  });

  it('accepted water bargain zeroes rifle and ammo', () => {
    const state = {
      ...BASE_STATE,
      supplies: { ...BASE_STATE.supplies, water: 0, ammo: 20 },
    };
    const bargain = findApplicableBargain({ state, isLethal: true, encounter: null })!;

    const result = applyBargainEffects({
      bargain,
      state,
      accepted: true,
    });

    expect(result.accepted).toBe(true);
    expect(result.bargainEvent.accepted).toBe(true);
    // Rifle equipment should get delta to zero it out
    expect(result.equipmentDeltas['rifle']).toBe(-100);
    // Ammo supply should be zeroed
    expect(result.supplyDeltas['ammo']).toBe(-20);
  });

  it('horse death bargain sets ammo to zero and adds detour', () => {
    const state = {
      ...BASE_STATE,
      horse: { ...BASE_STATE.horse, health: 0 },
    };
    const bargain = findApplicableBargain({ state, isLethal: true, encounter: null })!;
    expect(bargain.crisis).toBe('Horse death');

    const result = applyBargainEffects({
      bargain,
      state,
      accepted: true,
    });

    expect(result.supplyDeltas['ammo']).toBe(-20); // zero from 20
    expect(result.routeFlags.detourMiles).toBe(40);
  });

  it('morale bargain sets moraleSet and timeCost', () => {
    const state = {
      ...BASE_STATE,
      player: { ...BASE_STATE.player, morale: 0 },
    };
    const bargain = findApplicableBargain({ state, isLethal: true, encounter: null })!;
    expect(bargain.crisis).toBe('Party morale zero');

    const result = applyBargainEffects({
      bargain,
      state,
      accepted: true,
    });

    expect(result.moraleSet).toBe(50);
    expect(result.timeCost).toBe(2);
  });

  it('trade goods bargain sets fortSumnerDebt flag', () => {
    const state = {
      ...BASE_STATE,
      supplies: { ...BASE_STATE.supplies, water: 0 },
      player: {
        ...BASE_STATE.player,
        equipment: [
          { slot: EquipmentSlot.Rifle, durability: 0 },
        ],
      },
    };
    const bargain = findApplicableBargain({ state, isLethal: true, encounter: null })!;
    expect(bargain.crisis).toBe('Water zero, no rifle');

    const result = applyBargainEffects({
      bargain,
      state,
      accepted: true,
    });

    expect(result.routeFlags.fortSumnerDebt).toBe(true);
    expect(result.supplyDeltas['tradeGoods']).toBe(-15); // zero from 15
  });

  it('bargainEvent contains correct fields', () => {
    const state = {
      ...BASE_STATE,
      player: { ...BASE_STATE.player, morale: 0 },
    };
    const bargain = findApplicableBargain({ state, isLethal: true, encounter: null })!;

    const result = applyBargainEffects({
      bargain,
      state,
      accepted: true,
    });

    expect(result.bargainEvent.crisis).toBe(bargain.crisis);
    expect(result.bargainEvent.encounter).toBe(bargain.encounter);
    expect(result.bargainEvent.cost).toBe(bargain.cost.description);
    expect(result.bargainEvent.accepted).toBe(true);
  });
});
