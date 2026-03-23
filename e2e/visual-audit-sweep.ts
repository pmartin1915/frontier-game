/**
 * Frontier — Visual Audit Sweep
 *
 * Captures 36 strategically chosen screenshots across biome, time-of-day,
 * weather, and special feature combinations. Outputs labeled PNGs and a
 * manifest.json for downstream analysis by Claude or Gemini.
 *
 * Usage:
 *   npm run visual-audit
 *   npx tsx e2e/visual-audit-sweep.ts
 *
 * Requires: dev server running at http://localhost:3000
 */

import { chromium, type Page } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GAME_URL = 'http://localhost:3000';
const OUTPUT_DIR = resolve(__dirname, '../ai/visual-audit');
const SCREENSHOT_DIR = join(OUTPUT_DIR, 'screenshots');
const VIEWPORT = { width: 960, height: 600 };
const RENDER_WAIT = 1500; // ms after state change for Phaser re-render
const BOOT_WAIT = 4000;  // ms for initial Phaser preload

// ============================================================
// STATE CONFIGURATION (36 shots)
// ============================================================

interface SweepConfig {
  index: number;
  name: string;
  category: 'trail' | 'weather' | 'camp' | 'features';
  scene: 'TrailScene' | 'CampScene';
  biome: string;
  timeOfDay: string;
  weather: string;
  /** Extra store mutations for special feature shots. */
  specialSetup?: Record<string, unknown>;
  description: string;
}

