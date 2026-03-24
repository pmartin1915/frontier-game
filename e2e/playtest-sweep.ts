/**
 * Frontier — Automated Playtest Sweep
 *
 * Plays through N days of the game, capturing screenshots and state at every
 * meaningful transition (trail, encounter, camp, travel log). Outputs a
 * structured manifest + gallery for vision model review.
 *
 * Usage:
 *   npx tsx e2e/playtest-sweep.ts [--days=15]
 *
 * Output:
 *   ai/playtest/screenshots/   — PNG screenshots per day/phase
 *   ai/playtest/manifest.json  — structured session data for review
 *   ai/playtest/report-input.md — markdown summary ready for vision model
 *
 * Requires dev server running on port 3000 (npm run dev).
 */

import { chromium, type Page, type Browser } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GAME_URL = 'http://localhost:3000';
const VIEWPORT = { width: 960, height: 600 };
const OUT_DIR = join(process.cwd(), 'ai', 'playtest');
const SCREENSHOTS_DIR = join(OUT_DIR, 'screenshots');

const BOOT_WAIT = 5000;
const RENDER_WAIT = 1500;
const PHASE_POLL_MS = 300;
const PHASE_TIMEOUT_MS = 30000;
const DAY_SETTLE_MS = 800;

const DEFAULT_DAYS = 15;

// Parse --days=N from CLI args
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const MAX_DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : DEFAULT_DAYS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DaySnapshot {
  day: number;
  phase: string;
  biome: string;
  timeOfDay: string;
  weather: string;
  waypoint: string;
  pace: string;
  milesTotal: number;
  distanceToWaypoint: number;
  player: { health: number; morale: number; fatigue: number };
  horse: { health: number; fatigue: number; lameness: boolean };
  supplies: { water: number; food: number; coffee: number; ammo: number; medical: number };
  companions: Array<{ id: string; loyalty: number; status: string }>;
  campPet: { adopted: boolean; lost: boolean; name: string } | null;
  narratorEntry: string | null;
  narratorVoice: string | null;
  narratorFallback: boolean;
  encounter: string | null;
  events: string[];
  screenshots: string[];
}

