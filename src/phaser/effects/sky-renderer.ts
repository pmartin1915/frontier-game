/**
 * Frontier — SkyRenderer
 *
 * Renders atmospheric sky gradients, sun/moon, and horizon haze.
 * Used by both TrailScene (dynamic time-of-day) and CampScene (night only).
 *
 * Replaces the flat solid-color rectangles with multi-stop vertical gradients
 * and layered atmospheric effects for the "Living Illustration" aesthetic.
 *
 * Imports: types/ only.
 */

import Phaser from 'phaser';
import { TimeOfDay } from '@/types/game-state';

// ============================================================
// SKY GRADIENT DEFINITIONS
// ============================================================

/**
 * Each time-of-day maps to a 3-stop vertical gradient:
 *   top (zenith) → mid → bottom (horizon)
 * Plus optional sun/moon position and horizon haze.
 */
interface SkyGradientDef {
  top: string;
  mid: string;
  bottom: string;
  /** Horizon haze color (CSS hex) and alpha */
  haze: { color: string; alpha: number };
  /** Celestial body config (null = hidden) */
  celestial: CelestialDef | null;
}

interface CelestialDef {
  type: 'sun' | 'moon';
  /** X position as fraction of width (0=left, 1=right) */
  xFrac: number;
  /** Y position as fraction of sky height (0=top, 1=horizon) */
  yFrac: number;
  radius: number;
  color: number;
  glowRadius: number;
  glowAlpha: number;
}

const SKY_GRADIENTS: Record<TimeOfDay, SkyGradientDef> = {
  [TimeOfDay.Dawn]: {
    top: '#1e2d5a',
    mid: '#7a5a6e',
    bottom: '#d4a070',
    haze: { color: '#e8a050', alpha: 0.2 },
    celestial: {
      type: 'sun', xFrac: 0.15, yFrac: 0.82,
      radius: 8, color: 0xe87030, glowRadius: 40, glowAlpha: 0.12,
    },
  },
  [TimeOfDay.Morning]: {
    top: '#3a6ea5',
    mid: '#6aacda',
    bottom: '#c4d8e8',
    haze: { color: '#f5deb3', alpha: 0.08 },
    celestial: {
      type: 'sun', xFrac: 0.3, yFrac: 0.45,
      radius: 6, color: 0xffe860, glowRadius: 28, glowAlpha: 0.08,
    },
  },
  [TimeOfDay.Midday]: {
    top: '#5a8aba',
    mid: '#b8ccd8',
    bottom: '#e0dace',
    haze: { color: '#f0e8d0', alpha: 0.12 },
    celestial: {
      type: 'sun', xFrac: 0.5, yFrac: 0.15,
      radius: 5, color: 0xfff8e0, glowRadius: 24, glowAlpha: 0.06,
    },
  },
  [TimeOfDay.Afternoon]: {
    top: '#5a7a9a',
    mid: '#b89050',
    bottom: '#d8b060',
    haze: { color: '#d4a040', alpha: 0.15 },
    celestial: {
      type: 'sun', xFrac: 0.72, yFrac: 0.4,
      radius: 6, color: 0xf0c040, glowRadius: 30, glowAlpha: 0.1,
    },
  },
  [TimeOfDay.Sunset]: {
    top: '#2a1530',
    mid: '#8a2a30',
    bottom: '#d86030',
    haze: { color: '#e86030', alpha: 0.25 },
    celestial: {
      type: 'sun', xFrac: 0.88, yFrac: 0.85,
      radius: 10, color: 0xd83020, glowRadius: 50, glowAlpha: 0.18,
    },
  },
  [TimeOfDay.Night]: {
    top: '#060814',
    mid: '#0e1428',
    bottom: '#1a2040',
    haze: { color: '#1a1a3e', alpha: 0 },
    celestial: {
      type: 'moon', xFrac: 0.78, yFrac: 0.2,
      radius: 5, color: 0xdddcc8, glowRadius: 20, glowAlpha: 0.04,
    },
  },
};

// ============================================================
// BIOME GROUND GRADIENT DEFINITIONS
// ============================================================

interface GroundGradientDef {
  top: string;    // Near horizon (lighter, blends with sky)
  mid: string;    // Mid-ground
  bottom: string; // Bottom of screen (darkest)
}