const SWEEP_CONFIGS: SweepConfig[] = [
  // ── Category A: Trail biome × time-of-day (14 shots) ──
  { index: 1,  name: 'crossTimbers-morning',      category: 'trail', scene: 'TrailScene', biome: 'crossTimbers',   timeOfDay: 'morning',   weather: 'clear', description: 'Default biome, baseline reference' },
  { index: 2,  name: 'crossTimbers-night',         category: 'trail', scene: 'TrailScene', biome: 'crossTimbers',   timeOfDay: 'night',     weather: 'clear', description: 'Night sky + vegetation' },
  { index: 3,  name: 'stakedPlains-midday',        category: 'trail', scene: 'TrailScene', biome: 'stakedPlains',   timeOfDay: 'midday',    weather: 'clear', description: 'Flat terrain, harsh light' },
  { index: 4,  name: 'stakedPlains-sunset',        category: 'trail', scene: 'TrailScene', biome: 'stakedPlains',   timeOfDay: 'sunset',    weather: 'clear', description: 'Warm tones on flat terrain' },
  { index: 5,  name: 'desertApproach-dawn',        category: 'trail', scene: 'TrailScene', biome: 'desertApproach', timeOfDay: 'dawn',      weather: 'clear', description: 'Desert haze at dawn' },
  { index: 6,  name: 'desertApproach-midday',      category: 'trail', scene: 'TrailScene', biome: 'desertApproach', timeOfDay: 'midday',    weather: 'clear', description: 'Brightest desert light' },
  { index: 7,  name: 'pecosValley-morning',        category: 'trail', scene: 'TrailScene', biome: 'pecosValley',    timeOfDay: 'morning',   weather: 'clear', description: 'Canyon walls + river terrain' },
  { index: 8,  name: 'pecosValley-sunset',         category: 'trail', scene: 'TrailScene', biome: 'pecosValley',    timeOfDay: 'sunset',    weather: 'clear', description: 'Warm light in canyon' },
  { index: 9,  name: 'highDesert-afternoon',       category: 'trail', scene: 'TrailScene', biome: 'highDesert',     timeOfDay: 'afternoon', weather: 'clear', description: 'Mesa silhouettes' },
  { index: 10, name: 'highDesert-night',           category: 'trail', scene: 'TrailScene', biome: 'highDesert',     timeOfDay: 'night',     weather: 'clear', description: 'Sparse desert at night' },
  { index: 11, name: 'mountainPass-dawn',          category: 'trail', scene: 'TrailScene', biome: 'mountainPass',   timeOfDay: 'dawn',      weather: 'clear', description: 'Mountain silhouettes at dawn' },
  { index: 12, name: 'mountainPass-midday',        category: 'trail', scene: 'TrailScene', biome: 'mountainPass',   timeOfDay: 'midday',    weather: 'clear', description: 'Mountain clarity' },
  { index: 13, name: 'coloradoPlains-afternoon',   category: 'trail', scene: 'TrailScene', biome: 'coloradoPlains', timeOfDay: 'afternoon', weather: 'clear', description: 'Rolling hills, lush vegetation' },
  { index: 14, name: 'coloradoPlains-dawn',        category: 'trail', scene: 'TrailScene', biome: 'coloradoPlains', timeOfDay: 'dawn',      weather: 'clear', description: 'Transition biome at dawn' },

  // ── Category B: Weather overlays (7 shots) ──
  { index: 15, name: 'rain-crossTimbers-morning',       category: 'weather', scene: 'TrailScene', biome: 'crossTimbers',   timeOfDay: 'morning',   weather: 'rain',     description: 'Rain streaks against forest' },
  { index: 16, name: 'storm-stakedPlains-afternoon',    category: 'weather', scene: 'TrailScene', biome: 'stakedPlains',   timeOfDay: 'afternoon', weather: 'storm',    description: 'Lightning + heavy rain on open plains' },
  { index: 17, name: 'snow-mountainPass-dawn',          category: 'weather', scene: 'TrailScene', biome: 'mountainPass',   timeOfDay: 'dawn',      weather: 'snow',     description: 'Snow at altitude with dawn' },
  { index: 18, name: 'dust-highDesert-midday',          category: 'weather', scene: 'TrailScene', biome: 'highDesert',     timeOfDay: 'midday',    weather: 'dust',     description: 'Dust storm in desert' },
  { index: 19, name: 'heatwave-desertApproach-midday',  category: 'weather', scene: 'TrailScene', biome: 'desertApproach', timeOfDay: 'midday',    weather: 'heatwave', description: 'Shimmer in desert heat' },
  { index: 20, name: 'overcast-coloradoPlains-morning', category: 'weather', scene: 'TrailScene', biome: 'coloradoPlains', timeOfDay: 'morning',   weather: 'overcast', description: 'Overcast on lush terrain' },
  { index: 21, name: 'clear-pecosValley-afternoon',     category: 'weather', scene: 'TrailScene', biome: 'pecosValley',    timeOfDay: 'afternoon', weather: 'clear',    description: 'Clear weather baseline' },

  // ── Category C: CampScene (5 shots) ──
  { index: 22, name: 'camp-crossTimbers',   category: 'camp', scene: 'CampScene', biome: 'crossTimbers',   timeOfDay: 'night', weather: 'clear', description: 'Camp with fireflies (warm biome)' },
  { index: 23, name: 'camp-coloradoPlains', category: 'camp', scene: 'CampScene', biome: 'coloradoPlains', timeOfDay: 'night', weather: 'clear', description: 'Camp with fireflies (lush biome)' },
  { index: 24, name: 'camp-highDesert',     category: 'camp', scene: 'CampScene', biome: 'highDesert',     timeOfDay: 'night', weather: 'clear', description: 'Camp without fireflies (desert)' },
  { index: 25, name: 'camp-mountainPass',   category: 'camp', scene: 'CampScene', biome: 'mountainPass',   timeOfDay: 'night', weather: 'clear', description: 'Camp without fireflies (mountain)' },
  { index: 26, name: 'camp-pecosValley',    category: 'camp', scene: 'CampScene', biome: 'pecosValley',    timeOfDay: 'night', weather: 'clear', description: 'Camp with fireflies (canyon)' },

  // ── Category D: Special features (10 shots) ──
  { index: 27, name: 'clouds-overcast',     category: 'features', scene: 'TrailScene', biome: 'crossTimbers',   timeOfDay: 'morning',   weather: 'overcast', description: 'Dense cloud layer' },
  { index: 28, name: 'clouds-storm',        category: 'features', scene: 'TrailScene', biome: 'stakedPlains',   timeOfDay: 'afternoon', weather: 'storm',    description: 'Dark storm clouds' },
  { index: 29, name: 'clouds-clear',        category: 'features', scene: 'TrailScene', biome: 'desertApproach', timeOfDay: 'midday',    weather: 'clear',    description: 'Sparse clear-sky clouds' },
  { index: 30, name: 'clouds-night',        category: 'features', scene: 'TrailScene', biome: 'mountainPass',   timeOfDay: 'night',     weather: 'clear',    description: 'Clouds invisible at night' },
  { index: 31, name: 'campfire-trail',      category: 'features', scene: 'TrailScene', biome: 'crossTimbers',   timeOfDay: 'sunset',    weather: 'clear',    description: 'Trail campfire with embers + glow',
    specialSetup: { _command: { type: 'showCampfire', show: true } } },
  { index: 32, name: 'degradation',         category: 'features', scene: 'TrailScene', biome: 'stakedPlains',   timeOfDay: 'morning',   weather: 'clear',    description: 'Equipment degradation tint',
    specialSetup: { _equipmentDurability: 15 } },
  { index: 33, name: 'wagon-visible',       category: 'features', scene: 'TrailScene', biome: 'crossTimbers',   timeOfDay: 'morning',   weather: 'clear',    description: 'Wagon in party lineup',
    specialSetup: { _wagonVisible: true } },
  { index: 34, name: 'cat-visible',         category: 'features', scene: 'TrailScene', biome: 'crossTimbers',   timeOfDay: 'morning',   weather: 'clear',    description: 'Cat pet in party',
    specialSetup: { _catVisible: true } },
  { index: 35, name: 'full-party',          category: 'features', scene: 'TrailScene', biome: 'coloradoPlains', timeOfDay: 'afternoon', weather: 'clear',    description: 'All 3 companions active' },
  { index: 36, name: 'dawn-atmosphere',     category: 'features', scene: 'TrailScene', biome: 'crossTimbers',   timeOfDay: 'dawn',      weather: 'clear',    description: 'Dawn horizon blend + haze' },
];

