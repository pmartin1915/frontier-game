/**
 * Frontier — Balance Report Generator
 *
 * Aggregates run results, computes metrics, and checks pass/fail
 * against LORE.md balance targets.
 */

import type {
  SimulationConfig,
  RunResult,
  BatchReport,
  AggregateMetrics,
  PassFailCheck,
} from './types';

// ============================================================
// BALANCE TARGETS (from LORE.md)
// ============================================================

export const BALANCE_TARGETS: Omit<PassFailCheck, 'actual' | 'passed'>[] = [
  { metric: 'survivalRate', min: 0.55, max: 0.95 },
  { metric: 'denverArrivalRate', min: 0.35, max: 0.92 },
  { metric: 'avgDaysToComplete', min: 28, max: 55 },
  { metric: 'avgWaterDepletions', min: 1, max: 5 },
  { metric: 'encounterFrequency', min: 0.15, max: 0.40 },
  { metric: 'avgEquipmentBreakages', min: 0, max: 2.5 },
  { metric: 'avgFinalHealth', min: 35, max: 85 },
  { metric: 'horseAliveRate', min: 0.75, max: 1.0 },
];

// ============================================================
// AGGREGATE
// ============================================================

export function aggregateResults(results: RunResult[]): AggregateMetrics {
  const n = results.length;
  if (n === 0) {
    return emptyAggregate();
  }

  const survivors = results.filter((r) => r.survived);
  const arrivals = results.filter((r) => r.reachedDenver);
  const completedDays = arrivals.map((r) => r.daysElapsed).sort((a, b) => a - b);

  const totalEncounters = sum(results.map((r) => r.metrics.encounterCount));
  const totalDays = sum(results.map((r) => r.daysElapsed));

  // --- Journey metrics ---
  const journeyMetrics = computeJourneyMetrics(results);

  return {
    survivalRate: survivors.length / n,
    denverArrivalRate: arrivals.length / n,
    avgDaysToComplete: completedDays.length > 0
      ? sum(completedDays) / completedDays.length
      : 0,
    medianDaysToComplete: completedDays.length > 0
      ? median(completedDays)
      : 0,
    avgEncountersPerRun: totalEncounters / n,
    avgWaterDepletions: sum(results.map((r) => r.metrics.waterDepletionEvents)) / n,
    avgFoodDepletions: sum(results.map((r) => r.metrics.foodDepletionEvents)) / n,
    avgEquipmentBreakages: sum(results.map((r) => r.metrics.equipmentBreakages)) / n,
    avgFinalHealth: sum(survivors.map((r) => r.metrics.finalHealth)) / Math.max(survivors.length, 1),
    avgFinalHorseHealth: sum(survivors.map((r) => r.metrics.finalHorseHealth)) / Math.max(survivors.length, 1),
    horseAliveRate: results.filter((r) => r.finalState.horse.health > 0).length / n,
    encounterFrequency: totalDays > 0 ? totalEncounters / totalDays : 0,
    avgBargainsUsed: sum(results.map((r) => r.metrics.bargainsUsed)) / n,
    ...journeyMetrics,
  };
}

// ============================================================
// PASS/FAIL
// ============================================================

export function runPassFailChecks(aggregate: AggregateMetrics): PassFailCheck[] {
  return BALANCE_TARGETS.map((target) => {
    const actual = aggregate[target.metric as keyof AggregateMetrics] ?? 0;
    return {
      ...target,
      actual,
      passed: actual >= target.min && actual <= target.max,
    };
  });
}

// ============================================================
// REPORT GENERATION
// ============================================================

export function generateReport(
  config: SimulationConfig,
  results: RunResult[],
): BatchReport {
  const aggregate = aggregateResults(results);
  const checks = runPassFailChecks(aggregate);

  return {
    config,
    timestamp: new Date().toISOString(),
    results,
    aggregate,
    checks,
    allPassed: checks.every((c) => c.passed),
  };
}

// ============================================================
// TEXT FORMATTING
// ============================================================

