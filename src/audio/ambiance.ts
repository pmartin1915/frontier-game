/**
 * @file Frontier — Ambient Music System
 * @module audio/ambiance
 * @description
 * Howler.js-backed ambient track manager with crossfading support.
 *
 * This module handles the playback, volume control, and crossfading of ambient music tracks
 * based on game state (e.g., biome, weather). Tracks are loaded lazily to minimize initial load time.
 *
 * Audio files should be placed in:
 *   public/audio/ambient/<trackName>.mp3   (primary format)
 *   public/audio/ambient/<trackName>.ogg   (fallback for Firefox)
 *
 * Missing audio files are logged in development mode but otherwise handled gracefully.
 *
 * @note This module is a no-op in Node.js/Vitest environments as Howler requires a browser audio context.
 *
 * @example
 * // Switch to a new ambient track
 * switchAmbianceTrack('plains-day', 0.8, 0.7);
 *
 * // Update volume without changing track
 * setAmbianceVolume(0.5, 0.9);
 *
 * // Stop all ambient music
 * stopAmbiance();
 *
 * @asOf 2026-06-07
 */

import { Howl } from 'howler';
import { AmbianceTrack } from '@/types/audio';

const CROSSFADE_MS = 2500;

// Lazy track instances — created on first access to avoid loading everything upfront.
const _tracks = new Map<AmbianceTrack, Howl>();

let _activeTrack: AmbianceTrack | null = null;
let _targetVolume = 0;

// Tracks a Howl that is currently fading out so we can cancel and stop it
// immediately if a new switch arrives before the fade completes.
let _fadingOutTrack: { howl: Howl; timer: ReturnType<typeof setTimeout> } | null = null;

/**
 * Checks if the current environment supports audio playback.
 * @returns {boolean} True if running in a browser environment with audio support.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
}

/**
 * Creates a Howl instance for the specified track.
 * @param {AmbianceTrack} track - The track identifier.
 * @returns {Howl} A Howl instance configured for ambient playback.
 */
function makeHowl(track: AmbianceTrack): Howl {
  return new Howl({
    src: [
      `audio/ambient/${track}.mp3`,
      `audio/ambient/${track}.ogg`,
    ],
    loop:    true,
    volume:  0,
    preload: true,
    onloaderror: (_id: number, err: unknown) => {
      if (import.meta.env.DEV) {
        console.warn(`[audio/ambiance] Failed to load track "${track}":`, err);
      }
    },
  });
}

/**
 * Gets or creates a Howl instance for the specified track.
 * @param {AmbianceTrack} track - The track identifier.
 * @returns {Howl} The Howl instance for the track.
 */
function getHowl(track: AmbianceTrack): Howl {
  if (!_tracks.has(track)) {
    _tracks.set(track, makeHowl(track));
  }
  return _tracks.get(track)!;
}

/**
 * Crossfades to a new ambient track with volume adjustment.
 *
 * If the specified track is already active, only the volume is updated.
 * If another track is playing, it is faded out before the new track begins.
 *
 * @param {AmbianceTrack} track - The target track to play.
 * @param {number} masterVol - Current master volume (0-1).
 * @param {number} musicVol - Current music sub-volume (0-1).
 */
export function switchAmbianceTrack(
  track: AmbianceTrack,
  masterVol: number,
  musicVol: number,
): void {
  if (!isBrowser()) return;

  _targetVolume = Math.max(0, Math.min(1, masterVol * musicVol));

  if (_activeTrack === track) {
    // Same track — just update volume without restarting.
    _tracks.get(track)?.volume(_targetVolume);
    return;
  }

  // If there is already a track fading out, stop it immediately.
  // This prevents silent, leaked Howl instances when the user switches
  // tracks rapidly (e.g. biome + storm trigger in the same update).
  if (_fadingOutTrack !== null) {
    clearTimeout(_fadingOutTrack.timer);
    _fadingOutTrack.howl.stop();
    _fadingOutTrack = null;
  }

  // Fade out the currently active track.
  if (_activeTrack !== null) {
    const prev = _tracks.get(_activeTrack);
    if (prev) {
      const fromVol = prev.volume() as number;
      if (fromVol > 0) {
        prev.fade(fromVol, 0, CROSSFADE_MS);
        const timer = setTimeout(() => {
          prev.stop();
          _fadingOutTrack = null;
        }, CROSSFADE_MS + 150);
        _fadingOutTrack = { howl: prev, timer };
      } else {
        prev.stop();
      }
    }
  }

  // Fade in the new track.
  _activeTrack = track;
  const next = getHowl(track);
  next.volume(0);
  next.play();
  next.fade(0, _targetVolume, CROSSFADE_MS);
}

/**
 * Updates the volume of the currently playing ambient track.
 *
 * This should be called when master volume or music sub-volume changes.
 *
 * @param {number} masterVol - Current master volume (0-1).
 * @param {number} musicVol - Current music sub-volume (0-1).
 */
export function setAmbianceVolume(masterVol: number, musicVol: number): void {
  if (!isBrowser()) return;
  _targetVolume = Math.max(0, Math.min(1, masterVol * musicVol));
  if (_activeTrack !== null) {
    _tracks.get(_activeTrack)?.volume(_targetVolume);
  }
}

/**
 * Mutes or unmutes the active ambient track.
 * @param {boolean} muted - True to mute, false to unmute.
 */
export function muteAmbiance(muted: boolean): void {
  if (!isBrowser()) return;
  if (_activeTrack !== null) {
    _tracks.get(_activeTrack)?.mute(muted);
  }
}

/**
 * Stops the currently playing ambient track with a fade-out.
 *
 * This is used when ambient music should cease (e.g., game over, victory).
 */
export function stopAmbiance(): void {
  if (!isBrowser() || _activeTrack === null) return;
  const h = _tracks.get(_activeTrack);
  if (h) {
    h.fade(h.volume() as number, 0, 800);
    setTimeout(() => h.stop(), 900);
  }
  // Also stop any track mid-fade.
  if (_fadingOutTrack !== null) {
    clearTimeout(_fadingOutTrack.timer);
    _fadingOutTrack.howl.stop();
    _fadingOutTrack = null;
  }
  _activeTrack = null;
}