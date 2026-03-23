import { describe, it, expect } from 'vitest';
import {
  processCompanionDay,
  canRecruitCompanion,
  getCompanionSkillBonus,
} from '@/systems/companions';
import type { CompanionDayInput } from '@/systems/companions';
import type { CompanionInstance } from '@/types/companions';
import { CompanionId, CompanionSkill } from '@/types/companions';
import { Pace } from '@/types/game-state';

// ============================================================
// BASE TEST INPUTS
// ============================================================

const BASE_COMPANION: CompanionInstance = {
  id: CompanionId.EliasCoe,
  health: 85,
  morale: 60,
  loyalty: 50,
  conditions: [],
  dayJoined: 1,
  status: 'active',
};

const BASE_SUPPLIES = {
  water: 40,
  food: 35,
  coffee: 10,
  medical: 5,
  repair: 5,
  ammo: 20,
  tradeGoods: 15,
  funds: 50,
};

const BASE_INPUT: CompanionDayInput = {
  companions: [BASE_COMPANION],
  playerMorale: 65,
  supplies: BASE_SUPPLIES,
  pace: Pace.Normal,
  dayNumber: 10,
  encounterEffects: [],
};

// ============================================================
// processCompanionDay — Morale Drift
// ============================================================

describe('processCompanionDay — morale drift', () => {
  it('companion morale drifts toward player morale', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      playerMorale: 80,
      companions: [{ ...BASE_COMPANION, morale: 60 }],
    });
    const companion = result.updatedCompanions[0];
    // drift = (80 - 60) * 0.1 = 2, clamped to max 2
    expect(companion.morale).toBe(62);
  });

  it('morale drifts down when player morale is lower', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      playerMorale: 30,
      companions: [{ ...BASE_COMPANION, morale: 60 }],
    });
    const companion = result.updatedCompanions[0];
    // drift = (30 - 60) * 0.1 = -3, clamped to -2
    expect(companion.morale).toBe(58);
  });

  it('morale does not exceed 100', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      playerMorale: 100,
      companions: [{ ...BASE_COMPANION, morale: 99 }],
    });
    // drift = (100-99)*0.1 = 0.1, so morale = 99.1 (clamped at 100)
    expect(result.updatedCompanions[0].morale).toBeLessThanOrEqual(100);
    expect(result.updatedCompanions[0].morale).toBeCloseTo(99.1);
  });

  it('morale does not go below 0', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      playerMorale: 0,
      companions: [{ ...BASE_COMPANION, morale: 1 }],
    });
    expect(result.updatedCompanions[0].morale).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// processCompanionDay — Loyalty
// ============================================================

describe('processCompanionDay — loyalty', () => {
  it('adequate supplies give +1 loyalty per day', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, water: 40, food: 35 },
    });
    expect(result.updatedCompanions[0].loyalty).toBe(51);
  });

  it('critical supplies give -2 loyalty per day', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, water: 1, food: 35 },
    });
    expect(result.updatedCompanions[0].loyalty).toBe(48);
  });

  it('hard push pace gives -1 loyalty penalty', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      pace: Pace.HardPush,
    });
    // adequate supplies +1, hard push -1 = net 0
    expect(result.updatedCompanions[0].loyalty).toBe(50);
  });

  it('critical supplies + hard push stacks penalties', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      pace: Pace.HardPush,
      supplies: { ...BASE_SUPPLIES, water: 2, food: 35 },
    });
    // critical -2, hard push -1 = net -3
    expect(result.updatedCompanions[0].loyalty).toBe(47);
  });

  it('loyalty does not exceed 100', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      companions: [{ ...BASE_COMPANION, loyalty: 100 }],
    });
    expect(result.updatedCompanions[0].loyalty).toBe(100);
  });
});

// ============================================================
// processCompanionDay — Health
// ============================================================

describe('processCompanionDay — health from supply depletion', () => {
  it('water depletion damages companion health by 3', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, water: 0 },
    });
    expect(result.updatedCompanions[0].health).toBe(82);
  });

  it('food depletion damages companion health by 2', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, food: 0 },
    });
    expect(result.updatedCompanions[0].health).toBe(83);
  });

  it('both water and food depleted stack damage', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, water: 0, food: 0 },
    });
    // -3 (water) -2 (food) = -5
    expect(result.updatedCompanions[0].health).toBe(80);
  });
});

// ============================================================
// processCompanionDay — Encounter Effects
// ============================================================

describe('processCompanionDay — encounter effects', () => {
  it('applies encounter loyalty delta to specific companion', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      encounterEffects: [
        { companionId: CompanionId.EliasCoe, loyaltyDelta: 10 },
      ],
    });
    // +1 (adequate supplies) + 10 (encounter) = 61
    expect(result.updatedCompanions[0].loyalty).toBe(61);
    expect(result.companionEvents.some((e) => e.type === 'loyaltyChange')).toBe(true);
  });

  it('applies "all" encounter effect to all companions', () => {
    const companions = [
      { ...BASE_COMPANION, id: CompanionId.EliasCoe, loyalty: 50 },
      { ...BASE_COMPANION, id: CompanionId.TomBlanchard, loyalty: 40 },
    ];
    const result = processCompanionDay({
      ...BASE_INPUT,
      companions,
      encounterEffects: [{ companionId: 'all', loyaltyDelta: -5 }],
    });
    // Coe: +1 (supply) -5 (encounter) = 46
    expect(result.updatedCompanions[0].loyalty).toBe(46);
    // Blanchard: +1 (supply) -5 (encounter) = 36
    expect(result.updatedCompanions[1].loyalty).toBe(36);
  });
});

