/**
 * Frontier — CharacterSprite
 *
 * Wraps Phaser.GameObjects.Sprite with:
 *   - FSM transition validation (VALID_TRANSITIONS)
 *   - Facing direction with flipX
 *   - Accessory overlay management
 *   - Pace-aware frame rate adjustment
 *   - Dev mode colored-rectangle fallback
 *
 * Imports: types/ and phaser/ (sprite-registry, animation-registry) only.
 */

import Phaser from 'phaser';
import {
  AnimationState,
  FacingDirection,
  isValidTransition,
} from '@/types/animation';
import type { SpriteSheetConfig, AccessoryConfig } from '@/types/animation';
import { animKey } from '@/phaser/animation-registry';
import { PLACEHOLDER_COLORS, SHEET_COLS, SPRITE_SCALE } from '@/phaser/sprite-registry';

// ============================================================
// CHARACTER SPRITE
// ============================================================

/** Rim light scale factor — slightly larger than base for glow edge. */
const RIM_SCALE_FACTOR = 1.06;
/** Rim light base alpha. */
const RIM_ALPHA = 0.35;

export class CharacterSprite {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly config: SpriteSheetConfig;

  /** Rim light sprite — rendered behind the main sprite for edge glow. */
  private rimSprite?: Phaser.GameObjects.Sprite;

