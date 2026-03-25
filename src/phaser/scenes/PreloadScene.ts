/**
 * Frontier — PreloadScene
 *
 * Loads sprite sheet assets and registers animations.
 * In dev mode (missing PNGs), generates placeholder colored-rectangle textures.
 * Shows a simple progress bar during loading.
 *
 * Transitions to TrailScene on complete.
 */

import Phaser from 'phaser';
import {
  SPRITE_CONFIGS,
  PLACEHOLDER_COLORS,
  SHEET_COLS,
} from '@/phaser/sprite-registry';
import { registerAllAnimations } from '@/phaser/animation-registry';
import { MAP_OBJECTS } from '@/types/map-objects';

export class PreloadScene extends Phaser.Scene {
  private progressBar?: Phaser.GameObjects.Graphics;
  private progressText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.createProgressBar();

    // Track loading progress
    this.load.on('progress', (value: number) => {
      this.updateProgressBar(value);
    });

    // Attempt to load all sprite sheets
    let assetsQueued = 0;
    for (const config of Object.values(SPRITE_CONFIGS)) {
      // Queue the spritesheet load — Phaser will handle missing files gracefully
      this.load.spritesheet(config.key, config.path, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
      assetsQueued++;
    }

    // Load map object images (static PNGs, not spritesheets)
    for (const obj of Object.values(MAP_OBJECTS)) {
      this.load.image(obj.key, obj.path);
      assetsQueued++;
    }

    // Load tileable ground textures (GroundScroll falls back to procedural if missing)
    const GROUND_BIOMES = [
      'crossTimbers', 'stakedPlains', 'desertApproach',
      'pecosValley', 'highDesert', 'mountainPass', 'coloradoPlains',
    ];
    for (const biome of GROUND_BIOMES) {
      this.load.image(`ground_${biome}`, `assets/backgrounds/ground_${biome}.png`);
      assetsQueued++;
    }

    // If no assets queued, we'll go straight to create
    if (assetsQueued === 0) {
      this.load.on('complete', () => this.onLoadComplete());
    }
  }

  create(): void {
    // Generate placeholder textures for any sprites that failed to load
    this.generatePlaceholders();

    // Register all animations from loaded/placeholder textures
    registerAllAnimations(this);

    // Clean up progress bar
    this.progressBar?.destroy();
    this.progressText?.destroy();

    // Fade out, then transition to TrailScene
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TrailScene');
    });
  }

  // ============================================================
  // PROGRESS BAR
  // ============================================================

  private createProgressBar(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const barW = Math.min(this.cameras.main.width * 0.6, 240);

    this.progressBar = this.add.graphics();

    // Background bar
    this.progressBar.fillStyle(0x333333, 0.8);
    this.progressBar.fillRect(cx - barW / 2, cy - 8, barW, 16);

    // Text
    this.progressText = this.add
      .text(cx, cy - 24, 'Loading assets...', {
        fontSize: '12px',
        color: '#c4b08b',
        fontFamily: 'Georgia, serif',
      })
      .setOrigin(0.5);
  }

  private updateProgressBar(value: number): void {
    if (!this.progressBar) return;

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const barW = Math.min(this.cameras.main.width * 0.6, 240);

    // Clear and redraw
    this.progressBar.clear();

    // Background
    this.progressBar.fillStyle(0x333333, 0.8);
    this.progressBar.fillRect(cx - barW / 2, cy - 8, barW, 16);

    // Fill
    this.progressBar.fillStyle(0xc4b08b, 1);
    this.progressBar.fillRect(cx - barW / 2 + 2, cy - 6, (barW - 4) * value, 12);
  }

  private onLoadComplete(): void {
    this.updateProgressBar(1);
  }

  // ============================================================
  // PLACEHOLDER GENERATION
  // ============================================================

  /**
   * Generate colored-rectangle placeholder textures for any sprite sheet
   * that didn't load successfully. This ensures the game runs in dev mode
   * without real PNG assets.
   */
  private generatePlaceholders(): void {
    for (const config of Object.values(SPRITE_CONFIGS)) {
      if (this.textures.exists(config.key)) {
        // Check if it loaded properly (has correct frame count)
        const texture = this.textures.get(config.key);
        if (texture.frameTotal > 1) continue; // Real texture loaded
      }

      // Remove failed texture if it exists
      if (this.textures.exists(config.key)) {
        this.textures.remove(config.key);
      }

      this.createPlaceholderTexture(config.key, config.frameWidth, config.frameHeight);
    }
  }

  private createPlaceholderTexture(
    key: string,
    frameWidth: number,
    frameHeight: number,
  ): void {
    const color = PLACEHOLDER_COLORS[key] ?? 0x666666;
    const rows = 7;
    const totalWidth = frameWidth * SHEET_COLS;
    const totalHeight = frameHeight * rows;

    const rt = this.textures.createCanvas(key, totalWidth, totalHeight);
    if (!rt) return;

    const ctx = rt.getContext();
    if (!ctx) return;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const config = SPRITE_CONFIGS[key];
    if (!config) return;

    // Draw colored rectangle in each used frame cell
    for (const rowConfig of Object.values(config.rows)) {
      for (let col = 0; col < rowConfig.frameCount; col++) {
        const x = col * frameWidth;
        const y = rowConfig.row * frameHeight;

        // Fill body
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x + 2, y + 2, frameWidth - 4, frameHeight - 4);

        // Outline
        ctx.strokeStyle = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, frameWidth - 4, frameHeight - 4);

        // Frame number label
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.fillText(`${col}`, x + 4, y + frameHeight - 6);
      }
    }

    rt.refresh();

    // Add individual frame data to the texture
    let frameIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < SHEET_COLS; col++) {
        this.textures.get(key).add(
          frameIndex,
          0,
          col * frameWidth,
          row * frameHeight,
          frameWidth,
          frameHeight,
        );
        frameIndex++;
      }
    }
  }
}