const BIOME_GROUND: Record<string, GroundGradientDef> = {
  crossTimbers:   { top: '#7a8a58', mid: '#4a6430', bottom: '#2a3818' },
  stakedPlains:   { top: '#c4a868', mid: '#9a7a40', bottom: '#5a4a28' },
  desertApproach: { top: '#c4a070', mid: '#8a6e48', bottom: '#4a3820' },
  pecosValley:    { top: '#a08868', mid: '#706048', bottom: '#3a2a18' },
  highDesert:     { top: '#b89868', mid: '#806848', bottom: '#403020' },
  mountainPass:   { top: '#7a8890', mid: '#5a6870', bottom: '#2a3038' },
  coloradoPlains: { top: '#7a9a58', mid: '#5a7838', bottom: '#2a3a18' },
};

const DEFAULT_GROUND: GroundGradientDef = { top: '#8b7355', mid: '#6a5a3a', bottom: '#3a2a18' };

/** Time-of-day tint applied over ground gradient for atmospheric cohesion. */
const GROUND_TIME_TINTS: Record<TimeOfDay, { color: number; alpha: number }> = {
  [TimeOfDay.Dawn]:      { color: 0xd4a070, alpha: 0.12 },
  [TimeOfDay.Morning]:   { color: 0xf5deb3, alpha: 0.04 },
  [TimeOfDay.Midday]:    { color: 0xf0e8d0, alpha: 0.06 },
  [TimeOfDay.Afternoon]: { color: 0xd4a040, alpha: 0.10 },
  [TimeOfDay.Sunset]:    { color: 0xd86030, alpha: 0.18 },
  [TimeOfDay.Night]:     { color: 0x1a1a3e, alpha: 0.22 },
};

/** Atmospheric overlay tint for the entire scene (very low alpha). */
const ATMOSPHERE_TINTS: Record<TimeOfDay, { color: number; alpha: number }> = {
  [TimeOfDay.Dawn]:      { color: 0xd4a070, alpha: 0.04 },
  [TimeOfDay.Morning]:   { color: 0xf5deb3, alpha: 0.02 },
  [TimeOfDay.Midday]:    { color: 0xfff8e0, alpha: 0.03 },
  [TimeOfDay.Afternoon]: { color: 0xe8a020, alpha: 0.05 },
  [TimeOfDay.Sunset]:    { color: 0xe74c3c, alpha: 0.06 },
  [TimeOfDay.Night]:     { color: 0x1a1a3e, alpha: 0.08 },
};

// ============================================================
// SKY RENDERER CLASS
// ============================================================

export class SkyRenderer {
  private scene: Phaser.Scene;
  private skySprite: Phaser.GameObjects.Sprite | null = null;
  private groundSprite: Phaser.GameObjects.Sprite | null = null;
  private groundTintRect: Phaser.GameObjects.Rectangle | null = null;
  private horizonBlendSprite: Phaser.GameObjects.Sprite | null = null;
  private atmosphereOverlay: Phaser.GameObjects.Rectangle | null = null;
  private celestialBody: Phaser.GameObjects.Arc | null = null;
  private celestialGlow: Phaser.GameObjects.Arc | null = null;
  private moonShadow: Phaser.GameObjects.Arc | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private hazeTween: Phaser.Tweens.Tween | null = null;

  private skyWidth = 0;
  private skyHeight = 0;
  private groundHeight = 0;
  private currentBiome = '';
  private currentTimeOfDay = TimeOfDay.Morning;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create all sky and ground layers.
   * Call once in scene.create().
   */
  create(groundY: number): void {
    const { width, height } = this.scene.cameras.main;
    this.skyWidth = width;
    this.skyHeight = groundY;
    this.groundHeight = height - groundY;

    // Sky gradient sprite (depth 0)
    this.createSkyTexture('sky_gradient', this.skyWidth, this.skyHeight, SKY_GRADIENTS[TimeOfDay.Morning]);
    this.skySprite = this.scene.add.sprite(width / 2, this.skyHeight / 2, 'sky_gradient');
    this.skySprite.setDepth(0);

    // Ground gradient sprite (depth 0)
    this.createGroundTexture('ground_gradient', this.skyWidth, this.groundHeight, DEFAULT_GROUND);
    this.groundSprite = this.scene.add.sprite(
      width / 2,
      groundY + this.groundHeight / 2,
      'ground_gradient',
    );
    this.groundSprite.setDepth(0);

    // Ground time-of-day tint overlay (depth 0.1)
    this.groundTintRect = this.scene.add.rectangle(
      width / 2, groundY + this.groundHeight / 2,
      width, this.groundHeight, 0x000000, 0,
    );
    this.groundTintRect.setDepth(0.1);

    // Horizon blend gradient (depth 1 — soft sky↔ground transition)
    this.createHorizonBlend(width, groundY);

    // Atmospheric overlay (depth 25 — low-alpha mood tint over entire scene)
    this.atmosphereOverlay = this.scene.add.rectangle(
      width / 2, height / 2, width, height, 0x000000, 0,
    );
    this.atmosphereOverlay.setDepth(25);

    // Celestial body placeholder (depth 0, above gradient)
    this.celestialGlow = this.scene.add.circle(0, 0, 1, 0x000000, 0);
    this.celestialGlow.setDepth(0);
    this.celestialGlow.setVisible(false);

    this.moonShadow = this.scene.add.circle(0, 0, 1, 0x000000, 0);
    this.moonShadow.setDepth(0);
    this.moonShadow.setVisible(false);

    this.celestialBody = this.scene.add.circle(0, 0, 1, 0x000000, 0);
    this.celestialBody.setDepth(0);
    this.celestialBody.setVisible(false);
  }

