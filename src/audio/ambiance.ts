/**
 * @file Frontier — Ambient Music System
 *
 * Manages crossfading ambient music tracks using Howler.js. Tracks are loaded
 * on-demand and cached for the session. The system supports seamless crossfading
 * between tracks, volume adjustments, and muting.
 *
 * @module audio/ambiance
 * @asOf 2026-06-06
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
 * Target volume level (0-1) after applying master and music volume.
 * @type {number}
 */
let _targetVolume = 0;

/**
 * Reference to a track that is currently fading out, allowing cancellation
 * if a new track switch occurs before fade completion.
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
 * Creates a Howl instance for the given track.
 * @param {AmbianceTrack} track - The track identifier.
 * @returns {Howl} The Howl instance.
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
 * @returns {Howl} The Howl instance.
 */
function getHowl(track: AmbianceTrack): Howl {
  if (!_tracks.has(track)) {
    _tracks.set(track, makeHowl(track));
  }
  return _tracks.get(track)!;
}

/**
 * Switches to a new ambient track with crossfading.
 * If the track is already active, only the volume is updated.
 *
 * @param {AmbianceTrack} track - The target track to switch to.
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

  // Cancel any ongoing fade-out to prevent leaks.
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
 * Call this when volume sliders change or when master/music volume is adjusted.
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