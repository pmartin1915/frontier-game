/**
 * Frontier — Audio Types
 *
 * SFX events, ambient track identifiers, and volume preferences.
 * Imported by store/ and audio/ only. This file has no imports.
 */

// ============================================================
// ENUMS
// ============================================================

/** Synthesized sound-effect events fired by UI interactions and game events. */
export enum SfxEvent {
  Click        = 'click',        // Generic UI button press
  Confirm      = 'confirm',      // Start day / confirm major action
  Encounter    = 'encounter',    // Encounter trigger sting
  ChoiceSelect = 'choiceSelect', // Pick an encounter option
  Outcome      = 'outcome',      // Positive encounter outcome
  OutcomeBad   = 'outcomeBad',   // Negative encounter outcome
  Waypoint     = 'waypoint',     // Reach a new waypoint
  CampStart    = 'campStart',    // Transition to evening camp
  GameOver     = 'gameOver',     // Player death
  Victory      = 'victory',      // Reach Denver
}

/**
 * Ambient music tracks.
 * Audio files are expected at: public/audio/ambient/<trackName>.mp3
 * The system degrades gracefully when files are absent.
 */
export enum AmbianceTrack {
  CrossTimbers = 'crossTimbers',
  Plains       = 'plains',
  Desert       = 'desert',
  River        = 'river',
  Mountain     = 'mountain',
  Camp         = 'camp',
  Storm        = 'storm',
}

// ============================================================
// INTERFACES
// ============================================================

export interface AudioPrefs {
  master: number;   // 0–1  overall output
  music:  number;   // 0–1  ambient music
  sfx:    number;   // 0–1  sound effects
  muted:  boolean;  // global mute
}

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  master: 0.7,
  music:  0.5,
  sfx:    0.8,
  muted:  false,
};
