/**
 * Frontier — TerrainLayers
 *
 * Procedural terrain silhouette layers drawn between sky and ground.
 * 3 canvas-drawn layers per biome at varying depths/opacities to
 * create depth and atmosphere in the "Living Illustration" aesthetic.
 *
 * Each biome maps to a terrain profile (mesa, mountains, rolling_hills,
 * flat_plains, canyon_walls) which controls the polygon shape generator.
 *
 * Colors are derived from the current sky bottom color, darkened and
 * tinted by time-of-day for atmospheric cohesion.
 *
 * Imports: types/ only.
 */

import Phaser from 'phaser';
import { TimeOfDay } from '@/types/game-state';

// ============================================================
// TERRAIN PROFILE TYPES
// ============================================================

type TerrainProfile = 'mesa' | 'mountains' | 'rolling_hills' | 'flat_plains' | 'canyon_walls';

/** Map each biome to its terrain silhouette profile. */
const BIOME_TERRAIN_PROFILE: Record<string, TerrainProfile> = {
  crossTimbers:   'rolling_hills',
  stakedPlains:   'flat_plains',
  desertApproach: 'mesa',
  pecosValley:    'canyon_walls',
  highDesert:     'mesa',
  mountainPass:   'mountains',
  coloradoPlains: 'rolling_hills',
};

/** Sky bottom colors per time-of-day (must match SkyRenderer SKY_GRADIENTS). */
const SKY_BOTTOM_COLORS: Record<TimeOfDay, string> = {
  [TimeOfDay.Dawn]:      '#d4a070',
  [TimeOfDay.Morning]:   '#c4d8e8',
  [TimeOfDay.Midday]:    '#e0dace',
  [TimeOfDay.Afternoon]: '#d8b060',
  [TimeOfDay.Sunset]:    '#d86030',
  [TimeOfDay.Night]:     '#1a2040',
};

/** Time-of-day atmospheric tint applied to silhouette colors. */
const TIME_TINTS: Record<TimeOfDay, { r: number; g: number; b: number; strength: number }> = {
  [TimeOfDay.Dawn]:      { r: 212, g: 160, b: 112, strength: 0.15 },
  [TimeOfDay.Morning]:   { r: 196, g: 216, b: 232, strength: 0.08 },
  [TimeOfDay.Midday]:    { r: 224, g: 218, b: 206, strength: 0.05 },
  [TimeOfDay.Afternoon]: { r: 216, g: 176, b:  96, strength: 0.12 },
  [TimeOfDay.Sunset]:    { r: 216, g:  96, b:  48, strength: 0.20 },
  [TimeOfDay.Night]:     { r:  26, g:  32, b:  64, strength: 0.30 },
};

// ============================================================
// LAYER CONFIGURATION
// ============================================================

interface LayerDef {
  /** Phaser depth value */
  depth: number;
  /** Base alpha (opacity) */
  alpha: number;
  /** How much to darken from sky bottom color (0=same, 1=black) */
  darken: number;
  /** Vertical scale — how tall the silhouette reaches above horizon (fraction of sky height) */
  heightFrac: number;
  /** Parallax scroll speed (px per frame at pace 1.0). Slower = more distant. */
  parallaxSpeed: number;
}

const LAYER_DEFS: LayerDef[] = [
  { depth: 0.3, alpha: 0.50, darken: 0.55, heightFrac: 0.55, parallaxSpeed: 0.06 }, // Far
  { depth: 0.5, alpha: 0.65, darken: 0.42, heightFrac: 0.32, parallaxSpeed: 0.15 }, // Mid
  { depth: 0.7, alpha: 0.80, darken: 0.28, heightFrac: 0.16, parallaxSpeed: 0.35 }, // Near
];

// ============================================================
// TERRAIN LAYERS CLASS
// ============================================================

export class TerrainLayers {
  private scene: Phaser.Scene;
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private currentBiome = '';
  private currentTimeOfDay = TimeOfDay.Morning;
  private sceneWidth = 0;
  private skyHeight = 0;
  /** Per-layer scroll offset (pixels shifted left). */
  private scrollOffsets: number[] = [0, 0, 0];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create the 3 terrain silhouette layers.
   * Call once in scene.create(), after SkyRenderer.create().
   * Textures are 2x viewport width for seamless scroll wrapping.
   */
  create(groundY: number): void {
    const { width } = this.scene.cameras.main;
    this.sceneWidth = width;
    this.skyHeight = groundY;

    // Create 3 empty sprite slots — textures are 2x viewport for scroll wrap
    for (let i = 0; i < LAYER_DEFS.length; i++) {
      const def = LAYER_DEFS[i];
      const key = `terrain_layer_${i}`;
      this.createLayerTexture(key, width * 2, groundY, i, 'rolling_hills');
      const sprite = this.scene.add.sprite(width, groundY / 2, key);
      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(def.depth);
      sprite.setAlpha(def.alpha);
      sprite.setVisible(false);
      this.sprites.push(sprite);
    }
  }

