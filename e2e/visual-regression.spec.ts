/**
 * Frontier — Visual Regression Tests
 *
 * Captures baseline screenshots of the TrailScene and CampScene across
 * different biome + time-of-day combinations.
 *
 * First run: npx playwright test e2e/visual-regression.spec.ts --update-snapshots
 * Subsequent runs: npx playwright test e2e/visual-regression.spec.ts
 *
 * Requires a running dev server (started automatically via playwright.config.ts webServer).
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================
// HELPERS
// ============================================================

/** Boot the game, wait for canvas + Phaser to be ready. */
async function bootGame(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 });
  // Give Phaser time to finish preloading and render first frame
  await page.waitForTimeout(3000);

  const spriteErrors = errors.filter(
    (e) => e.includes('assets/') && (e.includes('404') || e.includes('Failed')),
  );
  if (spriteErrors.length > 0) {
    console.warn('Asset load errors:', spriteErrors.join(', '));
  }
}

/** Set biome and time-of-day via the Zustand store, then wait for Phaser to re-render. */
async function setWorldState(
  page: Page,
  biome: string,
  timeOfDay: string,
  waitMs = 800,
): Promise<void> {
  await page.evaluate(
    ([b, t]) => {
      const frontier = (window as unknown as Record<string, { setState: (fn: (s: unknown) => unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
      if (!frontier) return;
      const state = frontier.getState();
      frontier.setState({
        ...(state as object),
        world: {
          ...(state.world as object),
          biome: b,
          timeOfDay: t,
        },
      });
    },
    [biome, timeOfDay],
  );
  await page.waitForTimeout(waitMs);
}

/** Set weather via the Zustand store, then wait for Phaser to re-render. */
async function setWeather(
  page: Page,
  weather: string,
  waitMs = 1200,
): Promise<void> {
  await page.evaluate(
    (w) => {
      const frontier = (window as unknown as Record<string, { setState: (fn: (s: unknown) => unknown) => void; getState: () => Record<string, unknown> }>).__frontier;
      if (!frontier) return;
      const state = frontier.getState();
      frontier.setState({
        ...(state as object),
        world: {
          ...(state.world as object),
          weather: w,
        },
      });
    },
    weather,
  );
  await page.waitForTimeout(waitMs);
}

/** Take a screenshot of just the Phaser canvas element. */
async function screenshotCanvas(page: Page, name: string): Promise<void> {
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveScreenshot(`${name}.png`);
}

// ============================================================
// BOOT TESTS
// ============================================================

test.describe('Boot and asset loading', () => {
  test('game boots without asset errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(4000);

    const assetErrors = errors.filter(
      (e) => e.includes('assets/') && (e.includes('404') || e.includes('Failed')),
    );
    expect(assetErrors, `Asset errors: ${assetErrors.join(', ')}`).toHaveLength(0);
  });
});

// ============================================================
// TRAIL SCENE — TIME-OF-DAY PROGRESSION
// ============================================================

test.describe('TrailScene — time-of-day', () => {
  test.beforeEach(async ({ page }) => {
    await bootGame(page);
  });

  test('dawn — cross timbers', async ({ page }) => {
    await setWorldState(page, 'crossTimbers', 'dawn');
    await screenshotCanvas(page, 'trail-dawn-crossTimbers');
  });

  test('morning — cross timbers (default)', async ({ page }) => {
    await setWorldState(page, 'crossTimbers', 'morning');
    await screenshotCanvas(page, 'trail-morning-crossTimbers');
  });

  test('midday — staked plains', async ({ page }) => {
    await setWorldState(page, 'stakedPlains', 'midday');
    await screenshotCanvas(page, 'trail-midday-stakedPlains');
  });

  test('afternoon — desert approach', async ({ page }) => {
    await setWorldState(page, 'desertApproach', 'afternoon');
    await screenshotCanvas(page, 'trail-afternoon-desertApproach');
  });

  test('sunset — pecos valley', async ({ page }) => {
    await setWorldState(page, 'pecosValley', 'sunset');
    await screenshotCanvas(page, 'trail-sunset-pecosValley');
  });

  test('night — mountain pass', async ({ page }) => {
    await setWorldState(page, 'mountainPass', 'night');
    await screenshotCanvas(page, 'trail-night-mountainPass');
  });
});

// ============================================================
// TRAIL SCENE — BIOME SILHOUETTES
// ============================================================

test.describe('TrailScene — terrain silhouettes', () => {
  test.beforeEach(async ({ page }) => {
    await bootGame(page);
  });

  test('mesa silhouette — high desert, midday', async ({ page }) => {
    await setWorldState(page, 'highDesert', 'midday');
    await screenshotCanvas(page, 'terrain-mesa-highDesert');
  });

  test('mountain silhouette — mountain pass, morning', async ({ page }) => {
    await setWorldState(page, 'mountainPass', 'morning');
    await screenshotCanvas(page, 'terrain-mountains-mountainPass');
  });

  test('rolling hills — colorado plains, afternoon', async ({ page }) => {
    await setWorldState(page, 'coloradoPlains', 'afternoon');
    await screenshotCanvas(page, 'terrain-rolling-coloradoPlains');
  });

  test('canyon walls — pecos valley, morning', async ({ page }) => {
    await setWorldState(page, 'pecosValley', 'morning');
    await screenshotCanvas(page, 'terrain-canyon-pecosValley');
  });
});

// ============================================================
// ATMOSPHERE CONSISTENCY
// ============================================================

test.describe('Atmosphere — horizon and ground gradient', () => {
  test.beforeEach(async ({ page }) => {
    await bootGame(page);
  });

  test('horizon blend visible at dawn', async ({ page }) => {
    await setWorldState(page, 'desertApproach', 'dawn');
    await screenshotCanvas(page, 'atmosphere-horizon-dawn');
  });

  test('horizon blend at sunset (warmest)', async ({ page }) => {
    await setWorldState(page, 'pecosValley', 'sunset');
    await screenshotCanvas(page, 'atmosphere-horizon-sunset');
  });

  test('ground gradient depth — mountain pass, midday', async ({ page }) => {
    await setWorldState(page, 'mountainPass', 'midday');
    await screenshotCanvas(page, 'atmosphere-ground-mountainPass');
  });
});

// ============================================================
// TRAIL SCENE — WEATHER OVERLAYS
// ============================================================

test.describe('TrailScene — weather overlays', () => {
  test.beforeEach(async ({ page }) => {
    await bootGame(page);
  });

  test('rain — cross timbers, morning', async ({ page }) => {
    await setWorldState(page, 'crossTimbers', 'morning');
    await setWeather(page, 'rain');
    await screenshotCanvas(page, 'weather-rain-crossTimbers');
  });

  test('snow — mountain pass, dawn', async ({ page }) => {
    await setWorldState(page, 'mountainPass', 'dawn');
    await setWeather(page, 'snow');
    await screenshotCanvas(page, 'weather-snow-mountainPass');
  });

  test('dust storm — high desert, afternoon', async ({ page }) => {
    await setWorldState(page, 'highDesert', 'afternoon');
    await setWeather(page, 'dust');
    await screenshotCanvas(page, 'weather-dust-highDesert');
  });

  test('heatwave shimmer — desert approach, midday', async ({ page }) => {
    await setWorldState(page, 'desertApproach', 'midday');
    await setWeather(page, 'heatwave');
    await screenshotCanvas(page, 'weather-heatwave-desertApproach');
  });

  test('overcast — staked plains, morning', async ({ page }) => {
    await setWorldState(page, 'stakedPlains', 'morning');
    await setWeather(page, 'overcast');
    await screenshotCanvas(page, 'weather-overcast-stakedPlains');
  });
});
