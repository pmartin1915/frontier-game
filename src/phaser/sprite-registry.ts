/**
 * Frontier — Sprite Registry
 *
 * SpriteSheetConfig instances for all 13 entities in the sprite pipeline.
 * Maps to types/animation.ts SpriteSheetConfig interface.
 *
 * Frame layout: 7 rows x 8 columns per GDD §7.4 / Sprite Pipeline Spec.
 * AnimationState.Death falls back to Injured row (row 6).
 *
 * Imports: types/ only.
 */

import { AnimationState } from '@/types/animation';
import type { SpriteSheetConfig, SpriteRowConfig } from '@/types/animation';

// ============================================================
// CONSTANTS
// ============================================================

const BASE_FPS = 12;

/** Standard FSM row config shared by most entities. */
function standardRows(interactFrames = 8): Record<AnimationState, SpriteRowConfig> {
  return {
    [AnimationState.Idle]:     { row: 0, frameCount: 4, baseFrameRate: BASE_FPS, loop: true },
    [AnimationState.Walk]:     { row: 1, frameCount: 8, baseFrameRate: BASE_FPS, loop: true },
    [AnimationState.Run]:      { row: 2, frameCount: 6, baseFrameRate: BASE_FPS, loop: true },
    [AnimationState.Mount]:    { row: 3, frameCount: 4, baseFrameRate: BASE_FPS, loop: false },
    [AnimationState.Ride]:     { row: 4, frameCount: 6, baseFrameRate: BASE_FPS, loop: true },
    [AnimationState.Interact]: { row: 5, frameCount: interactFrames, baseFrameRate: BASE_FPS, loop: true },
    [AnimationState.Injured]:  { row: 6, frameCount: 2, baseFrameRate: BASE_FPS, loop: true },
    [AnimationState.Death]:    { row: 6, frameCount: 2, baseFrameRate: BASE_FPS, loop: false },
  };
}

// ============================================================
// SPRITE CONFIGS — 13 ENTITIES
// ============================================================

export const SPRITE_CONFIGS: Record<string, SpriteSheetConfig> = {
  // --- Player ---
  player_cowboy: {
    key: 'player_cowboy',
    path: 'assets/sprites/player_cowboy.png',
    frameWidth: 64,
    frameHeight: 64,
    rows: standardRows(8),
  },

  // --- Riding Horse ---
  horse_riding_base: {
    key: 'horse_riding_base',
    path: 'assets/sprites/horse_riding_base.png',
    frameWidth: 96,
    frameHeight: 80,
    rows: standardRows(4),
  },
  horse_riding_tack: {
    key: 'horse_riding_tack',
    path: 'assets/sprites/horse_riding_tack.png',
    frameWidth: 96,
    frameHeight: 80,
    rows: standardRows(4),
  },

  // --- Draft Horse ---
  horse_draft_base: {
    key: 'horse_draft_base',
    path: 'assets/sprites/horse_draft_base.png',
    frameWidth: 96,
    frameHeight: 80,
    rows: standardRows(4),
  },
  horse_draft_harness: {
    key: 'horse_draft_harness',
    path: 'assets/sprites/horse_draft_harness.png',
    frameWidth: 96,
    frameHeight: 80,
    rows: standardRows(4),
  },

  // --- Wagon ---
  wagon_prairie_schooner: {
    key: 'wagon_prairie_schooner',
    path: 'assets/sprites/wagon_prairie_schooner.png',
    frameWidth: 128,
    frameHeight: 64,
    rows: standardRows(8),
  },

  // --- Camp Pet ---
  cat_mouser: {
    key: 'cat_mouser',
    path: 'assets/sprites/cat_mouser.png',
    frameWidth: 32,
    frameHeight: 32,
    rows: standardRows(4),
  },

  // --- Companion: Elias Coe ---
  companion_elias_base: {
    key: 'companion_elias_base',
    path: 'assets/sprites/companion_elias_base.png',
    frameWidth: 64,
    frameHeight: 64,
    rows: standardRows(4),
  },
  companion_elias_kepi: {
    key: 'companion_elias_kepi',
    path: 'assets/sprites/companion_elias_kepi.png',
    frameWidth: 64,
    frameHeight: 64,
    rows: standardRows(4),
  },

  // --- Companion: Luisa Vega ---
  companion_luisa_base: {
    key: 'companion_luisa_base',
    path: 'assets/sprites/companion_luisa_base.png',
    frameWidth: 64,
    frameHeight: 64,
    rows: standardRows(8),
  },
  companion_luisa_serape: {
    key: 'companion_luisa_serape',
    path: 'assets/sprites/companion_luisa_serape.png',
    frameWidth: 64,
    frameHeight: 64,
    rows: standardRows(8),
  },

  companion_luisa_poncho: {
    key: 'companion_luisa_poncho',
    path: 'assets/sprites/companion_luisa_poncho.png',
    frameWidth: 64,
    frameHeight: 64,
    rows: standardRows(8),
  },

  // --- Companion: Tom Blanchard ---
  companion_tom_base: {
    key: 'companion_tom_base',
    path: 'assets/sprites/companion_tom_base.png',
    frameWidth: 64,
    frameHeight: 64,
    rows: standardRows(8),
  },
  companion_tom_hat_bandana: {
    key: 'companion_tom_hat_bandana',
    path: 'assets/sprites/companion_tom_hat_bandana.png',
    frameWidth: 64,
    frameHeight: 64,
    rows: standardRows(8),
  },
};

