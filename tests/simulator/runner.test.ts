import { describe, it, expect } from 'vitest';
import { executeRun, executeBatch } from '@/simulator/runner';
import { aggregateResults, runPassFailChecks } from '@/simulator/report';
import type { SimulationConfig } from '@/simulator/types';

const BASE_CONFIG: SimulationConfig = {
  runs: 1,
  maxDaysPerRun: 100,
  baseSeed: 42,
  strategy: 'random',
  verbose: false,
  jsonOutput: null,
};

describe('executeRun', () => {
  it('produces a valid RunResult', () => {
    const result = executeRun(BASE_CONFIG, 0);

    expect(result.seed).toBe(42);
    expect(result.daysElapsed).toBeGreaterThan(0);
    expect(typeof result.survived).toBe('boolean');
    expect(typeof result.reachedDenver).toBe('boolean');
    expect(result.snapshots.length).toBeGreaterThan(0);
    expect(result.metrics.daysElapsed).toBe(result.daysElapsed);
  });

  it('terminates within maxDaysPerRun', () => {
    const config: SimulationConfig = { ...BASE_CONFIG, maxDaysPerRun: 20 };
    const result = executeRun(config, 0);

    expect(result.daysElapsed).toBeLessThanOrEqual(20);
  });

  it('is reproducible with same seed', () => {
    const result1 = executeRun(BASE_CONFIG, 0);
    const result2 = executeRun(BASE_CONFIG, 0);

    expect(result1.daysElapsed).toBe(result2.daysElapsed);
    expect(result1.survived).toBe(result2.survived);
    expect(result1.reachedDenver).toBe(result2.reachedDenver);
    expect(result1.metrics.totalMiles).toBe(result2.metrics.totalMiles);
    expect(result1.metrics.encounterCount).toBe(result2.metrics.encounterCount);
  });

  it('produces different results with different seeds', () => {
    const result1 = executeRun(BASE_CONFIG, 0);
    const result2 = executeRun(BASE_CONFIG, 1);

    // Very unlikely to be identical with different seeds
    const sameResult =
      result1.daysElapsed === result2.daysElapsed &&
      result1.metrics.totalMiles === result2.metrics.totalMiles &&
      result1.metrics.encounterCount === result2.metrics.encounterCount;
    expect(sameResult).toBe(false);
  });

  it('tracks encounters in the log', () => {
    // Run enough days that encounters are likely
    const config: SimulationConfig = { ...BASE_CONFIG, maxDaysPerRun: 50 };
    const result = executeRun(config, 0);

    // encounter log entries should match metric
    expect(result.encounterLog.length).toBe(result.metrics.encounterCount);

    for (const entry of result.encounterLog) {
      expect(entry.encounterId).toBeTruthy();
      expect(entry.encounterName).toBeTruthy();
      expect(entry.choiceId).toBeTruthy();
      expect(entry.day).toBeGreaterThan(0);
    }
  });

  it('snapshots track daily state progression', () => {
    const result = executeRun(BASE_CONFIG, 0);

    // First snapshot should have day > 0 and totalMiles > 0
    const first = result.snapshots[0];
    expect(first.day).toBeGreaterThan(0);
    expect(first.totalMiles).toBeGreaterThan(0);

    // Miles should generally increase over time
    const last = result.snapshots[result.snapshots.length - 1];
    expect(last.totalMiles).toBeGreaterThanOrEqual(first.totalMiles);
  });
});

describe('executeBatch', () => {
  it('returns correct number of results', () => {
    const config: SimulationConfig = { ...BASE_CONFIG, runs: 5, maxDaysPerRun: 30 };
    const results = executeBatch(config);
    expect(results).toHaveLength(5);
  });

  it('each run has a unique seed', () => {
    const config: SimulationConfig = { ...BASE_CONFIG, runs: 3, maxDaysPerRun: 30 };
    const results = executeBatch(config);
    const seeds = results.map((r) => r.seed);
    expect(new Set(seeds).size).toBe(3);
  });
});

describe('all strategies produce valid runs', () => {
  const strategies = ['random', 'conservative', 'aggressive', 'optimal'] as const;

  for (const strategy of strategies) {
    it(`${strategy} strategy completes without error`, () => {
      const config: SimulationConfig = {
        ...BASE_CONFIG,
        strategy,
        maxDaysPerRun: 30,
      };
      const result = executeRun(config, 0);

      expect(result.daysElapsed).toBeGreaterThan(0);
      expect(result.snapshots.length).toBeGreaterThan(0);
      expect(result.metrics.totalMiles).toBeGreaterThan(0);
    });
  }
});

describe('aggregateResults', () => {
  it('computes correct survival rate', () => {
    const config: SimulationConfig = { ...BASE_CONFIG, runs: 10, maxDaysPerRun: 50 };
    const results = executeBatch(config);
    const aggregate = aggregateResults(results);

    const expectedRate = results.filter((r) => r.survived).length / 10;
    expect(aggregate.survivalRate).toBeCloseTo(expectedRate);
  });

  it('handles empty results', () => {
    const aggregate = aggregateResults([]);
    expect(aggregate.survivalRate).toBe(0);
    expect(aggregate.avgDaysToComplete).toBe(0);
  });
});

describe('passFailChecks', () => {
  it('produces correct number of checks', () => {
    const config: SimulationConfig = { ...BASE_CONFIG, runs: 5, maxDaysPerRun: 30 };
    const results = executeBatch(config);
    const aggregate = aggregateResults(results);
    const checks = runPassFailChecks(aggregate);

    expect(checks.length).toBe(8); // 8 balance targets including Denver arrival rate
    for (const check of checks) {
      expect(typeof check.actual).toBe('number');
      expect(typeof check.passed).toBe('boolean');
      expect(check.min).toBeLessThanOrEqual(check.max);
    }
  });
});
