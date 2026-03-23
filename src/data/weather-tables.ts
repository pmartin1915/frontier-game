/**
 * Frontier — Weather Probability Tables
 *
 * Biome-weighted weather probabilities for daily weather rolls.
 * Each biome maps to a set of Weather → probability pairs summing to 1.0.
 *
 * Imports only from types/. No side effects.
 */

import { Biome, Weather } from '@/types/game-state';

// ============================================================
// WEATHER WEIGHTS PER BIOME
// ============================================================

type WeatherWeights = Partial<Record<Weather, number>>;

const WEATHER_TABLES: Record<Biome, WeatherWeights> = {
  [Biome.CrossTimbers]: {
    [Weather.Clear]: 0.50,
    [Weather.Overcast]: 0.25,
    [Weather.Rain]: 0.15,
    [Weather.Storm]: 0.05,
    [Weather.Heatwave]: 0.05,
  },
  [Biome.StakedPlains]: {
    [Weather.Clear]: 0.40,
    [Weather.Dust]: 0.25,
    [Weather.Heatwave]: 0.20,
    [Weather.Overcast]: 0.10,
    [Weather.Storm]: 0.05,
  },
  [Biome.DesertApproach]: {
    [Weather.Clear]: 0.35,
    [Weather.Heatwave]: 0.30,
    [Weather.Dust]: 0.25,
    [Weather.Overcast]: 0.10,
  },
  [Biome.PecosValley]: {
    [Weather.Clear]: 0.45,
    [Weather.Overcast]: 0.20,
    [Weather.Rain]: 0.15,
    [Weather.Dust]: 0.10,
    [Weather.Heatwave]: 0.10,
  },
  [Biome.HighDesert]: {
    [Weather.Clear]: 0.40,
    [Weather.Overcast]: 0.20,
    [Weather.Dust]: 0.15,
    [Weather.Heatwave]: 0.15,
    [Weather.Snow]: 0.05,
    [Weather.Storm]: 0.05,
  },
  [Biome.MountainPass]: {
    [Weather.Overcast]: 0.30,
    [Weather.Snow]: 0.25,
    [Weather.Clear]: 0.20,
    [Weather.Storm]: 0.15,
    [Weather.Rain]: 0.10,
  },
  [Biome.ColoradoPlains]: {
    [Weather.Clear]: 0.45,
    [Weather.Overcast]: 0.25,
    [Weather.Rain]: 0.15,
    [Weather.Storm]: 0.10,
    [Weather.Snow]: 0.05,
  },
};

// ============================================================
// WEATHER ROLL
// ============================================================

/**
 * Roll weather for a given biome using weighted probabilities.
 * Pure function with injectable RNG.
 */
export function rollWeather(
  biome: Biome,
  rng: () => number = Math.random,
): Weather {
  const weights = WEATHER_TABLES[biome];
  if (!weights) return Weather.Clear;

  let cumulative = 0;
  const roll = rng();

  for (const [weather, probability] of Object.entries(weights)) {
    cumulative += probability as number;
    if (roll < cumulative) return weather as Weather;
  }

  // Fallback (shouldn't reach here if probabilities sum to 1.0)
  return Weather.Clear;
}

/** Exported for testing — verify probability sums */
export { WEATHER_TABLES };
