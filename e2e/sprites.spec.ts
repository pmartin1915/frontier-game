import { test, expect } from '@playwright/test';

const SPRITES = [
  'player_cowboy',
  'horse_riding_base',
  'horse_draft_base',
  'cat_mouser',
  'companion_elias_base',
  'companion_luisa_base',
  'companion_tom_base',
  // Accessories and wagon — generated session 2
  'companion_elias_kepi',
  'companion_luisa_serape',
  'companion_luisa_poncho',
  'companion_tom_hat_bandana',
  'horse_riding_tack',
  'horse_draft_harness',
  'wagon_prairie_schooner',
];

test('sprite PNGs are served and non-empty', async ({ page }) => {
  for (const name of SPRITES) {
    const resp = await page.request.get(`/assets/sprites/${name}.png`);
    expect(resp.status(), `${name}.png status`).toBe(200);
    const body = await resp.body();
    expect(body.length, `${name}.png size`).toBeGreaterThan(5000);
    console.log(`  ${name}.png — ${(body.length / 1024).toFixed(1)} KB ✓`);
  }
});

test('Phaser canvas mounts and game boots', async ({ page }) => {
  await page.goto('/');
  // Wait for canvas to appear
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 15000 });

  // Wait for Phaser to finish preloading (no console errors about missing sprites)
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Give game 5s to settle
  await page.waitForTimeout(5000);

  const spriteErrors = errors.filter(e =>
    e.includes('assets/sprites') && (e.includes('404') || e.includes('failed'))
  );
  expect(spriteErrors, `Sprite load errors: ${spriteErrors.join(', ')}`).toHaveLength(0);

  console.log(`  Canvas visible, ${errors.length} total console errors`);
  if (errors.length > 0) console.log('  Errors:', errors.slice(0, 5));
});
