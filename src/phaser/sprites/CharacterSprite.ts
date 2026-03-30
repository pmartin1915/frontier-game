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
  private walkBobTween?: Phaser.Tweens.Tween;
  private strideTween?: Phaser.Tweens.Tween;
  private rimStrideTween?: Phaser.Tweens.Tween;
  private headNodTween?: Phaser.Tweens.Tween;
  private breathingTween?: Phaser.Tweens.Tween;
  private rimBreathingTween?: Phaser.Tweens.Tween;
  private accessoryBreathingTweens: Phaser.Tweens.Tween[] = [];
  private lastWalkState?: AnimationState;
  private baseY = 0;
  private baseX = 0;

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
    this.baseY = y;
    this.baseX = x;

    // Create accessory overlays
    if (accessoryConfigs) {
      for (const accConfig of accessoryConfigs) {
        this.addAccessory(scene, accConfig);
      }
    }

    // Start in Idle
    this.playState(AnimationState.Idle);

    // Sub-pixel breathing — gentle scaleY oscillation prevents static "frozen" look.
    // Paused during Walk/Run to avoid conflict with stride stretch tween.
    // Horses breathe slower (3500ms) for a more natural large-animal cadence.
    const isHorse = config.key.includes('horse');
    const breathDuration = isHorse ? 3500 : 2000;

    this.breathingTween = scene.tweens.add({
      targets: this.sprite,
      scaleY: { from: scale, to: scale * 1.015 },
      duration: breathDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Sync breathing to rim sprite
    if (this.rimSprite) {
      const rimScale = scale * RIM_SCALE_FACTOR;
      this.rimBreathingTween = scene.tweens.add({
        targets: this.rimSprite,
        scaleY: { from: rimScale, to: rimScale * 1.015 },
        duration: breathDuration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Sync breathing to accessories
    for (const acc of this.accessories.values()) {
      acc.sprite.setScale(scale);
      const accTween = scene.tweens.add({
        targets: acc.sprite,
        scaleY: { from: scale, to: scale * 1.015 },
        duration: breathDuration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.accessoryBreathingTweens.push(accTween);
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
    // Guard against calls after destroy (scene shutdown race)
    if (!this.sprite.scene) return false;

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

    // Pause breathing during movement states to avoid conflict with stride stretch.
    const NON_BREATHING = [AnimationState.Walk, AnimationState.Run, AnimationState.Ride];
    const shouldBreathe = !NON_BREATHING.includes(state);
    if (this.breathingTween) this.breathingTween.paused = !shouldBreathe;
    if (this.rimBreathingTween) this.rimBreathingTween.paused = !shouldBreathe;
    for (const t of this.accessoryBreathingTweens) t.paused = !shouldBreathe;

    // Walk-bob: gentle vertical bounce to convey movement
    this.updateWalkBob(state);

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
      const safeMultiplier = Math.max(0.01, this.paceMultiplier);
      const msPerFrame = 1000 / (rowConfig.baseFrameRate * safeMultiplier);
      this.sprite.anims.msPerFrame = msPerFrame;
      if (this.rimSprite?.anims.currentAnim) {
        this.rimSprite.anims.msPerFrame = msPerFrame;
      }
    }
  }

  /**
   * Start or stop walk motion tweens:
   * 1. Vertical bob — scaled to entity size (horses bob more than humans)
   * 2. Stride stretch — subtle scaleX oscillation simulating body compression
   * 3. Head nod — x-position oscillation for horses (natural head motion)
   */
  private updateWalkBob(state: AnimationState): void {
    const isWalking = state === AnimationState.Walk || state === AnimationState.Run;

    // Recreate tweens if switching between Walk↔Run (different bob timing)
    if (isWalking && this.walkBobTween && state !== this.lastWalkState) {
      this.walkBobTween?.remove();
      this.walkBobTween = undefined;
      this.strideTween?.remove();
      this.strideTween = undefined;
      this.rimStrideTween?.remove();
      this.rimStrideTween = undefined;
      this.headNodTween?.remove();
      this.headNodTween = undefined;
    }

    if (isWalking && !this.walkBobTween) {
      this.lastWalkState = state;
      const isRunning = state === AnimationState.Run;
      const isHorse = this.config.key.includes('horse');
      const scale = SPRITE_SCALE[this.config.key] ?? 1.0;

      // Bob scales with entity size: horses (80px) bob more than humans (64px)
      const sizeFactor = this.config.frameHeight / 64;
      const baseBob = isRunning ? 3 : 2;
      const bobAmount = Math.round(baseBob * sizeFactor * (isHorse ? 1.5 : 1));
      const bobDuration = isRunning ? 200 : 350;

      // Collect all sprites that should move together
      const accSprites = Array.from(this.accessories.values()).map(a => a.sprite);

      const yTargets: Phaser.GameObjects.Sprite[] = [this.sprite, ...accSprites];
      if (this.rimSprite) yTargets.push(this.rimSprite);

      // 1. Vertical bob
      this.walkBobTween = this.sprite.scene.tweens.add({
        targets: yTargets,
        y: { from: this.baseY, to: this.baseY - bobAmount },
        duration: bobDuration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // 2. Stride stretch — body compresses/extends during gait
      const stretchAmount = isHorse ? 0.03 : 0.02;
      this.strideTween = this.sprite.scene.tweens.add({
        targets: [this.sprite, ...accSprites],
        scaleX: { from: scale * (1 - stretchAmount), to: scale * (1 + stretchAmount) },
        duration: bobDuration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Rim sprite gets its own stride tween (different base scale)
      if (this.rimSprite) {
        const rimScale = scale * RIM_SCALE_FACTOR;
        this.rimStrideTween = this.sprite.scene.tweens.add({
          targets: this.rimSprite,
          scaleX: { from: rimScale * (1 - stretchAmount), to: rimScale * (1 + stretchAmount) },
          duration: bobDuration,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      // 3. Head nod — horses naturally bob their head forward/back while walking
      if (isHorse) {
        const nodAmount = isRunning ? 3 : 2;
        const xTargets: Phaser.GameObjects.Sprite[] = [this.sprite, ...accSprites];
        if (this.rimSprite) xTargets.push(this.rimSprite);

        this.headNodTween = this.sprite.scene.tweens.add({
          targets: xTargets,
          x: { from: this.baseX - nodAmount, to: this.baseX + nodAmount },
          duration: bobDuration * 2, // Half the frequency of the bob
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (!isWalking && (this.walkBobTween || this.strideTween || this.headNodTween)) {
      this.walkBobTween?.remove();
      this.walkBobTween = undefined;
      this.strideTween?.remove();
      this.strideTween = undefined;
      this.rimStrideTween?.remove();
      this.rimStrideTween = undefined;
      this.headNodTween?.remove();
      this.headNodTween = undefined;

      // Reset position and scaleX only — scaleY is owned by the breathing tween.
      const scale = SPRITE_SCALE[this.config.key] ?? 1.0;
      this.sprite.y = this.baseY;
      this.sprite.x = this.baseX;
      this.sprite.scaleX = scale;
      if (this.rimSprite) {
        this.rimSprite.y = this.baseY;
        this.rimSprite.x = this.baseX;
        this.rimSprite.scaleX = scale * RIM_SCALE_FACTOR;
      }
      for (const acc of this.accessories.values()) {
        acc.sprite.scaleX = scale;
        acc.syncPosition();
      }
      this.lastWalkState = undefined;
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
    this.baseX = x;
    this.baseY = y;
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
    this.breathingTween?.remove();
    this.rimBreathingTween?.remove();
    for (const t of this.accessoryBreathingTweens) t.remove();
    this.walkBobTween?.remove();
    this.strideTween?.remove();
    this.rimStrideTween?.remove();
    this.headNodTween?.remove();
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
    // Track state even when invisible so accessories are correct when re-shown.
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
