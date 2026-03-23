import { describe, it, expect } from 'vitest';
import { calculateEquipment } from '@/systems/equipment';
import { Pace, Terrain, DiscretionaryAction, EquipmentSlot } from '@/types/game-state';

const BASE_EQUIPMENT = [
  { slot: EquipmentSlot.Saddle, durability: 100 },
  { slot: EquipmentSlot.Boots, durability: 100 },
  { slot: EquipmentSlot.Rifle, durability: 100 },
  { slot: EquipmentSlot.Canteen, durability: 100 },
  { slot: EquipmentSlot.Bedroll, durability: 100 },
];

const BASE_INPUT = {
  equipment: BASE_EQUIPMENT,
  pace: Pace.Normal,
  terrain: Terrain.Prairie,
  discretionaryAction: DiscretionaryAction.None,
  repairSupplies: 5,
};

describe('calculateEquipment', () => {
  it('normal pace, prairie → -1.0 per item', () => {
    const result = calculateEquipment(BASE_INPUT);
    for (const item of result.updatedEquipment) {
      // BASE_DEGRADATION -1.0 × 1.0 = -1.0
      expect(item.durability).toBe(99);
    }
    expect(result.repairSuppliesUsed).toBe(0);
  });

  it('hard push → -1.35 per item (1.35x of -1.0)', () => {
    const result = calculateEquipment({ ...BASE_INPUT, pace: Pace.HardPush });
    for (const item of result.updatedEquipment) {
      // -1.0 * 1.35 = -1.35
      expect(item.durability).toBeCloseTo(98.65, 2);
    }
  });

  it('canyon terrain → extra wear on boots and saddle', () => {
    const result = calculateEquipment({ ...BASE_INPUT, terrain: Terrain.Canyon });
    const saddle = result.updatedEquipment.find((e) => e.slot === EquipmentSlot.Saddle)!;
    const boots = result.updatedEquipment.find((e) => e.slot === EquipmentSlot.Boots)!;
    const rifle = result.updatedEquipment.find((e) => e.slot === EquipmentSlot.Rifle)!;
    // Base -1.0 * 1.0 (normal) * 1.5 (canyon) = -1.5
    expect(saddle.durability).toBe(98.5);
    expect(boots.durability).toBe(98.5);
    // Rifle unaffected by terrain: -1.0 * 1.0 = -1.0
    expect(rifle.durability).toBe(99);
  });

  it('repair action → +25 to lowest, -1 supply', () => {
    const lowEquipment = [
      { slot: EquipmentSlot.Saddle, durability: 30 },
      { slot: EquipmentSlot.Boots, durability: 60 },
      { slot: EquipmentSlot.Rifle, durability: 80 },
    ];
    const result = calculateEquipment({
      ...BASE_INPUT,
      equipment: lowEquipment,
      discretionaryAction: DiscretionaryAction.Repair,
    });
    // Saddle was lowest at 30, after degradation (-1.0): 29.0, then +25 = 54.0
    const saddle = result.updatedEquipment.find((e) => e.slot === EquipmentSlot.Saddle)!;
    expect(saddle.durability).toBe(54);
    expect(result.repairSuppliesUsed).toBe(1);
  });

  it('no repair when no supplies', () => {
    const result = calculateEquipment({
      ...BASE_INPUT,
      discretionaryAction: DiscretionaryAction.Repair,
      repairSupplies: 0,
    });
    expect(result.repairSuppliesUsed).toBe(0);
  });

  it('item breaks at 0 durability', () => {
    const fragile = [{ slot: EquipmentSlot.Canteen, durability: 1 }];
    const result = calculateEquipment({ ...BASE_INPUT, equipment: fragile });
    expect(result.updatedEquipment[0].durability).toBe(0);
    const brokenEvent = result.equipmentEvents.find((e) => e.type === 'broken');
    expect(brokenEvent).toBeDefined();
    expect(brokenEvent!.slot).toBe(EquipmentSlot.Canteen);
  });

  it('already broken items are not further degraded', () => {
    const broken = [{ slot: EquipmentSlot.Rifle, durability: 0 }];
    const result = calculateEquipment({ ...BASE_INPUT, equipment: broken });
    expect(result.updatedEquipment[0].durability).toBe(0);
    // No events for already-broken items
    expect(result.equipmentEvents).toHaveLength(0);
  });
});