export function formatReport(report: BatchReport): string {
  const { config, aggregate, checks, results } = report;
  const lines: string[] = [];

  lines.push('='.repeat(65));
  lines.push('FRONTIER BALANCE REPORT');
  lines.push('='.repeat(65));
  lines.push(`Strategy: ${config.strategy} | Runs: ${config.runs} | Max Days: ${config.maxDaysPerRun} | Seed: ${config.baseSeed}`);
  lines.push(`Generated: ${report.timestamp}`);
  lines.push('-'.repeat(65));
  lines.push('');

  // Survival & Completion
  lines.push('SURVIVAL & COMPLETION');
  const survived = results.filter((r) => r.survived).length;
  const arrived = results.filter((r) => r.reachedDenver).length;
  lines.push(formatMetricLine('Survival Rate', `${pct(aggregate.survivalRate)}  (${survived}/${config.runs})`, findCheck(checks, 'survivalRate')));
  lines.push(formatMetricLine('Denver Arrival Rate', `${pct(aggregate.denverArrivalRate)}  (${arrived}/${config.runs})`, findCheck(checks, 'denverArrivalRate')));
  lines.push(formatMetricLine('Avg Days to Denver', fmtN(aggregate.avgDaysToComplete, 1), findCheck(checks, 'avgDaysToComplete')));
  lines.push(formatMetricLine('Median Days', fmtN(aggregate.medianDaysToComplete, 0)));
  lines.push('');

  // Supply Economy
  lines.push('SUPPLY ECONOMY');
  lines.push(formatMetricLine('Avg Water Depletions', fmtN(aggregate.avgWaterDepletions, 1), findCheck(checks, 'avgWaterDepletions')));
  lines.push(formatMetricLine('Avg Food Depletions', fmtN(aggregate.avgFoodDepletions, 1)));
  lines.push('');

  // Encounters
  lines.push('ENCOUNTERS');
  lines.push(formatMetricLine('Encounter Frequency', `${fmtN(aggregate.encounterFrequency, 2)}/day`, findCheck(checks, 'encounterFrequency')));
  lines.push(formatMetricLine('Avg per Run', fmtN(aggregate.avgEncountersPerRun, 1)));
  lines.push(formatMetricLine('Avg Bargains Used', fmtN(aggregate.avgBargainsUsed, 1)));
  lines.push('');

  // Equipment
  lines.push('EQUIPMENT');
  lines.push(formatMetricLine('Avg Breakages', fmtN(aggregate.avgEquipmentBreakages, 1), findCheck(checks, 'avgEquipmentBreakages')));
  lines.push('');

  // Health at arrival
  lines.push('HEALTH (survivors)');
  lines.push(formatMetricLine('Avg Player Health', fmtN(aggregate.avgFinalHealth, 1), findCheck(checks, 'avgFinalHealth')));
  lines.push(formatMetricLine('Avg Horse Health', fmtN(aggregate.avgFinalHorseHealth, 1)));
  lines.push(formatMetricLine('Horse Alive Rate', pct(aggregate.horseAliveRate), findCheck(checks, 'horseAliveRate')));
  lines.push('');

  // Cause of death
  const deaths = results.filter((r) => !r.survived);
  if (deaths.length > 0) {
    lines.push(`CAUSE OF DEATH (${deaths.length} deaths)`);
    const causes = new Map<string, number>();
    for (const d of deaths) {
      const cause = d.causeOfDeath ?? 'Unknown';
      causes.set(cause, (causes.get(cause) ?? 0) + 1);
    }
    for (const [cause, count] of causes.entries()) {
      lines.push(`  ${cause}: ${count} (${pct(count / deaths.length)})`);
    }
    lines.push('');
  }

  // Waypoint progression
  lines.push('WAYPOINT PROGRESSION');
  const WAYPOINTS = ['Middle Concho', 'Horsehead Crossing', 'Castle Gap', 'Fort Sumner', 'Santa Fe', 'Raton Pass', 'Trinidad', 'Denver'];
  for (const wp of WAYPOINTS) {
    const reached = results.filter((r) =>
      r.metrics.waypointsReached.includes(wp),
    ).length;
    lines.push(`  ${wp.padEnd(22)} ${pct(reached / config.runs)}`);
  }
  lines.push('');

  // Journey Quality
  lines.push('JOURNEY QUALITY (pacing & player feel)');
  lines.push(formatMetricLine('Avg Close-Call Days', fmtN(aggregate.avgCloseCallDays, 1)));
  lines.push(formatMetricLine('Avg Max Crisis Streak', `${fmtN(aggregate.avgMaxCrisisStreak, 1)} days`));
  lines.push(formatMetricLine('  Health Crisis Streak', `${fmtN(aggregate.avgMaxHealthCrisisStreak, 1)} days`));
  lines.push(formatMetricLine('  Supply Crisis Streak', `${fmtN(aggregate.avgMaxSupplyCrisisStreak, 1)} days`));
  lines.push(formatMetricLine('Avg Health Volatility', fmtN(aggregate.avgHealthVolatility, 1)));
  lines.push(formatMetricLine('Avg Action Entropy', fmtN(aggregate.avgActionEntropy, 2)));
  lines.push(formatMetricLine('Avg Max Calm Streak', `${fmtN(aggregate.avgMaxCalmStreak, 1)} days`));
  lines.push('');

  // Camp Activity Distribution
  lines.push('CAMP ACTIVITY DISTRIBUTION');
  lines.push(formatMetricLine('Repair', pct(aggregate.campRepairRate)));
  lines.push(formatMetricLine('Rest', pct(aggregate.campRestRate)));
  lines.push(formatMetricLine('Cook', pct(aggregate.campCookRate)));
  lines.push('');

  // Summary
  lines.push('-'.repeat(65));
  const passCount = checks.filter((c) => c.passed).length;
  lines.push(`PASS/FAIL SUMMARY: ${passCount}/${checks.length} checks passed`);
  lines.push('='.repeat(65));

  return lines.join('\n');
}

