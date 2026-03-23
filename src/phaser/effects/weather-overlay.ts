/**
 * Frontier — Weather Overlay Effects
 *
 * Full-screen weather visual effects for the TrailScene.
 * Each weather type gets distinct particle/overlay treatment.
 * Follows TrailParticles pattern: Arc pools, state setters, no direct store import.
 *
 * Imports: types/ only.
 */

import Phaser from 'phaser';
import type { Weather, TimeOfDay, Biome } from '@/types/game-state';
import { BIOME_DUST_COLORS } from '@/types/animation';

// ============================================================
// CONSTANTS
// ============================================================

const RAIN_POOL_SIZE = 30;
const STORM_POOL_SIZE = 45;
const DUST_POOL_SIZE = 20;
const SNOW_POOL_SIZE = 25;

const WEATHER_DEPTH = 20;
const OVERLAY_DEPTH = 24;
const LIGHTNING_DEPTH = 22;

// Rain: angled streaks falling from top
const RAIN_COLOR = 0xaaccee;
const RAIN_RADIUS = 1;
const RAIN_ALPHA_MIN = 0.3;
const RAIN_ALPHA_MAX = 0.6;
const RAIN_FALL_SPEED = 350; // duration ms for a drop to cross the screen

// Storm: heavier rain + lightning
const STORM_FLASH_MIN_INTERVAL = 5000;
const STORM_FLASH_MAX_INTERVAL = 15000;
const STORM_FLASH_DURATION = 200;
const STORM_FLASH_ALPHA = 0.15;

// Snow: slow gentle drift
const SNOW_COLOR = 0xffffff;
const SNOW_RADIUS_MIN = 1.5;
const SNOW_RADIUS_MAX = 3;
const SNOW_ALPHA_MIN = 0.4;
const SNOW_ALPHA_MAX = 0.7;
const SNOW_FALL_SPEED = 2000;

// Dust: horizontal right-to-left
const DUST_RADIUS_MIN = 2;
const DUST_RADIUS_MAX = 3.5;
const DUST_ALPHA_MIN = 0.2;
const DUST_ALPHA_MAX = 0.4;
const DUST_DRIFT_SPEED = 1200;

// Heatwave: horizon shimmer
const HEAT_SHIMMER_COLOR = 0xffcc66;
const HEAT_SHIMMER_ALPHA_MIN = 0.02;
const HEAT_SHIMMER_ALPHA_MAX = 0.06;

// Overcast: subtle grey overlay
const OVERCAST_COLOR = 0x888899;
const OVERCAST_ALPHA_MIN = 0.06;
const OVERCAST_ALPHA_MAX = 0.10;

// ============================================================
// WEATHER OVERLAY
// ============================================================

export class WeatherOverlay {
  private scene: Phaser.Scene;
  private sceneWidth = 0;
  private sceneHeight = 0;
  private groundY = 0;

  // Particle pools per weather type
  private rainPool: Phaser.GameObjects.Arc[] = [];
  private dustPool: Phaser.GameObjects.Arc[] = [];
  private snowPool: Phaser.GameObjects.Arc[] = [];

  // Overlay rects
  private overcastRect?: Phaser.GameObjects.Rectangle;
  private heatShimmerRect?: Phaser.GameObjects.Rectangle;
  private lightningRect?: Phaser.GameObjects.Rectangle;

  // Timers
  private emitTimer?: Phaser.Time.TimerEvent;
  private lightningTimer?: Phaser.Time.TimerEvent;

  // Current state
  private currentWeather: Weather | string = 'clear';
  private currentBiome: Biome | string = 'crossTimbers';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  create(groundY: number): void {
    const { width, height } = this.scene.cameras.main;
    this.sceneWidth = width;
    this.sceneHeight = height;
    this.groundY = groundY;

    this.createRainPool(RAIN_POOL_SIZE);
    this.createDustPool();
    this.createSnowPool();
    this.createOverlayRects();
  }