interface PlaytestManifest {
  timestamp: string;
  durationMs: number;
  daysPlayed: number;
  daysRequested: number;
  gameEndReason: string | null;
  viewport: { width: number; height: number };
  consoleErrors: string[];
  days: DaySnapshot[];
  statTrajectory: {
    health: number[];
    morale: number[];
    water: number[];
    food: number[];
    miles: number[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getState(page: Page): Promise<Record<string, any>> {
  return page.evaluate(() => {
    const f = (window as any).__frontier;
    if (!f) return {};
    return JSON.parse(JSON.stringify(f.getState()));
  });
}

async function getPhase(page: Page): Promise<string> {
  const state = await getState(page);
  return (state.dailyCyclePhase as string) || 'unknown';
}

async function waitForPhase(
  page: Page,
  phases: string[],
  timeoutMs = PHASE_TIMEOUT_MS,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await getState(page);
    if (state.gameEndState) return 'gameEnd';
    if (phases.includes(state.dailyCyclePhase)) return state.dailyCyclePhase;
    await page.waitForTimeout(PHASE_POLL_MS);
  }
  return 'timeout';
}

async function captureScreenshot(
  page: Page,
  name: string,
): Promise<string> {
  const relPath = `screenshots/${name}.png`;
  const fullPath = join(OUT_DIR, relPath);
  // Canvas screenshot for the game view
  const canvas = page.locator('canvas');
  if (await canvas.isVisible()) {
    await canvas.screenshot({ path: fullPath });
  } else {
    await page.screenshot({ path: fullPath });
  }
  return relPath;
}

async function captureFullPage(
  page: Page,
  name: string,
): Promise<string> {
  const relPath = `screenshots/${name}.png`;
  const fullPath = join(OUT_DIR, relPath);
  await page.screenshot({ path: fullPath, fullPage: false });
  return relPath;
}

function extractDaySnapshot(state: Record<string, any>, day: number): Omit<DaySnapshot, 'screenshots'> {
  const world = state.world || {};
  const player = state.player || {};
  const horse = state.horse || {};
  const supplies = state.supplies || {};
  const journey = state.journey || {};
  const companions = (state.party?.companions || []).map((c: any) => ({
    id: c.id,
    loyalty: c.loyalty,
    status: c.status,
  }));
  const campPet = state.campPet?.adopted
    ? { adopted: true, lost: state.campPet.lost, name: state.campPet.name }
    : null;

  // Get the latest log entry for this day
  const logEntries = state.logEntries || [];
  const todayEntry = logEntries.filter((e: any) => e.day === day).pop();

  return {
    day,
    phase: state.dailyCyclePhase || 'unknown',
    biome: world.biome || 'unknown',
    timeOfDay: world.timeOfDay || 'unknown',
    weather: world.weather || 'unknown',
    waypoint: journey.waypoint || 'unknown',
    pace: journey.pace || 'unknown',
    milesTotal: world.totalMiles || 0,
    distanceToWaypoint: world.distanceToWaypoint || 0,
    player: {
      health: player.health ?? 100,
      morale: player.morale ?? 50,
      fatigue: player.fatigue ?? 0,
    },
    horse: {
      health: horse.health ?? 100,
      fatigue: horse.fatigue ?? 0,
      lameness: horse.lameness ?? false,
    },
    supplies: {
      water: supplies.water ?? 0,
      food: supplies.food ?? 0,
      coffee: supplies.coffee ?? 0,
      ammo: supplies.ammo ?? 0,
      medical: supplies.medical ?? 0,
    },
    companions,
    campPet,
    narratorEntry: todayEntry?.text || null,
    narratorVoice: todayEntry?.voice || null,
    narratorFallback: todayEntry?.fallback || false,
    encounter: state.pendingEncounter?.id || null,
    events: [],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Frontier Playtest Sweep — ${MAX_DAYS} days ===\n`);

  // Setup output directories
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const startTime = Date.now();
  const consoleErrors: string[] = [];
  const days: DaySnapshot[] = [];

  let browser: Browser | null = null;

  try {
    // Check if dev server is running
    try {
      const resp = await fetch(GAME_URL);
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
    } catch {
      console.error('Dev server not running on port 3000. Start it with: npm run dev');
      process.exit(1);
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    // Collect console errors and narrator warnings
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        if (text.includes('TypeError') || text.includes('Cannot') || text.includes('null')) {
          consoleErrors.push(text);
        }
      }
      // Capture narrator failures for debugging
      if (text.includes('Narrator') || text.includes('narrator') || text.includes('fallback')) {
        console.log(`  [browser] ${msg.type()}: ${text.substring(0, 200)}`);
      }
    });

    // Navigate and wait for boot
    console.log('Booting game...');
    await page.goto(GAME_URL);
    await page.locator('canvas').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(BOOT_WAIT);

    // Initialize game
    console.log('Initializing new game...');
    await page.evaluate(() => {
      const f = (window as any).__frontier;
      f.getState().initializeGame('Playtest', 'Dusty');
    });
    await page.waitForTimeout(1000);

    // Dismiss briefing overlay if present
    const phase = await getPhase(page);
    if (phase === 'briefing') {
      await page.evaluate(() => {
        const f = (window as any).__frontier;
        f.getState().dismissOverlay?.();
        f.setState({ dailyCyclePhase: 'idle' });
      });
      await page.waitForTimeout(500);
    }

    // Capture initial state
    const initScreenshots: string[] = [];
    initScreenshots.push(await captureFullPage(page, 'day-00-start-full'));
    initScreenshots.push(await captureScreenshot(page, 'day-00-start-canvas'));

    const initState = await getState(page);
    const day0 = { ...extractDaySnapshot(initState, 0), screenshots: initScreenshots };
    days.push(day0);
    console.log(`  Day 0: Game initialized — ${day0.biome}, ${day0.weather}`);

    // Enable auto-play
    await page.evaluate(() => {
      const f = (window as any).__frontier;
      f.getState().setAutoPlay(true);
    });

    // Play through days
    let lastDay = 0;
    let stuckCount = 0;
    let gameEnded = false;

    for (let tick = 0; tick < MAX_DAYS * 100; tick++) {
      const state = await getState(page);

      // Game end check
      if (state.gameEndState) {
        console.log(`\n  GAME ENDED: ${state.gameEndState.reason}`);
        const endScreenshots: string[] = [];
        endScreenshots.push(await captureFullPage(page, `day-${lastDay}-end-full`));
        endScreenshots.push(await captureScreenshot(page, `day-${lastDay}-end-canvas`));
        gameEnded = true;
        break;
      }

      const currentDay = state.journey?.daysElapsed || 0;
      const currentPhase = state.dailyCyclePhase || 'unknown';

      // New day detected
      if (currentDay > lastDay) {
        stuckCount = 0;

        // Wait for state to settle
        await page.waitForTimeout(DAY_SETTLE_MS);
        const settledState = await getState(page);

        const dayScreenshots: string[] = [];

        // Capture trail scene (canvas)
        dayScreenshots.push(await captureScreenshot(page, `day-${String(currentDay).padStart(2, '0')}-trail`));

        // Capture full page (includes travel log, HUD, map)
        dayScreenshots.push(await captureFullPage(page, `day-${String(currentDay).padStart(2, '0')}-full`));

        const snapshot = { ...extractDaySnapshot(settledState, currentDay), screenshots: dayScreenshots };
        days.push(snapshot);

        const hp = snapshot.player.health;
        const water = snapshot.supplies.water;
        const morale = snapshot.player.morale;
        const voice = snapshot.narratorVoice || 'fallback';
        const fb = snapshot.narratorFallback ? ' [FALLBACK]' : '';
        const logPreview = snapshot.narratorEntry
          ? snapshot.narratorEntry.substring(0, 60) + '...'
          : '(no entry)';

        console.log(
          `  Day ${currentDay}: HP=${hp} Water=${water.toFixed(1)} Morale=${morale} ` +
          `Voice=${voice}${fb} | ${snapshot.biome} ${snapshot.weather} | ${logPreview}`,
        );

        lastDay = currentDay;

        // Stop if we've played enough days
        if (currentDay >= MAX_DAYS) {
          console.log(`\n  Reached ${MAX_DAYS} days — stopping.`);
          break;
        }
      } else {
        stuckCount++;

        // Capture encounter if in event phase
        if (currentPhase === 'event' && state.pendingEncounter) {
          await captureFullPage(page, `day-${String(currentDay + 1).padStart(2, '0')}-encounter`);
        }

        // Capture camp scene
        if (currentPhase === 'camp') {
          await captureScreenshot(page, `day-${String(currentDay + 1).padStart(2, '0')}-camp`);
        }

        if (stuckCount > 80) {
          console.error(`  STUCK at day ${currentDay}, phase=${currentPhase}. Aborting.`);
          break;
        }
      }

      await page.waitForTimeout(PHASE_POLL_MS);
    }

    // Disable auto-play
    await page.evaluate(() => {
      const f = (window as any).__frontier;
      f.getState().setAutoPlay(false);
    });

    // Final captures
    console.log('\nCapturing final state...');
    await captureFullPage(page, 'final-full');
    await captureScreenshot(page, 'final-canvas');

    // Build stat trajectories
    const statTrajectory = {
      health: days.map((d) => d.player.health),
      morale: days.map((d) => d.player.morale),
      water: days.map((d) => d.supplies.water),
      food: days.map((d) => d.supplies.food),
      miles: days.map((d) => d.milesTotal),
    };

    // Build manifest
    const manifest: PlaytestManifest = {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      daysPlayed: lastDay,
      daysRequested: MAX_DAYS,
      gameEndReason: gameEnded ? 'death_or_victory' : null,
      viewport: VIEWPORT,
      consoleErrors,
      days,
      statTrajectory,
    };

    writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Build review input document
    const reviewMd = buildReviewDocument(manifest);
    writeFileSync(join(OUT_DIR, 'report-input.md'), reviewMd);

    console.log(`\n=== Sweep complete ===`);
    console.log(`  Days played: ${lastDay}`);
    console.log(`  Screenshots: ${countScreenshots(days)}`);
    console.log(`  Console errors: ${consoleErrors.length}`);
    console.log(`  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`  Output: ${OUT_DIR}`);
    console.log(`  Review doc: ai/playtest/report-input.md`);
    console.log();
  } finally {
    if (browser) await browser.close();
  }
}

function countScreenshots(days: DaySnapshot[]): number {
  return days.reduce((sum, d) => sum + d.screenshots.length, 0);
}

// ---------------------------------------------------------------------------
// Review document generator
// ---------------------------------------------------------------------------

function buildReviewDocument(m: PlaytestManifest): string {
  const lines: string[] = [];

  lines.push('# Frontier Playtest Review Input');
  lines.push('');
  lines.push(`**Date:** ${m.timestamp}`);
  lines.push(`**Days played:** ${m.daysPlayed} / ${m.daysRequested}`);
  lines.push(`**Duration:** ${(m.durationMs / 1000).toFixed(1)}s`);
  lines.push(`**Game end:** ${m.gameEndReason || 'Still alive'}`);
  lines.push('');

  // Stat trajectory summary
  lines.push('## Stat Trajectories');
  lines.push('');
  lines.push('| Day | Health | Morale | Water | Food | Miles |');
  lines.push('|-----|--------|--------|-------|------|-------|');
  for (const d of m.days) {
    lines.push(
      `| ${d.day} | ${d.player.health} | ${d.player.morale} | ${d.supplies.water.toFixed(1)} | ${d.supplies.food.toFixed(1)} | ${d.milesTotal.toFixed(0)} |`,
    );
  }
  lines.push('');

  // Narrator entries
  lines.push('## Narrator Entries');
  lines.push('');
  for (const d of m.days) {
    if (!d.narratorEntry) continue;
    const fb = d.narratorFallback ? ' **(FALLBACK)**' : '';
    lines.push(`### Day ${d.day} — ${d.narratorVoice || 'unknown'}${fb}`);
    lines.push(`*${d.biome}, ${d.weather}, ${d.timeOfDay}*`);
    lines.push('');
    lines.push(`> ${d.narratorEntry}`);
    lines.push('');
  }

  // Companion tracking
  const companionDays = m.days.filter((d) => d.companions.length > 0);
  if (companionDays.length > 0) {
    lines.push('## Companion Status');
    lines.push('');
    lines.push('| Day | Companion | Loyalty | Status |');
    lines.push('|-----|-----------|---------|--------|');
    for (const d of companionDays) {
      for (const c of d.companions) {
        lines.push(`| ${d.day} | ${c.id} | ${c.loyalty} | ${c.status} |`);
      }
    }
    lines.push('');
  }

  // Encounters
  const encounterDays = m.days.filter((d) => d.encounter);
  if (encounterDays.length > 0) {
    lines.push('## Encounters');
    lines.push('');
    for (const d of encounterDays) {
      lines.push(`- **Day ${d.day}:** ${d.encounter}`);
    }
    lines.push('');
  }

  // Console errors
  if (m.consoleErrors.length > 0) {
    lines.push('## Console Errors');
    lines.push('');
    for (const e of m.consoleErrors) {
      lines.push(`- \`${e.substring(0, 200)}\``);
    }
    lines.push('');
  }

  // Screenshot manifest
  lines.push('## Screenshots');
  lines.push('');
  for (const d of m.days) {
    for (const s of d.screenshots) {
      lines.push(`- Day ${d.day}: \`${s}\``);
    }
  }
  lines.push('');

  // Review rubric
  lines.push('## Review Rubric');
  lines.push('');
  lines.push('When reviewing the screenshots and data above, evaluate:');
  lines.push('');
  lines.push('### Visual Quality');
  lines.push('- [ ] Sky/ground gradients render correctly for each biome');
  lines.push('- [ ] Character silhouettes are recognizable and proportional');
  lines.push('- [ ] Weather effects visible and appropriate');
  lines.push('- [ ] Time-of-day lighting looks natural');
  lines.push('- [ ] No rendering glitches, black screens, or missing sprites');
  lines.push('- [ ] Camp scene has campfire, tent, props visible');
  lines.push('');
  lines.push('### Narrative Quality');
  lines.push('- [ ] Prose matches the assigned voice (Adams=spare, Irving=ornate, McMurtry=plain)');
  lines.push('- [ ] Period accuracy (1866, no anachronisms)');
  lines.push('- [ ] Entries reference actual game events (weather, terrain, encounters)');
  lines.push('- [ ] No narrator entries are generic or repetitive');
  lines.push('- [ ] Fallback entries are contextually appropriate');
  lines.push('');
  lines.push('### Game Balance');
  lines.push('- [ ] Health trajectory is reasonable (not too fast/slow decline)');
  lines.push('- [ ] Supply consumption is balanced');
  lines.push('- [ ] Morale tracks with events (drops on bad events, rises on good)');
  lines.push('- [ ] Horse health and fatigue are meaningful');
  lines.push('- [ ] Encounters have appropriate frequency and variety');
  lines.push('');
  lines.push('### UI/UX');
  lines.push('- [ ] Travel Log is readable with clear day headers');
  lines.push('- [ ] HUD stats are visible and understandable');
  lines.push('- [ ] Map shows correct position and fog of war');
  lines.push('- [ ] No overlapping UI elements or layout breaks');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error('Playtest sweep failed:', err);
  process.exit(1);
});