// ============================================================
// processCompanionDay — Desertion & Death
// ============================================================

describe('processCompanionDay — desertion and death', () => {
  it('companion deserts at low loyalty and low morale with low RNG', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      playerMorale: 10,
      companions: [{ ...BASE_COMPANION, loyalty: 5, morale: 10 }],
      rng: () => 0.01, // low roll = deserts
    });
    expect(result.updatedCompanions[0].status).toBe('deserted');
    expect(result.companionEvents.some((e) => e.type === 'deserted')).toBe(true);
  });

  it('companion does NOT desert at low loyalty/morale with high RNG', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      playerMorale: 10,
      companions: [{ ...BASE_COMPANION, loyalty: 10, morale: 15 }],
      rng: () => 0.99, // high roll = stays
    });
    expect(result.updatedCompanions[0].status).toBe('active');
  });

  it('companion does not desert when loyalty > 15', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      playerMorale: 10,
      companions: [{ ...BASE_COMPANION, loyalty: 20, morale: 10 }],
      rng: () => 0.01,
    });
    expect(result.updatedCompanions[0].status).toBe('active');
  });

  it('companion dies when health reaches 0', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, water: 0, food: 0 },
      companions: [{ ...BASE_COMPANION, health: 3 }],
    });
    // -3 (water) -2 (food) = health goes to -2, clamped to 0
    expect(result.updatedCompanions[0].health).toBe(0);
    expect(result.updatedCompanions[0].status).toBe('dead');
    expect(result.companionEvents.some((e) => e.type === 'death')).toBe(true);
  });

  it('inactive companions are not processed', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      companions: [{ ...BASE_COMPANION, status: 'deserted', loyalty: 5, morale: 5 }],
    });
    // Should not change anything on deserted companion
    expect(result.updatedCompanions[0].status).toBe('deserted');
    expect(result.updatedCompanions[0].loyalty).toBe(5);
  });
});

// ============================================================
// Skill Bonuses
// ============================================================

describe('skill bonuses', () => {
  it('calculates navigation bonus from Elias Coe', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      companions: [{ ...BASE_COMPANION, id: CompanionId.EliasCoe, loyalty: 70 }],
    });
    // bonus = 10 + floor(71/10) = 10 + 7 = 17 (loyalty increases to 71 from adequate supplies)
    expect(result.skillBonuses.navigationBonus).toBe(17);
    expect(result.skillBonuses.medicineBonus).toBe(0);
    expect(result.skillBonuses.huntingBonus).toBe(0);
  });

  it('calculates hunting bonus from Tom Blanchard', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      companions: [{ ...BASE_COMPANION, id: CompanionId.TomBlanchard, loyalty: 50 }],
    });
    // bonus = 10 + floor(51/10) = 10 + 5 = 15
    expect(result.skillBonuses.huntingBonus).toBe(15);
  });

  it('calculates medicine bonus from Luisa Vega', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      companions: [{ ...BASE_COMPANION, id: CompanionId.LuisaVega, loyalty: 80 }],
    });
    // bonus = 10 + floor(81/10) = 10 + 8 = 18
    expect(result.skillBonuses.medicineBonus).toBe(18);
  });

  it('dead companions do not contribute bonuses', () => {
    const result = processCompanionDay({
      ...BASE_INPUT,
      companions: [
        { ...BASE_COMPANION, id: CompanionId.EliasCoe, status: 'dead', loyalty: 100 },
      ],
    });
    expect(result.skillBonuses.navigationBonus).toBe(0);
  });
});

// ============================================================
// canRecruitCompanion
// ============================================================

describe('canRecruitCompanion', () => {
  it('returns true when party has room', () => {
    expect(canRecruitCompanion([], 4)).toBe(true);
    expect(canRecruitCompanion([BASE_COMPANION], 4)).toBe(true);
  });

  it('returns false when party is full', () => {
    const full = [
      { ...BASE_COMPANION, id: CompanionId.EliasCoe },
      { ...BASE_COMPANION, id: CompanionId.LuisaVega },
      { ...BASE_COMPANION, id: CompanionId.TomBlanchard },
      { ...BASE_COMPANION, id: CompanionId.EliasCoe },
    ];
    expect(canRecruitCompanion(full, 4)).toBe(false);
  });

  it('does not count deserted/dead companions toward limit', () => {
    const mixed = [
      { ...BASE_COMPANION, status: 'deserted' as const },
      { ...BASE_COMPANION, status: 'dead' as const },
      BASE_COMPANION,
    ];
    expect(canRecruitCompanion(mixed, 2)).toBe(true);
  });
});

// ============================================================
// getCompanionSkillBonus
// ============================================================

describe('getCompanionSkillBonus', () => {
  it('returns correct bonus for matching skill', () => {
    const bonus = getCompanionSkillBonus([BASE_COMPANION], CompanionSkill.Navigation);
    expect(bonus).toBe(15); // 10 + floor(50/10) = 15
  });

  it('returns 0 for non-matching skill', () => {
    const bonus = getCompanionSkillBonus([BASE_COMPANION], CompanionSkill.Hunting);
    expect(bonus).toBe(0);
  });

  it('returns 0 for empty companions', () => {
    const bonus = getCompanionSkillBonus([], CompanionSkill.Navigation);
    expect(bonus).toBe(0);
  });
});
