/**
 * Frontier — Trail Particle Effects
 *
 * Manual-tween particle pool for dust (Walk/Run) and breath (cold biomes).
 * Follows the CampScene ember pattern: Arc circles + tweens + pool recycling.
 *
 * Imports: types/ only (via animation.ts constants).
 * Environmental state passed in via setters — no direct store import.
 */

import Phaser from 'phaser';
import type { Biome, Pace, Weather, TimeOfDay } from '@/types/game-state';
import {
  BIOME_DUST_COLORS,
  DUST_INTENSITY,
  DUST_SUPPRESSED_WEATHER,
  BREATH_COLD_BIOMES,
  BREATH_COLD_TIMES,
  BREATH_COLD_WEATHER,
} from '@/types/animation';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_DUST_PARTICLES = 16;
const MAX_BREATH_PARTICLES = 8;

const DUST_DEPTH = 3;    // Below sprites (sprites start at depth 10)
const BREATH_DEPTH = 15; // Above sprites

// ============================================================
// TRAIL PARTICLES
// ============================================================

export class TrailParticles {
  private scene: Phaser.Scene;
  private dustPool: Phaser.GameObjects.Arc[] = [];
  private breathPool: Phaser.GameObjects.Arc[] = [];

  // Current environmental state
  private currentBiome: Biome | string = 'crossTimbers';
  private currentWeather: Weather | string = 'clear';
  private currentTimeOfDay: TimeOfDay | string = 'morning';
  private currentPace: Pace | string = 'normal';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createDustPool();
    this.createBreathPool();
  }

  // ============================================================
  // STATE SETTERS (called by TrailScene from store subscriptions)
  // ============================================================

  setBiome(biome: Biome | string): void {
    this.currentBiome = biome;
  }

  setWeather(weather: Weather | string): void {
    this.currentWeather = weather;
  }

  setTimeOfDay(timeOfDay: TimeOfDay | string): void {
    this.currentTimeOfDay = timeOfDay;
  }

  setPace(pace: Pace | string): void {
    this.currentPace = pace;
  }

  // ============================================================
  // DUST EMISSION
  // ============================================================

  /**
   * Emit a burst of dust particles at the given foot position.
   * Called by TrailScene timer for each moving sprite.
   */
  emitDust(x: number, footY: number): void {
    if (this.isDustSuppressed()) return;

    const intensity = DUST_INTENSITY[this.currentPace as Pace]
      ?? DUST_INTENSITY.normal;
    const color = BIOME_DUST_COLORS[this.currentBiome as Biome] ?? 0x8b7355;

    for (let i = 0; i < intensity.count; i++) {
      const particle = this.getAvailable(this.dustPool);
      if (!particle) return; // pool exhausted

      particle.setPosition(
        x + (Math.random() - 0.5) * intensity.spread,
        footY,
      );
      particle.setFillStyle(color, 0.5 + Math.random() * 0.3);
      particle.setRadius(1 + Math.random() * 1.5);
      particle.setVisible(true);
      particle.setActive(true);

      this.scene.tweens.add({
        targets: particle,
        y: footY - 4 - Math.random() * 6,
        x: particle.x - 3 - Math.random() * 5,
        alpha: 0,
        duration: 400 + Math.random() * 300,
        ease: 'Sine.easeOut',
        onComplete: () => {
          particle.setVisible(false);
          particle.setActive(false);
        },
      });
    }
  }

  // ============================================================
  // BREATH EMISSION
  // ============================================================

  /**
   * Emit a breath vapor particle near the given head position.
   * Called by TrailScene timer for idle/walking sprites in cold conditions.
   */
  emitBreath(x: number, headY: number): void {
    if (!this.isBreathVisible()) return;

    const particle = this.getAvailable(this.breathPool);
    if (!particle) return;

    particle.setPosition(x + 4, headY - 2);
    particle.setFillStyle(0xffffff, 0.3 + Math.random() * 0.2);
    particle.setRadius(1.5 + Math.random());
    particle.setVisible(true);
    particle.setActive(true);
    particle.setScale(1);

    this.scene.tweens.add({
      targets: particle,
      y: headY - 10 - Math.random() * 8,
      x: particle.x + 2 + Math.random() * 4,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1200 + Math.random() * 800,
      ease: 'Sine.easeOut',
      onComplete: () => {
        particle.setVisible(false);
        particle.setActive(false);
        particle.setScale(1);
      },
    });
  }

  // ============================================================
  // CONDITION CHECKS
  // ============================================================

  private isDustSuppressed(): boolean {
    return DUST_SUPPRESSED_WEATHER.has(this.currentWeather as Weather);
  }

  private isBreathVisible(): boolean {
    return (
      BREATH_COLD_BIOMES.has(this.currentBiome as Biome) ||
      BREATH_COLD_TIMES.has(this.currentTimeOfDay as TimeOfDay) ||
      BREATH_COLD_WEATHER.has(this.currentWeather as Weather)
    );
  }

  // ============================================================
  // POOL MANAGEMENT
  // ============================================================

  private createDustPool(): void {
    for (let i = 0; i < MAX_DUST_PARTICLES; i++) {
      const circle = this.scene.add.circle(0, 0, 1, 0x000000, 0);
      circle.setDepth(DUST_DEPTH);
      circle.setVisible(false);
      circle.setActive(false);
      this.dustPool.push(circle);
    }
  }

  private createBreathPool(): void {
    for (let i = 0; i < MAX_BREATH_PARTICLES; i++) {
      const circle = this.scene.add.circle(0, 0, 1.5, 0xffffff, 0);
      circle.setDepth(BREATH_DEPTH);
      circle.setVisible(false);
      circle.setActive(false);
      this.breathPool.push(circle);
    }
  }

  private getAvailable(pool: Phaser.GameObjects.Arc[]): Phaser.GameObjects.Arc | null {
    for (const p of pool) {
      if (!p.active) return p;
    }
    return null;
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  destroy(): void {
    for (const p of this.dustPool) {
      p.destroy();
    }
    for (const p of this.breathPool) {
      p.destroy();
    }
    this.dustPool = [];
    this.breathPool = [];
  }
}