  destroy(): void {
    this.stopEmission();
    for (const p of this.rainPool) p.destroy();
    for (const p of this.dustPool) p.destroy();
    for (const p of this.snowPool) p.destroy();
    this.rainPool = [];
    this.dustPool = [];
    this.snowPool = [];
    this.overcastRect?.destroy();
    this.heatShimmerRect?.destroy();
    this.lightningRect?.destroy();
    this.overcastRect = undefined;
    this.heatShimmerRect = undefined;
    this.lightningRect = undefined;
  }

  // ============================================================
  // STATE SETTERS
  // ============================================================

  setWeather(weather: Weather | string): void {
    if (weather === this.currentWeather) return;
    this.currentWeather = weather;
    this.stopEmission();
    this.hideAllOverlays();
    this.startWeather();
  }

  setBiome(biome: Biome | string): void {
    this.currentBiome = biome;
  }

  setTimeOfDay(_timeOfDay: TimeOfDay | string): void {
    // Could tint weather particles by time — reserved for future refinement
  }

  // ============================================================
  // WEATHER ACTIVATION
  // ============================================================

  private startWeather(): void {
    switch (this.currentWeather) {
      case 'rain':
        this.startRain(RAIN_POOL_SIZE, 120);
        break;
      case 'storm':
        this.startRain(STORM_POOL_SIZE, 80);
        this.startLightning();
        break;
      case 'snow':
        this.startSnow();
        break;
      case 'dust':
        this.startDust();
        break;
      case 'overcast':
        this.showOvercast();
        break;
      case 'heatwave':
        this.showHeatShimmer();
        break;
      // 'clear' — nothing
    }
  }

  // ============================================================
  // RAIN
  // ============================================================

  private startRain(maxActive: number, interval: number): void {
    // Grow pool if needed for storm
    while (this.rainPool.length < maxActive) {
      const circle = this.scene.add.circle(0, 0, RAIN_RADIUS, RAIN_COLOR, 0);
      circle.setDepth(WEATHER_DEPTH);
      circle.setVisible(false);
      circle.setActive(false);
      this.rainPool.push(circle);
    }

    this.emitTimer = this.scene.time.addEvent({
      delay: interval,
      loop: true,
      callback: () => this.emitRainDrop(),
    });
  }

  private emitRainDrop(): void {
    const drop = this.getAvailable(this.rainPool);
    if (!drop) return;

    const startX = Math.random() * (this.sceneWidth + 60) - 30;
    const startY = -5;
    const alpha = RAIN_ALPHA_MIN + Math.random() * (RAIN_ALPHA_MAX - RAIN_ALPHA_MIN);

    drop.setPosition(startX, startY);
    drop.setFillStyle(RAIN_COLOR, alpha);
    drop.setRadius(RAIN_RADIUS);
    drop.setVisible(true);
    drop.setActive(true);

    // Rain falls slightly angled (drift left ~60px over full fall)
    const drift = -40 - Math.random() * 40;
    const duration = RAIN_FALL_SPEED + Math.random() * 150;

    this.scene.tweens.add({
      targets: drop,
      x: startX + drift,
      y: this.groundY + Math.random() * 20,
      alpha: 0,
      duration,
      ease: 'Linear',
      onComplete: () => {
        drop.setVisible(false);
        drop.setActive(false);
      },
    });
  }

  // ============================================================
  // LIGHTNING (storm only)
  // ============================================================

  private startLightning(): void {
    const scheduleFlash = () => {
      const delay = STORM_FLASH_MIN_INTERVAL +
        Math.random() * (STORM_FLASH_MAX_INTERVAL - STORM_FLASH_MIN_INTERVAL);

      this.lightningTimer = this.scene.time.delayedCall(delay, () => {
        this.flashLightning();
        scheduleFlash();
      });
    };
    scheduleFlash();
  }

