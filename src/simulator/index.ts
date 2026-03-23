/**
 * Frontier — Headless Balance Simulator CLI
 *
 * Usage: npx tsx src/simulator/index.ts [--runs=50] [--days=100] [--seed=42] [--strategy=optimal] [--verbose] [--json=report.json]
 */

import { executeBatch } from './runner';
import { generateReport, formatReport } from './report';
import type { SimulationConfig, StrategyName } from './types';
import { writeFileSync } from 'node:fs';

// ============================================================
// ARGUMENT PARSING
// ============================================================

function parseArgs(argv: string[]): Partial<SimulationConfig> {
  const result: Record<string, string | boolean> = {};

  for (const arg of argv) {
    if (arg === '--verbose') {
      result.verbose = true;
      continue;
    }
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }

  return {
    runs: result.runs ? parseInt(result.runs as string, 10) : undefined,
    maxDaysPerRun: result.days ? parseInt(result.days as string, 10) : undefined,
    baseSeed: result.seed ? parseInt(result.seed as string, 10) : undefined,
    strategy: result.strategy as StrategyName | undefined,
    verbose: result.verbose as boolean | undefined,
    jsonOutput: result.json as string | undefined,
  };
}

// ============================================================
// MAIN
// ============================================================

const args = parseArgs(process.argv.slice(2));

const config: SimulationConfig = {
  runs: args.runs ?? 50,
  maxDaysPerRun: args.maxDaysPerRun ?? 100,
  baseSeed: args.baseSeed ?? 42,
  strategy: args.strategy ?? 'random',
  verbose: args.verbose ?? false,
  jsonOutput: args.jsonOutput ?? null,
};

console.log('Frontier Balance Simulator');
console.log(`Runs: ${config.runs} | Max days: ${config.maxDaysPerRun} | Seed: ${config.baseSeed} | Strategy: ${config.strategy}`);
console.log('');

const startTime = Date.now();
const results = executeBatch(config);
const elapsed = Date.now() - startTime;

const report = generateReport(config, results);
console.log(formatReport(report));
console.log(`\nCompleted in ${elapsed}ms`);

// Optional JSON output
if (config.jsonOutput) {
  const jsonData = JSON.stringify({
    ...report,
    // Omit full finalState from JSON to keep file size reasonable
    results: report.results.map((r) => ({
      ...r,
      finalState: undefined,
      snapshots: config.verbose ? r.snapshots : undefined,
    })),
  }, null, 2);
  writeFileSync(config.jsonOutput, jsonData);
  console.log(`JSON report written to ${config.jsonOutput}`);
}

// Exit code based on pass/fail
if (report.allPassed) {
  console.log('\n[PASS] All balance checks within target range.');
  process.exit(0);
} else {
  const failed = report.checks.filter((c) => !c.passed);
  console.log(`\n[FAIL] ${failed.length} balance check(s) outside target range:`);
  for (const f of failed) {
    console.log(`  ${f.metric}: ${f.actual.toFixed(2)} (target: ${f.min}–${f.max})`);
  }
  process.exit(1);
}
