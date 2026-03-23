import { describe, it, expect } from 'vitest';
import { resolveCamp, isCampActivityAvailable } from '@/systems/camp';
import { CampActivity } from '@/types/camp';
import type { CampInput, CampActivitySelection } from '@/types/camp';
import { EquipmentSlot } from '@/types/game-state';
import type { Supplies, Equipment } from '@/types/game-state';
import { CompanionId } from '@/types/companions';

// ============================================================
// TEST FIXTURES
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

const BASE_EQUIPMENT: Equipment[] = [
  { slot: EquipmentSlot.Saddle, durability: 80 },
  { slot: EquipmentSlot.Boots, durability: 60 },
  { slot: EquipmentSlot.Rifle, durability: 100 },
  { slot: EquipmentSlot.Canteen, durability: 90 },
  { slot: EquipmentSlot.Bedroll, durability: 70 },
];

const BASE_INPUT: CampInput = {
  activities: [],
  isFullDay: false,
  playerFatigue: 50,
  playerMorale: 60,
  playerHealth: 80,
  equipment: BASE_EQUIPMENT,
  supplies: BASE_SUPPLIES,
  activeCompanionIds: [CompanionId.EliasCoe],
  hasCampPet: false,
};

// ============================================================
// resolveCamp
// ============================================================

describe('resolveCamp', () => {
  it('base camp with no activities gives -5 fatigue', () => {
    const result = resolveCamp({ ...BASE_INPUT, activities: [] });
    expect(result.fatigueDelta).toBe(-5);
    expect(result.moraleDelta).toBe(0);
    expect(result.healthDelta).toBe(0);
    expect(result.campEvents).toHaveLength(1);
    expect(result.campEvents[0].type).toBe('camp');
  });

  // --- REST ---

  it('evening rest: fatigue -15 (-5 base + -10), morale +2', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      activities: [{ activity: CampActivity.Rest }],
    });
    expect(result.fatigueDelta).toBe(-15); // -5 base + -10 rest
    expect(result.moraleDelta).toBe(2);
  });

  it('full-day rest: fatigue -25 (-5 base + -20), morale +3', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      isFullDay: true,
      activities: [{ activity: CampActivity.Rest }],
    });
    expect(result.fatigueDelta).toBe(-25); // -5 base + -20 rest
    expect(result.moraleDelta).toBe(3);
  });

  // --- COOK ---

  it('evening cook: health +5, food -1', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      activities: [{ activity: CampActivity.Cook }],
    });
    expect(result.healthDelta).toBe(5);
    expect(result.supplyDeltas.food).toBe(-1);
  });

  it('full-day cook: health +8, food -1', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      isFullDay: true,
      activities: [{ activity: CampActivity.Cook }],
    });
    expect(result.healthDelta).toBe(8);
    expect(result.supplyDeltas.food).toBe(-1);
  });

  it('cook with coffee: adds morale bonus', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      activities: [{ activity: CampActivity.Cook }],
    });
    expect(result.moraleDelta).toBe(2); // coffee bonus
    expect(result.summaryLines).toContain('Coffee brewed. Spirits lifted.');
  });

  it('cook without coffee: no morale bonus', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, coffee: 0 },
      activities: [{ activity: CampActivity.Cook }],
    });
    expect(result.moraleDelta).toBe(0);
  });

  it('cook fails when food < 2', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, food: 1 },
      activities: [{ activity: CampActivity.Cook }],
    });
    expect(result.healthDelta).toBe(0);
    expect(result.supplyDeltas.food).toBeUndefined();
    expect(result.summaryLines).toContain('Not enough food to cook.');
  });

  // --- REPAIR ---

  it('evening repair: +15 durability on worst item, repair -1', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      activities: [{ activity: CampActivity.Repair }],
    });
    // Boots have lowest durability (60)
    expect(result.equipmentRepairs).toHaveLength(1);
    expect(result.equipmentRepairs[0].slot).toBe(EquipmentSlot.Boots);
    expect(result.equipmentRepairs[0].durabilityDelta).toBe(15);
    expect(result.supplyDeltas.repair).toBe(-1);
  });

  it('full-day repair: +25 durability on worst item', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      isFullDay: true,
      activities: [{ activity: CampActivity.Repair }],
    });
    expect(result.equipmentRepairs[0].slot).toBe(EquipmentSlot.Boots);
    expect(result.equipmentRepairs[0].durabilityDelta).toBe(25);
    expect(result.supplyDeltas.repair).toBe(-1);
  });

  it('repair caps at 100 durability', () => {
    const equipment = [
      { slot: EquipmentSlot.Boots, durability: 95 },
      { slot: EquipmentSlot.Saddle, durability: 100 },
    ];
    const result = resolveCamp({
      ...BASE_INPUT,
      equipment,
      isFullDay: true,
      activities: [{ activity: CampActivity.Repair }],
    });
    // Would be +20 but capped at 100 - 95 = 5
    expect(result.equipmentRepairs[0].durabilityDelta).toBe(5);
  });

  it('repair fails when no repair supplies', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      supplies: { ...BASE_SUPPLIES, repair: 0 },
      activities: [{ activity: CampActivity.Repair }],
    });
    expect(result.equipmentRepairs).toHaveLength(0);
    expect(result.summaryLines).toContain('No repair supplies available.');
  });

  it('repair fails when all equipment at 100', () => {
    const equipment = BASE_EQUIPMENT.map((e) => ({ ...e, durability: 100 }));
    const result = resolveCamp({
      ...BASE_INPUT,
      equipment,
      activities: [{ activity: CampActivity.Repair }],
    });
    expect(result.equipmentRepairs).toHaveLength(0);
    expect(result.summaryLines).toContain('All equipment in good condition.');
  });

  // --- COMPANION CHAT ---

  it('evening companion chat: +5 loyalty', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      activities: [{ activity: CampActivity.CompanionChat, targetCompanionId: CompanionId.EliasCoe }],
    });
    expect(result.companionLoyaltyDeltas).toHaveLength(1);
    expect(result.companionLoyaltyDeltas[0].companionId).toBe(CompanionId.EliasCoe);
    expect(result.companionLoyaltyDeltas[0].loyaltyDelta).toBe(5);
  });

  it('full-day companion chat: +10 loyalty', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      isFullDay: true,
      activities: [{ activity: CampActivity.CompanionChat, targetCompanionId: CompanionId.EliasCoe }],
    });
    expect(result.companionLoyaltyDeltas[0].loyaltyDelta).toBe(10);
  });

  it('companion chat with invalid target: no effect', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      activeCompanionIds: [],
      activities: [{ activity: CampActivity.CompanionChat, targetCompanionId: CompanionId.EliasCoe }],
    });
    expect(result.companionLoyaltyDeltas).toHaveLength(0);
    expect(result.summaryLines).toContain('No companion available to speak with.');
  });

  it('companion chat without targetCompanionId: no effect', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      activities: [{ activity: CampActivity.CompanionChat }],
    });
    expect(result.companionLoyaltyDeltas).toHaveLength(0);
  });

  // --- MULTIPLE ACTIVITIES ---

  it('full-day with 2 activities: both effects apply', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      isFullDay: true,
      activities: [
        { activity: CampActivity.Rest },
        { activity: CampActivity.Cook },
      ],
    });
    // Rest: fatigue -20, morale +3
    // Cook: health +8, food -1, coffee morale +3
    // Base: fatigue -5
    expect(result.fatigueDelta).toBe(-25); // -5 base + -20 rest
    expect(result.moraleDelta).toBe(6);    // 3 rest + 3 coffee
    expect(result.healthDelta).toBe(8);
    expect(result.supplyDeltas.food).toBe(-1);
  });

  // --- CAMP EVENTS ---

  it('generates camp events for narrator', () => {
    const result = resolveCamp({
      ...BASE_INPUT,
      activities: [{ activity: CampActivity.Rest }],
    });
    expect(result.campEvents.length).toBeGreaterThanOrEqual(2);
    expect(result.campEvents.every((e) => e.type === 'camp')).toBe(true);
  });
});

