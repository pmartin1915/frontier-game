/**
 * Frontier — Animation & Sprite System Interfaces
 *
 * Per GDD §7.4: Strict animation state machine with validated transitions,
 * directional flip utility, walk cycle locking, and accessory layer system.
 */

import { Biome, TimeOfDay, Pace, Weather, EquipmentSlot } from './game-state';
import { CompanionId } from './companions';

// ============================================================
// ANIMATION STATE MACHINE
// ============================================================

export enum AnimationState {
  Idle = 'idle',
  Walk = 'walk',
  Run = 'run',
  Mount = 'mount',
  Ride = 'ride',
  Interact = 'interact',
  Injured = 'injured',
  Death = 'death',
}

/**
 * Sprite sheet layout: each state maps to a row in the sheet.
 */
export interface SpriteSheetConfig {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  rows: Record<AnimationState, SpriteRowConfig>;
}

export interface SpriteRowConfig {
  row: number;
  frameCount: number;
  /** Frames per second at Normal pace */
  baseFrameRate: number;
  /** Whether this animation loops */
  loop: boolean;
}

/**
 * Valid state transitions. The FSM rejects any transition not in this map.
 * Key = current state, Value = set of valid next states.
 */
export const VALID_TRANSITIONS: Record<AnimationState, Set<AnimationState>> = {
  [AnimationState.Idle]: new Set([AnimationState.Walk, AnimationState.Mount, AnimationState.Interact]),
  [AnimationState.Walk]: new Set([AnimationState.Idle, AnimationState.Run, AnimationState.Mount]),
  [AnimationState.Run]: new Set([AnimationState.Walk, AnimationState.Idle]),
  [AnimationState.Mount]: new Set([AnimationState.Idle, AnimationState.Ride]),
  [AnimationState.Ride]: new Set([AnimationState.Idle]),
  [AnimationState.Interact]: new Set([AnimationState.Idle]),
  [AnimationState.Injured]: new Set([AnimationState.Idle, AnimationState.Death]),
  [AnimationState.Death]: new Set([]),
};

/**
 * Validates a state transition. Returns true if the transition is legal.
 */
export function isValidTransition(from: AnimationState, to: AnimationState): boolean {
  return VALID_TRANSITIONS[from].has(to);
}

// ============================================================
// DIRECTIONAL FLIP
// ============================================================

export enum FacingDirection {
  Right = 'right',
  Left = 'left',
}

/**
 * Asymmetric elements that need separate overlay sprites when flipped.
 * These are NOT flipped with flipX—they use dedicated left-facing overlays.
 */
export interface FlipExemptElement {
  key: string;
  description: string;
  /** Overlay sprite key for left-facing version */
  leftSpriteKey: string;
}

// ============================================================
// ACCESSORY LAYER SYSTEM
// ============================================================

/**
 * An accessory overlay that tracks a parent sprite's position and frame.
 * Rendered on a transparent background above the character sprite.
 */
export interface AccessoryConfig {
  id: string;
  /** Which character this accessory belongs to */
  owner: 'player' | CompanionId;
  /** Sprite sheet key for this accessory */
  spriteKey: string;
  /** Whether this accessory is currently visible */
  visible: boolean;
  /** Offset from parent sprite origin (pixels) */
  offsetX: number;
  offsetY: number;
  /** Whether this accessory is flip-exempt (needs left-facing variant) */
  flipExempt: boolean;
  /** Conditions that toggle this accessory */
  toggleConditions?: AccessoryToggle[];
}

export interface AccessoryToggle {
  type: 'weather' | 'health' | 'event' | 'custom';
  /** Condition that makes the accessory visible */
  showWhen: string;
  /** Condition that hides the accessory */
  hideWhen: string;
}

/**
 * Pre-defined companion accessories per GDD §7.4.
 */
export const COMPANION_ACCESSORIES: Record<CompanionId, AccessoryConfig[]> = {
  [CompanionId.EliasCoe]: [
    {
      id: 'coe-kepi', owner: CompanionId.EliasCoe,
      spriteKey: 'companion_elias_kepi', visible: true,
      offsetX: 0, offsetY: -4, flipExempt: false,
      toggleConditions: [
        { type: 'weather', showWhen: 'default', hideWhen: 'storm' },
      ],
    },
  ],
  [CompanionId.LuisaVega]: [
    {
      id: 'vega-serape', owner: CompanionId.LuisaVega,
      spriteKey: 'companion_luisa_serape', visible: true,
      offsetX: 0, offsetY: 0, flipExempt: false,
    },
    {
      id: 'vega-poncho', owner: CompanionId.LuisaVega,
      spriteKey: 'companion_luisa_poncho', visible: false,
      offsetX: 0, offsetY: 0, flipExempt: false,
      toggleConditions: [
        { type: 'weather', showWhen: 'rain', hideWhen: 'clear' },
      ],
    },
  ],
  [CompanionId.TomBlanchard]: [
    {
      id: 'blanchard-bandana', owner: CompanionId.TomBlanchard,
      spriteKey: 'companion_tom_hat_bandana', visible: true,
      offsetX: 0, offsetY: -2, flipExempt: false,
      toggleConditions: [
        { type: 'event', showWhen: 'default', hideWhen: 'windstorm_loss' },
      ],
    },
  ],
};

