/**
 * Frontier — Headless Simulator Types
 *
 * Interfaces for batch simulation, metrics collection, and balance reporting.
 * No runtime dependencies — pure type definitions.
 */

import type { GameState } from '@/types/game-state';

// ============================================================
// CONFIGURATION
// ============================================================

export type StrategyName = 'random' | 'conservative' | 'aggressive' | 'optimal';

export interface SimulationConfig {
  /** Number of complete runs to execute */
  runs: number;
  /** Maximum days per run (failsafe) */
  maxDaysPerRun: number;
  /** Base seed for reproducible runs (each run gets baseSeed + runIndex) */
  baseSeed: number;
  /** Strategy for player decisions */
  strategy: StrategyName;
  /** Whether to log per-day detail */
  verbose: boolean;
  /** Output JSON file path (null = console only) */
  jsonOutput: string | null;
}

// ============================================================
// PER-DAY SNAPSHOT
// ============================================================

export interface DaySnapshot {
  day: number;
  totalMiles: number;
  health: number;
  horseHealth: number;
  morale: number;
  water: number;
  food: number;
  fatigue: number;
  equipmentMinDurability: number;
  weather: string;
  biome: string;
  waypoint: string;
  encounterId: string | null;
  dominantEvent: string;
  /** Player's pace choice this day */
  pace: string;
  /** Player's discretionary action this day */
  action: string;
  /** Camp activities selected this evening */
  campActivities: string[];
  /** Consecutive days without an encounter (resets to 0 on encounter day) */
  calmDayStreak: number;
}

// ============================================================
// ENCOUNTER LOG
// ============================================================

export interface EncounterLogEntry {
  day: number;
  encounterId: string;
  encounterName: string;
  choiceId: string;
  bargainOffered: boolean;
  bargainAccepted: boolean;
}

// ============================================================
// PER-RUN METRICS
// ============================================================

export interface RunMetrics {
  totalMiles: number;
  daysElapsed: number;
  encounterCount: number;
  waterDepletionEvents: number;
  foodDepletionEvents: number;
  equipmentBreakages: number;
  waypointsReached: string[];
  companionDesertions: number;
  bargainsUsed: number;
  finalHealth: number;
  finalHorseHealth: number;
  finalMorale: number;
}

// ============================================================
// PER-RUN RESULT
// ============================================================

export interface RunResult {
  seed: number;
  daysElapsed: number;
  survived: boolean;
  reachedDenver: boolean;
  causeOfDeath: string | null;
  finalState: GameState;
  snapshots: DaySnapshot[];
  encounterLog: EncounterLogEntry[];
  metrics: RunMetrics;
}

// ============================================================
// AGGREGATE METRICS
// ============================================================

export interface AggregateMetrics {
  // --- Endpoint metrics (existing) ---
  survivalRate: number;
  denverArrivalRate: number;
  avgDaysToComplete: number;
  medianDaysToComplete: number;
  avgEncountersPerRun: number;
  avgWaterDepletions: number;
  avgFoodDepletions: number;
  avgEquipmentBreakages: number;
  avgFinalHealth: number;
  avgFinalHorseHealth: number;
  horseAliveRate: number;
  encounterFrequency: number;
  avgBargainsUsed: number;

  // --- Journey metrics (new) ---
  /** Avg number of days per run where health dropped below 25 */
  avgCloseCallDays: number;
  /** Avg longest consecutive crisis streak (health<25 or water=0 or food=0) */
  avgMaxCrisisStreak: number;
  /** Avg longest consecutive health-only crisis streak (health<25) */
  avgMaxHealthCrisisStreak: number;
  /** Avg longest consecutive supply-only crisis streak (water=0 or food=0) */
  avgMaxSupplyCrisisStreak: number;
  /** Avg standard deviation of health across a run's snapshots */
  avgHealthVolatility: number;
  /** Shannon entropy of action distribution (0 = always same, ~2.3 = uniform across 5) */
  avgActionEntropy: number;
  /** Avg longest streak of days without any encounter */
  avgMaxCalmStreak: number;
  /** Fraction of camp slots spent on Repair across all runs */
  campRepairRate: number;
  /** Fraction of camp slots spent on Rest across all runs */
  campRestRate: number;
  /** Fraction of camp slots spent on Cook across all runs */
  campCookRate: number;
}

// ============================================================
// PASS/FAIL CHECKS
// ============================================================

export interface PassFailCheck {
  metric: string;
  actual: number;
  min: number;
  max: number;
  passed: boolean;
}

// ============================================================
// BATCH REPORT
// ============================================================

export interface BatchReport {
  config: SimulationConfig;
  timestamp: string;
  results: RunResult[];
  aggregate: AggregateMetrics;
  checks: PassFailCheck[];
  allPassed: boolean;
}
