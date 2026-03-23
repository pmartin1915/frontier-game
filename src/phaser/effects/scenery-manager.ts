/**
 * Frontier — SceneryManager
 *
 * Manages depth-layered, parallax-scrolling scenery objects in the trail scene.
 * 3 depth lanes (far/mid/near) with distinct scale, alpha, and scroll speeds
 * create a sense of depth and motion as the party travels.
 *
 * Vegetation objects receive subtle sway tweens for wind effect.
 * Objects that scroll off-screen left are recycled to the right edge.
 *
 * Imports: types/ only.
 */

import Phaser from 'phaser';
import { MAP_OBJECTS, BIOME_SCENERY } from '@/types/map-objects';
import type { ObjectCategory } from '@/types/map-objects';

// ============================================================
// DEPTH LANE CONFIGURATION
// ============================================================

interface LaneDef {
  depthMin: number;
  depthMax: number;
  scaleMin: number;
  scaleMax: number;
  alpha: number;
  parallaxSpeed: number;
  count: number;
  yOffset: number;  // relative to groundY (negative = above)
  yJitter: number;
}

const LANES: LaneDef[] = [
  // Far — tiny, faded, slow scroll (horizon dressing)
  { depthMin: 2, depthMax: 3, scaleMin: 0.3,  scaleMax: 0.45, alpha: 0.5,  parallaxSpeed: 0.12, count: 3, yOffset: -30, yJitter: 6 },
  // Mid — moderate size, behind characters
  { depthMin: 4, depthMax: 5, scaleMin: 0.5,  scaleMax: 0.65, alpha: 0.75, parallaxSpeed: 0.35, count: 3, yOffset: -8,  yJitter: 5 },
  // Near — subtle foreground accents at screen edges only
  { depthMin: 7, depthMax: 8, scaleMin: 0.7,  scaleMax: 0.85, alpha: 0.9,  parallaxSpeed: 0.7,  count: 2, yOffset: 3,   yJitter: 3 },
];

/** Categories that should NOT appear in the near (foreground) lane. */
const NEAR_LANE_EXCLUDED: ObjectCategory[] = ['structure'];

/** Object keys that receive wind sway tweens. */
const SWAY_VEGETATION = new Set([
  'prairie_grass', 'wildflowers', 'tumbleweed',
  'mesquite_tree', 'oak_tree', 'dead_tree',
  'cactus_saguaro', 'cactus_prickly',
]);

/** Trees get angle-based sway; low vegetation gets scaleX sway. */
const TREE_KEYS = new Set(['mesquite_tree', 'oak_tree', 'dead_tree', 'cactus_saguaro']);

/** Minimum horizontal distance between any two objects in the same lane. */
const MIN_DISTANCE = 60;

/** X-range to avoid (where character sprites stand). */
const PARTY_ZONE_MIN = 280;
const PARTY_ZONE_MAX = 720;

// ============================================================
// SCENERY MANAGER CLASS
// ============================================================

interface ScenerySprite {
  image: Phaser.GameObjects.Image;
  laneIndex: number;
  objKey: string;
}

export class SceneryManager {
  private scene: Phaser.Scene;
  private items: ScenerySprite[] = [];
  private swayTweens: Phaser.Tweens.Tween[] = [];
  private currentBiome = '';
  private groundY = 0;
  private sceneWidth = 0;
  private rngState = 0;

  /** Exposed for TrailScene.applyCompositeTint() to iterate. */
  get sprites(): Phaser.GameObjects.Image[] {
    return this.items.map((s) => s.image);
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Initial creation. Call once in scene.create(), after TerrainLayers.
   */
  create(groundY: number): void {
    const { width } = this.scene.cameras.main;
    this.groundY = groundY;
    this.sceneWidth = width;
  }

  /**
   * Swap scenery to match a new biome.
   * Destroys existing objects and places a fresh set.
   */
  setBiome(biome: string): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;
    this.rebuild();
  }

  /**
   * Per-frame parallax scroll.
   * @param delta - ms since last frame
   * @param isMoving - true if any character sprite is walking/running
   * @param paceSpeed - scroll speed multiplier (conservative: 0.3, normal: 0.6, hardPush: 1.0)
   */
  update(delta: number, isMoving: boolean, paceSpeed: number): void {
    if (!isMoving || this.items.length === 0) return;

    const dt = delta / 16.667; // normalize to ~60fps
    const baseSpeed = paceSpeed * 0.6; // px per normalized frame

    for (const item of this.items) {
      const lane = LANES[item.laneIndex];
      const dx = baseSpeed * lane.parallaxSpeed * dt;
      item.image.x -= dx;

      // Recycle objects that scroll off the left edge
      if (item.image.x < -item.image.displayWidth) {
        this.recycleToRight(item);
      }
    }
  }

  destroy(): void {
    this.clearAll();
  }

