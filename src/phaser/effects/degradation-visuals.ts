/**
 * Frontier — Equipment Degradation Visual Indicators
 *
 * Manages small damage indicator dots near sprites based on equipment
 * durability tiers. Broken tier gets a pulsing animation.
 *
 * Follows import boundary: phaser/ imports from types/ only.
 */

import Phaser from 'phaser';
import {
  DurabilityTier,
  DURABILITY_VISUALS,
} from '@/types/animation';

// ============================================================
// TYPES
// ============================================================

interface DamageIndicator {
  dot: Phaser.GameObjects.Arc;
  pulse: Phaser.Tweens.Tween | null;
  currentTier: DurabilityTier;
}

// ============================================================
// DEGRADATION VISUALS
// ============================================================

export class DegradationVisuals {
  private scene: Phaser.Scene;
  private indicators: Map<string, DamageIndicator> = new Map();

  /** Depth for indicator dots — above all sprites and accessories */
  private static readonly INDICATOR_DEPTH = 20;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Update the damage indicator for a sprite based on its durability tier.
   *
   * @param spriteKey  Sprite map key (e.g. 'player_cowboy')
   * @param tier       Current durability tier
   * @param spriteX    X position of the parent sprite
   * @param spriteY    Y position of the parent sprite (feet / origin)
   * @param spriteHeight  Height of the parent sprite for positioning the dot near the top
   */
  updateIndicator(
    spriteKey: string,
    tier: DurabilityTier,
    spriteX: number,
    spriteY: number,
    spriteHeight: number,
  ): void {
    const visual = DURABILITY_VISUALS[tier];
    const existing = this.indicators.get(spriteKey);

    // --- No indicator needed ---
    if (!visual.showIndicator) {
      if (existing) {
        existing.pulse?.destroy();
        existing.dot.destroy();
        this.indicators.delete(spriteKey);
      }
      return;
    }

    const dotX = spriteX + 8;
    const dotY = spriteY - spriteHeight + 4;

    // --- Update existing indicator ---
    if (existing) {
      existing.dot.setPosition(dotX, dotY);
      existing.dot.setFillStyle(visual.indicatorColor, visual.indicatorAlpha);

      // Tier changed: recreate pulse if needed
      if (existing.currentTier !== tier) {
        existing.pulse?.destroy();
        existing.pulse = null;

        if (tier === DurabilityTier.Broken) {
          existing.pulse = this.createPulseTween(existing.dot, visual.indicatorAlpha);
        }

        existing.currentTier = tier;
      }
      return;
    }

    // --- Create new indicator ---
    const dot = this.scene.add.circle(
      dotX,
      dotY,
      2.5,
      visual.indicatorColor,
      visual.indicatorAlpha,
    );
    dot.setDepth(DegradationVisuals.INDICATOR_DEPTH);

    let pulse: Phaser.Tweens.Tween | null = null;
    if (tier === DurabilityTier.Broken) {
      pulse = this.createPulseTween(dot, visual.indicatorAlpha);
    }

    this.indicators.set(spriteKey, { dot, pulse, currentTier: tier });
  }

  /**
   * Sync all indicator positions when sprites may have moved.
   */
  syncPositions(
    spritePositions: Map<string, { x: number; y: number; height: number }>,
  ): void {
    for (const [key, indicator] of this.indicators) {
      const pos = spritePositions.get(key);
      if (pos) {
        indicator.dot.setPosition(pos.x + 8, pos.y - pos.height + 4);
      }
    }
  }

  /**
   * Remove a single indicator (e.g. when a sprite is removed).
   */
  removeIndicator(spriteKey: string): void {
    const existing = this.indicators.get(spriteKey);
    if (existing) {
      existing.pulse?.destroy();
      existing.dot.destroy();
      this.indicators.delete(spriteKey);
    }
  }

  destroy(): void {
    for (const indicator of this.indicators.values()) {
      indicator.pulse?.destroy();
      indicator.dot.destroy();
    }
    this.indicators.clear();
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private createPulseTween(
    dot: Phaser.GameObjects.Arc,
    baseAlpha: number,
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: dot,
      alpha: { from: baseAlpha, to: baseAlpha * 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
