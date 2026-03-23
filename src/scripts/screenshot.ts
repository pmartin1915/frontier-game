/**
 * Frontier — Playwright Screenshot + State Reader
 *
 * Takes a screenshot of the running game and prints a JSON state summary
 * so AI agents (Claude, Cline) can "see" what's happening.
 *
 * Usage (game must be running at http://localhost:3000):
 *   npx tsx src/scripts/screenshot.ts
 *   npx tsx src/scripts/screenshot.ts --out=ai/screenshot.png
 *   npx tsx src/scripts/screenshot.ts --state-only
 *
 * Output:
 *   - ai/screenshot.png   (full-page screenshot)
 *   - Prints JSON game state to stdout
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const GAME_URL = 'http://localhost:3000';
const DEFAULT_OUT = resolve(__dirname, '../../ai/screenshot.png');

const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith('--out='));
const outFile = outArg ? resolve(outArg.split('=')[1]) : DEFAULT_OUT;
const stateOnly = args.includes('--state-only');

async function main() {
  // Try the agent state API first (no browser needed)
  const stateResp = await fetch(`${GAME_URL}/api/agent/state`).catch(() => null);
  if (stateResp?.ok) {
    const state = await stateResp.json();
    console.log('=== GAME STATE (from agent bridge) ===');
    console.log(JSON.stringify(state, null, 2));

    const summaryResp = await fetch(`${GAME_URL}/api/agent/summary`).catch(() => null);
    if (summaryResp?.ok) {
      const { summary } = await summaryResp.json() as { summary: string };
      console.log('\n=== SUMMARY ===');
      console.log(summary);
    }
  }

  if (stateOnly) return;

  // Take screenshot via Playwright
  console.log('\nConnecting to browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await page.goto(GAME_URL, { waitUntil: 'networkidle', timeout: 10_000 });

    // Also read live state from window.__frontier if available
    const liveState = await page.evaluate(() => {
      const frontier = (window as unknown as Record<string, unknown>).__frontier;
      if (!frontier || typeof (frontier as Record<string, unknown>).getState !== 'function') return null;
      const s = (frontier as { getState: () => Record<string, unknown> }).getState();
      return {
        phase: s.dailyCyclePhase,
        autoPlay: s.autoPlay,
        day: (s.journey as Record<string, unknown>)?.daysElapsed,
        health: (s.player as Record<string, unknown>)?.health,
        water: (s.supplies as Record<string, unknown>)?.water,
        food: (s.supplies as Record<string, unknown>)?.food,
      };
    });

    if (liveState) {
      console.log('\n=== LIVE BROWSER STATE ===');
      console.log(JSON.stringify(liveState, null, 2));
    }

    mkdirSync(resolve(outFile, '..'), { recursive: true });
    await page.screenshot({ path: outFile, fullPage: false });
    console.log(`\nScreenshot saved: ${outFile}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