// ============================================================
// HELPERS
// ============================================================

async function waitForServer(): Promise<void> {
  const maxRetries = 15;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(GAME_URL);
      if (resp.ok) return;
    } catch { /* retry */ }
    console.log(`  Waiting for dev server... (${i + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Dev server not available at ${GAME_URL} after ${maxRetries} retries`);
}

async function bootGame(page: Page): Promise<void> {
  await page.goto(GAME_URL);
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(BOOT_WAIT);
}

async function setWorldState(page: Page, biome: string, timeOfDay: string): Promise<void> {
  await page.evaluate(
    ([b, t]) => {
      const f = (window as unknown as Record<string, { setState: (u: unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
      if (!f) return;
      const s = f.getState();
      f.setState({ ...(s as object), world: { ...(s.world as object), biome: b, timeOfDay: t } });
    },
    [biome, timeOfDay],
  );
  await page.waitForTimeout(RENDER_WAIT);
}

async function setWeather(page: Page, weather: string): Promise<void> {
  await page.evaluate(
    (w) => {
      const f = (window as unknown as Record<string, { setState: (u: unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
      if (!f) return;
      const s = f.getState();
      f.setState({ ...(s as object), world: { ...(s.world as object), weather: w } });
    },
    weather,
  );
  await page.waitForTimeout(RENDER_WAIT);
}

async function changeScene(page: Page, scene: string): Promise<void> {
  await page.evaluate(
    (sc) => {
      const f = (window as unknown as Record<string, { setState: (u: unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
      if (!f) return;
      const s = f.getState();
      const queue = (s.commandQueue as unknown[]) || [];
      f.setState({ ...(s as object), commandQueue: [...queue, { type: 'changeScene', scene: sc }] });
    },
    scene,
  );
  await page.waitForTimeout(3000); // Scene transition + creation
}

async function applySpecialSetup(page: Page, setup: Record<string, unknown>): Promise<void> {
  if (setup._command) {
    await page.evaluate(
      (cmd) => {
        const f = (window as unknown as Record<string, { setState: (u: unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
        if (!f) return;
        const s = f.getState();
        const queue = (s.commandQueue as unknown[]) || [];
        f.setState({ ...(s as object), commandQueue: [...queue, cmd] });
      },
      setup._command,
    );
    await page.waitForTimeout(RENDER_WAIT);
  }

  if (setup._equipmentDurability !== undefined) {
    await page.evaluate(
      (dur) => {
        const f = (window as unknown as Record<string, { setState: (u: unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
        if (!f) return;
        const s = f.getState();
        const player = s.player as Record<string, unknown>;
        const equipment = (player.equipment as Array<Record<string, unknown>>).map((e) => ({ ...e, durability: dur }));
        f.setState({ ...(s as object), player: { ...player, equipment } });
      },
      setup._equipmentDurability,
    );
    await page.waitForTimeout(RENDER_WAIT);
  }

  if (setup._wagonVisible) {
    await page.evaluate(() => {
      const f = (window as unknown as Record<string, { setState: (u: unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
      if (!f) return;
      const s = f.getState();
      const journey = s.journey as Record<string, unknown>;
      f.setState({ ...(s as object), journey: { ...journey, transport: 'wagon' } });
    });
    await page.waitForTimeout(RENDER_WAIT);
  }

  if (setup._catVisible) {
    await page.evaluate(() => {
      const f = (window as unknown as Record<string, { setState: (u: unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
      if (!f) return;
      const s = f.getState();
      f.setState({ ...(s as object), campPet: { adopted: true, lost: false, name: 'Whiskers' } });
    });
    await page.waitForTimeout(RENDER_WAIT);
  }
}

// ============================================================
// MAIN
// ============================================================

interface ManifestEntry {
  index: number;
  file: string;
  name: string;
  category: string;
  scene: string;
  biome: string;
  timeOfDay: string;
  weather: string;
  description: string;
}

async function main() {
  const startTime = Date.now();
  console.log('Frontier Visual Audit Sweep');
  console.log('===========================\n');

  // Ensure dev server is running
  await waitForServer();

  // Create output directories
  for (const sub of ['trail', 'weather', 'camp', 'features']) {
    mkdirSync(join(SCREENSHOT_DIR, sub), { recursive: true });
  }

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const manifest: ManifestEntry[] = [];
  let currentScene = 'TrailScene';

  try {
    await bootGame(page);
    console.log('Game booted.\n');

    for (const config of SWEEP_CONFIGS) {
      const paddedIdx = String(config.index).padStart(2, '0');
      const filename = `${paddedIdx}-${config.name}.png`;
      const relPath = `${config.category}/${filename}`;
      const fullPath = join(SCREENSHOT_DIR, relPath);

      process.stdout.write(`  [${paddedIdx}/36] ${config.name}...`);

      // CampScene reads biome only on create(), so for each camp shot:
      // return to TrailScene → set biome → switch to CampScene
      if (config.scene === 'CampScene') {
        if (currentScene !== 'TrailScene') {
          await changeScene(page, 'trail');
          currentScene = 'TrailScene';
        }
        // Set world state while in TrailScene (safe)
        await setWorldState(page, config.biome, config.timeOfDay);
        if (config.weather !== 'clear') {
          await setWeather(page, config.weather);
        }
        // Now switch to CampScene
        await changeScene(page, 'camp');
        currentScene = 'CampScene';
      } else {
        // TrailScene shot
        if (currentScene !== 'TrailScene') {
          await changeScene(page, 'trail');
          currentScene = 'TrailScene';
        }
        await setWorldState(page, config.biome, config.timeOfDay);
        if (config.weather !== 'clear') {
          await setWeather(page, config.weather);
        }
      }

      // Apply special setup if any
      if (config.specialSetup) {
        await applySpecialSetup(page, config.specialSetup);
      }

      // Capture canvas screenshot
      const canvas = page.locator('canvas');
      await canvas.screenshot({ path: fullPath });

      manifest.push({
        index: config.index,
        file: relPath,
        name: config.name,
        category: config.category,
        scene: config.scene,
        biome: config.biome,
        timeOfDay: config.timeOfDay,
        weather: config.weather,
        description: config.description,
      });

      console.log(' OK');

      // Reset special setups for next shot (return to TrailScene if needed)
      if (config.specialSetup && config.index < SWEEP_CONFIGS.length) {
        const next = SWEEP_CONFIGS[config.index]; // next config (0-indexed = current index)
        if (next && next.scene === 'TrailScene' && currentScene === 'CampScene') {
          await changeScene(page, 'trail');
          currentScene = 'TrailScene';
        }
      }
    }
  } finally {
    await browser.close();
  }

  const duration = Date.now() - startTime;

  // Write manifest
  const manifestData = {
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    screenshots_captured: manifest.length,
    screenshots_expected: SWEEP_CONFIGS.length,
    viewport: VIEWPORT,
    screenshots: manifest,
  };

  writeFileSync(
    join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifestData, null, 2),
  );

  console.log(`\n===========================`);
  console.log(`Sweep complete: ${manifest.length}/${SWEEP_CONFIGS.length} screenshots`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Manifest: ${join(OUTPUT_DIR, 'manifest.json')}`);
}

main().catch((err) => {
  console.error('Sweep failed:', err.message);
  process.exit(1);
});
