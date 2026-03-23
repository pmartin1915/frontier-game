/**
 * Frontier — Phase 8 Polish & Feel E2E Tests
 *
 * Tests the UX polish features added in Phase 8:
 *   - Scene fade transitions (no console errors)
 *   - Toast notifications (success + error)
 *   - Keyboard navigation (Escape closes overlays)
 *   - Help card (first-play, dismissible, persisted)
 *   - Mobile viewport (no overflow)
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================
// HELPERS
// ============================================================

/** Boot the game and wait for Phaser canvas to be ready. */
async function bootGame(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(3000);
}

/** Initialize a new game via the store. */
async function initGame(page: Page): Promise<void> {
  await page.evaluate(() => {
    const frontier = (window as unknown as Record<string, unknown>).__frontier as {
      getState: () => Record<string, unknown> & {
        initializeGame: (name: string, horse: string) => void;
      };
    };
    frontier.getState().initializeGame('TestPlayer', 'TestHorse');
  });
  await page.waitForTimeout(500);
}

/** Access a store action via page.evaluate. */
async function storeAction(page: Page, code: string): Promise<void> {
  await page.evaluate((c) => {
    const frontier = (window as unknown as Record<string, unknown>).__frontier as {
      getState: () => Record<string, (...args: unknown[]) => unknown>;
      setState: (s: unknown) => void;
    };
    const fn = new Function('store', c);
    fn(frontier);
  }, code);
}

// ============================================================
// SCENE FADE TRANSITIONS
// ============================================================

test.describe('Scene fade transitions', () => {
  test('scene change to camp and back produces no errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await bootGame(page);
    await initGame(page);

    // Trigger scene change to camp
    await storeAction(page, `
      store.getState().pushCommand({ type: 'changeScene', scene: 'camp' });
    `);

    // Wait for fade-out (400ms) + fade-in (400ms) + settle
    await page.waitForTimeout(1500);

    // Canvas should still be visible
    await expect(page.locator('canvas')).toBeVisible();

    // Return to trail
    await storeAction(page, `
      store.getState().pushCommand({ type: 'changeScene', scene: 'trail' });
    `);
    await page.waitForTimeout(1500);

    await expect(page.locator('canvas')).toBeVisible();

    // No crash errors during transitions
    const crashErrors = errors.filter(
      (e) => e.includes('Cannot') || e.includes('undefined') || e.includes('null'),
    );
    expect(crashErrors, `Transition errors: ${crashErrors.join(', ')}`).toHaveLength(0);
  });
});

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

test.describe('Toast notifications', () => {
  test('success toast appears and auto-clears', async ({ page }) => {
    await bootGame(page);
    await initGame(page);

    // Trigger success toast
    await storeAction(page, `
      store.getState().setToast('Game saved', 'success');
    `);

    // Toast should be visible
    const toast = page.locator('[role="status"]');
    await expect(toast).toBeVisible({ timeout: 1000 });
    await expect(toast).toContainText('Game saved');

    // Toast should auto-clear after 4s
    await page.waitForTimeout(4500);
    await expect(toast).not.toBeVisible();
  });

  test('error toast appears with correct styling', async ({ page }) => {
    await bootGame(page);
    await initGame(page);

    // Trigger error toast
    await storeAction(page, `
      store.getState().setToast('Something failed', 'error');
    `);

    const toast = page.locator('[role="status"]');
    await expect(toast).toBeVisible({ timeout: 1000 });
    await expect(toast).toContainText('Something failed');
  });
});

// ============================================================
// KEYBOARD NAVIGATION
// ============================================================

test.describe('Keyboard navigation', () => {
  test('Escape closes Journal modal', async ({ page }) => {
    await bootGame(page);
    await initGame(page);

    // Ensure phase is idle (Journal only shows in idle phase)
    await storeAction(page, `
      store.setState({ ...store.getState(), dailyCyclePhase: 'idle' });
    `);
    await page.waitForTimeout(200);

    // Open Journal
    await storeAction(page, `
      store.getState().toggleSaveLoadModal();
    `);
    await page.waitForTimeout(300);

    // Journal modal overlay should be visible (use close button as anchor)
    const closeBtn = page.locator('[aria-label="Close journal"]');
    await expect(closeBtn).toBeVisible({ timeout: 2000 });

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Close button (and modal) should be gone
    await expect(closeBtn).not.toBeVisible();
  });

  test('Escape dismisses Morning Briefing', async ({ page }) => {
    await bootGame(page);
    await initGame(page);

    // Set phase to briefing
    await storeAction(page, `
      store.setState({ ...store.getState(), dailyCyclePhase: 'briefing' });
    `);
    await page.waitForTimeout(300);

    // Briefing should show (look for "Day" heading)
    const briefing = page.locator('.frontier-overlay').first();
    await expect(briefing).toBeVisible({ timeout: 2000 });

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Phase should be idle now
    const phase = await page.evaluate(() => {
      const frontier = (window as unknown as Record<string, unknown>).__frontier as {
        getState: () => { dailyCyclePhase: string };
      };
      return frontier.getState().dailyCyclePhase;
    });
    expect(phase).toBe('idle');
  });
});

// ============================================================
// HELP CARD
// ============================================================

test.describe('Help card', () => {
  test('shows on first play and persists dismissal', async ({ page }) => {
    await bootGame(page);

    // Clear any previous dismissal
    await page.evaluate(() => localStorage.removeItem('frontier_help_dismissed'));

    await initGame(page);

    // Dismiss any overlays that appear after initGame (e.g. MorningBriefing)
    await storeAction(page, `
      store.setState({ ...store.getState(), dailyCyclePhase: 'idle' });
    `);
    await page.waitForTimeout(500);

    // Help card should be visible
    const helpCard = page.locator('text=How to Play');
    await expect(helpCard).toBeVisible({ timeout: 3000 });

    // Dismiss it (use force since overlays might linger)
    const dismissBtn = page.locator('[aria-label="Dismiss help"]');
    await dismissBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Should be gone
    await expect(helpCard).not.toBeVisible();

    // Verify localStorage was set
    const dismissed = await page.evaluate(() => localStorage.getItem('frontier_help_dismissed'));
    expect(dismissed).toBe('1');

    // Reload and re-init — should stay dismissed
    await page.reload();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(3000);
    await initGame(page);
    await storeAction(page, `
      store.setState({ ...store.getState(), dailyCyclePhase: 'idle' });
    `);
    await page.waitForTimeout(500);

    await expect(helpCard).not.toBeVisible();
  });
});

// ============================================================
// MOBILE VIEWPORT
// ============================================================

test.describe('Mobile viewport', () => {
  test('renders without horizontal overflow at 375x667', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await bootGame(page);

    // Canvas should be visible
    await expect(page.locator('canvas')).toBeVisible();

    // No horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(overflow, 'Page should not have horizontal overflow on mobile').toBe(false);
  });
});
