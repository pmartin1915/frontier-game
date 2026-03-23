import { describe, it, expect } from 'vitest';
import { applyDayResults } from '@/simulator/state-applicator';
import { createInitialState } from '@/simulator/initial-state';
import type { DayResults } from '@/types/game-state';
import { Weather, Biome, Terrain, Act, Pace, DiscretionaryAction } from '@/types/game-state';

describe('applyDayResults', () => {
  it('applies world updates', () => {
    const state = createInitialState();
    const results: DayResults = {
      world: { totalMiles: 27, distanceToWaypoint: 103, weather: Weather.Dust },
      player: {},
      horse: {},
      supplies: {},
      party: {},
      journey: {},
    };

    const next = applyDayResults(state, results);

    expect(next.world.totalMiles).toBe(27);
    expect(next.world.distanceToWaypoint).toBe(103);
    expect(next.world.weather).toBe(Weather.Dust);
    // Unchanged fields preserved
    expect(next.world.biome).toBe(Biome.CrossTimbers);
    expect(next.world.temperature).toBe(78);
  });

  it('applies player health and fatigue', () => {
    const state = createInitialState();
    const results: DayResults = {
      world: {},
      player: { health: 85, fatigue: 15 },
      horse: {},
      supplies: {},
      party: {},
      journey: {},
    };

    const next = applyDayResults(state, results);

    expect(next.player.health).toBe(85);
    expect(next.player.fatigue).toBe(15);
    // Unchanged fields preserved
    expect(next.player.morale).toBe(65);
    expect(next.player.name).toBe('Martin');
  });

  it('applies supply deltas', () => {
    const state = createInitialState();
    const results: DayResults = {
      world: {},
      player: {},
      horse: {},
      supplies: { water: 37, food: 33, coffee: 9 },
      party: {},
      journey: {},
    };

    const next = applyDayResults(state, results);

    expect(next.supplies.water).toBe(37);
    expect(next.supplies.food).toBe(33);
    expect(next.supplies.coffee).toBe(9);
    // Unchanged
    expect(next.supplies.ammo).toBe(20);
  });

  it('applies journey state changes', () => {
    const state = createInitialState();
    const results: DayResults = {
      world: {},
      player: {},
      horse: {},
      supplies: {},
      party: {},
      journey: { daysElapsed: 1, pace: Pace.HardPush },
    };

    const next = applyDayResults(state, results);

    expect(next.journey.daysElapsed).toBe(1);
    expect(next.journey.pace).toBe(Pace.HardPush);
    expect(next.journey.waypoint).toBe('Middle Concho');
  });

  it('applies horse state changes', () => {
    const state = createInitialState();
    const results: DayResults = {
      world: {},
      player: {},
      horse: { fatigue: 10, thirst: 5 },
      supplies: {},
      party: {},
      journey: {},
    };

    const next = applyDayResults(state, results);

    expect(next.horse.fatigue).toBe(10);
    expect(next.horse.thirst).toBe(5);
    expect(next.horse.health).toBe(100);
  });

  it('applies carryCapacity when present', () => {
    const state = createInitialState();
    const results: DayResults = {
      world: {},
      player: {},
      horse: {},
      supplies: {},
      party: {},
      journey: {},
      carryCapacity: { water: 40, food: 30, transport: 'packHorse' },
    };

    const next = applyDayResults(state, results);

    expect(next.carryCapacity.transport).toBe('packHorse');
    expect(next.carryCapacity.water).toBe(40);
  });

  it('preserves carryCapacity when not in results', () => {
    const state = createInitialState();
    const results: DayResults = {
      world: {},
      player: {},
      horse: {},
      supplies: {},
      party: {},
      journey: {},
    };

    const next = applyDayResults(state, results);

    expect(next.carryCapacity).toEqual(state.carryCapacity);
  });

  it('applies campPet when present', () => {
    const state = createInitialState();
    const results: DayResults = {
      world: {},
      player: {},
      horse: {},
      supplies: {},
      party: {},
      journey: {},
      campPet: { adopted: true, name: 'Scout', dayAdopted: 5 },
    };

    const next = applyDayResults(state, results);

    expect(next.campPet.adopted).toBe(true);
    expect(next.campPet.name).toBe('Scout');
    expect(next.campPet.dayAdopted).toBe(5);
    expect(next.campPet.lost).toBe(false); // preserved from original
  });

  it('does not mutate the original state', () => {
    const state = createInitialState();
    const originalHealth = state.player.health;
    const results: DayResults = {
      world: {},
      player: { health: 50 },
      horse: {},
      supplies: {},
      party: {},
      journey: {},
    };

    const next = applyDayResults(state, results);

    expect(state.player.health).toBe(originalHealth);
    expect(next.player.health).toBe(50);
    expect(next).not.toBe(state);
  });

  it('chains multiple applications correctly', () => {
    let state = createInitialState();

    // Day 1
    state = applyDayResults(state, {
      world: { totalMiles: 25 },
      player: { fatigue: 10 },
      horse: {},
      supplies: { water: 37 },
      party: {},
      journey: { daysElapsed: 1 },
    });

    // Day 2
    state = applyDayResults(state, {
      world: { totalMiles: 52 },
      player: { fatigue: 20 },
      horse: {},
      supplies: { water: 34 },
      party: {},
      journey: { daysElapsed: 2 },
    });

    expect(state.world.totalMiles).toBe(52);
    expect(state.player.fatigue).toBe(20);
    expect(state.supplies.water).toBe(34);
    expect(state.journey.daysElapsed).toBe(2);
  });
});