  private flashLightning(): void {
    if (!this.lightningRect) {
      this.lightningRect = this.scene.add.rectangle(
        this.sceneWidth / 2, this.sceneHeight / 2,
        this.sceneWidth, this.sceneHeight,
        0xffffff, 0,
      );
      this.lightningRect.setDepth(LIGHTNING_DEPTH);
    }

    this.lightningRect.setAlpha(0);
    this.lightningRect.setVisible(true);

    this.scene.tweens.add({
      targets: this.lightningRect,
      alpha: { from: STORM_FLASH_ALPHA, to: 0 },
      duration: STORM_FLASH_DURATION,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.lightningRect?.setVisible(false);
      },
    });
  }

  // ============================================================
  // SNOW
  // ============================================================

  private startSnow(): void {
    this.emitTimer = this.scene.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => this.emitSnowflake(),
    });
  }

  private emitSnowflake(): void {
    const flake = this.getAvailable(this.snowPool);
    if (!flake) return;

    const startX = Math.random() * this.sceneWidth;
    const startY = -5;
    const radius = SNOW_RADIUS_MIN + Math.random() * (SNOW_RADIUS_MAX - SNOW_RADIUS_MIN);
    const alpha = SNOW_ALPHA_MIN + Math.random() * (SNOW_ALPHA_MAX - SNOW_ALPHA_MIN);

    flake.setPosition(startX, startY);
    flake.setFillStyle(SNOW_COLOR, alpha);
    flake.setRadius(radius);
    flake.setVisible(true);
    flake.setActive(true);

    // Gentle lateral drift with sine-like path via intermediate tween
    const lateralDrift = (Math.random() - 0.5) * 60;
    const duration = SNOW_FALL_SPEED + Math.random() * 1000;

    this.scene.tweens.add({
      targets: flake,
      x: startX + lateralDrift,
      y: this.groundY + Math.random() * 10,
      alpha: 0,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => {
        flake.setVisible(false);
        flake.setActive(false);
      },
    });
  }

  // ============================================================
  // DUST STORM (horizontal)
  // ============================================================

  private startDust(): void {
    this.emitTimer = this.scene.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => this.emitDustParticle(),
    });

    // Also show a faint overlay tint
    if (this.overcastRect) {
      const dustColor = BIOME_DUST_COLORS[this.currentBiome as Biome] ?? 0x8b7355;
      this.overcastRect.setFillStyle(dustColor, 0.06);
      this.overcastRect.setVisible(true);
      this.scene.tweens.add({
        targets: this.overcastRect,
        alpha: { from: 0.04, to: 0.08 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private emitDustParticle(): void {
    const particle = this.getAvailable(this.dustPool);
    if (!particle) return;

    const dustColor = BIOME_DUST_COLORS[this.currentBiome as Biome] ?? 0x8b7355;
    const startX = this.sceneWidth + 10;
    const startY = this.groundY * 0.4 + Math.random() * (this.groundY * 0.6);
    const radius = DUST_RADIUS_MIN + Math.random() * (DUST_RADIUS_MAX - DUST_RADIUS_MIN);
    const alpha = DUST_ALPHA_MIN + Math.random() * (DUST_ALPHA_MAX - DUST_ALPHA_MIN);

    particle.setPosition(startX, startY);
    particle.setFillStyle(dustColor, alpha);
    particle.setRadius(radius);
    particle.setVisible(true);
    particle.setActive(true);

    const yDrift = (Math.random() - 0.5) * 30;
    const duration = DUST_DRIFT_SPEED + Math.random() * 600;

    this.scene.tweens.add({
      targets: particle,
      x: -20,
      y: startY + yDrift,
      alpha: 0,
      duration,
      ease: 'Linear',
      onComplete: () => {
        particle.setVisible(false);
        particle.setActive(false);
      },
    });
  }

  // ============================================================
  // OVERCAST OVERLAY
  // ============================================================

  private showOvercast(): void {
    if (!this.overcastRect) return;
    this.overcastRect.setFillStyle(OVERCAST_COLOR, OVERCAST_ALPHA_MIN);
    this.overcastRect.setVisible(true);
    this.scene.tweens.add({
      targets: this.overcastRect,
      alpha: { from: OVERCAST_ALPHA_MIN, to: OVERCAST_ALPHA_MAX },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ============================================================
  // HEATWAVE SHIMMER
  // ============================================================

  private showHeatShimmer(): void {
    if (!this.heatShimmerRect) return;
    this.heatShimmerRect.setVisible(true);
    this.scene.tweens.add({
      targets: this.heatShimmerRect,
      alpha: { from: HEAT_SHIMMER_ALPHA_MIN, to: HEAT_SHIMMER_ALPHA_MAX },
      scaleX: { from: 1.0, to: 1.02 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ============================================================
  // POOL MANAGEMENT
  // ============================================================

  private createRainPool(size: number): void {
    for (let i = 0; i < size; i++) {
      const circle = this.scene.add.circle(0, 0, RAIN_RADIUS, RAIN_COLOR, 0);
      circle.setDepth(WEATHER_DEPTH);
      circle.setVisible(false);
      circle.setActive(false);
      this.rainPool.push(circle);
    }
  }

  private createDustPool(): void {
    for (let i = 0; i < DUST_POOL_SIZE; i++) {
      const circle = this.scene.add.circle(0, 0, DUST_RADIUS_MIN, 0x8b7355, 0);
      circle.setDepth(WEATHER_DEPTH);
      circle.setVisible(false);
      circle.setActive(false);
      this.dustPool.push(circle);
    }
  }

  private createSnowPool(): void {
    for (let i = 0; i < SNOW_POOL_SIZE; i++) {
      const circle = this.scene.add.circle(0, 0, SNOW_RADIUS_MIN, SNOW_COLOR, 0);
      circle.setDepth(WEATHER_DEPTH);
      circle.setVisible(false);
      circle.setActive(false);
      this.snowPool.push(circle);
    }
  }

  private createOverlayRects(): void {
    // Full-screen overlay for overcast / dust tint
    this.overcastRect = this.scene.add.rectangle(
      this.sceneWidth / 2, this.sceneHeight / 2,
      this.sceneWidth, this.sceneHeight,
      OVERCAST_COLOR, 0,
    );
    this.overcastRect.setDepth(OVERLAY_DEPTH);
    this.overcastRect.setVisible(false);

    // Horizon shimmer for heatwave
    this.heatShimmerRect = this.scene.add.rectangle(
      this.sceneWidth / 2, this.groundY - 10,
      this.sceneWidth, 30,
      HEAT_SHIMMER_COLOR, 0,
    );
    this.heatShimmerRect.setDepth(OVERLAY_DEPTH);
    this.heatShimmerRect.setVisible(false);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getAvailable(pool: Phaser.GameObjects.Arc[]): Phaser.GameObjects.Arc | null {
    for (const p of pool) {
      if (!p.active) return p;
    }
    return null;
  }

  private stopEmission(): void {
    this.emitTimer?.destroy();
    this.emitTimer = undefined;
    this.lightningTimer?.destroy();
    this.lightningTimer = undefined;
  }

  private hideAllOverlays(): void {
    this.overcastRect?.setVisible(false);
    this.heatShimmerRect?.setVisible(false);
    this.lightningRect?.setVisible(false);

    // Kill all active tweens on overlays and reset
    if (this.overcastRect) this.scene.tweens.killTweensOf(this.overcastRect);
    if (this.heatShimmerRect) this.scene.tweens.killTweensOf(this.heatShimmerRect);

    // Return all particles to pool
    for (const p of this.rainPool) {
      this.scene.tweens.killTweensOf(p);
      p.setVisible(false);
      p.setActive(false);
    }
    for (const p of this.dustPool) {
      this.scene.tweens.killTweensOf(p);
      p.setVisible(false);
      p.setActive(false);
    }
    for (const p of this.snowPool) {
      this.scene.tweens.killTweensOf(p);
      p.setVisible(false);
      p.setActive(false);
    }
  }
}