  private currentState: AnimationState = AnimationState.Idle;
  private facing: FacingDirection = FacingDirection.Right;
  private paceMultiplier = 1.0;
  private accessories: Map<string, AccessoryOverlay> = new Map();
  private isPlaceholder: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: SpriteSheetConfig,
    accessoryConfigs?: AccessoryConfig[],
  ) {
    this.config = config;
    this.isPlaceholder = !scene.textures.exists(config.key);

    if (this.isPlaceholder) {
      // Dev mode: create a colored rectangle as a placeholder texture
      this.createPlaceholderTexture(scene, config);
    }

    // Apply proportional scaling (horse = 1.0 reference)
    const scale = SPRITE_SCALE[config.key] ?? 1.0;

    // Rim light sprite — slightly larger, rendered behind main for edge glow
    if (!this.isPlaceholder) {
      this.rimSprite = scene.add.sprite(x, y, config.key, 0);
      this.rimSprite.setOrigin(0.5, 1);
      this.rimSprite.setScale(scale * RIM_SCALE_FACTOR);
      this.rimSprite.setAlpha(RIM_ALPHA);
      this.rimSprite.setTint(0xd4b896); // default dawn rim
    }

    this.sprite = scene.add.sprite(x, y, config.key, 0);
    this.sprite.setOrigin(0.5, 1); // Anchor at feet for ground-line alignment
    this.sprite.setScale(scale);

    // Create accessory overlays
    if (accessoryConfigs) {
      for (const accConfig of accessoryConfigs) {
        this.addAccessory(scene, accConfig);
      }
    }

    // Start in Idle
    this.playState(AnimationState.Idle);

    // Sub-pixel breathing — gentle scaleY oscillation prevents static "frozen" look
    // (Visual Style Guide §3: Secondary Motion)
    scene.tweens.add({
      targets: this.sprite,
      scaleY: { from: scale, to: scale * 1.015 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Sync breathing to rim sprite
    if (this.rimSprite) {
      const rimScale = scale * RIM_SCALE_FACTOR;
      scene.tweens.add({
        targets: this.rimSprite,
        scaleY: { from: rimScale, to: rimScale * 1.015 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Sync breathing to accessories
    for (const acc of this.accessories.values()) {
      acc.sprite.setScale(scale);
      scene.tweens.add({
        targets: acc.sprite,
        scaleY: { from: scale, to: scale * 1.015 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  /**
   * Transition to a new animation state.
   * Validates the transition via VALID_TRANSITIONS.
   * Returns true if the transition was accepted.
   */
  playState(state: AnimationState): boolean {
    // Allow self-transition and initial play
    if (state !== this.currentState) {
      if (!isValidTransition(this.currentState, state)) {
        console.warn(
          `[CharacterSprite] Invalid transition: ${this.currentState} -> ${state} for ${this.config.key}`,
        );
        return false;
      }
    }

    this.currentState = state;
    const key = animKey(this.config.key, state);

    if (this.sprite.scene.anims.exists(key)) {
      this.sprite.play(key);
      this.applyPaceToAnimation();
    }

    // Sync rim sprite to same animation
    if (this.rimSprite && this.sprite.scene.anims.exists(key)) {
      this.rimSprite.play(key);
      const rowConfig = this.config.rows[state];
      this.rimSprite.anims.msPerFrame =
        1000 / (rowConfig.baseFrameRate * this.paceMultiplier);
    }

    // Sync accessories to same state
    for (const acc of this.accessories.values()) {
      acc.syncState(state, this.paceMultiplier);
    }

    return true;
  }

  getCurrentState(): AnimationState {
    return this.currentState;
  }

  // ============================================================
  // FACING / FLIP
  // ============================================================

  /**
   * Set facing direction. Flips sprite horizontally for left.
   * Flip-exempt accessories use their own logic.
   */
  setFacing(direction: FacingDirection): void {
    this.facing = direction;
    const flip = direction === FacingDirection.Left;
    this.sprite.setFlipX(flip);
    this.rimSprite?.setFlipX(flip);

    for (const acc of this.accessories.values()) {
      acc.syncFacing(flip);
    }
  }

  getFacing(): FacingDirection {
    return this.facing;
  }

  // ============================================================
  // PACE
  // ============================================================

  /**
   * Update the animation speed based on travel pace.
   */
  updatePaceMultiplier(multiplier: number): void {
    this.paceMultiplier = multiplier;
    this.applyPaceToAnimation();

    for (const acc of this.accessories.values()) {
      acc.syncState(this.currentState, this.paceMultiplier);
    }
  }

  private applyPaceToAnimation(): void {
    if (this.sprite.anims.currentAnim) {
      const rowConfig = this.config.rows[this.currentState];
      const msPerFrame = 1000 / (rowConfig.baseFrameRate * this.paceMultiplier);
      this.sprite.anims.msPerFrame = msPerFrame;
      if (this.rimSprite?.anims.currentAnim) {
        this.rimSprite.anims.msPerFrame = msPerFrame;
      }
    }
  }

  // ============================================================
  // ACCESSORIES
  // ============================================================

  private addAccessory(scene: Phaser.Scene, accConfig: AccessoryConfig): void {
    const overlay = new AccessoryOverlay(scene, this, accConfig);
    this.accessories.set(accConfig.id, overlay);
  }

  toggleAccessory(id: string, visible: boolean): void {
    const acc = this.accessories.get(id);
    if (acc) {
      acc.setVisible(visible);
    }
  }

  // ============================================================
  // POSITION / VISIBILITY
  // ============================================================

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.rimSprite?.setPosition(x, y);
    for (const acc of this.accessories.values()) {
      acc.syncPosition();
    }
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.rimSprite?.setVisible(visible);
    for (const acc of this.accessories.values()) {
      if (visible) {
        acc.syncPosition();
      } else {
        acc.sprite.setVisible(false);
      }
    }
  }

  setTint(color: number): void {
    this.sprite.setTint(color);
    for (const acc of this.accessories.values()) {
      acc.sprite.setTint(color);
    }
  }

  clearTint(): void {
    this.sprite.clearTint();
    for (const acc of this.accessories.values()) {
      acc.sprite.clearTint();
    }
  }

  /** Set the rim light glow color (time-of-day or fire tint). */
  setRimTint(color: number): void {
    this.rimSprite?.setTint(color);
  }

  setDepth(depth: number): void {
    // Rim renders behind main sprite
    this.rimSprite?.setDepth(depth - 1);
    this.sprite.setDepth(depth);
    // Accessories render above base sprite
    let d = depth + 1;
    for (const acc of this.accessories.values()) {
      acc.sprite.setDepth(d++);
    }
  }

  destroy(): void {
    for (const acc of this.accessories.values()) {
      acc.sprite.destroy();
    }
    this.accessories.clear();
    this.rimSprite?.destroy();
    this.sprite.destroy();
  }

  // ============================================================
  // PLACEHOLDER TEXTURE (dev mode)
  // ============================================================

  private createPlaceholderTexture(
    scene: Phaser.Scene,
    config: SpriteSheetConfig,
  ): void {
    const color = PLACEHOLDER_COLORS[config.key] ?? 0x666666;
    const totalWidth = config.frameWidth * SHEET_COLS;
    const totalHeight = config.frameHeight * 7; // 7 rows

    const rt = scene.textures.createCanvas(config.key, totalWidth, totalHeight);
    if (!rt) return;

    const ctx = rt.getContext();
    if (!ctx) return;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    // Draw a colored rectangle in each used frame cell
    const states = Object.values(AnimationState);
    for (const state of states) {
      const rowConfig = config.rows[state];
      if (!rowConfig || rowConfig.frameCount === 0) continue;

      for (let col = 0; col < rowConfig.frameCount; col++) {
        const x = col * config.frameWidth;
        const y = rowConfig.row * config.frameHeight;

        // Fill with entity color
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x + 2, y + 2, config.frameWidth - 4, config.frameHeight - 4);

        // Outline
        ctx.strokeStyle = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, config.frameWidth - 4, config.frameHeight - 4);
      }
    }

    rt.refresh();

    // Register as a spritesheet so Phaser can generate frame numbers
    scene.textures.get(config.key).add(
      '__BASE',
      0,
      0,
      0,
      totalWidth,
      totalHeight,
    );

    // Add individual frames for the spritesheet
    let frameIndex = 0;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < SHEET_COLS; col++) {
        scene.textures.get(config.key).add(
          frameIndex,
          0,
          col * config.frameWidth,
          row * config.frameHeight,
          config.frameWidth,
          config.frameHeight,
        );
        frameIndex++;
      }
    }
  }
}

// ============================================================
// ACCESSORY OVERLAY
// ============================================================

class AccessoryOverlay {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly parent: CharacterSprite;
  private readonly accConfig: AccessoryConfig;

  constructor(
    scene: Phaser.Scene,
    parent: CharacterSprite,
    accConfig: AccessoryConfig,
  ) {
    this.parent = parent;
    this.accConfig = accConfig;

    const textureKey = accConfig.spriteKey;
    this.sprite = scene.add.sprite(0, 0, textureKey, 0);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setVisible(accConfig.visible);

    this.syncPosition();
  }

  syncState(state: AnimationState, paceMultiplier: number): void {
    if (!this.sprite.visible) return;

    const parentConfig = this.parent.config;
    // Accessories use matching spritesheet key from accConfig
    const key = animKey(this.accConfig.spriteKey, state);

    if (this.sprite.scene.anims.exists(key)) {
      this.sprite.play(key);
      const rowConfig = parentConfig.rows[state];
      this.sprite.anims.msPerFrame =
        1000 / (rowConfig.baseFrameRate * paceMultiplier);
    }
  }

  syncFacing(flip: boolean): void {
    if (this.accConfig.flipExempt) {
      // Flip-exempt accessories don't flip with the parent
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setFlipX(flip);
    }
    this.syncPosition();
  }

  syncPosition(): void {
    const px = this.parent.sprite.x;
    const py = this.parent.sprite.y;
    const flip = this.parent.sprite.flipX;

    const ox = flip ? -this.accConfig.offsetX : this.accConfig.offsetX;
    const oy = this.accConfig.offsetY;

    this.sprite.setPosition(px + ox, py + oy);
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    if (visible) this.syncPosition();
  }
}
