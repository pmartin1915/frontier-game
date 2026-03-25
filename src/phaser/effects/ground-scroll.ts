/**
 * Frontier — GroundScroll
 *
 * Tileable ground texture that scrolls left during the travel phase.
 * Uses Phaser.GameObjects.TileSprite for GPU-accelerated seamless tiling.
 * Semi-transparent overlay on the existing SkyRenderer ground gradient,
 * adding detail (trail ruts, grass, pebbles) and motion to the ground plane.
 *
 * Falls back to procedurally generated canvas textures when PNG assets
 * are not available (dev mode safe).
 *
 * Imports: types/ only.
 */

import Phaser from 'phaser';
import { TimeOfDay } from '@/types/game-state';

// ============================================================
// CONSTANTS
// ============================================================

const GROUND_SCROLL_DEPTH = 0.85;
const GROUND_SCROLL_ALPHA = 0.55;
const GROUND_SCROLL_SPEED = 0.25;
const NIGHT_ALPHA_FACTOR = 0.5;

/** Texture dimensions for procedural fallback (POT for WebGL). */
const TEX_WIDTH = 512;
const TEX_HEIGHT = 128;

/** Maps biome key to ground texture key. */
const BIOME_GROUND_TEXTURE: Record<string, string> = {
  crossTimbers:   'ground_crossTimbers',
  stakedPlains:   'ground_stakedPlains',
  desertApproach: 'ground_desertApproach',
  pecosValley:    'ground_pecosValley',
  highDesert:     'ground_highDesert',
  mountainPass:   'ground_mountainPass',
  coloradoPlains: 'ground_coloradoPlains',
};

/** Biome ground mid-colors for procedural texture generation. */
const BIOME_GROUND_COLORS: Record<string, { base: string; detail: string; ruts: boolean; grassDensity: number }> = {
  crossTimbers:   { base: '#4a6430', detail: '#7a8a58', ruts: true,  grassDensity: 0.7 },
  stakedPlains:   { base: '#9a7a40', detail: '#c4a868', ruts: true,  grassDensity: 0.3 },
  desertApproach: { base: '#8a6e48', detail: '#c4a070', ruts: false, grassDensity: 0.1 },
  pecosValley:    { base: '#706048', detail: '#a08868', ruts: false, grassDensity: 0.15 },
  highDesert:     { base: '#806848', detail: '#b89868', ruts: false, grassDensity: 0.05 },
  mountainPass:   { base: '#5a6870', detail: '#7a8890', ruts: false, grassDensity: 0.2 },
  coloradoPlains: { base: '#5a7838', detail: '#7a9a58', ruts: true,  grassDensity: 0.6 },
};

// ============================================================
// GROUND SCROLL CLASS
// ============================================================

export class GroundScroll {
  private scene: Phaser.Scene;
  private _tileSprite: Phaser.GameObjects.TileSprite | null = null;
  private currentBiome = '';
  private currentTimeOfDay = TimeOfDay.Morning;
  private groundY = 0;
  private sceneWidth = 0;
  private groundHeight = 0;

  /** Exposed for TrailScene.applyCompositeTint() to tint. */
  get tileSprite(): Phaser.GameObjects.TileSprite | null {
    return this._tileSprite;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  create(groundY: number): void {
    const { width, height } = this.scene.cameras.main;
    this.groundY = groundY;
    this.sceneWidth = width;
    this.groundHeight = height - groundY;
  }

  /**
   * Per-frame scroll update.
   * @param delta - ms since last frame
   * @param isMoving - true if any character sprite is walking/running
   * @param paceSpeed - scroll speed multiplier (conservative: 0.3, normal: 0.6, hardPush: 1.0)
   */
  update(delta: number, isMoving: boolean, paceSpeed: number): void {
    if (!isMoving || !this._tileSprite) return;

    const dt = delta / 16.667; // normalize to ~60fps
    const baseSpeed = paceSpeed * 0.6;
    const dx = baseSpeed * GROUND_SCROLL_SPEED * dt;
    this._tileSprite.tilePositionX += dx;
  }

  setBiome(biome: string): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;

    const textureKey = BIOME_GROUND_TEXTURE[biome];
    if (!textureKey) return;

    // Use loaded PNG if available, otherwise generate procedural texture
    if (!this.scene.textures.exists(textureKey)) {
      this.generateProceduralTexture(biome, textureKey);
    }

    if (this._tileSprite) {
      this._tileSprite.setTexture(textureKey);
      this._tileSprite.tilePositionX = 0;
    } else {
      this.createTileSprite(textureKey);
    }

    this.applyTimeOfDayAlpha();
  }

