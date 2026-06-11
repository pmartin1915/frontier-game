/**
 * @file Frontier — Ambient Music System
 *
 * Manages crossfading ambient music tracks using Howler.js. Tracks are loaded
 * lazily and cached to avoid upfront loading of all audio assets.
 *
 * Audio files should be placed in:
 *   public/audio/ambient/<trackName>.mp3 (or .ogg for Firefox compatibility)
 *
 * Missing files are logged in development mode but do not crash the game.
 * The system gracefully handles missing tracks by skipping playback.
 *
 * @module audio/ambiance
 * @date 2026-06-07
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
 * Currently active track name, or null if no track is playing.
 * @type {AmbianceTrack|null}
 */
let _activeTrack: AmbianceTrack | null = null;

/**
 * Target volume level (0-1) after applying master and music volume.
 * @type {number}
 */
let _targetVolume = 0;

/**
 * Reference to a track currently fading out, used to cancel mid-fade if needed.
 * @type {{ howl: Howl; timer: ReturnType<typeof setTimeout> }|null}
 */
let _fadingOutTrack: { howl: Howl; timer: ReturnType<typeof setTimeout> } | null = null;

/**
 * Checks if the environment supports audio (browser with AudioContext).
 * @returns {boolean} True if audio is supported.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
}

/**
 * Creates a Howl instance for a given track.
 * @param {AmbianceTrack} track - Track identifier.
 * @returns {Howl} Howl instance for the track.
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
 * Gets or creates a Howl instance for a track.
 * @param {AmbianceTrack} track - Track identifier.
 * @returns {Howl} Howl instance for the track.
 */
function getHowl(track: AmbianceTrack): Howl {
  if (!_tracks.has(track)) {
    _tracks.set(track, makeHowl(track));
  }
  return _tracks.get(track)!;
}

/**
 * Crossfades to a new ambient track.
 *
 * If the specified track is already active, only the volume is updated.
 * If another track is playing, it is faded out before the new track fades in.
 *
 * @param {AmbianceTrack} track - Target track to switch to.
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
  // Also stop any track mid-fade.
  if (_fadingOutTrack !== null) {
    clearTimeout(_fadingOutTrack.timer);
    _fadingOutTrack.howl.stop();
    _fadingOutTrack = null;
  }
  _activeTrack = null;
}