/**
 * Frontier — CampScene
 *
 * Atmospheric night camp scene with animated campfire,
 * seated characters, twinkling stars, and warm lighting.
 *
 * Imports: types/ and store/ only (per architecture rules).
 */

import Phaser from 'phaser';
import { store } from '@/store';
import type { GameCommand } from '@/types/animation';
import { FacingDirection, COMPANION_ACCESSORIES } from '@/types/animation';
import type { CompanionId } from '@/types/companions';
import { MAP_OBJECTS } from '@/types/map-objects';
import { CharacterSprite } from '@/phaser/sprites/CharacterSprite';
import { SPRITE_CONFIGS } from '@/phaser/sprite-registry';

/** Biomes where fireflies appear (warm, vegetated). */
const FIREFLY_BIOMES = new Set(['crossTimbers', 'coloradoPlains', 'pecosValley']);

export class CampScene extends Phaser.Scene {
  private unsubscribers: (() => void)[] = [];
  private stars: Phaser.GameObjects.Arc[] = [];
  private fireParticles: Phaser.GameObjects.Arc[] = [];
  private fireflies: Phaser.GameObjects.Arc[] = [];
  private campSprites: CharacterSprite[] = [];

  constructor() {
    super({ key: 'CampScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const groundY = Math.floor(height * 0.72);

    // --- Night sky gradient ---
    this.createNightSky(width, groundY);

    // --- Ground gradient ---
    this.createNightGround(width, height, groundY);

    // --- Moon ---
    this.createMoon(width, groundY);

    // --- Stars + Milky Way ---
    this.createStarfield(width, groundY);

    // --- Horizon warmth (campfire glow reflected at horizon) ---
    const horizonWarmth = this.add.rectangle(width / 2, groundY, width, 20, 0xff6600, 0.05);
    horizonWarmth.setDepth(1);
    this.tweens.add({
      targets: horizonWarmth,
      alpha: { from: 0.03, to: 0.07 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- Camp props (tent, bedroll, lantern) ---
    this.createCampProps(width / 2, groundY);

    // --- Campfire (sprite + animated effects) ---
    this.createCampfire(width / 2, groundY);

    // --- Warm light glow ---
    const fireGlow = this.add.circle(width / 2, groundY - 4, 80, 0xff6600, 0.08);
    fireGlow.setDepth(2);
    this.tweens.add({
      targets: fireGlow,
      alpha: { from: 0.06, to: 0.12 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- Characters seated around fire ---
    this.createSeatedCharacters(width / 2, groundY);

    // --- Fireflies (warm biomes only) ---
    this.createFireflies(width, groundY);

    // --- Camp pet (if adopted) ---
    const state = store.getState();
    if (state.campPet.adopted && !state.campPet.lost) {
      const catConfig = SPRITE_CONFIGS['cat_mouser'];
      if (catConfig) {
        const cat = new CharacterSprite(this, width / 2 + 30, groundY, catConfig);
        cat.setDepth(12);
        cat.setFacing(FacingDirection.Left);
        cat.setTint(0xffcc88);
        this.campSprites.push(cat);
        this.addCampShadow(width / 2 + 30, groundY, 20, 3);
      }
    }

    // Fade in from black
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Emit ready event
    this.game.events.emit('camp-scene-ready');
  }

  update(): void {
    const commands = store.getState().commandQueue;
    if (commands.length > 0) {
      for (const cmd of commands) {
        this.processCommand(cmd);
      }
      store.getState().clearCommands();
    }
  }

  shutdown(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];

    for (const sprite of this.campSprites) {
      sprite.destroy();
    }
    this.campSprites = [];

    this.stars = [];
    this.fireParticles = [];
    for (const ff of this.fireflies) ff.destroy();
    this.fireflies = [];

    // Clean up dynamic canvas textures
    if (this.textures.exists('camp_night_sky')) this.textures.remove('camp_night_sky');
    if (this.textures.exists('camp_night_ground')) this.textures.remove('camp_night_ground');
  }

  // ============================================================
  // VISUAL CREATION
  // ============================================================

  private createNightSky(width: number, groundY: number): void {
    const key = 'camp_night_sky';
    if (this.textures.exists(key)) this.textures.remove(key);

    const canvas = this.textures.createCanvas(key, width, groundY);
    if (!canvas) return;

    const ctx = canvas.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
    gradient.addColorStop(0, '#060814');     // Deep black-blue zenith
    gradient.addColorStop(0.4, '#0e1428');   // Dark indigo
    gradient.addColorStop(0.75, '#1a2040');  // Midnight blue
    gradient.addColorStop(1.0, '#22284a');   // Slightly lighter at horizon
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, groundY);
    canvas.refresh();

    const sky = this.add.sprite(width / 2, groundY / 2, key);
    sky.setDepth(0);
  }

  private createNightGround(width: number, height: number, groundY: number): void {
    const groundH = height - groundY;
    const key = 'camp_night_ground';
    if (this.textures.exists(key)) this.textures.remove(key);

    const canvas = this.textures.createCanvas(key, width, groundH);
    if (!canvas) return;

    const ctx = canvas.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, groundH);
    gradient.addColorStop(0, '#2e2a1e');   // Warm dark brown at horizon (campfire glow)
    gradient.addColorStop(0.3, '#1e1a12'); // Dark earth
    gradient.addColorStop(1.0, '#0e0c08'); // Near-black at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, groundH);
    canvas.refresh();

    const ground = this.add.sprite(width / 2, groundY + groundH / 2, key);
    ground.setDepth(0);
  }

  private createMoon(width: number, groundY: number): void {
    const moonX = width * 0.78;
    const moonY = groundY * 0.18;

    // Outer atmospheric glow
    const outerGlow = this.add.circle(moonX, moonY, 28, 0xaaaacc, 0.03);
    outerGlow.setDepth(0);
    this.tweens.add({
      targets: outerGlow,
      alpha: { from: 0.02, to: 0.05 },
      duration: 3500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Inner glow
    const innerGlow = this.add.circle(moonX, moonY, 16, 0xdddcc8, 0.06);
    innerGlow.setDepth(0);
    this.tweens.add({
      targets: innerGlow,
      alpha: { from: 0.04, to: 0.08 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Moon disc
    const moon = this.add.circle(moonX, moonY, 7, 0xeeeedd, 0.9);
    moon.setDepth(1);

    // Crescent shadow (overlapping darker circle to create crescent)
    const shadow = this.add.circle(moonX + 3, moonY - 2, 6, 0x0a0e1e, 1);
    shadow.setDepth(1);
  }

  private createStarfield(width: number, groundY: number): void {
    // --- Main starfield (90 stars) ---
    const starCount = 90;

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * (groundY * 0.9);

      // Size variation: mostly small, some medium, rare large
      const sizeRoll = Math.random();
      let size: number;
      if (sizeRoll < 0.35) size = 0.5;
      else if (sizeRoll < 0.7) size = 1;
      else if (sizeRoll < 0.9) size = 1.5;
      else size = 2;

      // Color temperature variation
      const colorRoll = Math.random();
      let color: number;
      if (colorRoll < 0.7) color = 0xffffff;       // White
      else if (colorRoll < 0.88) color = 0xffe8cc;  // Warm yellow
      else color = 0xcceeff;                         // Cool blue-white

      // Depth-based brightness: brighter near zenith, dimmer near horizon
      const heightFrac = y / groundY; // 0=top, 1=horizon
      const baseAlpha = (0.3 + Math.random() * 0.6) * (1 - heightFrac * 0.5);

      const star = this.add.circle(x, y, size, color, baseAlpha);
      star.setDepth(1);
      this.stars.push(star);

      // Twinkle — varied periods
      this.tweens.add({
        targets: star,
        alpha: { from: baseAlpha * 0.2, to: baseAlpha },
        duration: 800 + Math.random() * 3200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 3000,
      });
    }

    // --- Milky Way band (diagonal strip, upper-left to lower-right) ---
    const milkyWayCount = 45;
    for (let i = 0; i < milkyWayCount; i++) {
      // Parametric position along diagonal band
      const t = Math.random();
      const bandCenterX = t * width;
      const bandCenterY = t * (groundY * 0.7);

      // Scatter perpendicular to the band (band width ~40px)
      const perpOffset = (Math.random() - 0.5) * 50;
      const x = bandCenterX + perpOffset * 0.7;
      const y = bandCenterY + perpOffset * 0.7;

      if (x < 0 || x > width || y < 0 || y > groundY * 0.85) continue;

      const size = Math.random() < 0.6 ? 0.5 : 1;
      const baseAlpha = 0.15 + Math.random() * 0.35;

      const star = this.add.circle(x, y, size, 0xffeedd, baseAlpha);
      star.setDepth(1);
      this.stars.push(star);

      // Gentle twinkle
      this.tweens.add({
        targets: star,
        alpha: { from: baseAlpha * 0.4, to: baseAlpha },
        duration: 1500 + Math.random() * 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      });
    }
  }

  private createCampfire(cx: number, groundY: number): void {
    const fireY = groundY - 6;
    const campfireDef = MAP_OBJECTS['campfire_lit'];

    // Use real campfire sprite if available, otherwise fall back to geometric
    if (campfireDef && this.textures.exists(campfireDef.key)) {
      const fireSprite = this.add.image(cx, groundY, campfireDef.key);
      fireSprite.setOrigin(0.5, 1);
      fireSprite.setDepth(3);
      // Gentle flicker via scale tween
      this.tweens.add({
        targets: fireSprite,
        scaleY: { from: 0.95, to: 1.05 },
        scaleX: { from: 0.97, to: 1.03 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Geometric fallback
      this.add.circle(cx, groundY, 8, 0x331100).setDepth(3);
      const core = this.add.circle(cx, fireY, 5, 0xff4400, 0.9);
      core.setDepth(4);
      this.tweens.add({
        targets: core,
        scaleY: { from: 0.8, to: 1.2 },
        scaleX: { from: 0.9, to: 1.1 },
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      const inner = this.add.circle(cx, fireY - 2, 3, 0xffaa00, 0.8);
      inner.setDepth(5);
      this.tweens.add({
        targets: inner,
        y: { from: fireY - 1, to: fireY - 4 },
        alpha: { from: 0.8, to: 0.5 },
        scaleY: { from: 1, to: 1.3 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Rising embers (always shown — layered above any campfire)
    for (let i = 0; i < 6; i++) {
      this.createEmber(cx, fireY);
    }
  }

  private createEmber(cx: number, baseY: number): void {
    const ember = this.add.circle(
      cx + (Math.random() - 0.5) * 10,
      baseY,
      1,
      0xff8800,
      0.7,
    );
    ember.setDepth(6);
    this.fireParticles.push(ember);

    const drift = () => {
      ember.setPosition(
        cx + (Math.random() - 0.5) * 10,
        baseY,
      );
      ember.setAlpha(0.7);

      this.tweens.add({
        targets: ember,
        y: baseY - 15 - Math.random() * 20,
        x: ember.x + (Math.random() - 0.5) * 16,
        alpha: 0,
        duration: 800 + Math.random() * 1200,
        ease: 'Sine.easeOut',
        onComplete: drift,
      });
    };

    // Stagger initial starts
    this.time.delayedCall(Math.random() * 1500, drift);
  }

  private createCampProps(cx: number, groundY: number): void {
    // Tent — left side, behind characters
    const tentDef = MAP_OBJECTS['tent_canvas'];
    if (tentDef && this.textures.exists(tentDef.key)) {
      const tent = this.add.image(cx - 80, groundY, tentDef.key);
      tent.setOrigin(0.5, 1);
      tent.setDepth(2);
    }

    // Bedroll — near tent
    const bedrollDef = MAP_OBJECTS['bedroll'];
    if (bedrollDef && this.textures.exists(bedrollDef.key)) {
      const bedroll = this.add.image(cx - 55, groundY, bedrollDef.key);
      bedroll.setOrigin(0.5, 1);
      bedroll.setDepth(2);
    }

    // Cooking pot — right of fire
    const potDef = MAP_OBJECTS['cooking_pot'];
    if (potDef && this.textures.exists(potDef.key)) {
      const pot = this.add.image(cx + 25, groundY, potDef.key);
      pot.setOrigin(0.5, 1);
      pot.setDepth(3);
    }

    // Lantern — near tent
    const lanternDef = MAP_OBJECTS['lantern'];
    if (lanternDef && this.textures.exists(lanternDef.key)) {
      const lantern = this.add.image(cx - 60, groundY - 10, lanternDef.key);
      lantern.setOrigin(0.5, 1);
      lantern.setDepth(7);
      // Warm glow pulse
      this.tweens.add({
        targets: lantern,
        alpha: { from: 0.8, to: 1.0 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createSeatedCharacters(cx: number, groundY: number): void {
    const state = store.getState();
    let depth = 10;
    const FIRE_TINT = 0xffcc88;

    // Player (left of fire, facing right toward campfire)
    const playerConfig = SPRITE_CONFIGS['player_cowboy'];
    if (playerConfig) {
      const player = new CharacterSprite(this, cx - 30, groundY, playerConfig);
      player.setDepth(depth++);
      player.setFacing(FacingDirection.Right);
      player.setTint(FIRE_TINT);
      this.campSprites.push(player);
      this.addCampShadow(cx - 30, groundY, 40, 4);
    }

    // Companions around fire — face toward the center
    const positions = [
      { x: cx + 30, y: groundY, facing: FacingDirection.Left },
      { x: cx - 50, y: groundY + 4, facing: FacingDirection.Right },
      { x: cx + 50, y: groundY + 4, facing: FacingDirection.Left },
    ];

    const companions = state.party.companions.filter((c) => c.status === 'active');

    for (let i = 0; i < companions.length && i < positions.length; i++) {
      const companion = companions[i];
      const pos = positions[i];
      const companionKey = this.companionSpriteKey(companion.id as CompanionId);
      const config = SPRITE_CONFIGS[companionKey];

      if (config) {
        const accessories = COMPANION_ACCESSORIES[companion.id as CompanionId] ?? [];
        const sprite = new CharacterSprite(this, pos.x, pos.y, config, accessories);
        sprite.setDepth(depth++);
        sprite.setFacing(pos.facing);
        sprite.setTint(FIRE_TINT);
        this.campSprites.push(sprite);
        this.addCampShadow(pos.x, pos.y, 40, 4);
      }
    }
  }

  private createFireflies(width: number, groundY: number): void {
    const state = store.getState();
    if (!FIREFLY_BIOMES.has(state.world.biome)) return;

    const count = 8 + Math.floor(Math.random() * 5); // 8-12
    for (let i = 0; i < count; i++) {
      const x = 30 + Math.random() * (width - 60);
      const y = groundY * 0.3 + Math.random() * (groundY * 0.6);

      const ff = this.add.circle(x, y, 1, 0xccff44, 0);
      ff.setDepth(8);
      this.fireflies.push(ff);

      // Glow on/off with random phase
      const peakAlpha = 0.5 + Math.random() * 0.3;
      this.tweens.add({
        targets: ff,
        alpha: { from: 0, to: peakAlpha },
        duration: 1500 + Math.random() * 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 3000,
      });

      // Slow drift (gentle wander)
      const wanderX = () => {
        this.tweens.add({
          targets: ff,
          x: ff.x + (Math.random() - 0.5) * 8,
          y: ff.y + (Math.random() - 0.5) * 6,
          duration: 4000 + Math.random() * 2000,
          ease: 'Sine.easeInOut',
          onComplete: wanderX,
        });
      };
      this.time.delayedCall(Math.random() * 2000, wanderX);
    }
  }

  private addCampShadow(x: number, y: number, w: number, h: number): void {
    const shadow = this.add.ellipse(x, y + 1, w, h, 0x331100, 0.12);
    shadow.setDepth(9);
  }

  private companionSpriteKey(id: CompanionId): string {
    const map: Record<string, string> = {
      eliasCoe: 'companion_elias_base',
      luisaVega: 'companion_luisa_base',
      tomBlanchard: 'companion_tom_base',
    };
    return map[id] ?? `companion_${id.toLowerCase()}_base`;
  }

  // ============================================================
  // COMMAND PROCESSING
  // ============================================================

  private processCommand(cmd: GameCommand): void {
    switch (cmd.type) {
      case 'changeScene':
        if (cmd.scene === 'trail') {
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('TrailScene');
          });
        }
        break;
      // Camp scene ignores other commands
    }
  }
}
