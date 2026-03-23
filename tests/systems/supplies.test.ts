import { describe, it, expect } from 'vitest';
import { calculateSupplyConsumption } from '@/systems/supplies';
import { Pace, Weather, DiscretionaryAction } from '@/types/game-state';
import type { Supplies } from '@/types/game-state';

const FULL_SUPPLIES: Supplies = {
  water: 40,
  food: 35,
  coffee: 10,
  medical: 5,
  repair: 5,
  ammo: 20,
  tradeGoods: 15,
  funds: 50,
};

const BASE_INPUT = {
  pace: Pace.Normal,
  nightTravel: false,
  weather: Weather.Clear,
  temperature: 78,
  discretionaryAction: DiscretionaryAction.None,
  currentSupplies: FULL_SUPPLIES,
  companionCount: 0,
  survivalSkill: 40,
  rng: () => 0.5,
};

describe('calculateSupplyConsumption', () => {
  it('normal pace, no specials → base consumption', () => {
    const result = calculateSupplyConsumption(BASE_INPUT);
    // water: -3.5 * 1.0 = -3.5; food: -3.5 * 1.1 = -3.85 → rounded -3.9 (IEEE 754); coffee: -1
    expect(result.deltas.water).toBe(-3.5);
    expect(result.deltas.food).toBe(-3.9);
    expect(result.deltas.coffee).toBe(-1);
  });

  it('companions increase food consumption', () => {
    const result = calculateSupplyConsumption({ ...BASE_INPUT, companionCount: 2 });
    // food: -3.9 + (-1 * 2) = -5.9
    expect(result.deltas.food).toBe(-5.9);
  });

  it('heatwave increases water consumption', () => {
    const result = calculateSupplyConsumption({
      ...BASE_INPUT,
      weather: Weather.Heatwave,
    });
    // water: -3.5 * 1.0 - 1 = -4.5
    expect(result.deltas.water).toBe(-4.5);
  });

  it('night travel halves water consumption', () => {
    const result = calculateSupplyConsumption({ ...BASE_INPUT, nightTravel: true });
    // water: -3.5 * 1.0 * 0.5 = -1.75 → Math.round(-17.5)/10 = -1.7
    expect(result.deltas.water).toBe(-1.7);
  });

  it('hunt with ammo → food gain on success', () => {
    // rng=0.5, huntChance = 0.5 + 40/200 = 0.7. rng < 0.7 → success
    const result = calculateSupplyConsumption({
      ...BASE_INPUT,
      discretionaryAction: DiscretionaryAction.Hunt,
    });
    // food: -3.9 + 4 = 0.1; ammo: -1
    expect(result.deltas.food).toBeCloseTo(0.1, 1);
    expect(result.deltas.ammo).toBe(-1);
  });

  it('hunt with no ammo → no food gain', () => {
    const result = calculateSupplyConsumption({
      ...BASE_INPUT,
      discretionaryAction: DiscretionaryAction.Hunt,
      currentSupplies: { ...FULL_SUPPLIES, ammo: 0 },
    });
    expect(result.deltas.food).toBe(-3.9);
    expect(result.deltas.ammo).toBeUndefined();
  });

  it('forage adds skill-scaled water and food', () => {
    const result = calculateSupplyConsumption({
      ...BASE_INPUT,
      discretionaryAction: DiscretionaryAction.Forage,
    });
    // survivalSkill=40: yield = 1 * (1 + 40*0.03) = 2.2
    // water: -3.5 + 2.2 = -1.3; food: -3.9 + 2.2 = -1.7
    expect(result.deltas.water).toBeCloseTo(-1.3, 1);
    expect(result.deltas.food).toBeCloseTo(-1.7, 1);
  });

  it('no coffee consumption when coffee is 0', () => {
    const result = calculateSupplyConsumption({
      ...BASE_INPUT,
      currentSupplies: { ...FULL_SUPPLIES, coffee: 0 },
    });
    expect(result.deltas.coffee).toBeUndefined();
  });

  it('generates warnings for low supplies', () => {
    const result = calculateSupplyConsumption({
      ...BASE_INPUT,
      currentSupplies: { ...FULL_SUPPLIES, water: 4, food: 2, coffee: 1 },
    });
    // water: 4 + (-3.5) = 0.5 → critical; food: 2 + (-3.9) = -1.9 → depleted
    const waterWarn = result.warnings.find((w) => w.supply === 'water');
    const foodWarn = result.warnings.find((w) => w.supply === 'food');
    expect(waterWarn?.level).toBe('critical');
    expect(foodWarn?.level).toBe('depleted');
  });
});