// ============================================================
// JOURNEY METRICS
// ============================================================

interface JourneyMetricsResult {
  avgCloseCallDays: number;
  avgMaxCrisisStreak: number;
  avgMaxHealthCrisisStreak: number;
  avgMaxSupplyCrisisStreak: number;
  avgHealthVolatility: number;
  avgActionEntropy: number;
  avgMaxCalmStreak: number;
  campRepairRate: number;
  campRestRate: number;
  campCookRate: number;
}

function computeJourneyMetrics(results: RunResult[]): JourneyMetricsResult {
  const n = results.length;
  if (n === 0) {
    return {
      avgCloseCallDays: 0, avgMaxCrisisStreak: 0,
      avgMaxHealthCrisisStreak: 0, avgMaxSupplyCrisisStreak: 0,
      avgHealthVolatility: 0,
      avgActionEntropy: 0, avgMaxCalmStreak: 0,
      campRepairRate: 0, campRestRate: 0, campCookRate: 0,
    };
  }

  let totalCloseCallDays = 0;
  let totalMaxCrisisStreak = 0;
  let totalMaxHealthCrisisStreak = 0;
  let totalMaxSupplyCrisisStreak = 0;
  let totalHealthVolatility = 0;
  let totalActionEntropy = 0;
  let totalMaxCalmStreak = 0;
  let totalCampSlots = 0;
  const campCounts = { rest: 0, cook: 0, repair: 0, companionChat: 0 };

  for (const run of results) {
    const snaps = run.snapshots;
    if (snaps.length === 0) continue;

    // Close-call days: health below 25
    totalCloseCallDays += snaps.filter((s) => s.health < 25 && s.health > 0).length;

    // Max crisis streak: consecutive days where health<25 OR water=0 OR food=0
    let crisisStreak = 0;
    let maxCrisis = 0;
    let healthCrisisStreak = 0;
    let maxHealthCrisis = 0;
    let supplyCrisisStreak = 0;
    let maxSupplyCrisis = 0;
    for (const s of snaps) {
      if (s.health < 25 || s.water <= 0 || s.food <= 0) {
        crisisStreak++;
        maxCrisis = Math.max(maxCrisis, crisisStreak);
      } else {
        crisisStreak = 0;
      }
      if (s.health < 25 && s.health > 0) {
        healthCrisisStreak++;
        maxHealthCrisis = Math.max(maxHealthCrisis, healthCrisisStreak);
      } else {
        healthCrisisStreak = 0;
      }
      if (s.water <= 0 || s.food <= 0) {
        supplyCrisisStreak++;
        maxSupplyCrisis = Math.max(maxSupplyCrisis, supplyCrisisStreak);
      } else {
        supplyCrisisStreak = 0;
      }
    }
    totalMaxCrisisStreak += maxCrisis;
    totalMaxHealthCrisisStreak += maxHealthCrisis;
    totalMaxSupplyCrisisStreak += maxSupplyCrisis;

    // Health volatility: standard deviation of health values
    totalHealthVolatility += stddev(snaps.map((s) => s.health));

    // Action entropy: Shannon entropy of discretionary action distribution
    totalActionEntropy += shannonEntropy(snaps.map((s) => s.action));

    // Max calm streak
    totalMaxCalmStreak += Math.max(0, ...snaps.map((s) => s.calmDayStreak));

    // Camp activity distribution
    for (const s of snaps) {
      for (const act of s.campActivities) {
        totalCampSlots++;
        if (act in campCounts) {
          campCounts[act as keyof typeof campCounts]++;
        }
      }
    }
  }

  return {
    avgCloseCallDays: totalCloseCallDays / n,
    avgMaxCrisisStreak: totalMaxCrisisStreak / n,
    avgMaxHealthCrisisStreak: totalMaxHealthCrisisStreak / n,
    avgMaxSupplyCrisisStreak: totalMaxSupplyCrisisStreak / n,
    avgHealthVolatility: totalHealthVolatility / n,
    avgActionEntropy: totalActionEntropy / n,
    avgMaxCalmStreak: totalMaxCalmStreak / n,
    campRepairRate: totalCampSlots > 0 ? campCounts.repair / totalCampSlots : 0,
    campRestRate: totalCampSlots > 0 ? campCounts.rest / totalCampSlots : 0,
    campCookRate: totalCampSlots > 0 ? campCounts.cook / totalCampSlots : 0,
  };
}

