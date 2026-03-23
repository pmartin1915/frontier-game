/**
 * Frontier — Cloud Layer
 *
 * Semi-transparent cloud blobs drifting across the sky area.
 * Density and opacity vary by weather; tinted by time-of-day.
 * Invisible at night.
 *
 * Imports: types/ only.
 */

import Phaser from 'phaser';
import type { Weather, TimeOfDay } from '@/types/game-state';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_CLOUDS = 5;
const CLOUD_DEPTH = 1.5;

/** Drift speed in px/frame at 60fps (very slow, atmospheric). */
const BASE_DRIFT_SPEED = 0.08;

/** Cloud visual presets per weather state. */
const WEATHER_CLOUD_CONFIG: Record<string, { count: number; alpha: number; tint: number }> = {
  clear:     { count: 2, alpha: 0.12, tint: 0xffffff },
  overcast:  { count: 5, alpha: 0.35, tint: 0xbbbbcc },
  rain:      { count: 4, alpha: 0.30, tint: 0x99aabb },
  storm:     { count: 5, alpha: 0.45, tint: 0x667788 },
  dust:      { count: 3, alpha: 0.20, tint: 0xccaa88 },
  snow:      { count: 4, alpha: 0.28, tint: 0xddddee },
  heatwave:  { count: 1, alpha: 0.08, tint: 0xeeddcc },
};

/** Time-of-day tint modifiers applied to cloud color. */
const TOD_TINT: Record<string, number> = {
  dawn:      0xffccaa,
  morning:   0xffffff,
  midday:    0xeeeeff,
  afternoon: 0xffddaa,
  sunset:    0xff9966,
  night:     0x000000, // Clouds invisible at night
};

// ============================================================
// CLOUD LAYER
// ============================================================

export class CloudLayer {
  private scene: Phaser.Scene;
  private clouds: Phaser.GameObjects.Ellipse[] = [];
  private sceneWidth = 0;
  private groundY = 0;
  private visibleCount = 2;
  private targetAlpha = 0.12;
  private isNight = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  create(groundY: number): void {
    const { width } = this.scene.cameras.main;
    this.sceneWidth = width;
    this.groundY = groundY;

    for (let i = 0; i < MAX_CLOUDS; i++) {
      const cloudWidth = 50 + Math.random() * 80;
      const cloudHeight = 12 + Math.random() * 16;
      const x = Math.random() * (width + 200) - 100;
      const y = groundY * 0.08 + Math.random() * (groundY * 0.35);

      const cloud = this.scene.add.ellipse(x, y, cloudWidth, cloudHeight, 0xffffff, 0.12);
      cloud.setDepth(CLOUD_DEPTH);
      cloud.setVisible(i < this.visibleCount);
      this.clouds.push(cloud);
    }
  }

  destroy(): void {
    for (const c of this.clouds) c.destroy();
    this.clouds = [];
  }

  // ============================================================
  // STATE SETTERS
  // ============================================================

  setWeather(weather: Weather | string): void {
    const cfg = WEATHER_CLOUD_CONFIG[weather as string] ?? WEATHER_CLOUD_CONFIG.clear;
    this.visibleCount = cfg.count;
    this.targetAlpha = cfg.alpha;

    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      if (i < this.visibleCount && !this.isNight) {
        cloud.setVisible(true);
        cloud.setAlpha(this.targetAlpha);
        cloud.setFillStyle(cfg.tint, this.targetAlpha);
      } else {
        cloud.setVisible(false);
      }
    }
  }

  setTimeOfDay(timeOfDay: TimeOfDay | string): void {
    this.isNight = timeOfDay === 'night';

    const tint = TOD_TINT[timeOfDay as string] ?? 0xffffff;

    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      if (this.isNight) {
        cloud.setVisible(false);
      } else if (i < this.visibleCount) {
        cloud.setVisible(true);
        cloud.setFillStyle(tint, this.targetAlpha);
      }
    }
  }

  // ============================================================
  // UPDATE (called from TrailScene.update)
  // ============================================================

  update(_delta: number, _isMoving: boolean, _paceSpeed: number): void {
    if (this.isNight) return;

    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      if (!cloud.visible) continue;

      // Drift left at constant speed (parallax feel without being pace-dependent)
      cloud.x -= BASE_DRIFT_SPEED + i * 0.01;

      // Recycle off-screen clouds to the right
      if (cloud.x < -100) {
        cloud.x = this.sceneWidth + 50 + Math.random() * 80;
        cloud.y = this.groundY * 0.08 + Math.random() * (this.groundY * 0.35);
      }
    }
  }
}
