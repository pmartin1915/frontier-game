/**
 * @fileoverview Frontier — Ambient Music System
 *
 * Manages crossfading ambient music tracks using Howler.js. Tracks are loaded
 * on-demand and cached for the session. Volume and crossfade transitions are
 * handled automatically based on game state (biome, weather, time of day).
 *
 * @module audio/ambiance
 * @asOf 2026-06-04
 */

import { Howl } from 'howler';
import { AmbianceTrack } from '@/types/audio';

const CROSSFADE_MS = 2500;

/**
 * Lazy-loaded Howl instances for each ambient track.
 * @type {Map<AmbianceTrack, Howl>}
 */
const _tracks = new Map<AmbianceTrack, Howl>();

/**
 * Currently active track, or null if none is playing.
 * @type {AmbianceTrack|null}
 */
let _activeTrack: AmbianceTrack | null = null;

/**
 * Target volume (0-1) after applying master and music volume multipliers.
 * @type {number}
 */
let _targetVolume = 0;

/**
 * Reference to a track currently fading out, allowing immediate cancellation
 * if a new track switch occurs before the fade completes.
 * @type {{ howl: Howl; timer: ReturnType<typeof setTimeout> }|null}
 */
let _fadingOutTrack: { howl: Howl; timer: ReturnType<typeof setTimeout> } | null = null;

/**
 * Checks if the environment supports audio playback (browser with AudioContext).
 * @returns {boolean} True if running in a browser environment with audio support.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
}

/**
 * Creates a Howl instance for the given track.
 * @param {AmbianceTrack} track - The track identifier.
 * @returns {Howl} Configured Howl instance for the track.
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
 * Retrieves or creates a Howl instance for the given track.
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
 * Crossfades to a new ambient track, stopping the current track if one is playing.
 * If the requested track is already active, only the volume is updated.
 *
 * @param {AmbianceTrack} track - The track to switch to.
 * @param {number} masterVol - Master volume level (0-1).
 * @param {number} musicVol - Music sub-volume level (0-1).
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

  // Cancel any pending fade-out to prevent leaked Howl instances.
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
 * Updates the volume of the currently playing track without crossfading.
 * Call this when master or music volume sliders change.
 *
 * @param {number} masterVol - Master volume level (0-1).
 * @param {number} musicVol - Music sub-volume level (0-1).
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
 *
 * @param {boolean} muted - True to mute, false to unmute.
 */
export function muteAmbiance(muted: boolean): void {
  if (!isBrowser()) return;
  if (_activeTrack !== null) {
    _tracks.get(_activeTrack)?.mute(muted);
  }
}

/**
 * Fades out and stops the active ambient track.
 * Used when the game ends or ambient music should cease.
 */
export function stopAmbiance(): void {
  if (!isBrowser() || _activeTrack === null) return;
  const h = _tracks.get(_activeTrack);
  if (h) {
    h.fade(h.volume() as number, 0, 800);
    setTimeout(() => h.stop(), 900);
  }
  // Stop any track mid-fade.
  if (_fadingOutTrack !== null) {
    clearTimeout(_fadingOutTrack.timer);
    _fadingOutTrack.howl.stop();
    _fadingOutTrack = null;
  }
  _activeTrack = null;
}