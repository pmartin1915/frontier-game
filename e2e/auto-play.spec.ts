/**
 * Frontier — Auto-Play End-to-End Test
 *
 * Plays through 20 in-game days using the built-in auto-player,
 * validating state invariants and catching crashes.
 *
 * Usage: npx playwright test e2e/auto-play.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================
// HELPERS
// ============================================================

interface GameState {
  dailyCyclePhase: string;
  gameInitialized: boolean;
  autoPlay: boolean;
  gameEndState: { reason: string } | null;
  player: { health: number; morale: number; fatigue: number };
  horse: { health: number; fatigue: number; lameness: boolean };
  supplies: { water: number; food: number; coffee: number; ammo: number };
  journey: { daysElapsed: number; waypoint: string; pace: string };
}

async function getState(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const s = (window as unknown as Record<string, unknown>).__frontier as {
      getState: () => Record<string, unknown>;
    };
    const state = s.getState();
    return {
      dailyCyclePhase: state.dailyCyclePhase,
      gameInitialized: state.gameInitialized,
      autoPlay: state.autoPlay,
      gameEndState: state.gameEndState,
      player: state.player,
      horse: state.horse,
      supplies: state.supplies,
      journey: state.journey,
    };
  }) as Promise<GameState>;
}

async function waitForPhase(
  page: Page,
  phases: string[],
  timeoutMs = 30000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await getState(page);
    if (state.gameEndState !== null) return 'gameEnd';
    if (phases.includes(state.dailyCyclePhase)) return state.dailyCyclePhase;
    await page.waitForTimeout(300);
  }
  throw new Error(`Timeout waiting for phases [${phases.join(',')}] after ${timeoutMs}ms`);
}

// ============================================================
// TEST
// ============================================================

test.describe('Auto-play integration', () => {
  test('plays 20 days without crash or state violations', async ({ page }) => {
    test.setTimeout(300000); // 5 min max

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Boot
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(3000);

    // Initialize game
    await page.evaluate(() => {
      const f = (window as unknown as Record<string, unknown>).__frontier as {
        getState: () => Record<string, (...args: unknown[]) => unknown>;
      };
      f.getState().initializeGame('AutoTest', 'Scout');
    });
    await page.waitForTimeout(500);

    // Enable auto-play
    await page.evaluate(() => {
      const f = (window as unknown as Record<string, unknown>).__frontier as {
        getState: () => Record<string, (...args: unknown[]) => unknown>;
      };
      f.getState().setAutoPlay(true);
    });

    // Play through days
    const invariantViolations: string[] = [];
    let maxDays = 20;
    let lastDay = 0;
    let stuckCount = 0;

    for (let tick = 0; tick < 200; tick++) {
      const state = await getState(page);

      // Game ended (death or victory)
      if (state.gameEndState !== null) {
        console.log(`  Game ended: ${state.gameEndState.reason} on day ${state.journey.daysElapsed}`);
        break;
      }

      // Check day progression
      if (state.journey.daysElapsed > lastDay) {
        lastDay = state.journey.daysElapsed;
        stuckCount = 0;
        console.log(`  Day ${lastDay}: HP=${state.player.health} W=${state.supplies.water} F=${state.supplies.food} @ ${state.journey.waypoint}`);
      } else {
        stuckCount++;
      }

      // Soft-lock detection
      if (stuckCount > 40) {
        invariantViolations.push(`Soft-lock: stuck on day ${lastDay}, phase=${state.dailyCyclePhase} for 40+ polls`);
        break;
      }

      // Reached target days
      if (state.journey.daysElapsed >= maxDays) {
        console.log(`  Reached ${maxDays} days successfully`);
        break;
      }

      // State invariant checks
      if (state.player.health < 0) {
        invariantViolations.push(`Day ${lastDay}: negative health (${state.player.health})`);
      }
      if (state.supplies.water < 0) {
        invariantViolations.push(`Day ${lastDay}: negative water (${state.supplies.water})`);
      }
      if (state.supplies.food < 0) {
        invariantViolations.push(`Day ${lastDay}: negative food (${state.supplies.food})`);
      }

      // Canvas should never go black (check it's still visible)
      const canvasVisible = await page.locator('canvas').isVisible();
      if (!canvasVisible) {
        invariantViolations.push(`Day ${lastDay}: canvas not visible (black screen?)`);
        break;
      }

      await page.waitForTimeout(500);
    }

    // Assertions
    expect(lastDay, 'Game should progress past day 0').toBeGreaterThan(0);
    expect(invariantViolations, `Invariant violations: ${invariantViolations.join('; ')}`).toHaveLength(0);

    // Filter out non-critical console errors (asset warnings, etc.)
    const criticalErrors = errors.filter(
      (e) => e.includes('Cannot') || e.includes('TypeError') || e.includes('null'),
    );
    expect(criticalErrors, `Critical errors: ${criticalErrors.join('; ')}`).toHaveLength(0);
  });
});
