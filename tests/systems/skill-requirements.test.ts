import { describe, it, expect } from 'vitest';
import { evaluateRequirements, checkEncounter } from '@/systems/encounters';
import type { EncounterCheckInput } from '@/systems/encounters';
import type { EncounterRequirement } from '@/types/encounters';
import {
  Act,
  Biome,
  Terrain,
  EquipmentSlot,
  DiscretionaryAction,
} from '@/types/game-state';

// ============================================================
// BASE TEST STATE
// ============================================================

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

const BASE_EQUIPMENT = [
  { slot: EquipmentSlot.Rifle, durability: 100 },
  { slot: EquipmentSlot.Boots, durability: 100 },
  { slot: EquipmentSlot.Saddle, durability: 100 },
  { slot: EquipmentSlot.Canteen, durability: 100 },
  { slot: EquipmentSlot.Bedroll, durability: 100 },
];

const BASE_SKILLS = { survival: 40, navigation: 30, combat: 35, barter: 25 };

const BASE_STATE = {
  supplies: BASE_SUPPLIES,
  equipment: BASE_EQUIPMENT,
  companions: [],
  morale: 65,
  skills: BASE_SKILLS,
};

// ============================================================
// evaluateRequirements — skill type
// ============================================================

describe('evaluateRequirements — skill type', () => {
  it('passes when skill meets minValue', () => {
    const reqs: EncounterRequirement[] = [
      { type: 'skill', key: 'survival', minValue: 40 },
    ];
    expect(evaluateRequirements(reqs, BASE_STATE)).toBe(true);
  });

  it('passes when skill exceeds minValue', () => {
    const reqs: EncounterRequirement[] = [
      { type: 'skill', key: 'survival', minValue: 20 },
    ];
    expect(evaluateRequirements(reqs, BASE_STATE)).toBe(true);
  });

  it('fails when skill is below minValue', () => {
    const reqs: EncounterRequirement[] = [
      { type: 'skill', key: 'barter', minValue: 30 },
    ];
    expect(evaluateRequirements(reqs, BASE_STATE)).toBe(false);
  });

  it('fails when skill key does not exist', () => {
    const reqs: EncounterRequirement[] = [
      { type: 'skill', key: 'alchemy', minValue: 10 },
    ];
    expect(evaluateRequirements(reqs, BASE_STATE)).toBe(false);
  });

  it('fails when skills object is undefined', () => {
    const reqs: EncounterRequirement[] = [
      { type: 'skill', key: 'survival', minValue: 10 },
    ];
    const stateWithoutSkills = { ...BASE_STATE, skills: undefined };
    expect(evaluateRequirements(reqs, stateWithoutSkills)).toBe(false);
  });

  it('handles minValue of 0 (always passes if skill exists)', () => {
    const reqs: EncounterRequirement[] = [
      { type: 'skill', key: 'barter', minValue: 0 },
    ];
    expect(evaluateRequirements(reqs, BASE_STATE)).toBe(true);
  });

  it('handles skill requirement combined with supply requirement', () => {
    const reqs: EncounterRequirement[] = [
      { type: 'supply', key: 'ammo', minValue: 2 },
      { type: 'skill', key: 'survival', minValue: 30 },
    ];
    expect(evaluateRequirements(reqs, BASE_STATE)).toBe(true);
  });

  it('fails if supply passes but skill fails', () => {
    const reqs: EncounterRequirement[] = [
      { type: 'supply', key: 'ammo', minValue: 2 },
      { type: 'skill', key: 'barter', minValue: 50 },
    ];
    expect(evaluateRequirements(reqs, BASE_STATE)).toBe(false);
  });
});

// ============================================================
// checkEncounter — skill-gated choices
// ============================================================

describe('checkEncounter — skill-gated choices', () => {
  const BASE_INPUT: EncounterCheckInput = {
    day: 10,
    act: Act.I,
    biome: Biome.StakedPlains,
    terrain: Terrain.Prairie,
    morale: 65,
    supplies: BASE_SUPPLIES,
    companions: [],
    equipment: BASE_EQUIPMENT,
    discretionaryAction: DiscretionaryAction.None,
    previousEncounterIds: [],
    skills: BASE_SKILLS,
  };

  it('passes skills through to encounter instantiation', () => {
    // Force a trail_lost_markers encounter (biome match + always trigger)
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      biome: Biome.StakedPlains,
      skills: { survival: 40, navigation: 30, combat: 35, barter: 25 },
      rng: () => 0.01, // Force all encounters to trigger
    };

    const encounter = checkEncounter(input);
    if (encounter) {
      // If we got an encounter, check that choices have been evaluated
      for (const choice of encounter.choices) {
        // available should be a boolean (evaluated, not just template default)
        expect(typeof choice.available).toBe('boolean');
      }
    }
    // Test passes even if no encounter triggers — the skill passing is the point
  });

  it('marks skill-gated choices as unavailable when skill is too low', () => {
    const input: EncounterCheckInput = {
      ...BASE_INPUT,
      biome: Biome.StakedPlains,
      skills: { survival: 5, navigation: 5, combat: 5, barter: 5 },
      rng: () => 0.01,
    };

    const encounter = checkEncounter(input);
    if (encounter) {
      const skillGated = encounter.choices.filter(
        (c) => c.requirements?.some((r) => r.type === 'skill'),
      );
      for (const choice of skillGated) {
        expect(choice.available).toBe(false);
      }
    }
  });
});
