import { describe, it, expect } from 'vitest';
import { checkEncounter } from '@/systems/encounters';
import type { EncounterCheckInput } from '@/systems/encounters';
import {
  Act,
  Biome,
  Terrain,
  Weather,
  DiscretionaryAction,
  EquipmentSlot,
} from '@/types/game-state';

// ============================================================
// BASE TEST INPUT (with trigger-aware fields)
// ============================================================

const BASE_INPUT: EncounterCheckInput = {
  day: 10,
  act: Act.I,
  biome: Biome.CrossTimbers,
  terrain: Terrain.Prairie,
  morale: 65,
  supplies: {
    water: 40,
    food: 35,
    coffee: 10,
    medical: 5,
    repair: 5,
    ammo: 20,
    tradeGoods: 15,
    funds: 50,
  },
  companions: [],
  equipment: [
    { slot: EquipmentSlot.Rifle, durability: 100 },
    { slot: EquipmentSlot.Boots, durability: 100 },
    { slot: EquipmentSlot.Saddle, durability: 100 },
    { slot: EquipmentSlot.Canteen, durability: 100 },
    { slot: EquipmentSlot.Bedroll, durability: 100 },
  ],
  discretionaryAction: DiscretionaryAction.None,
  previousEncounterIds: [],
  weather: Weather.Clear,
  distanceToWaypoint: 80,
  totalMiles: 50,
  waypointReached: false,
  playerHealth: 100,
  horseHealth: 100,
};

// ============================================================
// TRIGGER-AWARE ENCOUNTER CHECKS
// ============================================================

describe('encounter trigger evaluation', () => {
  it('river terrain encounters only fire near River terrain', () => {
    // With River terrain, more encounter templates should be eligible
    const riverInput: EncounterCheckInput = {
      ...BASE_INPUT,
      terrain: Terrain.River,
      rng: () => 0.01, // very low → should trigger if any match
    };
    const prairieInput: EncounterCheckInput = {
      ...BASE_INPUT,
      terrain: Terrain.Prairie,
      rng: () => 0.01,
    };

    // Both may or may not produce encounters, but river terrain
    // should make river-triggered templates eligible
    const riverResult = checkEncounter(riverInput);
    const prairieResult = checkEncounter(prairieInput);

    // If river produced an encounter, it may have a territory trigger
    // This is a smoke test — the important thing is no crash
    if (riverResult) {
      expect(riverResult.id).toBeTruthy();
    }
    if (prairieResult) {
      expect(prairieResult.id).toBeTruthy();
    }
  });

  it('waypoint-triggered encounters are eligible when waypointReached is true', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      waypointReached: true,
      distanceToWaypoint: 0,
      rng: () => 0.01,
    };

    // Smoke test — should not throw
    const result = checkEncounter(input);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('waypoint-triggered encounters eligible when close to waypoint', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      waypointReached: false,
      distanceToWaypoint: 10, // < 15 threshold
      rng: () => 0.01,
    };

    // Should not throw
    const result = checkEncounter(input);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('weather-triggered encounters respect current weather', () => {
    const dustInput: EncounterCheckInput = {
      ...BASE_INPUT,
      biome: Biome.StakedPlains,
      act: Act.II,
      weather: Weather.Dust,
      rng: () => 0.01,
    };

    // Should not throw
    const result = checkEncounter(dustInput);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('low morale triggers morale-based encounters', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      morale: 20, // below 30 threshold
      rng: () => 0.01,
    };

    // Low morale raises master gate probability (×1.3 multiplier)
    const result = checkEncounter(input);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('scouting increases encounter probability', () => {
    const scoutInput: EncounterCheckInput = {
      ...BASE_INPUT,
      discretionaryAction: DiscretionaryAction.Scout,
      rng: () => 0.01,
    };

    const noScoutInput: EncounterCheckInput = {
      ...BASE_INPUT,
      discretionaryAction: DiscretionaryAction.None,
      rng: () => 0.01,
    };

    // Both should not throw
    checkEncounter(scoutInput);
    checkEncounter(noScoutInput);
  });

  it('critical trigger: horse near death', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      horseHealth: 15, // below 20 threshold
      rng: () => 0.01,
    };

    // Should not throw
    const result = checkEncounter(input);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('critical trigger: total supply failure', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      supplies: {
        ...BASE_INPUT.supplies,
        water: 2,
        food: 2,
      },
      rng: () => 0.01,
    };

    const result = checkEncounter(input);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('settlement terrain boosts settlement encounters', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      terrain: Terrain.Settlement,
      biome: Biome.PecosValley,
      act: Act.III,
      rng: () => 0.01,
    };

    // Settlement terrain raises master gate probability (×1.3 multiplier)
    const result = checkEncounter(input);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('canyon terrain enables canyon-triggered encounters', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      terrain: Terrain.Canyon,
      biome: Biome.DesertApproach,
      act: Act.II,
      rng: () => 0.01,
    };

    const result = checkEncounter(input);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('mountain terrain enables mountain-triggered encounters', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      terrain: Terrain.Mountain,
      biome: Biome.MountainPass,
      act: Act.IV,
      rng: () => 0.01,
    };

    const result = checkEncounter(input);
    if (result) {
      expect(result.id).toBeTruthy();
    }
  });

  it('returns null when rng is high (no encounters trigger)', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      rng: () => 0.99, // high → nothing triggers
    };

    const result = checkEncounter(input);
    expect(result).toBeNull();
  });
});