// ============================================================
// TIME-OF-DAY PALETTES (per GDD §7.2)
// ============================================================

export interface PaletteConfig {
  timeOfDay: TimeOfDay;
  /** CSS-compatible color values for the palette */
  sky: string;
  ambient: string;
  shadow: string;
  description: string;
}

export const TIME_PALETTES: Record<TimeOfDay, PaletteConfig> = {
  [TimeOfDay.Dawn]: { timeOfDay: TimeOfDay.Dawn, sky: '#4a6fa5', ambient: '#d4b896', shadow: '#2a3f5f', description: 'Cool blues to pale gold, stars fading' },
  [TimeOfDay.Morning]: { timeOfDay: TimeOfDay.Morning, sky: '#87CEEB', ambient: '#f5deb3', shadow: '#4a4a2a', description: 'Clear warm yellows, sharp shadows' },
  [TimeOfDay.Midday]: { timeOfDay: TimeOfDay.Midday, sky: '#e8e4d0', ambient: '#ffffff', shadow: '#c8c4b0', description: 'Harsh whites, bleached, heat haze' },
  [TimeOfDay.Afternoon]: { timeOfDay: TimeOfDay.Afternoon, sky: '#d4a843', ambient: '#e8a020', shadow: '#6b4e1a', description: 'Amber to orange, long shadows' },
  [TimeOfDay.Sunset]: { timeOfDay: TimeOfDay.Sunset, sky: '#c0392b', ambient: '#e74c3c', shadow: '#4a1a2e', description: 'Deep orange/red/purple, silhouettes' },
  [TimeOfDay.Night]: { timeOfDay: TimeOfDay.Night, sky: '#1a1a3e', ambient: '#2a2a5e', shadow: '#0a0a1e', description: 'Deep blues, silver, campfire glow' },
};

/**
 * Rim light colors per time-of-day for silhouette characters.
 * The rim sprite behind each character is tinted with this color,
 * creating an atmospheric edge glow that shifts across the day.
 */
export const RIM_COLORS: Record<TimeOfDay, number> = {
  [TimeOfDay.Dawn]: 0xd4b896,      // pale gold
  [TimeOfDay.Morning]: 0xf5deb3,   // warm wheat
  [TimeOfDay.Midday]: 0xeeeedd,    // near-white (subtle)
  [TimeOfDay.Afternoon]: 0xe8c078, // warm gold
  [TimeOfDay.Sunset]: 0xff8844,    // bright orange
  [TimeOfDay.Night]: 0x4466aa,     // cool blue moonlight
};

// ============================================================
// PHASER COMMAND QUEUE
// ============================================================

export type GameCommand =
  | { type: 'changeScene'; scene: 'trail' | 'camp' | 'boot' }
  | { type: 'updateBiome'; biome: Biome }
  | { type: 'updateTimeOfDay'; timeOfDay: TimeOfDay }
  | { type: 'playAnimation'; target: string; state: AnimationState }
  | { type: 'toggleAccessory'; accessoryId: string; visible: boolean }
  | { type: 'setFacing'; target: string; direction: FacingDirection }
  | { type: 'triggerWeatherEffect'; weather: string }
  | { type: 'showCampfire'; show: boolean }
  | { type: 'setCampPetVisible'; visible: boolean };

// ============================================================
// PARTICLE EFFECT CONSTANTS
// ============================================================

/** Biome-to-dust-color mapping for ground particle effects */
export const BIOME_DUST_COLORS: Record<Biome, number> = {
  [Biome.CrossTimbers]: 0x8b6914,
  [Biome.StakedPlains]: 0xc4a060,
  [Biome.DesertApproach]: 0xb8956a,
  [Biome.PecosValley]: 0x9a8060,
  [Biome.HighDesert]: 0xa09070,
  [Biome.MountainPass]: 0x7a7a7a,
  [Biome.ColoradoPlains]: 0x8b7355,
};