/**
 * Standard deviation of a number array.
 */
function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = sum(arr) / arr.length;
  const variance = sum(arr.map((x) => (x - mean) ** 2)) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Shannon entropy of a categorical distribution (in nats).
 * Higher = more diverse actions. 0 = always the same action.
 */
function shannonEntropy(values: string[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / values.length;
    if (p > 0) entropy -= p * Math.log(p);
  }
  return entropy;
}

// ============================================================
// HELPERS
// ============================================================

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtN(n: number, decimals: number): string {
  return n.toFixed(decimals);
}

function findCheck(checks: PassFailCheck[], metric: string): PassFailCheck | undefined {
  return checks.find((c) => c.metric === metric);
}

function formatMetricLine(
  label: string,
  value: string,
  check?: PassFailCheck,
): string {
  const padded = `  ${label}:`.padEnd(30) + value;
  if (!check) return padded;
  const range = `[${check.min}–${check.max}]`;
  const status = check.passed ? 'PASS' : 'FAIL';
  return `${padded.padEnd(50)} ${range.padEnd(14)} ${status}`;
}

function emptyAggregate(): AggregateMetrics {
  return {
    survivalRate: 0,
    denverArrivalRate: 0,
    avgDaysToComplete: 0,
    medianDaysToComplete: 0,
    avgEncountersPerRun: 0,
    avgWaterDepletions: 0,
    avgFoodDepletions: 0,
    avgEquipmentBreakages: 0,
    avgFinalHealth: 0,
    avgFinalHorseHealth: 0,
    horseAliveRate: 0,
    encounterFrequency: 0,
    avgBargainsUsed: 0,
    avgCloseCallDays: 0,
    avgMaxCrisisStreak: 0,
    avgMaxHealthCrisisStreak: 0,
    avgMaxSupplyCrisisStreak: 0,
    avgHealthVolatility: 0,
    avgActionEntropy: 0,
    avgMaxCalmStreak: 0,
    campRepairRate: 0,
    campRestRate: 0,
    campCookRate: 0,
  };
}
