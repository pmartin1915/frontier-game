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
}

const LAYER_DEFS: LayerDef[] = [
  { depth: 0.3, alpha: 0.50, darken: 0.55, heightFrac: 0.55 }, // Far — tallest, most atmospheric
  { depth: 0.5, alpha: 0.65, darken: 0.42, heightFrac: 0.32 }, // Mid
  { depth: 0.7, alpha: 0.80, darken: 0.28, heightFrac: 0.16 }, // Near — darkest, shortest
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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create the 3 terrain silhouette layers.
   * Call once in scene.create(), after SkyRenderer.create().
   */
  create(groundY: number): void {
    const { width } = this.scene.cameras.main;
    this.sceneWidth = width;
    this.skyHeight = groundY;

    // Create 3 empty sprite slots
    for (let i = 0; i < LAYER_DEFS.length; i++) {
      const def = LAYER_DEFS[i];
      const key = `terrain_layer_${i}`;
      // Create a 1x1 placeholder texture
      this.createLayerTexture(key, width, groundY, i, 'rolling_hills');
      const sprite = this.scene.add.sprite(width / 2, groundY / 2, key);
      sprite.setOrigin(0.5, 0.5); // Explicit: texture is groundY tall, centered
      sprite.setDepth(def.depth);
      sprite.setAlpha(def.alpha);
      sprite.setVisible(false);
      this.sprites.push(sprite);
    }
  }

  setBiome(biome: string): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;
    this.redrawAll();
  }

  setTimeOfDay(timeOfDay: TimeOfDay): void {
    if (timeOfDay === this.currentTimeOfDay) return;
    this.currentTimeOfDay = timeOfDay;
    this.redrawAll();
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

  private redrawAll(): void {
    const profile = BIOME_TERRAIN_PROFILE[this.currentBiome] ?? 'rolling_hills';

    for (let i = 0; i < LAYER_DEFS.length; i++) {
      const key = `terrain_layer_${i}`;
      this.createLayerTexture(key, this.sceneWidth, this.skyHeight, i, profile);
      const sprite = this.sprites[i];
      if (sprite) {
        sprite.setTexture(key);
        sprite.setVisible(true);
      }
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
    const color = this.computeLayerColor(layerDef.darken);

    // Generate terrain polygon points
    const seed = this.hashBiome(this.currentBiome) + layerIndex * 1000;
    const maxHeight = h * layerDef.heightFrac;
    const points = this.generateProfile(profile, w, maxHeight, seed, layerIndex);

    // Draw filled polygon from bottom of canvas up to terrain profile
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h); // bottom-left
    for (const [px, py] of points) {
      ctx.lineTo(px, h - py); // py is height above bottom
    }
    ctx.lineTo(w, h); // bottom-right
    ctx.closePath();
    ctx.fill();

    canvas.refresh();
  }

  /**
   * Compute silhouette color: sky bottom color darkened + time-of-day tint.
   */
  private computeLayerColor(darken: number): string {
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

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
    switch (profile) {
      case 'mesa':          return this.genMesa(width, maxHeight, seed, layerIndex);
      case 'mountains':     return this.genMountains(width, maxHeight, seed, layerIndex);
      case 'rolling_hills': return this.genRollingHills(width, maxHeight, seed, layerIndex);
      case 'flat_plains':   return this.genFlatPlains(width, maxHeight, seed, layerIndex);
      case 'canyon_walls':  return this.genCanyonWalls(width, maxHeight, seed, layerIndex);
    }
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

  /** Create a seeded PRNG (LCG). */
  private makeRng(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 16807 + 1) & 0x7fffffff;
      return (state & 0xffff) / 0xffff;
    };
  }
}