// ============================================================
// PLACEHOLDER COLORS (dev mode — colored rectangles)
// ============================================================

export const PLACEHOLDER_COLORS: Record<string, number> = {
  player_cowboy:            0x4488cc,
  horse_riding_base:        0x8b6914,
  horse_riding_tack:        0x5a3a1a,
  horse_draft_base:         0x6b4e2a,
  horse_draft_harness:      0x3a2a1a,
  wagon_prairie_schooner:   0xc4a868,
  cat_mouser:               0x888888,
  companion_elias_base:     0x446644,
  companion_elias_kepi:     0x334433,
  companion_luisa_base:     0xcc6644,
  companion_luisa_serape:   0x884422,
  companion_luisa_poncho:   0x664422,
  companion_tom_base:       0x6688aa,
  companion_tom_hat_bandana: 0x445566,
};

// ============================================================
// PACE MULTIPLIERS
// ============================================================

export const PACE_FRAME_RATE_MULTIPLIER: Record<string, number> = {
  conservative: 0.8,
  normal: 1.0,
  hardPush: 1.3,
};

// ============================================================
// HELPERS
// ============================================================

export function getSpriteConfig(key: string): SpriteSheetConfig | undefined {
  return SPRITE_CONFIGS[key];
}

export function getAllSpriteKeys(): string[] {
  return Object.keys(SPRITE_CONFIGS);
}

/** Total columns per sheet row (fixed grid). */
export const SHEET_COLS = 8;

/**
 * Display scale per entity for correct proportions on a 640x360 canvas.
 * Cowboy rendered ~35px tall, horse ~44px tall (horse clearly taller).
 * Scales tuned from real device testing — player 0.55 keeps cowboy proportional to horse.
 */
export const SPRITE_SCALE: Record<string, number> = {
  player_cowboy: 0.50,
  companion_elias_base: 0.52,
  companion_elias_kepi: 0.52,
  companion_luisa_base: 0.50,
  companion_luisa_serape: 0.50,
  companion_luisa_poncho: 0.50,
  companion_tom_base: 0.53,
  companion_tom_hat_bandana: 0.53,
  horse_riding_base: 0.55,
  horse_riding_tack: 0.55,
  horse_draft_base: 0.55,
  horse_draft_harness: 0.55,
  wagon_prairie_schooner: 0.55,
  cat_mouser: 0.35,
};
