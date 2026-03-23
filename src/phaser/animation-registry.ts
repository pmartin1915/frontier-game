/**
 * Frontier — Animation Registry
 *
 * Creates Phaser animations from SpriteSheetConfig entries.
 * Called once during PreloadScene.create() after textures are loaded.
 *
 * Animation naming convention: `${spriteKey}_${animState}`
 *   e.g. "player_cowboy_idle", "horse_riding_base_walk"
 *
 * Imports: types/ and phaser/ only.
 */

import Phaser from 'phaser';
import { AnimationState } from '@/types/animation';
import type { SpriteSheetConfig } from '@/types/animation';
import { SPRITE_CONFIGS, SHEET_COLS } from '@/phaser/sprite-registry';

// ============================================================
// ANIMATION KEY HELPERS
// ============================================================

/**
 * Build the animation key for a given sprite and state.
 */
export function animKey(spriteKey: string, state: AnimationState): string {
  return `${spriteKey}_${state}`;
}

// ============================================================
// REGISTRATION
// ============================================================

/**
 * Register all animations for a single sprite sheet config.
 * Each AnimationState becomes a separate Phaser animation.
 *
 * Frame indices are calculated from the row and column layout:
 *   startFrame = row * SHEET_COLS
 *   endFrame = startFrame + frameCount - 1
 */
export function registerAnimations(
  scene: Phaser.Scene,
  config: SpriteSheetConfig,
): void {
  const states = Object.values(AnimationState);

  for (const state of states) {
    const rowConfig = config.rows[state];
    if (!rowConfig || rowConfig.frameCount === 0) continue;

    const key = animKey(config.key, state);

    // Skip if already registered (prevents double-registration on scene restart)
    if (scene.anims.exists(key)) continue;

    const startFrame = rowConfig.row * SHEET_COLS;
    const endFrame = startFrame + rowConfig.frameCount - 1;

    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(config.key, {
        start: startFrame,
        end: endFrame,
      }),
      frameRate: rowConfig.baseFrameRate,
      repeat: rowConfig.loop ? -1 : 0,
    });
  }
}

/**
 * Register animations for ALL sprites in the registry.
 * Only registers for textures that exist in the texture manager.
 */
export function registerAllAnimations(scene: Phaser.Scene): void {
  for (const config of Object.values(SPRITE_CONFIGS)) {
    if (scene.textures.exists(config.key)) {
      registerAnimations(scene, config);
    }
  }
}
