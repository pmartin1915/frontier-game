/**
 * Frontier — Ambient Music System
 *
 * Howler.js-backed ambient track manager with crossfading.
 *
 * Audio files should be placed at:
 *   public/audio/ambient/<trackName>.mp3   (or .ogg for Firefox)
 *
 * When a file is missing, Howler fires onloaderror which is logged
 * in dev mode but otherwise swallowed silently — the track simply
 * never plays. Drop the .mp3 files in and they start working with
 * no code changes.
 *
 * This module is a no-op in Node.js / Vitest environments because
 * Howler requires a browser audio context.
 *
 * @module audio/ambiance
 * @date 2026-06-04
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
 * Currently active ambient track.
 * @type {AmbianceTrack|null}
 */
let _activeTrack: AmbianceTrack | null = null;

/**
 * Target volume level (0-1) for the active track.
 * @type {number}
 */
let _targetVolume = 0;

/**
 * Tracks a Howl that is currently fading out so we can cancel and stop it
 * immediately if a new switch arrives before the fade completes.
 * @type {{ howl: Howl; timer: ReturnType<typeof setTimeout> }|null}
 */
let _fadingOutTrack: { howl: Howl; timer: ReturnType<typeof setTimeout> } | null = null;

/**
 * Checks if the environment supports audio (browser with AudioContext).
 * @returns {boolean} True if running in a browser environment with audio support.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
}

/**
 * Creates a new Howl instance for the specified track.
 * @param {AmbianceTrack} track - The track to create a Howl for.
 * @returns {Howl} The created Howl instance.
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
 * @param {AmbianceTrack} track - The track to get a Howl for.
 * @returns {Howl} The Howl instance for the track.
 */
function getHowl(track: AmbianceTrack): Howl {
  if (!_tracks.has(track)) {
    _tracks.set(track, makeHowl(track));
  }
  return _tracks.get(track)!;
}

/**
 * Crossfade to a new ambient track.
 * If the track is already active, just updates the volume.
 *
 * @param {AmbianceTrack} track - Target AmbianceTrack to switch to.
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
 * Update the volume of the currently playing track without crossfading.
 * Call this when the user moves a volume slider or when master/music volume changes.
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
 * Mute or unmute the active ambient track without stopping it.
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
 * Fade out and stop the active ambient track.
 * Used on game over / victory or when ambient music should cease.
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