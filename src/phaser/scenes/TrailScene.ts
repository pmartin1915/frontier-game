/**
 * Frontier — TrailScene
 *
 * Main gameplay Phaser scene. Displays the party traveling along the trail.
 * Subscribes to Zustand store for biome/time-of-day changes.
 * Processes the GameCommand queue each frame.
 *
 * Characters positioned along the ground:
 *   horse → player → companions → wagon → cat
 *
 * Imports: types/ and store/ only (via phaser/bridge).
 */

import Phaser from 'phaser';
import { store } from '@/store';
import { subscribePhaser } from '@/phaser/bridge';
import {
  AnimationState,
  TIME_PALETTES,
  RIM_COLORS,
  COMPANION_ACCESSORIES,
  SPRITE_EQUIPMENT_MAPPING,
  DURABILITY_VISUALS,
  getDurabilityTier,
  multiplyTintScalar,
} from '@/types/animation';
import type { GameCommand } from '@/types/animation';
import type { Biome, TimeOfDay, Equipment } from '@/types/game-state';
import { CharacterSprite } from '@/phaser/sprites/CharacterSprite';
import {
  SPRITE_CONFIGS,
  PACE_FRAME_RATE_MULTIPLIER,
} from '@/phaser/sprite-registry';
import { DegradationVisuals } from '@/phaser/effects/degradation-visuals';
import { TrailParticles } from '@/phaser/effects/trail-particles';
import { SkyRenderer } from '@/phaser/effects/sky-renderer';
import { TerrainLayers } from '@/phaser/effects/terrain-layers';
import type { CompanionId } from '@/types/companions';
import { SceneryManager } from '@/phaser/effects/scenery-manager';
import { WeatherOverlay } from '@/phaser/effects/weather-overlay';
import { CloudLayer } from '@/phaser/effects/cloud-layer';
import { GroundScroll } from '@/phaser/effects/ground-scroll';
import { MAP_OBJECTS } from '@/types/map-objects';

// ============================================================
// TRAIL SCENE
// ============================================================

/** Shadow dimensions per entity type (scaled to match SPRITE_SCALE proportions). */
const SHADOW_SIZES: Record<string, { w: number; h: number }> = {
  horse_riding_base: { w: 60, h: 5 },
  horse_riding_tack: { w: 60, h: 5 },
  horse_draft_base: { w: 60, h: 5 },
  horse_draft_harness: { w: 60, h: 5 },
  wagon_prairie_schooner: { w: 88, h: 5 },
  cat_mouser: { w: 12, h: 2 },
};
const DEFAULT_SHADOW = { w: 30, h: 3 };

/** Shadow alpha per time-of-day. */
const SHADOW_ALPHA: Record<string, number> = {
  dawn: 0.25,
  morning: 0.20,
  midday: 0.15,
  afternoon: 0.20,
  sunset: 0.25,
  night: 0.05,
};

export class TrailScene extends Phaser.Scene {
  private sprites: Map<string, CharacterSprite> = new Map();
  private shadows: Map<string, Phaser.GameObjects.Ellipse> = new Map();
  private campfireSprite?: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  private campfireGlow?: Phaser.GameObjects.Arc;
  private campfireEmbers: Phaser.GameObjects.Arc[] = [];
  private unsubscribers: (() => void)[] = [];

  // Sky & ground renderer
  private skyRenderer!: SkyRenderer;
  private terrainLayers!: TerrainLayers;
  private sceneryManager!: SceneryManager;

  // Weather & clouds
  private weatherOverlay!: WeatherOverlay;
  private cloudLayer!: CloudLayer;

  // Scrolling ground texture
  private groundScroll!: GroundScroll;

  // Degradation visuals
  private degradationVisuals!: DegradationVisuals;
  private currentAmbientTint = 0xffffff;
  private entityDurabilityMultipliers: Map<string, number> = new Map();