/** Particle count and spread per pace */
export const DUST_INTENSITY: Record<Pace, { count: number; spread: number }> = {
  [Pace.Conservative]: { count: 2, spread: 6 },
  [Pace.Normal]: { count: 3, spread: 8 },
  [Pace.HardPush]: { count: 4, spread: 12 },
};

/** Weather that suppresses dust (wet ground) */
export const DUST_SUPPRESSED_WEATHER: Set<Weather> = new Set([
  Weather.Rain,
  Weather.Storm,
  Weather.Snow,
]);

/** Biomes where breath vapor is always visible */
export const BREATH_COLD_BIOMES: Set<Biome> = new Set([
  Biome.MountainPass,
]);

/** Times of day that trigger breath vapor */
export const BREATH_COLD_TIMES: Set<TimeOfDay> = new Set([
  TimeOfDay.Night,
  TimeOfDay.Dawn,
]);

/** Weather that triggers breath vapor */
export const BREATH_COLD_WEATHER: Set<Weather> = new Set([
  Weather.Snow,
]);

// ============================================================
// EQUIPMENT DEGRADATION VISUALS
// ============================================================

export enum DurabilityTier {
  Good = 'good',
  Worn = 'worn',
  Damaged = 'damaged',
  Broken = 'broken',
}

export interface DurabilityVisual {
  tier: DurabilityTier;
  /** Tint brightness scalar (1.0 = no change, lower = darker) */
  tintMultiplier: number;
  /** Whether to show the damage indicator dot */
  showIndicator: boolean;
  /** Indicator color (if shown) */
  indicatorColor: number;
  /** Indicator alpha (if shown) */
  indicatorAlpha: number;
}

export const DURABILITY_VISUALS: Record<DurabilityTier, DurabilityVisual> = {
  [DurabilityTier.Good]: {
    tier: DurabilityTier.Good,
    tintMultiplier: 1.0,
    showIndicator: false,
    indicatorColor: 0x000000,
    indicatorAlpha: 0,
  },
  [DurabilityTier.Worn]: {
    tier: DurabilityTier.Worn,
    tintMultiplier: 0.85,
    showIndicator: false,
    indicatorColor: 0x000000,
    indicatorAlpha: 0,
  },
  [DurabilityTier.Damaged]: {
    tier: DurabilityTier.Damaged,
    tintMultiplier: 0.7,
    showIndicator: true,
    indicatorColor: 0xaa6600,
    indicatorAlpha: 0.6,
  },
  [DurabilityTier.Broken]: {
    tier: DurabilityTier.Broken,
    tintMultiplier: 0.55,
    showIndicator: true,
    indicatorColor: 0xcc2200,
    indicatorAlpha: 0.8,
  },
};

/** Determine the durability tier from a numeric value (0-100). */
export function getDurabilityTier(durability: number): DurabilityTier {
  if (durability >= 75) return DurabilityTier.Good;
  if (durability >= 40) return DurabilityTier.Worn;
  if (durability >= 10) return DurabilityTier.Damaged;
  return DurabilityTier.Broken;
}

/** Calculate average durability across an equipment array. */
export function getAverageDurability(
  equipment: ReadonlyArray<{ durability: number }>,
): number {
  if (equipment.length === 0) return 100;
  const sum = equipment.reduce((acc, e) => acc + e.durability, 0);
  return Math.round(sum / equipment.length);
}

/** Maps sprite keys to the equipment slots that affect their visual degradation */
export const SPRITE_EQUIPMENT_MAPPING: Record<string, EquipmentSlot[]> = {
  player_cowboy: [EquipmentSlot.Boots, EquipmentSlot.Bedroll, EquipmentSlot.Canteen, EquipmentSlot.Rifle],
  horse_riding_base: [EquipmentSlot.Saddle],
  wagon_prairie_schooner: [EquipmentSlot.WagonWheel],
};

/**
 * Multiply a Phaser tint color by a brightness scalar (0.0 to 1.0).
 * Extracts R/G/B channels, scales each, and recombines.
 */
export function multiplyTintScalar(baseColor: number, scalar: number): number {
  const r = Math.round(((baseColor >> 16) & 0xff) * Math.min(1, Math.max(0, scalar)));
  const g = Math.round(((baseColor >> 8) & 0xff) * Math.min(1, Math.max(0, scalar)));
  const b = Math.round((baseColor & 0xff) * Math.min(1, Math.max(0, scalar)));
  return (r << 16) | (g << 8) | b;
}