  /**
   * Update sky for a new time of day.
   */
  setTimeOfDay(timeOfDay: TimeOfDay): void {
    const def = SKY_GRADIENTS[timeOfDay];
    if (!def) return;
    this.currentTimeOfDay = timeOfDay;

    // Redraw sky gradient
    this.createSkyTexture('sky_gradient', this.skyWidth, this.skyHeight, def);
    if (this.skySprite) {
      this.skySprite.setTexture('sky_gradient');
    }

    // Re-render ground with current biome (time tint changes)
    if (this.currentBiome) {
      this.renderGround();
    }

    // Update ground time-of-day tint overlay
    const groundTint = GROUND_TIME_TINTS[timeOfDay];
    if (this.groundTintRect && groundTint) {
      this.groundTintRect.setFillStyle(groundTint.color, groundTint.alpha);
    }

    // Update atmospheric overlay
    const atmo = ATMOSPHERE_TINTS[timeOfDay];
    if (this.atmosphereOverlay && atmo) {
      this.atmosphereOverlay.setFillStyle(atmo.color, atmo.alpha);
    }

    // Update horizon blend
    this.updateHorizonBlend();

    // Update celestial body
    this.updateCelestial(def.celestial);
  }

  /**
   * Update ground for a new biome.
   */
  setBiome(biome: string): void {
    this.currentBiome = biome;
    this.renderGround();
    this.updateHorizonBlend();
  }

  private renderGround(): void {
    const def = BIOME_GROUND[this.currentBiome] ?? DEFAULT_GROUND;
    this.createGroundTexture('ground_gradient', this.skyWidth, this.groundHeight, def);
    if (this.groundSprite) {
      this.groundSprite.setTexture('ground_gradient');
    }
  }

  destroy(): void {
    this.glowTween?.destroy();
    this.hazeTween?.destroy();
    this.skySprite?.destroy();
    this.groundSprite?.destroy();
    this.groundTintRect?.destroy();
    this.horizonBlendSprite?.destroy();
    this.atmosphereOverlay?.destroy();
    this.celestialBody?.destroy();
    this.celestialGlow?.destroy();
    this.moonShadow?.destroy();

    for (const key of ['sky_gradient', 'ground_gradient', 'horizon_blend']) {
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
    }
  }

  // ============================================================
  // TEXTURE CREATION
  // ============================================================

  private createSkyTexture(key: string, w: number, h: number, def: SkyGradientDef): void {
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    const canvas = this.scene.textures.createCanvas(key, w, h);
    if (!canvas) return;

    const ctx = canvas.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, def.top);
    gradient.addColorStop(0.5, def.mid);
    gradient.addColorStop(1.0, def.bottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    canvas.refresh();
  }

  private createGroundTexture(key: string, w: number, h: number, def: GroundGradientDef): void {
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    const canvas = this.scene.textures.createCanvas(key, w, h);
    if (!canvas) return;

    const ctx = canvas.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, def.top);
    gradient.addColorStop(0.4, def.mid);
    gradient.addColorStop(1, def.bottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    canvas.refresh();
  }

  // ============================================================
  // HORIZON BLEND
  // ============================================================