  setTimeOfDay(timeOfDay: TimeOfDay): void {
    if (timeOfDay === this.currentTimeOfDay) return;
    this.currentTimeOfDay = timeOfDay;
    this.applyTimeOfDayAlpha();
  }

  destroy(): void {
    this._tileSprite?.destroy();
    this._tileSprite = null;
  }

  // ============================================================
  // INTERNAL
  // ============================================================

  private createTileSprite(textureKey: string): void {
    this._tileSprite = this.scene.add.tileSprite(
      this.sceneWidth / 2,
      this.groundY + this.groundHeight / 2,
      this.sceneWidth,
      this.groundHeight,
      textureKey,
    );
    this._tileSprite.setDepth(GROUND_SCROLL_DEPTH);
    this._tileSprite.setAlpha(GROUND_SCROLL_ALPHA);
  }

  private applyTimeOfDayAlpha(): void {
    if (!this._tileSprite) return;
    const isNight = this.currentTimeOfDay === TimeOfDay.Night;
    this._tileSprite.setAlpha(isNight ? GROUND_SCROLL_ALPHA * NIGHT_ALPHA_FACTOR : GROUND_SCROLL_ALPHA);
  }

  /**
   * Generate a procedural canvas texture for a biome when PNG is not available.
   * Creates trail ruts, grass tufts, and pebbles appropriate to the biome.
   */
  private generateProceduralTexture(biome: string, textureKey: string): void {
    // Remove existing if present
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey);
    }

    const canvas = this.scene.textures.createCanvas(textureKey, TEX_WIDTH, TEX_HEIGHT);
    if (!canvas) return;

    const ctx = canvas.getContext();
    if (!ctx) return;

    const colors = BIOME_GROUND_COLORS[biome] ?? BIOME_GROUND_COLORS.stakedPlains;
    const rng = this.makeRng(this.hashString(biome));

    // Fill with base color
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = colors.base;
    ctx.fillRect(0, 0, TEX_WIDTH, TEX_HEIGHT);

    // Vertical alpha gradient: more transparent at top, more opaque at bottom
    const gradient = ctx.createLinearGradient(0, 0, 0, TEX_HEIGHT);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TEX_WIDTH, TEX_HEIGHT);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

    // Trail ruts (horizontal dashed lines)
    if (colors.ruts) {
      ctx.strokeStyle = colors.detail;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);

      const rutY1 = TEX_HEIGHT * 0.4;
      const rutY2 = TEX_HEIGHT * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, rutY1);
      ctx.lineTo(TEX_WIDTH, rutY1);
      ctx.moveTo(0, rutY2);
      ctx.lineTo(TEX_WIDTH, rutY2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Grass tufts / vegetation dots
    ctx.globalAlpha = 0.5;
    const grassCount = Math.floor(colors.grassDensity * 80);
    for (let i = 0; i < grassCount; i++) {
      const gx = rng() * TEX_WIDTH;
      const gy = TEX_HEIGHT * 0.2 + rng() * TEX_HEIGHT * 0.7;
      ctx.fillStyle = colors.detail;
      if (rng() > 0.5) {
        // Small rectangle (grass tuft)
        ctx.fillRect(gx, gy, 2 + rng() * 2, 1);
      } else {
        // Dot (pebble)
        ctx.beginPath();
        ctx.arc(gx, gy, 0.5 + rng(), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pebbles / stones (sparse, all biomes)
    ctx.globalAlpha = 0.35;
    const stoneCount = 12 + Math.floor(rng() * 12);
    for (let i = 0; i < stoneCount; i++) {
      const sx = rng() * TEX_WIDTH;
      const sy = TEX_HEIGHT * 0.3 + rng() * TEX_HEIGHT * 0.6;
      const sr = 0.5 + rng() * 1.5;
      ctx.fillStyle = colors.detail;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
    canvas.refresh();
  }

  // ============================================================
  // RNG UTILITIES
  // ============================================================

  private hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    return hash & 0x7fffffff;
  }

  private makeRng(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 16807 + 1) & 0x7fffffff;
      return (state & 0xffff) / 0xffff;
    };
  }
}
