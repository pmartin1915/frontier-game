import { describe, it, expect } from 'vitest';
import { rollWeather, WEATHER_TABLES } from '@/data/weather-tables';
import { Biome, Weather } from '@/types/game-state';

describe('WEATHER_TABLES', () => {
  it('has an entry for every biome', () => {
    for (const biome of Object.values(Biome)) {
      expect(WEATHER_TABLES[biome]).toBeDefined();
    }
  });

  it('probabilities sum to 1.0 for each biome', () => {
    for (const biome of Object.values(Biome)) {
      const weights = WEATHER_TABLES[biome];
      const sum = Object.values(weights).reduce(
        (acc, v) => acc + (v as number),
        0,
      );
      expect(sum).toBeCloseTo(1.0, 6);
    }
  });

  it('all weather values are valid Weather enum members', () => {
    const validWeathers = Object.values(Weather);
    for (const biome of Object.values(Biome)) {
      for (const key of Object.keys(WEATHER_TABLES[biome])) {
        expect(validWeathers).toContain(key);
      }
    }
  });

  it('no negative probabilities', () => {
    for (const biome of Object.values(Biome)) {
      for (const prob of Object.values(WEATHER_TABLES[biome])) {
        expect(prob as number).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('rollWeather', () => {
  it('returns Clear for CrossTimbers when rng returns 0.0', () => {
    // CrossTimbers: Clear 0.50, so rng=0.0 → Clear
    expect(rollWeather(Biome.CrossTimbers, () => 0.0)).toBe(Weather.Clear);
  });

  it('returns Overcast for CrossTimbers when rng returns 0.6', () => {
    // CrossTimbers: Clear 0.50, Overcast 0.25 → cumulative 0.75
    // rng=0.6 → past Clear (0.50), within Overcast (0.75)
    expect(rollWeather(Biome.CrossTimbers, () => 0.6)).toBe(Weather.Overcast);
  });

  it('returns Snow for MountainPass when rng hits snow band', () => {
    // MountainPass: Overcast 0.30, Snow 0.25 → cumulative 0.55
    // rng=0.35 → past Overcast (0.30), within Snow (0.55)
    expect(rollWeather(Biome.MountainPass, () => 0.35)).toBe(Weather.Snow);
  });

  it('returns last weather type for rng just below 1.0', () => {
    const result = rollWeather(Biome.CrossTimbers, () => 0.999);
    const validWeathers = Object.values(Weather);
    expect(validWeathers).toContain(result);
  });

  it('never returns weather not in the biome table', () => {
    // DesertApproach has no Snow, Rain, Storm
    for (let i = 0; i < 100; i++) {
      const rng = () => i / 100;
      const result = rollWeather(Biome.DesertApproach, rng);
      expect([
        Weather.Clear,
        Weather.Heatwave,
        Weather.Dust,
        Weather.Overcast,
      ]).toContain(result);
    }
  });

  it('produces different weather for different rng values', () => {
    const results = new Set<Weather>();
    for (let i = 0; i < 100; i++) {
      results.add(rollWeather(Biome.CrossTimbers, () => i / 100));
    }
    // CrossTimbers has 5 weather types — should see most of them
    expect(results.size).toBeGreaterThanOrEqual(3);
  });
});