  /**
   * Scroll terrain layers during travel.
   * Call from TrailScene.update() alongside sceneryManager/groundScroll.
   */
  update(delta: number, isMoving: boolean, paceSpeed: number): void {
    if (!isMoving) return;

    const dt = delta / 16.667; // normalize to 60fps
    for (let i = 0; i < LAYER_DEFS.length; i++) {
      const def = LAYER_DEFS[i];
      const sprite = this.sprites[i];
      if (!sprite?.visible) continue;

      this.scrollOffsets[i] += def.parallaxSpeed * paceSpeed * dt;

      // Wrap when scrolled by one viewport width
      if (this.scrollOffsets[i] >= this.sceneWidth) {
        this.scrollOffsets[i] -= this.sceneWidth;
      }

      // Shift sprite left by offset (sprite is 2x wide, origin 0.5)
      sprite.x = this.sceneWidth - this.scrollOffsets[i];
    }
  }

  setBiome(biome: string): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;
    this.redrawGeometry();
    this.applyTint();
  }

  setTimeOfDay(timeOfDay: TimeOfDay): void {
    if (timeOfDay === this.currentTimeOfDay) return;
    this.currentTimeOfDay = timeOfDay;
    // Tint only — no canvas regeneration needed for time-of-day changes.
    this.applyTint();
  }

  destroy(): void {
    for (let i = 0; i < this.sprites.length; i++) {
      this.sprites[i].destroy();
      const key = `terrain_layer_${i}`;
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
    }
    this.sprites = [];
  }

  // ============================================================
  // RENDERING
  // ============================================================

  /** Regenerate canvas geometry (biome change only). Resets scroll offsets. */
  private redrawGeometry(): void {
    const profile = BIOME_TERRAIN_PROFILE[this.currentBiome] ?? 'rolling_hills';

    for (let i = 0; i < LAYER_DEFS.length; i++) {
      const key = `terrain_layer_${i}`;
      this.createLayerTexture(key, this.sceneWidth * 2, this.skyHeight, i, profile);
      const sprite = this.sprites[i];
      if (sprite) {
        sprite.setTexture(key);
        sprite.setVisible(true);
      }
      this.scrollOffsets[i] = 0;
    }
  }

  /** Apply per-layer tint color based on TOD + darken. No canvas regen. */
  private applyTint(): void {
    for (let i = 0; i < LAYER_DEFS.length; i++) {
      const sprite = this.sprites[i];
      if (!sprite) continue;
      const tintColor = this.computeLayerColorNum(LAYER_DEFS[i].darken);
      sprite.setTint(tintColor);
    }
  }

  private createLayerTexture(
    key: string,
    w: number,
    h: number,
    layerIndex: number,
    profile: TerrainProfile,
  ): void {
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    const canvas = this.scene.textures.createCanvas(key, w, h);
    if (!canvas) return;

    const ctx = canvas.getContext();
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const layerDef = LAYER_DEFS[layerIndex];

    // Generate terrain polygon for one viewport width, then draw it twice
    // side-by-side on the 2x canvas so scrolling wraps seamlessly.
    // Geometry is drawn in white; TOD color is applied via sprite.setTint().
    const seed = this.hashBiome(this.currentBiome) + layerIndex * 1000;
    const halfW = w / 2;
    const maxHeight = h * layerDef.heightFrac;
    const points = this.generateProfile(profile, halfW, maxHeight, seed, layerIndex);

    ctx.fillStyle = '#ffffff';

    // Draw the same profile twice: once at x=0, once shifted by halfW
    for (const offset of [0, halfW]) {
      ctx.beginPath();
      ctx.moveTo(offset, h); // bottom-left of this half
      for (const [px, py] of points) {
        ctx.lineTo(offset + px, h - py);
      }
      ctx.lineTo(offset + halfW, h); // bottom-right of this half
      ctx.closePath();
      ctx.fill();
    }

    canvas.refresh();
  }

  /**
   * Compute silhouette color as a 0xRRGGBB number for sprite.setTint().
   * Sky bottom color darkened + time-of-day atmospheric tint.
   */
  private computeLayerColorNum(darken: number): number {
    const skyBottom = SKY_BOTTOM_COLORS[this.currentTimeOfDay] ?? '#888888';
    const tint = TIME_TINTS[this.currentTimeOfDay];

    // Parse sky bottom hex
    let r = parseInt(skyBottom.slice(1, 3), 16);
    let g = parseInt(skyBottom.slice(3, 5), 16);
    let b = parseInt(skyBottom.slice(5, 7), 16);

    // Darken
    r = Math.round(r * (1 - darken));
    g = Math.round(g * (1 - darken));
    b = Math.round(b * (1 - darken));

    // Apply time tint
    if (tint) {
      r = Math.round(r * (1 - tint.strength) + tint.r * tint.strength);
      g = Math.round(g * (1 - tint.strength) + tint.g * tint.strength);
      b = Math.round(b * (1 - tint.strength) + tint.b * tint.strength);
    }

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return (r << 16) | (g << 8) | b;
  }

  // ============================================================
  // SHAPE GENERATORS
  // ============================================================

  private generateProfile(
    profile: TerrainProfile,
    width: number,
    maxHeight: number,
    seed: number,
    layerIndex: number,
  ): [number, number][] {
    let points: [number, number][];
    switch (profile) {
      case 'mesa':          points = this.genMesa(width, maxHeight, seed, layerIndex); break;
      case 'mountains':     points = this.genMountains(width, maxHeight, seed, layerIndex); break;
      case 'rolling_hills': points = this.genRollingHills(width, maxHeight, seed, layerIndex); break;
      case 'flat_plains':   points = this.genFlatPlains(width, maxHeight, seed, layerIndex); break;
      case 'canyon_walls':  points = this.genCanyonWalls(width, maxHeight, seed, layerIndex); break;
    }
    return this.makeSeamless(points, width);
  }

  /**
   * Blend the last ~15% of the profile back toward the starting height
   * so that tiling two copies side-by-side creates a smooth transition.
   */
  private makeSeamless(points: [number, number][], width: number): [number, number][] {
    if (points.length < 3) return points;

    const startHeight = points[0][1];
    const fadeStart = width * 0.85;

    for (let i = 0; i < points.length; i++) {
      const [px, py] = points[i];
      if (px >= fadeStart) {
        const t = (px - fadeStart) / (width - fadeStart); // 0 at fadeStart → 1 at width
        const eased = t * t * (3 - 2 * t); // smoothstep for natural blend
        points[i] = [px, py * (1 - eased) + startHeight * eased];
      }
    }

    // Ensure the last point exactly matches the first height
    const last = points[points.length - 1];
    points[points.length - 1] = [last[0], startHeight];

    return points;
  }

  /** Mesa: flat-topped blocky formations with steep sides. */
  private genMesa(w: number, maxH: number, seed: number, _layer: number): [number, number][] {
    const rng = this.makeRng(seed);
    const points: [number, number][] = [];
    const step = 8;
    let x = 0;

    // Start low
    points.push([0, maxH * 0.1]);

    while (x < w) {
      const isMesa = rng() > 0.55;
      if (isMesa) {
        // Rise to mesa top
        const mesaWidth = 60 + rng() * 120;
        const mesaHeight = maxH * (0.6 + rng() * 0.35);
        const riseWidth = 10 + rng() * 15;

        // Steep rise
        for (let dx = 0; dx < riseWidth && x < w; dx += step) {
          const t = dx / riseWidth;
          points.push([x, maxH * 0.15 + t * (mesaHeight - maxH * 0.15)]);
          x += step;
        }
        // Flat top with slight variation
        for (let dx = 0; dx < mesaWidth && x < w; dx += step) {
          points.push([x, mesaHeight + (rng() - 0.5) * maxH * 0.04]);
          x += step;
        }
        // Steep descent
        for (let dx = 0; dx < riseWidth && x < w; dx += step) {
          const t = 1 - dx / riseWidth;
          points.push([x, maxH * 0.15 + t * (mesaHeight - maxH * 0.15)]);
          x += step;
        }
      } else {
        // Low desert floor
        const gapWidth = 40 + rng() * 80;
        for (let dx = 0; dx < gapWidth && x < w; dx += step) {
          points.push([x, maxH * (0.08 + rng() * 0.12)]);
          x += step;
        }
      }
    }

    points.push([w, maxH * 0.1]);
    return points;
  }

  /** Mountains: jagged peaks with sharp angles. */
  private genMountains(w: number, maxH: number, seed: number, layer: number): [number, number][] {
    const rng = this.makeRng(seed);
    const points: [number, number][] = [];
    const peakCount = 4 + Math.floor(rng() * 3);
    // Far layers have bigger, broader peaks; near layers have smaller ones
    const peakScale = layer === 0 ? 1.0 : layer === 1 ? 0.7 : 0.5;

    points.push([0, maxH * 0.05]);

    for (let i = 0; i < peakCount; i++) {
      const peakX = (w / (peakCount + 1)) * (i + 1) + (rng() - 0.5) * (w / peakCount) * 0.4;
      const peakH = maxH * (0.5 + rng() * 0.5) * peakScale;
      const baseHalfWidth = 30 + rng() * 60;

      // Left slope
      const leftBase = Math.max(0, peakX - baseHalfWidth);
      points.push([leftBase, maxH * 0.05 + rng() * maxH * 0.08]);

      // Optional sub-ridge
      if (rng() > 0.5) {
        const ridgeX = leftBase + (peakX - leftBase) * (0.3 + rng() * 0.3);
        points.push([ridgeX, peakH * (0.4 + rng() * 0.2)]);
      }

      // Peak
      points.push([peakX, peakH]);

      // Optional sub-ridge
      if (rng() > 0.5) {
        const ridgeX = peakX + (baseHalfWidth * (0.3 + rng() * 0.3));
        points.push([ridgeX, peakH * (0.3 + rng() * 0.3)]);
      }

      // Right slope
      const rightBase = Math.min(w, peakX + baseHalfWidth);
      points.push([rightBase, maxH * 0.05 + rng() * maxH * 0.08]);
    }

    points.push([w, maxH * 0.05]);

    // Sort by x to avoid crossing lines
    points.sort((a, b) => a[0] - b[0]);
    return points;
  }

  /** Rolling hills: gentle undulating curves. */
  private genRollingHills(w: number, maxH: number, seed: number, _layer: number): [number, number][] {
    const rng = this.makeRng(seed);
    const points: [number, number][] = [];
    const step = 6;

    // Use 3-4 overlapping sine waves for organic feel
    const freq1 = 0.004 + rng() * 0.003;
    const freq2 = 0.008 + rng() * 0.005;
    const freq3 = 0.015 + rng() * 0.008;
    const amp1 = maxH * (0.3 + rng() * 0.2);
    const amp2 = maxH * (0.15 + rng() * 0.1);
    const amp3 = maxH * (0.05 + rng() * 0.05);
    const phase1 = rng() * Math.PI * 2;
    const phase2 = rng() * Math.PI * 2;
    const phase3 = rng() * Math.PI * 2;
    const base = maxH * 0.15;

    for (let x = 0; x <= w; x += step) {
      const h = base
        + amp1 * (0.5 + 0.5 * Math.sin(x * freq1 + phase1))
        + amp2 * (0.5 + 0.5 * Math.sin(x * freq2 + phase2))
        + amp3 * (0.5 + 0.5 * Math.sin(x * freq3 + phase3));
      points.push([x, Math.min(maxH, h)]);
    }

    return points;
  }

  /** Flat plains: very subtle bumps near the horizon. */
  private genFlatPlains(w: number, maxH: number, seed: number, _layer: number): [number, number][] {
    const rng = this.makeRng(seed);
    const points: [number, number][] = [];
    const step = 8;

    const freq = 0.006 + rng() * 0.004;
    const amp = maxH * (0.15 + rng() * 0.15);
    const phase = rng() * Math.PI * 2;
    const base = maxH * 0.1;

    for (let x = 0; x <= w; x += step) {
      const h = base + amp * (0.5 + 0.5 * Math.sin(x * freq + phase))
        + (rng() - 0.5) * maxH * 0.03; // tiny noise
      points.push([x, Math.max(0, Math.min(maxH, h))]);
    }

    return points;
  }

  /** Canyon walls: steep formations rising from both edges, low in center. */
  private genCanyonWalls(w: number, maxH: number, seed: number, _layer: number): [number, number][] {
    const rng = this.makeRng(seed);
    const points: [number, number][] = [];
    const step = 6;

    for (let x = 0; x <= w; x += step) {
      // U-shape: high at edges, low in center
      const centerDist = Math.abs(x - w / 2) / (w / 2); // 0 at center, 1 at edges
      const wallHeight = maxH * centerDist * centerDist * (0.7 + rng() * 0.3);
      const noise = (rng() - 0.5) * maxH * 0.08;
      const base = maxH * 0.05;
      points.push([x, Math.max(0, Math.min(maxH, base + wallHeight + noise))]);
    }

    return points;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /** Simple deterministic hash from biome string. */
  private hashBiome(biome: string): number {
    let hash = 0;
    for (let i = 0; i < biome.length; i++) {
      hash = (hash * 31 + biome.charCodeAt(i)) | 0;
    }
    return hash & 0x7fffffff;
  }

  /** Create a seeded PRNG (LCG). Uses full 31-bit range for better distribution. */
  private makeRng(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 16807 + 1) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }
}