  // ============================================================
  // INTERNAL
  // ============================================================

  private rebuild(): void {
    this.clearAll();

    const keys = BIOME_SCENERY[this.currentBiome];
    if (!keys || keys.length === 0) return;

    // Seed RNG from biome name
    this.rngState = this.hashString(this.currentBiome);

    for (let laneIndex = 0; laneIndex < LANES.length; laneIndex++) {
      const lane = LANES[laneIndex];
      const isNearLane = laneIndex === LANES.length - 1;

      // Filter keys for this lane (exclude structures from near lane)
      const laneKeys = isNearLane
        ? keys.filter((k) => {
            const def = MAP_OBJECTS[k];
            return def && !NEAR_LANE_EXCLUDED.includes(def.category);
          })
        : keys;

      if (laneKeys.length === 0) continue;

      // Place objects with minimum-distance constraint
      const positions = this.generatePositions(lane.count, lane);

      for (let i = 0; i < positions.length; i++) {
        const objKey = laneKeys[i % laneKeys.length];
        const def = MAP_OBJECTS[objKey];
        if (!def || !this.scene.textures.exists(def.key)) continue;

        const x = positions[i];
        const yJitter = (this.rng() - 0.5) * lane.yJitter * 2;
        const y = this.groundY + lane.yOffset + yJitter;

        const scale = lane.scaleMin + this.rng() * (lane.scaleMax - lane.scaleMin);
        const depth = lane.depthMin + Math.floor(this.rng() * (lane.depthMax - lane.depthMin + 1));

        const img = this.scene.add.image(x, y, def.key);
        img.setOrigin(0.5, 1);
        img.setScale(scale);
        img.setDepth(depth);
        img.setAlpha(lane.alpha);

        // Random flip for variety
        if (this.rng() > 0.5) img.setFlipX(true);

        const item: ScenerySprite = { image: img, laneIndex, objKey };
        this.items.push(item);

        // Add sway tween for vegetation
        this.addSwayTween(item);
      }
    }
  }

  /**
   * Generate non-overlapping X positions for a lane, avoiding the party zone.
   */
  private generatePositions(count: number, lane: LaneDef): number[] {
    const positions: number[] = [];
    // Spread objects across a wider range than screen for parallax buffer
    const totalWidth = this.sceneWidth + 200; // extra buffer right
    const startX = -50; // slight left buffer
    let attempts = 0;

    while (positions.length < count && attempts < count * 20) {
      attempts++;
      const x = startX + this.rng() * totalWidth;

      // Check minimum distance from existing positions
      const tooClose = positions.some((px) => Math.abs(px - x) < MIN_DISTANCE);
      if (tooClose) continue;

      // Avoid the party zone for mid and near lanes (far lane is behind characters anyway)
      if (lane === LANES[1] || lane === LANES[2]) {
        if (x > PARTY_ZONE_MIN && x < PARTY_ZONE_MAX) continue;
      }

      positions.push(x);
    }

    return positions.sort((a, b) => a - b);
  }

  private addSwayTween(item: ScenerySprite): void {
    if (!SWAY_VEGETATION.has(item.objKey)) return;

    if (TREE_KEYS.has(item.objKey)) {
      // Trees: subtle angle oscillation
      const duration = 3000 + this.rng() * 1500;
      const angle = 0.6 + this.rng() * 0.5;
      const tween = this.scene.tweens.add({
        targets: item.image,
        angle: { from: -angle, to: angle },
        duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: this.rng() * 2000,
      });
      this.swayTweens.push(tween);
    } else {
      // Low vegetation: scaleX oscillation (wind sway)
      const duration = 2000 + this.rng() * 1000;
      const baseScale = item.image.scaleX;
      const tween = this.scene.tweens.add({
        targets: item.image,
        scaleX: { from: baseScale * 0.95, to: baseScale * 1.05 },
        duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: this.rng() * 2000,
      });
      this.swayTweens.push(tween);
    }
  }

  /**
   * Recycle an object that scrolled off the left to the right side.
   */
  private recycleToRight(item: ScenerySprite): void {
    const lane = LANES[item.laneIndex];
    const buffer = 20 + this.rng() * 80;
    item.image.x = this.sceneWidth + buffer;

    // Randomize vertical position within lane
    const yJitter = (this.rng() - 0.5) * lane.yJitter * 2;
    item.image.y = this.groundY + lane.yOffset + yJitter;

    // Random flip
    item.image.setFlipX(this.rng() > 0.5);
  }

  private clearAll(): void {
    for (const tween of this.swayTweens) {
      tween.destroy();
    }
    this.swayTweens = [];

    for (const item of this.items) {
      item.image.destroy();
    }
    this.items = [];
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

  private rng(): number {
    this.rngState = (this.rngState * 16807 + 1) & 0x7fffffff;
    return (this.rngState & 0xffff) / 0xffff;
  }
}
