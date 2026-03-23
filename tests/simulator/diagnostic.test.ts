import { describe, it } from 'vitest';
import { executeRun } from '@/simulator/runner';
import type { SimulationConfig } from '@/simulator/types';

const CONFIG: SimulationConfig = {
  runs: 1,
  maxDaysPerRun: 30,
  baseSeed: 42,
  strategy: 'optimal',
  verbose: false,
  jsonOutput: null,
};

describe('diagnostic trace', () => {
  it('dumps daily state for first 30 days', () => {
    const result = executeRun(CONFIG, 0);
    console.log('\n=== DAILY TRACE (optimal, seed 42) ===');
    console.log('Day | TotalMi | Waypoint           | Pace       | Action   | Health | Fatigue | Water | Food');
    console.log('----|---------|--------------------|-----------:|----------|--------|---------|-------|-----');
    for (const s of result.snapshots) {
      console.log(
        `${String(s.day).padStart(3)} | ` +
        `${s.totalMiles.toFixed(1).padStart(7)} | ` +
        `${s.waypoint.padEnd(18)} | ` +
        `${s.pace.padStart(10)} | ` +
        `${s.action.padEnd(8)} | ` +
        `${s.health.toFixed(0).padStart(6)} | ` +
        `${s.fatigue.toFixed(0).padStart(7)} | ` +
        `${s.water.toFixed(1).padStart(5)} | ` +
        `${s.food.toFixed(1).padStart(4)}`
      );
    }
    console.log(`\nFinal: ${result.daysElapsed} days, ${result.finalState.world.totalMiles.toFixed(1)} miles, survived=${result.survived}, denver=${result.reachedDenver}`);
    console.log(`Encounters: ${result.encounterLog.length}`);
    console.log(`Horse health: ${result.finalState.horse.health}, fatigue: ${result.finalState.horse.fatigue}, lameness: ${result.finalState.horse.lameness}`);
    console.log(`distanceToWaypoint: ${result.finalState.world.distanceToWaypoint}`);
    console.log(`terrain: ${result.finalState.world.terrain}`);
  });
});
