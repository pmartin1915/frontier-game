import { describe, it, expect } from 'vitest';
import { resolveEncounterHeadless } from '@/simulator/encounter-resolver';
import { createInitialState } from '@/simulator/initial-state';
import type { GameState, DayResults } from '@/types/game-state';
import { EncounterType } from '@/types/encounters';
import type { Encounter } from '@/types/encounters';
import type { EventRecord } from '@/types/narrative';
import { NarrativeEventType } from '@/types/narrative';
import { Biome, Act, TimeOfDay } from '@/types/game-state';

// ============================================================
// TEST FIXTURES
// ============================================================

function makeBaseEventRecord(): EventRecord {
  return {
    day: 1,
    act: Act.I,
    date: '1866-06-07',
    timeOfDay: TimeOfDay.Dawn,
    biome: Biome.CrossTimbers,
    dominantEvent: NarrativeEventType.RoutineTravel,
    events: [],
    supplyDeltas: { water: -3, food: -2, coffee: -1 },
    healthEvents: [],
    moraleChange: 0,
    companionEvents: [],
  };
}

function makeBaseDayResults(): DayResults {
  return {
    world: { totalMiles: 27 },
    player: { health: 95, fatigue: 10 },
    horse: { fatigue: 5 },
    supplies: { water: 37, food: 33, coffee: 9 },
    party: {},
    journey: { daysElapsed: 1 },
  };
}

function makeTrailEncounter(): Encounter {
  return {
    id: 'broken_wagon_day1',
    type: EncounterType.Trail,
    name: 'Broken Wagon',
    description: 'A wagon with a broken axle blocks the trail.',
    trigger: { type: 'distance', condition: 'crossTimbers' },
    choices: [
      { id: 'help', label: 'Help', description: 'Help fix the wagon', available: true },
      { id: 'ignore', label: 'Ignore', description: 'Go around', available: true },
    ],
    resolved: false,
    outcome: null,
  };
}

// ============================================================
// TESTS
// ============================================================

describe('resolveEncounterHeadless', () => {
  it('produces an encounter log entry', () => {
    const state = createInitialState();
    const encounter = makeTrailEncounter();
    const rng = () => 0.5;

    const result = resolveEncounterHeadless(
      encounter, 'help', true,
      makeBaseEventRecord(), makeBaseDayResults(), state, rng,
    );

    expect(result.encounterLog.encounterId).toBe('broken_wagon_day1');
    expect(result.encounterLog.encounterName).toBe('Broken Wagon');
    expect(result.encounterLog.choiceId).toBe('help');
    expect(result.encounterLog.day).toBe(1);
  });

  it('adds encounter events to eventRecord', () => {
    const state = createInitialState();
    const encounter = makeTrailEncounter();
    const rng = () => 0.5;

    const result = resolveEncounterHeadless(
      encounter, 'ignore', true,
      makeBaseEventRecord(), makeBaseDayResults(), state, rng,
    );

    // Should have at least one event from resolution
    expect(result.eventRecord.events.length).toBeGreaterThan(0);
  });

  it('tracks encounter in journey history', () => {
    const state = createInitialState();
    const encounter = makeTrailEncounter();
    const rng = () => 0.5;

    const result = resolveEncounterHeadless(
      encounter, 'help', true,
      makeBaseEventRecord(), makeBaseDayResults(), state, rng,
    );

    const history = result.dayResults.journey.encounterHistory as string[];
    expect(history).toContain('broken_wagon_day1');
  });

  it('preserves existing dayResults fields', () => {
    const state = createInitialState();
    const encounter = makeTrailEncounter();
    const baseDayResults = makeBaseDayResults();
    const rng = () => 0.5;

    const result = resolveEncounterHeadless(
      encounter, 'ignore', true,
      makeBaseEventRecord(), baseDayResults, state, rng,
    );

    // World, journey base fields should be preserved
    expect(result.dayResults.world.totalMiles).toBe(27);
    expect(result.dayResults.journey.daysElapsed).toBe(1);
  });

  it('handles encounter with no matching outcome gracefully', () => {
    const state = createInitialState();
    const encounter: Encounter = {
      id: 'nonexistent_day1',
      type: EncounterType.Trail,
      name: 'Ghost Encounter',
      description: 'An encounter with no template match.',
      trigger: { type: 'distance', condition: 'test' },
      choices: [
        { id: 'proceed', label: 'Proceed', description: 'Move on', available: true },
      ],
      resolved: false,
      outcome: null,
    };
    const rng = () => 0.5;

    // Should not throw — resolveEncounter has a fallback outcome
    const result = resolveEncounterHeadless(
      encounter, 'proceed', true,
      makeBaseEventRecord(), makeBaseDayResults(), state, rng,
    );

    expect(result.encounterLog.encounterId).toBe('nonexistent_day1');
    expect(result.eventRecord.events.length).toBeGreaterThan(0);
  });
});