  private createHorizonBlend(width: number, groundY: number): void {
    const blendH = 40;
    this.createHorizonBlendTexture(width, blendH);
    this.horizonBlendSprite = this.scene.add.sprite(
      width / 2, groundY, 'horizon_blend',
    );
    this.horizonBlendSprite.setDepth(1);
  }

  private updateHorizonBlend(): void {
    if (!this.horizonBlendSprite) return;

    this.hazeTween?.destroy();
    this.hazeTween = null;

    this.createHorizonBlendTexture(this.skyWidth, 40);
    this.horizonBlendSprite.setTexture('horizon_blend');

    // Subtle pulse at dawn/sunset for atmospheric warmth
    const def = SKY_GRADIENTS[this.currentTimeOfDay];
    if (def && def.haze.alpha >= 0.15) {
      this.hazeTween = this.scene.tweens.add({
        targets: this.horizonBlendSprite,
        alpha: { from: 0.7, to: 1 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.horizonBlendSprite.setAlpha(1);
    }
  }

  private createHorizonBlendTexture(w: number, h: number): void {
    const key = 'horizon_blend';
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    const canvas = this.scene.textures.createCanvas(key, w, h);
    if (!canvas) return;

    const skyDef = SKY_GRADIENTS[this.currentTimeOfDay];
    const groundDef = BIOME_GROUND[this.currentBiome] ?? DEFAULT_GROUND;
    const hazeColor = skyDef?.haze.color ?? '#888888';
    const hazeAlpha = skyDef?.haze.alpha ?? 0.1;

    // Convert 6-digit hex to rgba() string with given alpha (0-1).
    const hexRgba = (hex: string, a: number): string => {
      const c = Phaser.Display.Color.HexStringToColor(hex);
      return `rgba(${c.red},${c.green},${c.blue},${a.toFixed(3)})`;
    };

    const ctx = canvas.getContext();
    // Blend from transparent sky-bottom → haze color → transparent ground-top
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, hexRgba(skyDef?.bottom ?? '#000000', 0));
    gradient.addColorStop(0.3, hexRgba(hazeColor, hazeAlpha));
    gradient.addColorStop(0.5, hexRgba(hazeColor, hazeAlpha * 0.78));
    gradient.addColorStop(0.7, hexRgba(groundDef.top, hazeAlpha * 0.70));
    gradient.addColorStop(1, hexRgba(groundDef.top, 0));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    canvas.refresh();
  }

  // ============================================================
  // CELESTIAL BODY (SUN / MOON)
  // ============================================================

  private updateCelestial(def: CelestialDef | null): void {
    this.glowTween?.destroy();
    this.glowTween = null;

    if (!def || !this.celestialBody || !this.celestialGlow || !this.moonShadow) {
      this.celestialBody?.setVisible(false);
      this.celestialGlow?.setVisible(false);
      this.moonShadow?.setVisible(false);
      return;
    }

    const x = this.skyWidth * def.xFrac;
    const y = this.skyHeight * def.yFrac;

    // Glow (behind body)
    this.celestialGlow.setPosition(x, y);
    this.celestialGlow.setRadius(def.glowRadius);
    this.celestialGlow.setFillStyle(def.color, def.glowAlpha);
    this.celestialGlow.setVisible(true);
    this.celestialGlow.setDepth(0);

    // Body
    this.celestialBody.setPosition(x, y);
    this.celestialBody.setRadius(def.radius);
    this.celestialBody.setFillStyle(def.color, def.type === 'moon' ? 0.9 : 1);
    this.celestialBody.setVisible(true);
    this.celestialBody.setDepth(0);

    // Moon crescent (dark overlay offset to create crescent shape)
    if (def.type === 'moon') {
      this.moonShadow.setPosition(x + 3, y - 2);
      this.moonShadow.setRadius(def.radius * 0.85);
      // Derive color from sky mid-tone to perfectly blend with gradient
      const nightMid = SKY_GRADIENTS[this.currentTimeOfDay]?.mid ?? '#0e1428';
      const shadowColor = Phaser.Display.Color.HexStringToColor(nightMid).color;
      this.moonShadow.setFillStyle(shadowColor, 1);
      this.moonShadow.setVisible(true);
      this.moonShadow.setDepth(0);
    } else {
      this.moonShadow.setVisible(false);
    }

    // Subtle glow pulse
    this.glowTween = this.scene.tweens.add({
      targets: this.celestialGlow,
      alpha: { from: def.glowAlpha * 0.7, to: def.glowAlpha * 1.3 },
      duration: def.type === 'moon' ? 3000 : 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