// ============================================================
// isCampActivityAvailable
// ============================================================

describe('isCampActivityAvailable', () => {
  it('rest is always available', () => {
    expect(isCampActivityAvailable(CampActivity.Rest, BASE_SUPPLIES, BASE_EQUIPMENT, [])).toBe(true);
  });

  it('cook requires food >= 2', () => {
    expect(isCampActivityAvailable(CampActivity.Cook, BASE_SUPPLIES, BASE_EQUIPMENT, [])).toBe(true);
    expect(isCampActivityAvailable(CampActivity.Cook, { ...BASE_SUPPLIES, food: 1 }, BASE_EQUIPMENT, [])).toBe(false);
  });

  it('repair requires repair >= 1 and damaged equipment', () => {
    expect(isCampActivityAvailable(CampActivity.Repair, BASE_SUPPLIES, BASE_EQUIPMENT, [])).toBe(true);
    expect(isCampActivityAvailable(CampActivity.Repair, { ...BASE_SUPPLIES, repair: 0 }, BASE_EQUIPMENT, [])).toBe(false);
    const allPerfect = BASE_EQUIPMENT.map((e) => ({ ...e, durability: 100 }));
    expect(isCampActivityAvailable(CampActivity.Repair, BASE_SUPPLIES, allPerfect, [])).toBe(false);
  });

  it('companion chat requires active companions', () => {
    expect(isCampActivityAvailable(CampActivity.CompanionChat, BASE_SUPPLIES, BASE_EQUIPMENT, [CompanionId.EliasCoe])).toBe(true);
    expect(isCampActivityAvailable(CampActivity.CompanionChat, BASE_SUPPLIES, BASE_EQUIPMENT, [])).toBe(false);
  });
});
