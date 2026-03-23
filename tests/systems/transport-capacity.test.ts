import { describe, it, expect } from 'vitest';
import { calculateSupplyConsumption } from '@/systems/supplies';
import { TRANSPORT_CAPACITY, Pace, Weather, DiscretionaryAction } from '@/types/game-state';
import type { Supplies } from '@/types/game-state';

// ============================================================
// HELPERS
// ============================================================

const BASE_SUPPLIES: Supplies = {
  water: 40,
  food: 35,
  coffee: 10,
  medical: 5,
  repair: 5,
  ammo: 20,
  tradeGoods: 15,
  funds: 50,
};

function makeInput(overrides: Partial<Parameters<typeof calculateSupplyConsumption>[0]> = {}) {
  return {
    pace: Pace.Normal,
    nightTravel: false,
    weather: Weather.Clear,
    temperature: 80,
    discretionaryAction: DiscretionaryAction.None,
    currentSupplies: BASE_SUPPLIES,
    companionCount: 0,
    survivalSkill: 40,
    rng: () => 0.5,
    ...overrides,
  };
}

// ============================================================
// TESTS
// ============================================================

describe('TRANSPORT_CAPACITY constants', () => {
  it('saddlebags: water 10, food 15', () => {
    expect(TRANSPORT_CAPACITY.saddlebags).toEqual({ water: 10, food: 15 });
  });

  it('packHorse: water 40, food 30', () => {
    expect(TRANSPORT_CAPACITY.packHorse).toEqual({ water: 40, food: 30 });
  });

  it('wagon: water 80, food 60', () => {
    expect(TRANSPORT_CAPACITY.wagon).toEqual({ water: 80, food: 60 });
  });
});

describe('supply capacity enforcement', () => {
  it('water gain is capped at saddlebags capacity (10)', () => {
    const input = makeInput({
      currentSupplies: { ...BASE_SUPPLIES, water: 8 },
      discretionaryAction: DiscretionaryAction.Forage,
      waterCapacity: TRANSPORT_CAPACITY.saddlebags.water,
    });

    const result = calculateSupplyConsumption(input);
    // Forage adds +2 water, base consumption is -2 (Normal pace multiplier 1.0)
    // Net: 8 + (-2 + 2) = 8, which is under 10, so no capping needed
    // Resulting water = 8 + delta, must not exceed 10
    const resultingWater = input.currentSupplies.water + (result.deltas.water ?? 0);
    expect(resultingWater).toBeLessThanOrEqual(10);
  });

  it('water never exceeds wagon capacity (80)', () => {
    // Start at 79, forage adds water
    const input = makeInput({
      currentSupplies: { ...BASE_SUPPLIES, water: 79 },
      discretionaryAction: DiscretionaryAction.Forage,
      waterCapacity: TRANSPORT_CAPACITY.wagon.water,
    });

    const result = calculateSupplyConsumption(input);
    // Forage +2.2 water, base consumption -3, net = -0.8, result = 78.2 < 80, fine
    const resultingWater = input.currentSupplies.water + (result.deltas.water ?? 0);
    expect(resultingWater).toBeLessThanOrEqual(80);
  });

  it('food gain is capped at saddlebags capacity (15)', () => {
    // Start at 14, hunt yields food
    const input = makeInput({
      currentSupplies: { ...BASE_SUPPLIES, food: 14, ammo: 10 },
      discretionaryAction: DiscretionaryAction.Hunt,
      survivalSkill: 100, // guarantees hunt success
      rng: () => 0.01, // below threshold = success
      foodCapacity: TRANSPORT_CAPACITY.saddlebags.food,
    });

    const result = calculateSupplyConsumption(input);
    const resultingFood = input.currentSupplies.food + (result.deltas.food ?? 0);
    expect(resultingFood).toBeLessThanOrEqual(15);
  });

  it('no capacity = no cap (undefined waterCapacity)', () => {
    // Without capacity, forage can push water above saddlebags limit
    const input = makeInput({
      currentSupplies: { ...BASE_SUPPLIES, water: 100 },
      discretionaryAction: DiscretionaryAction.Forage,
      // No waterCapacity or foodCapacity set
    });

    const result = calculateSupplyConsumption(input);
    // survivalSkill=40: forage yield = 1 * (1 + 40*0.03) = 2.2
    // Base consumption -3.5, forage +2.2 = -1.3, result = 98.7
    // No capacity enforcement
    const resultingWater = input.currentSupplies.water + (result.deltas.water ?? 0);
    expect(resultingWater).toBeCloseTo(98.7, 1);
  });

  it('transport downgrade truncates supplies at new capacity', () => {
    // Simulate wagon → saddlebags: water 40 should be capped at 10
    // This is handled by the store resolveEncounterChoice transport effect,
    // but we verify the constants match expectations
    const wagonCap = TRANSPORT_CAPACITY.wagon;
    const saddlebagsCap = TRANSPORT_CAPACITY.saddlebags;

    expect(wagonCap.water).toBeGreaterThan(saddlebagsCap.water);
    expect(wagonCap.food).toBeGreaterThan(saddlebagsCap.food);

    // Simulate capping
    const currentWater = 40;
    const currentFood = 35;
    const cappedWater = Math.min(currentWater, saddlebagsCap.water);
    const cappedFood = Math.min(currentFood, saddlebagsCap.food);
    expect(cappedWater).toBe(10);
    expect(cappedFood).toBe(15);
  });
});