  // Particle effects
  private particles!: TrailParticles;
  private dustTimer?: Phaser.Time.TimerEvent;
  private breathTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'TrailScene' });
  }

  create(): void {
    const { height } = this.cameras.main;
    const groundY = Math.floor(height * 0.75);

    // Atmospheric sky & ground gradients
    this.skyRenderer = new SkyRenderer(this);
    this.skyRenderer.create(groundY);

    // Procedural terrain silhouettes (between sky and ground)
    this.terrainLayers = new TerrainLayers(this);
    this.terrainLayers.create(groundY);

    // Cloud layer (between sky and terrain silhouettes)
    this.cloudLayer = new CloudLayer(this);
    this.cloudLayer.create(groundY);

    // Depth-layered parallax scenery (behind characters)
    this.sceneryManager = new SceneryManager(this);
    this.sceneryManager.create(groundY);

    // Tileable scrolling ground texture (on top of gradient, behind scenery)
    this.groundScroll = new GroundScroll(this);
    this.groundScroll.create(groundY);

    // Create character sprites
    this.createPartySprites(groundY);

    // Visual effect managers
    this.degradationVisuals = new DegradationVisuals(this);
    this.particles = new TrailParticles(this);

    // Weather overlay (rain, snow, dust, storm, heatwave, overcast)
    this.weatherOverlay = new WeatherOverlay(this);
    this.weatherOverlay.create(groundY);

    // Particle emission timers
    this.dustTimer = this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => this.emitDustForMovingSprites(),
    });
    this.breathTimer = this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => this.emitBreathForIdleSprites(),
    });

    // Subscribe to store changes
    this.subscribeToStore();

    // Apply initial state
    const state = store.getState();
    this.applyBiome(state.world.biome);
    this.applyTimeOfDay(state.world.timeOfDay);
    this.terrainLayers.setBiome(state.world.biome);
    this.terrainLayers.setTimeOfDay(state.world.timeOfDay);
    this.applyPace(state.journey.pace);
    this.sceneryManager.setBiome(state.world.biome);
    this.groundScroll.setBiome(state.world.biome);
    this.groundScroll.setTimeOfDay(state.world.timeOfDay);
    this.applyEquipmentDegradation(state.player.equipment);
    this.particles.setBiome(state.world.biome);
    this.particles.setWeather(state.world.weather);
    this.particles.setTimeOfDay(state.world.timeOfDay);
    this.particles.setPace(state.journey.pace);
    this.weatherOverlay.setBiome(state.world.biome);
    this.weatherOverlay.setWeather(state.world.weather);
    this.weatherOverlay.setTimeOfDay(state.world.timeOfDay);
    this.cloudLayer.setWeather(state.world.weather);
    this.cloudLayer.setTimeOfDay(state.world.timeOfDay);

    // Fade in from black
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Emit connection event
    this.game.events.emit('camp-ready');
  }

  update(_time: number, delta: number): void {
    // Process command queue
    const commands = store.getState().commandQueue;
    if (commands.length > 0) {
      for (const cmd of commands) {
        this.processCommand(cmd);
      }
      store.getState().clearCommands();
    }

    // Parallax scenery scroll — check if any visible sprite is walking/running
    let isMoving = false;
    for (const sprite of this.sprites.values()) {
      if (!sprite.sprite.visible) continue;
      const state = sprite.getCurrentState();
      if (state === AnimationState.Walk || state === AnimationState.Run) {
        isMoving = true;
        break;
      }
    }
    const paceSpeed = PACE_FRAME_RATE_MULTIPLIER[store.getState().journey.pace] ?? 1.0;
    this.sceneryManager.update(delta, isMoving, paceSpeed);
    this.groundScroll.update(delta, isMoving, paceSpeed);
    this.cloudLayer.update(delta, isMoving, paceSpeed);
  }

  shutdown(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    this.skyRenderer?.destroy();
    this.terrainLayers?.destroy();
    this.cloudLayer?.destroy();
    this.sceneryManager?.destroy();
    this.groundScroll?.destroy();
    this.weatherOverlay?.destroy();
    this.degradationVisuals?.destroy();
    this.particles?.destroy();
    this.dustTimer?.destroy();
    this.breathTimer?.destroy();

    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
    for (const shadow of this.shadows.values()) {
      shadow.destroy();
    }
    this.shadows.clear();
    this.entityDurabilityMultipliers.clear();
  }

  // ============================================================
  // SPRITE CREATION
  // ============================================================

  private createPartySprites(groundY: number): void {
    const { width } = this.cameras.main;
    const centerX = Math.floor(width * 0.55);

    // Position: player leads (rightmost), horse behind, companions, wagon, cat
    const spacing = 48;
    let x = centerX;
    let depth = 10;

    // Player (leading the party)
    const playerConfig = SPRITE_CONFIGS['player_cowboy'];
    if (playerConfig) {
      const player = new CharacterSprite(this, x, groundY, playerConfig);
      player.setDepth(depth++);
      this.sprites.set('player_cowboy', player);
      this.createShadow('player_cowboy', x, groundY);
    }

    // Horse (just behind the player)
    x -= spacing;
    const horseConfig = SPRITE_CONFIGS['horse_riding_base'];
    if (horseConfig) {
      const horse = new CharacterSprite(this, x, groundY, horseConfig);
      horse.setDepth(depth++);
      this.sprites.set('horse_riding_base', horse);
      this.createShadow('horse_riding_base', x, groundY);
    }

    // Companions (from store)
    const state = store.getState();
    const companions = state.party.companions.filter((c) => c.status === 'active');
    for (const companion of companions) {
      x -= spacing;
      const companionKey = this.companionSpriteKey(companion.id as CompanionId);
      const config = SPRITE_CONFIGS[companionKey];
      if (config) {
        const accessories = COMPANION_ACCESSORIES[companion.id as CompanionId] ?? [];
        const sprite = new CharacterSprite(this, x, groundY, config, accessories);
        sprite.setDepth(depth++);
        this.sprites.set(companionKey, sprite);
        this.createShadow(companionKey, x, groundY);
      }
    }

    // Wagon (if present — always create, toggle visibility later)
    x -= spacing * 2;
    const wagonConfig = SPRITE_CONFIGS['wagon_prairie_schooner'];
    if (wagonConfig) {
      const wagon = new CharacterSprite(this, x, groundY, wagonConfig);
      wagon.setDepth(depth++);
      wagon.setVisible(false); // Hidden until player acquires wagon
      this.sprites.set('wagon_prairie_schooner', wagon);
      this.createShadow('wagon_prairie_schooner', x, groundY, false);
    }

    // Cat
    x -= spacing;
    const catConfig = SPRITE_CONFIGS['cat_mouser'];
    if (catConfig) {
      const cat = new CharacterSprite(this, x, groundY, catConfig);
      cat.setDepth(depth++);
      const catVisible = state.campPet.adopted && !state.campPet.lost;
      cat.setVisible(catVisible);
      this.sprites.set('cat_mouser', cat);
      this.createShadow('cat_mouser', x, groundY, catVisible);
    }
  }

  private companionSpriteKey(id: CompanionId): string {
    const map: Record<string, string> = {
      eliasCoe: 'companion_elias_base',
      luisaVega: 'companion_luisa_base',
      tomBlanchard: 'companion_tom_base',
    };
    return map[id] ?? `companion_${id.toLowerCase()}_base`;
  }

  private createShadow(key: string, x: number, groundY: number, visible = true): void {
    const size = SHADOW_SIZES[key] ?? DEFAULT_SHADOW;
    const shadow = this.add.ellipse(x, groundY + 1, size.w, size.h, 0x000000, 0.20);
    shadow.setDepth(9);
    shadow.setVisible(visible);
    this.shadows.set(key, shadow);
  }

  private updateShadowAlpha(timeOfDay: string): void {
    const alpha = SHADOW_ALPHA[timeOfDay] ?? 0.15;
    for (const shadow of this.shadows.values()) {
      shadow.setAlpha(alpha);
    }
  }

  // ============================================================
  // STORE SUBSCRIPTIONS
  // ============================================================

  private subscribeToStore(): void {
    // Biome changes
    this.unsubscribers.push(
      subscribePhaser(
        (s) => s.world.biome,
        (biome) => {
          this.applyBiome(biome);
          this.sceneryManager.setBiome(biome);
          this.groundScroll.setBiome(biome);
          this.terrainLayers.setBiome(biome);
          this.particles.setBiome(biome);
          this.weatherOverlay.setBiome(biome);
        },
      ),
    );

    // Time of day changes
    this.unsubscribers.push(
      subscribePhaser(
        (s) => s.world.timeOfDay,
        (timeOfDay) => {
          this.applyTimeOfDay(timeOfDay);
          this.terrainLayers.setTimeOfDay(timeOfDay);
          this.groundScroll.setTimeOfDay(timeOfDay);
          this.particles.setTimeOfDay(timeOfDay);
          this.weatherOverlay.setTimeOfDay(timeOfDay);
          this.cloudLayer.setTimeOfDay(timeOfDay);
        },
      ),
    );

    // Weather changes
    this.unsubscribers.push(
      subscribePhaser(
        (s) => s.world.weather,
        (weather) => {
          this.particles.setWeather(weather);
          this.weatherOverlay.setWeather(weather);
          this.cloudLayer.setWeather(weather);
        },
      ),
    );

    // Pace changes (adjust animation speed + particle intensity)
    this.unsubscribers.push(
      subscribePhaser(
        (s) => s.journey.pace,
        (pace) => {
          this.applyPace(pace);
          this.particles.setPace(pace);
        },
      ),
    );

    // Camp pet visibility (fade in/out instead of instant pop)
    this.unsubscribers.push(
      subscribePhaser(
        (s) => s.campPet.adopted && !s.campPet.lost,
        (visible) => {
          const cat = this.sprites.get('cat_mouser');
          const catShadow = this.shadows.get('cat_mouser');
          if (visible) {
            if (cat) {
              cat.setVisible(true);
              cat.sprite.setAlpha(0);
              this.tweens.add({ targets: cat.sprite, alpha: 1, duration: 300 });
            }
            if (catShadow) {
              catShadow.setVisible(true);
              catShadow.setAlpha(0);
              this.tweens.add({ targets: catShadow, alpha: SHADOW_ALPHA[store.getState().world.timeOfDay] ?? 0.15, duration: 300 });
            }
          } else {
            if (cat) cat.setVisible(false);
            if (catShadow) catShadow.setVisible(false);
          }
        },
      ),
    );

    // Equipment durability → visual degradation
    this.unsubscribers.push(
      subscribePhaser(
        (s) => s.player.equipment,
        (equipment) => this.applyEquipmentDegradation(equipment),
      ),
    );

    // Daily cycle phase → animate sprites during travel
    this.unsubscribers.push(
      subscribePhaser(
        (s) => s.dailyCyclePhase,
        (phase) => {
          const targetState = phase === 'travel'
            ? AnimationState.Walk
            : AnimationState.Idle;
          for (const sprite of this.sprites.values()) {
            if (sprite.sprite.visible && sprite.getCurrentState() !== targetState) {
              sprite.playState(targetState);
            }
          }
        },
      ),
    );
  }

  // ============================================================
  // COMMAND PROCESSING
  // ============================================================

  private processCommand(cmd: GameCommand): void {
    switch (cmd.type) {
      case 'playAnimation': {
        const sprite = this.sprites.get(cmd.target);
        if (sprite) sprite.playState(cmd.state);
        break;
      }

      case 'toggleAccessory': {
        for (const sprite of this.sprites.values()) {
          sprite.toggleAccessory(cmd.accessoryId, cmd.visible);
        }
        break;
      }

      case 'setFacing': {
        const sprite = this.sprites.get(cmd.target);
        if (sprite) sprite.setFacing(cmd.direction);
        break;
      }

      case 'updateTimeOfDay':
        this.applyTimeOfDay(cmd.timeOfDay);
        break;

      case 'updateBiome':
        this.applyBiome(cmd.biome);
        break;

      case 'showCampfire':
        this.toggleCampfire(cmd.show);
        break;

      case 'setCampPetVisible': {
        const cat = this.sprites.get('cat_mouser');
        if (cat) cat.setVisible(cmd.visible);
        break;
      }

      case 'changeScene': {
        const targetScene =
          cmd.scene === 'trail' ? 'TrailScene' :
          cmd.scene === 'camp' ? 'CampScene' :
          'PreloadScene';
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(targetScene);
        });
        break;
      }
    }
  }

  // ============================================================
  // VISUAL UPDATES
  // ============================================================

  private applyBiome(biome: Biome | string): void {
    this.skyRenderer?.setBiome(biome as string);
  }

  private applyTimeOfDay(timeOfDay: TimeOfDay | string): void {
    const palette = TIME_PALETTES[timeOfDay as TimeOfDay];
    if (!palette) return;

    // Update sky gradient, sun/moon, horizon haze
    this.skyRenderer?.setTimeOfDay(timeOfDay as TimeOfDay);

    // Update shadow intensity
    this.updateShadowAlpha(timeOfDay as string);

    // Update rim light color on all sprites
    const rimColor = RIM_COLORS[timeOfDay as TimeOfDay];
    if (rimColor !== undefined) {
      for (const sprite of this.sprites.values()) {
        sprite.setRimTint(rimColor);
      }
    }

    // Store ambient tint and recompose with durability
    this.currentAmbientTint = Phaser.Display.Color.HexStringToColor(palette.ambient).color;
    this.applyCompositeTint();
  }

  /**
   * Apply composite tint to all sprites: time-of-day ambient × durability multiplier.
   * Both effects compose via color channel multiplication.
   */
  private applyCompositeTint(): void {
    for (const [key, sprite] of this.sprites) {
      const durabilityScalar = this.entityDurabilityMultipliers.get(key) ?? 1.0;
      const composed = multiplyTintScalar(this.currentAmbientTint, durabilityScalar);

      if (composed === 0xffffff) {
        sprite.clearTint();
      } else {
        sprite.setTint(composed);
      }
    }

    // Tint ground scroll with ambient color
    const groundTile = this.groundScroll.tileSprite;
    if (groundTile) {
      if (this.currentAmbientTint === 0xffffff) {
        groundTile.clearTint();
      } else {
        groundTile.setTint(this.currentAmbientTint);
      }
    }

    // Tint scenery objects with ambient color (no durability)
    for (const obj of this.sceneryManager.sprites) {
      if (this.currentAmbientTint === 0xffffff) {
        obj.clearTint();
      } else {
        obj.setTint(this.currentAmbientTint);
      }
    }
  }

  /**
   * Map equipment durability to visual degradation effects.
   * Updates per-entity tint multipliers and damage indicator overlays.
   */
  private applyEquipmentDegradation(equipment: Equipment[]): void {
    const durabilityBySlot = new Map<string, number>();
    for (const e of equipment) {
      durabilityBySlot.set(e.slot, e.durability);
    }

    for (const [spriteKey, sprite] of this.sprites) {
      const slots = SPRITE_EQUIPMENT_MAPPING[spriteKey];
      if (!slots) continue;

      const relevant = slots
        .map((slot) => durabilityBySlot.get(slot))
        .filter((d): d is number => d !== undefined);

      if (relevant.length === 0) continue;

      const avg = Math.round(relevant.reduce((a, b) => a + b, 0) / relevant.length);
      const tier = getDurabilityTier(avg);
      const visual = DURABILITY_VISUALS[tier];

      this.entityDurabilityMultipliers.set(spriteKey, visual.tintMultiplier);

      this.degradationVisuals.updateIndicator(
        spriteKey,
        tier,
        sprite.sprite.x,
        sprite.sprite.y,
        sprite.config.frameHeight,
      );
    }

    this.applyCompositeTint();
  }

  // ============================================================
  // PARTICLE EMISSION (timer callbacks)
  // ============================================================

  private emitDustForMovingSprites(): void {
    for (const sprite of this.sprites.values()) {
      if (!sprite.sprite.visible) continue;
      const state = sprite.getCurrentState();
      if (state === AnimationState.Walk || state === AnimationState.Run) {
        this.particles.emitDust(sprite.sprite.x, sprite.sprite.y);
      }
    }
  }

  private emitBreathForIdleSprites(): void {
    for (const sprite of this.sprites.values()) {
      if (!sprite.sprite.visible) continue;
      const state = sprite.getCurrentState();
      if (state === AnimationState.Idle || state === AnimationState.Walk) {
        const headY = sprite.sprite.y - sprite.config.frameHeight;
        this.particles.emitBreath(sprite.sprite.x, headY);
      }
    }
  }

  private applyPace(pace: string): void {
    const multiplier = PACE_FRAME_RATE_MULTIPLIER[pace] ?? 1.0;
    for (const sprite of this.sprites.values()) {
      sprite.updatePaceMultiplier(multiplier);
    }
  }

  private toggleCampfire(show: boolean): void {
    if (show && !this.campfireSprite) {
      const { width, height } = this.cameras.main;
      const groundY = Math.floor(height * 0.75);
      const fireX = width * 0.35;

      // Use real campfire sprite if available (matches CampScene pattern)
      const campfireDef = MAP_OBJECTS['campfire_lit'];
      if (campfireDef && this.textures.exists(campfireDef.key)) {
        const sprite = this.add.image(fireX, groundY, campfireDef.key);
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(5);
        this.tweens.add({
          targets: sprite,
          scaleY: { from: 0.95, to: 1.05 },
          scaleX: { from: 0.97, to: 1.03 },
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.campfireSprite = sprite;
      } else {
        // Geometric fallback for dev mode
        this.campfireSprite = this.add.rectangle(fireX, groundY - 8, 16, 16, 0xff6600);
        this.campfireSprite.setDepth(5);
      }

      // Warm glow circle
      this.campfireGlow = this.add.circle(fireX, groundY - 4, 40, 0xff6600, 0.06);
      this.campfireGlow.setDepth(4);
      this.tweens.add({
        targets: this.campfireGlow,
        alpha: { from: 0.04, to: 0.08 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Rising embers
      const fireY = groundY - 6;
      for (let i = 0; i < 4; i++) {
        const ember = this.add.circle(
          fireX + (Math.random() - 0.5) * 8, fireY,
          1, 0xff8800, 0.7,
        );
        ember.setDepth(6);
        this.campfireEmbers.push(ember);

        const drift = () => {
          ember.setPosition(fireX + (Math.random() - 0.5) * 8, fireY);
          ember.setAlpha(0.7);
          this.tweens.add({
            targets: ember,
            y: fireY - 12 - Math.random() * 16,
            x: ember.x + (Math.random() - 0.5) * 12,
            alpha: 0,
            duration: 800 + Math.random() * 1000,
            ease: 'Sine.easeOut',
            onComplete: drift,
          });
        };
        this.time.delayedCall(Math.random() * 1200, drift);
      }
    } else if (!show) {
      this.campfireSprite?.destroy();
      this.campfireSprite = undefined;
      this.campfireGlow?.destroy();
      this.campfireGlow = undefined;
      for (const e of this.campfireEmbers) {
        this.tweens.killTweensOf(e);
        e.destroy();
      }
      this.campfireEmbers = [];
    }
  }
}
