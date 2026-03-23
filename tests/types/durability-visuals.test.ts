/**
 * Frontier — Durability Visual Constants Tests
 *
 * Validates getDurabilityTier, getAverageDurability, multiplyTintScalar,
 * and the completeness of DURABILITY_VISUALS / SPRITE_EQUIPMENT_MAPPING.
 */

import { describe, it, expect } from 'vitest';
import {
  DurabilityTier,
  DURABILITY_VISUALS,
  getDurabilityTier,
  getAverageDurability,
  multiplyTintScalar,
  SPRITE_EQUIPMENT_MAPPING,
} from '@/types/animation';
import { EquipmentSlot } from '@/types/game-state';

// ============================================================
// getDurabilityTier
// ============================================================

describe('getDurabilityTier', () => {
  it('returns Good for 100', () => {
    expect(getDurabilityTier(100)).toBe(DurabilityTier.Good);
  });

  it('returns Good for 75 (boundary)', () => {
    expect(getDurabilityTier(75)).toBe(DurabilityTier.Good);
  });

  it('returns Worn for 74 (just below Good)', () => {
    expect(getDurabilityTier(74)).toBe(DurabilityTier.Worn);
  });

  it('returns Worn for 40 (boundary)', () => {
    expect(getDurabilityTier(40)).toBe(DurabilityTier.Worn);
  });

  it('returns Damaged for 39 (just below Worn)', () => {
    expect(getDurabilityTier(39)).toBe(DurabilityTier.Damaged);
  });

  it('returns Damaged for 10 (boundary)', () => {
    expect(getDurabilityTier(10)).toBe(DurabilityTier.Damaged);
  });

  it('returns Broken for 9 (just below Damaged)', () => {
    expect(getDurabilityTier(9)).toBe(DurabilityTier.Broken);
  });

  it('returns Broken for 0', () => {
    expect(getDurabilityTier(0)).toBe(DurabilityTier.Broken);
  });
});

// ============================================================
// getAverageDurability
// ============================================================

describe('getAverageDurability', () => {
  it('returns 100 for empty array', () => {
    expect(getAverageDurability([])).toBe(100);
  });

  it('returns exact value for single item', () => {
    expect(getAverageDurability([{ durability: 60 }])).toBe(60);
  });

  it('averages two items', () => {
    expect(getAverageDurability([{ durability: 50 }, { durability: 100 }])).toBe(75);
  });

  it('rounds to nearest integer', () => {
    expect(getAverageDurability([{ durability: 33 }, { durability: 34 }])).toBe(34);
  });

  it('handles all-zero durabilities', () => {
    expect(getAverageDurability([{ durability: 0 }, { durability: 0 }])).toBe(0);
  });
});

// ============================================================
// multiplyTintScalar
// ============================================================

describe('multiplyTintScalar', () => {
  it('returns same color at scalar 1.0', () => {
    expect(multiplyTintScalar(0xff8040, 1.0)).toBe(0xff8040);
  });

  it('returns black at scalar 0.0', () => {
    expect(multiplyTintScalar(0xffffff, 0.0)).toBe(0x000000);
  });

  it('halves each channel at scalar 0.5', () => {
    const result = multiplyTintScalar(0xffffff, 0.5);
    // Each channel: round(255 * 0.5) = 128 = 0x80
    expect(result).toBe(0x808080);
  });

  it('clamps scalar above 1.0', () => {
    expect(multiplyTintScalar(0xff8040, 1.5)).toBe(0xff8040);
  });

  it('clamps scalar below 0.0', () => {
    expect(multiplyTintScalar(0xff8040, -0.5)).toBe(0x000000);
  });
});

// ============================================================
// DURABILITY_VISUALS completeness
// ============================================================

describe('DURABILITY_VISUALS', () => {
  it('has entries for all DurabilityTier values', () => {
    for (const tier of Object.values(DurabilityTier)) {
      expect(DURABILITY_VISUALS[tier]).toBeDefined();
      expect(DURABILITY_VISUALS[tier].tier).toBe(tier);
    }
  });

  it('Good and Worn do not show indicator', () => {
    expect(DURABILITY_VISUALS[DurabilityTier.Good].showIndicator).toBe(false);
    expect(DURABILITY_VISUALS[DurabilityTier.Worn].showIndicator).toBe(false);
  });

  it('Damaged and Broken show indicator', () => {
    expect(DURABILITY_VISUALS[DurabilityTier.Damaged].showIndicator).toBe(true);
    expect(DURABILITY_VISUALS[DurabilityTier.Broken].showIndicator).toBe(true);
  });

  it('tintMultiplier decreases as tier worsens', () => {
    const tiers = [DurabilityTier.Good, DurabilityTier.Worn, DurabilityTier.Damaged, DurabilityTier.Broken];
    for (let i = 1; i < tiers.length; i++) {
      expect(DURABILITY_VISUALS[tiers[i]].tintMultiplier)
        .toBeLessThan(DURABILITY_VISUALS[tiers[i - 1]].tintMultiplier);
    }
  });
});

// ============================================================
// SPRITE_EQUIPMENT_MAPPING
// ============================================================

describe('SPRITE_EQUIPMENT_MAPPING', () => {
  it('maps player_cowboy to personal equipment', () => {
    const slots = SPRITE_EQUIPMENT_MAPPING['player_cowboy'];
    expect(slots).toContain(EquipmentSlot.Boots);
    expect(slots).toContain(EquipmentSlot.Rifle);
    expect(slots).toContain(EquipmentSlot.Canteen);
    expect(slots).toContain(EquipmentSlot.Bedroll);
  });

  it('maps horse_riding_base to Saddle', () => {
    expect(SPRITE_EQUIPMENT_MAPPING['horse_riding_base']).toEqual([EquipmentSlot.Saddle]);
  });

  it('maps wagon_prairie_schooner to WagonWheel', () => {
    expect(SPRITE_EQUIPMENT_MAPPING['wagon_prairie_schooner']).toEqual([EquipmentSlot.WagonWheel]);
  });
});
