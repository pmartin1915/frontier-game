/**
 * Frontier — Particle Effect Constants Tests
 *
 * Validates completeness of BIOME_DUST_COLORS, DUST_INTENSITY,
 * and breath/dust condition sets against their respective enums.
 */

import { describe, it, expect } from 'vitest';
import {
  BIOME_DUST_COLORS,
  DUST_INTENSITY,
  DUST_SUPPRESSED_WEATHER,
  BREATH_COLD_BIOMES,
  BREATH_COLD_TIMES,
  BREATH_COLD_WEATHER,
} from '@/types/animation';
import { Biome, Pace, Weather, TimeOfDay } from '@/types/game-state';

// ============================================================
// BIOME_DUST_COLORS
// ============================================================

describe('BIOME_DUST_COLORS', () => {
  it('has an entry for every Biome value', () => {
    for (const biome of Object.values(Biome)) {
      expect(BIOME_DUST_COLORS[biome]).toBeDefined();
      expect(typeof BIOME_DUST_COLORS[biome]).toBe('number');
    }
  });

  it('all colors are valid 24-bit RGB values', () => {
    for (const color of Object.values(BIOME_DUST_COLORS)) {
      expect(color).toBeGreaterThanOrEqual(0);
      expect(color).toBeLessThanOrEqual(0xffffff);
    }
  });
});

// ============================================================
// DUST_INTENSITY
// ============================================================

describe('DUST_INTENSITY', () => {
  it('has an entry for every Pace value', () => {
    for (const pace of Object.values(Pace)) {
      expect(DUST_INTENSITY[pace]).toBeDefined();
      expect(DUST_INTENSITY[pace].count).toBeGreaterThan(0);
      expect(DUST_INTENSITY[pace].spread).toBeGreaterThan(0);
    }
  });

  it('HardPush produces more particles than Conservative', () => {
    expect(DUST_INTENSITY[Pace.HardPush].count)
      .toBeGreaterThan(DUST_INTENSITY[Pace.Conservative].count);
  });
});

// ============================================================
// DUST_SUPPRESSED_WEATHER
// ============================================================

describe('DUST_SUPPRESSED_WEATHER', () => {
  it('includes Rain, Storm, and Snow', () => {
    expect(DUST_SUPPRESSED_WEATHER.has(Weather.Rain)).toBe(true);
    expect(DUST_SUPPRESSED_WEATHER.has(Weather.Storm)).toBe(true);
    expect(DUST_SUPPRESSED_WEATHER.has(Weather.Snow)).toBe(true);
  });

  it('does not include Clear or Dust weather', () => {
    expect(DUST_SUPPRESSED_WEATHER.has(Weather.Clear)).toBe(false);
    expect(DUST_SUPPRESSED_WEATHER.has(Weather.Dust)).toBe(false);
  });
});

// ============================================================
// BREATH conditions
// ============================================================

describe('Breath cold conditions', () => {
  it('BREATH_COLD_BIOMES includes MountainPass', () => {
    expect(BREATH_COLD_BIOMES.has(Biome.MountainPass)).toBe(true);
  });

  it('BREATH_COLD_BIOMES does not include warm biomes', () => {
    expect(BREATH_COLD_BIOMES.has(Biome.DesertApproach)).toBe(false);
    expect(BREATH_COLD_BIOMES.has(Biome.StakedPlains)).toBe(false);
  });

  it('BREATH_COLD_TIMES includes Night and Dawn', () => {
    expect(BREATH_COLD_TIMES.has(TimeOfDay.Night)).toBe(true);
    expect(BREATH_COLD_TIMES.has(TimeOfDay.Dawn)).toBe(true);
  });

  it('BREATH_COLD_TIMES does not include Midday', () => {
    expect(BREATH_COLD_TIMES.has(TimeOfDay.Midday)).toBe(false);
  });

  it('BREATH_COLD_WEATHER includes Snow', () => {
    expect(BREATH_COLD_WEATHER.has(Weather.Snow)).toBe(true);
  });

  it('BREATH_COLD_WEATHER does not include Clear', () => {
    expect(BREATH_COLD_WEATHER.has(Weather.Clear)).toBe(false);
  });
});
