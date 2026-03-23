import { describe, it, expect } from 'vitest';
import { getStrategy } from '@/simulator/strategies';
import type { Strategy } from '@/simulator/strategies';
import { createInitialState } from '@/simulator/initial-state';
import { createSeededRng } from '@/simulator/rng';
import { Pace, DiscretionaryAction } from '@/types/game-state';
import type { GameState } from '@/types/game-state';
import { EncounterType } from '@/types/encounters';
import type { Encounter } from '@/types/encounters';
import { CampActivity } from '@/types/camp';

// ============================================================
// TEST FIXTURES
// ============================================================

function makeEncounter(choices: { id: string; available: boolean }[]): Encounter {
  return {
    id: 'test_enc_day1',
    type: EncounterType.Trail,
    name: 'Test Encounter',
    description: 'A test encounter',
    trigger: { type: 'distance', condition: 'test' },
    choices: choices.map((c) => ({
      id: c.id,
      label: c.id,
      description: `Choice ${c.id}`,
      available: c.available,
    })),
    resolved: false,
    outcome: null,
  };
}

const PACES = Object.values(Pace);
const ACTIONS = Object.values(DiscretionaryAction);
const STRATEGIES: Array<{ name: string; strategy: Strategy }> = [
  { name: 'random', strategy: getStrategy('random') },
  { name: 'conservative', strategy: getStrategy('conservative') },
  { name: 'aggressive', strategy: getStrategy('aggressive') },
  { name: 'optimal', strategy: getStrategy('optimal') },
];

// ============================================================
// TESTS
// ============================================================

describe('all strategies', () => {
  for (const { name, strategy } of STRATEGIES) {
    describe(name, () => {
      it('decideDayActions returns valid pace and action', () => {
        const state = createInitialState();
        const rng = createSeededRng(42);
        const decisions = strategy.decideDayActions(state, rng);

        expect(PACES).toContain(decisions.pace);
        expect(ACTIONS).toContain(decisions.action);
        expect(typeof decisions.nightTravel).toBe('boolean');
      });

      it('decideEncounter picks from available choices', () => {
        const state = createInitialState();
        const rng = createSeededRng(42);
        const encounter = makeEncounter([
          { id: 'a', available: false },
          { id: 'b', available: true },
          { id: 'c', available: true },
        ]);

        const decision = strategy.decideEncounter(encounter, state, rng);
        const availableIds = encounter.choices
          .filter((c) => c.available)
          .map((c) => c.id);

        expect(availableIds).toContain(decision.choiceId);
        expect(typeof decision.acceptBargain).toBe('boolean');
      });

      it('decideEncounter handles single available choice', () => {
        const state = createInitialState();
        const rng = createSeededRng(42);
        const encounter = makeEncounter([
          { id: 'only', available: true },
        ]);

        const decision = strategy.decideEncounter(encounter, state, rng);
        expect(decision.choiceId).toBe('only');
      });

      it('decideCamp returns correct number of activities', () => {
        const state = createInitialState();
        const rng = createSeededRng(42);

        const evening = strategy.decideCamp(state, false, rng);
        expect(evening).toHaveLength(1);

        const fullDay = strategy.decideCamp(state, true, rng);
        expect(fullDay).toHaveLength(2);
      });

      it('decideCamp returns valid activities', () => {
        const state = createInitialState();
        const rng = createSeededRng(42);
        const activities = strategy.decideCamp(state, true, rng);

        const validActivities = Object.values(CampActivity);
        for (const a of activities) {
          expect(validActivities).toContain(a.activity);
        }
      });
    });
  }
});

describe('conservative strategy specifics', () => {
  const strategy = getStrategy('conservative');
  const rng = createSeededRng(42);

  it('uses Conservative pace when water is low', () => {
    const state: GameState = {
      ...createInitialState(),
      supplies: { ...createInitialState().supplies, water: 5 },
    };
    const decisions = strategy.decideDayActions(state, rng);
    expect(decisions.pace).toBe(Pace.Conservative);
  });

  it('hunts when food is low and has ammo', () => {
    const state: GameState = {
      ...createInitialState(),
      supplies: { ...createInitialState().supplies, food: 10, ammo: 5 },
      player: { ...createInitialState().player, fatigue: 20 },
    };
    const decisions = strategy.decideDayActions(state, rng);
    expect(decisions.action).toBe(DiscretionaryAction.Hunt);
  });

  it('never night travels', () => {
    const state = createInitialState();
    const decisions = strategy.decideDayActions(state, rng);
    expect(decisions.nightTravel).toBe(false);
  });
});

describe('aggressive strategy specifics', () => {
  const strategy = getStrategy('aggressive');
  const rng = createSeededRng(42);

  it('always uses HardPush pace', () => {
    const state = createInitialState();
    const decisions = strategy.decideDayActions(state, rng);
    expect(decisions.pace).toBe(Pace.HardPush);
  });

  it('declines bargains', () => {
    const state = createInitialState();
    const encounter = makeEncounter([{ id: 'a', available: true }]);
    const decision = strategy.decideEncounter(encounter, state, rng);
    expect(decision.acceptBargain).toBe(false);
  });
});

describe('optimal strategy specifics', () => {
  const strategy = getStrategy('optimal');
  const rng = createSeededRng(42);

  it('uses Conservative pace when health is critically low', () => {
    const state: GameState = {
      ...createInitialState(),
      player: { ...createInitialState().player, health: 20 },
    };
    const decisions = strategy.decideDayActions(state, rng);
    expect(decisions.pace).toBe(Pace.Conservative);
  });

  it('accepts bargains', () => {
    const state = createInitialState();
    const encounter = makeEncounter([{ id: 'a', available: true }]);
    const decision = strategy.decideEncounter(encounter, state, rng);
    expect(decision.acceptBargain).toBe(true);
  });

  it('night travels when close to waypoint and in good shape', () => {
    const state: GameState = {
      ...createInitialState(),
      world: { ...createInitialState().world, distanceToWaypoint: 20 },
      player: { ...createInitialState().player, fatigue: 10, morale: 60 },
    };
    const decisions = strategy.decideDayActions(state, rng);
    expect(decisions.nightTravel).toBe(true);
  });
});
