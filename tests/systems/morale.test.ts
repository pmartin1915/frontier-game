import { describe, it, expect } from 'vitest';
import { calculateMorale, getMoraleState } from '@/systems/morale';
import { MoraleState, Pace } from '@/types/game-state';

const BASE_INPUT = {
  currentMorale: 65,
  coffeeAvailable: true,
  campPet: { adopted: false, name: null, dayAdopted: null, lost: false, dayLost: null },
  events: [],
  criticalSupplies: [],
  restDay: false,
  pace: Pace.Normal,
};

describe('calculateMorale', () => {
  it('coffee available → +2', () => {
    const result = calculateMorale(BASE_INPUT);
    expect(result.moraleDelta).toBe(2);
    expect(result.newMorale).toBe(67);
  });

  it('no coffee → -3', () => {
    const result = calculateMorale({ ...BASE_INPUT, coffeeAvailable: false });
    expect(result.moraleDelta).toBe(-3);
  });

  it('camp pet bonus +1', () => {
    const result = calculateMorale({
      ...BASE_INPUT,
      campPet: { adopted: true, name: 'Scout', dayAdopted: 3, lost: false, dayLost: null },
    });
    expect(result.moraleDelta).toBe(3); // coffee +2 + pet +1
  });

  it('lost camp pet → no bonus', () => {
    const result = calculateMorale({
      ...BASE_INPUT,
      campPet: { adopted: true, name: 'Scout', dayAdopted: 3, lost: true, dayLost: 10 },
    });
    expect(result.moraleDelta).toBe(2); // coffee +2 only
  });

  it('rest day → +5', () => {
    const result = calculateMorale({ ...BASE_INPUT, restDay: true });
    expect(result.moraleDelta).toBe(7); // coffee +2 + rest +5
  });

  it('hard push → -3', () => {
    const result = calculateMorale({ ...BASE_INPUT, pace: Pace.HardPush });
    expect(result.moraleDelta).toBe(-1); // coffee +2 + hard push -3
  });

  it('critical supplies penalize morale', () => {
    const result = calculateMorale({
      ...BASE_INPUT,
      criticalSupplies: ['water', 'food'],
    });
    // coffee +2 + 2 critical supplies * -3 = -4
    expect(result.moraleDelta).toBe(-4);
  });

  it('negative events reduce morale', () => {
    const result = calculateMorale({
      ...BASE_INPUT,
      events: [
        { type: 'health', description: 'test', severity: 'major' as const },
        { type: 'supply', description: 'test', severity: 'minor' as const },
      ],
    });
    // coffee +2 + health major -5 + supply minor -1 = -4
    expect(result.moraleDelta).toBe(-4);
  });

  it('navigation events are half impact', () => {
    const result = calculateMorale({
      ...BASE_INPUT,
      events: [
        { type: 'navigation', description: 'got lost', severity: 'moderate' as const },
      ],
    });
    // coffee +2 + navigation moderate -ceil(3/2) = -2 → total 0
    expect(result.moraleDelta).toBe(0);
  });

  it('morale clamped to 0-100', () => {
    const highResult = calculateMorale({ ...BASE_INPUT, currentMorale: 99, restDay: true });
    expect(highResult.newMorale).toBe(100);

    const lowResult = calculateMorale({
      ...BASE_INPUT,
      currentMorale: 2,
      coffeeAvailable: false,
    });
    expect(lowResult.newMorale).toBe(0);
  });
});

describe('getMoraleState', () => {
  it('returns HighSpirits for 80-100', () => {
    expect(getMoraleState(80)).toBe(MoraleState.HighSpirits);
    expect(getMoraleState(100)).toBe(MoraleState.HighSpirits);
  });

  it('returns Steady for 50-79', () => {
    expect(getMoraleState(50)).toBe(MoraleState.Steady);
    expect(getMoraleState(79)).toBe(MoraleState.Steady);
  });

  it('returns Wavering for 30-49', () => {
    expect(getMoraleState(30)).toBe(MoraleState.Wavering);
    expect(getMoraleState(49)).toBe(MoraleState.Wavering);
  });

  it('returns Desperate for 10-29', () => {
    expect(getMoraleState(10)).toBe(MoraleState.Desperate);
    expect(getMoraleState(29)).toBe(MoraleState.Desperate);
  });

  it('returns Broken for 0-9', () => {
    expect(getMoraleState(0)).toBe(MoraleState.Broken);
    expect(getMoraleState(9)).toBe(MoraleState.Broken);
  });
});
