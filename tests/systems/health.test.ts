import { describe, it, expect } from 'vitest';
import { calculateHealth } from '@/systems/health';
import {
  Pace,
  HealthCondition,
  DiscretionaryAction,
  EquipmentSlot,
} from '@/types/game-state';
import type { PlayerState, HorseState } from '@/types/game-state';

const BASE_PLAYER: PlayerState = {
  name: 'Martin',
  health: 100,
  conditions: [],
  fatigue: 20,
  morale: 65,
  skills: { survival: 40, navigation: 30, combat: 35, barter: 25 },
  equipment: [
    { slot: EquipmentSlot.Saddle, durability: 100 },
    { slot: EquipmentSlot.Boots, durability: 100 },
  ],
};

const BASE_HORSE: HorseState = {
  name: 'Horse',
  health: 100,
  fatigue: 20,
  lameness: false,
  thirst: 20,
  hunger: 20,
  tackCondition: 100,
};

const BASE_INPUT = {
  player: BASE_PLAYER,
  horse: BASE_HORSE,
  pace: Pace.Normal,
  waterDepleted: false,
  foodDepleted: false,
  nightTravel: false,
  horseInjuryRisk: false,
  temperature: 78,
  discretionaryAction: DiscretionaryAction.None,
  rng: () => 0.99, // above lameness chance → no lameness
};

describe('calculateHealth', () => {
  it('normal pace → no fatigue change (negated fatigueChange=0)', () => {
    const result = calculateHealth(BASE_INPUT);
    // -0 and 0 are semantically equivalent; use toBeCloseTo to avoid Object.is distinction
    expect(result.playerFatigueDelta).toBeCloseTo(0);
    expect(result.horseFatigueDelta).toBeCloseTo(0);
  });

  it('conservative pace → fatigue recovery', () => {
    const result = calculateHealth({ ...BASE_INPUT, pace: Pace.Conservative });
    // fatigueChange = 5, negated → -5 (recovery)
    expect(result.playerFatigueDelta).toBe(-5);
  });

  it('hard push → fatigue increase', () => {
    const result = calculateHealth({ ...BASE_INPUT, pace: Pace.HardPush });
    // fatigueChange = -12, negated → +12
    expect(result.playerFatigueDelta).toBe(12);
  });

  it('rest action → fatigue recovery', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      discretionaryAction: DiscretionaryAction.Rest,
    });
    // Normal pace: 0 + rest (-20) = -20
    expect(result.playerFatigueDelta).toBe(-20);
  });

  it('night travel → 1.2x fatigue', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      pace: Pace.HardPush,
      nightTravel: true,
    });
    // HardPush: negated -12 → +12, * 1.2 = 14.4, rounded = 14
    expect(result.playerFatigueDelta).toBe(14);
  });

  it('water depleted → acquires dehydration', () => {
    const result = calculateHealth({ ...BASE_INPUT, waterDepleted: true });
    expect(result.newConditions).toHaveLength(1);
    expect(result.newConditions[0].condition).toBe(HealthCondition.Dehydration);
    expect(result.healthEvents).toContainEqual({
      target: 'player',
      condition: HealthCondition.Dehydration,
      type: 'acquired',
    });
  });

  it('ongoing dehydration + still depleted → health penalty, no partial recovery', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      waterDepleted: true,
      player: {
        ...BASE_PLAYER,
        conditions: [
          { condition: HealthCondition.Dehydration, dayAcquired: 1, daysUntilCritical: 3, treated: false },
        ],
      },
    });
    // dehydration -5 + partial depletion recovery 0 = -5
    expect(result.playerHealthDelta).toBe(-5);
    expect(result.healthEvents).toContainEqual({
      target: 'player',
      condition: HealthCondition.Dehydration,
      type: 'worsened',
    });
  });

  it('both supplies depleted → full penalty, no partial recovery', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      waterDepleted: true,
      foodDepleted: true,
      player: {
        ...BASE_PLAYER,
        conditions: [
          { condition: HealthCondition.Dehydration, dayAcquired: 1, daysUntilCritical: 3, treated: false },
        ],
      },
    });
    // dehydration -5 + starvation -3 + no recovery = -8
    expect(result.playerHealthDelta).toBe(-8);
  });

  it('dehydration resolved when water restored', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      waterDepleted: false,
      player: {
        ...BASE_PLAYER,
        conditions: [
          { condition: HealthCondition.Dehydration, dayAcquired: 1, daysUntilCritical: 3, treated: false },
        ],
      },
    });
    expect(result.resolvedConditions).toContain(HealthCondition.Dehydration);
  });

  it('food depleted → starvation penalty with no partial recovery', () => {
    const result = calculateHealth({ ...BASE_INPUT, foodDepleted: true });
    // starvation -3 + partial depletion recovery 0 = -3
    expect(result.playerHealthDelta).toBe(-3);
  });

  it('crisis recovery scales when health is low', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      player: { ...BASE_PLAYER, health: 25 },
    });
    // base +1 + crisis bonus (40-25)*0.05 = +0.75 = total +1.75
    expect(result.playerHealthDelta).toBeCloseTo(1.75, 1);
  });

  it('high fatigue → additional health penalty', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      player: { ...BASE_PLAYER, fatigue: 85 },
    });
    // fatigue 85 + delta 0 = 85 > 80 → -2 health + 1 passive recovery = -1
    expect(result.playerHealthDelta).toBe(-1);
  });

  it('horse thirst/hunger recovery when supplies available', () => {
    const result = calculateHealth(BASE_INPUT);
    // horseThirstDelta: 8 - 8 = 0 (no net change when water available)
    // horseHungerDelta: 5 - 8 = -3, clamped to max(-5, -3) = -3
    expect(result.horseThirstDelta).toBe(0);
    expect(result.horseHungerDelta).toBe(-3);
  });

  it('horse health penalty when thirst > 70', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      horse: { ...BASE_HORSE, thirst: 75 },
    });
    expect(result.horseHealthDelta).toBe(-2);
  });

  it('passive horse recovery +1 when properly fed and watered', () => {
    const result = calculateHealth({
      ...BASE_INPUT,
      waterDepleted: false,
      foodDepleted: false,
      horse: { ...BASE_HORSE, thirst: 50, hunger: 50 },
    });
    expect(result.horseHealthDelta).toBe(1);
  });
});
