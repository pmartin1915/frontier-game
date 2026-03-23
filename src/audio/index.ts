/**
 * Frontier — Audio System Initializer
 *
 * Call initAudio() once at app startup (browser only).
 *
 * All audio reactions are driven by Zustand store subscriptions so
 * there are no direct imports from engine/ or ui/ — respecting the
 * same boundary rules as phaser/ (imports from types/ and store/ only).
 *
 * Ambient tracks switch on biome/weather/phase changes.
 * SFX fire on encounter trigger, waypoint arrival, camp start, and game end.
 * UI-driven SFX (button clicks, confirm) are fired via store.triggerSfx().
 */

import { Biome, Weather, TimeOfDay } from '@/types/game-state';
import { AmbianceTrack, SfxEvent } from '@/types/audio';
import { store } from '@/store';
import { playSfxEvent, unlockAudio } from '@/audio/sfx';
import {
  switchAmbianceTrack,
  setAmbianceVolume,
  muteAmbiance,
  stopAmbiance,
} from '@/audio/ambiance';

// ---- Helpers ----

function biomeToTrack(biome: Biome, weather: Weather): AmbianceTrack {
  if (weather === Weather.Storm) return AmbianceTrack.Storm;
  switch (biome) {
    case Biome.CrossTimbers:  return AmbianceTrack.CrossTimbers;
    case Biome.MountainPass:  return AmbianceTrack.Mountain;
    case Biome.PecosValley:   return AmbianceTrack.River;
    case Biome.DesertApproach:
    case Biome.HighDesert:    return AmbianceTrack.Desert;
    default:                  return AmbianceTrack.Plains; // StakedPlains, ColoradoPlains
  }
}

/** Quiet the ambient mix at dawn/night; full volume during the day. */
function todVolumeScale(tod: TimeOfDay): number {
  switch (tod) {
    case TimeOfDay.Night:   return 0.50;
    case TimeOfDay.Dawn:
    case TimeOfDay.Sunset:  return 0.70;
    default:                return 1.00;
  }
}

function sfxVolume(): number {
  const p = store.getState().audioPrefs;
  return p.muted ? 0 : p.master * p.sfx;
}

// ---- Reactive update for ambient track ----

function updateAmbiance(): void {
  const s = store.getState();
  const p = s.audioPrefs;
  if (p.muted) return;

  if (s.dailyCyclePhase === 'camp') {
    switchAmbianceTrack(AmbianceTrack.Camp, p.master, p.music);
  } else {
    const track    = biomeToTrack(s.world.biome, s.world.weather);
    const volScale = todVolumeScale(s.world.timeOfDay);
    switchAmbianceTrack(track, p.master * volScale, p.music);
  }
}

function updateAmbianceVolume(): void {
  const p = store.getState().audioPrefs;
  if (!p.muted) setAmbianceVolume(p.master, p.music);
}

// ---- Public API ----

/**
 * Initialize the audio system and attach reactive Zustand subscriptions.
 * Must be called once after the store is ready, in a browser context.
 */
export function initAudio(): void {
  if (typeof window === 'undefined') return; // guard for SSR / Vitest

  // -- Unlock AudioContext on first user gesture (autoplay policy) --
  // unlockAudio() creates/resumes the AudioContext synchronously inside
  // the event handler, satisfying browser autoplay policy before any
  // game-driven SFX fires. The { once: true } option auto-removes the listener.
  const gestureEvents = ['click', 'keydown', 'touchstart'] as const;
  const onGesture = () => {
    unlockAudio();
    gestureEvents.forEach((ev) => document.removeEventListener(ev, onGesture));
  };
  gestureEvents.forEach((ev) => document.addEventListener(ev, onGesture, { once: true }));

  // -- Ambient: respond to world state and phase changes --

  store.subscribe((s) => s.world.biome,          updateAmbiance);
  store.subscribe((s) => s.world.weather,        updateAmbiance);
  store.subscribe((s) => s.world.timeOfDay,      updateAmbiance);
  store.subscribe((s) => s.dailyCyclePhase, (phase) => {
    updateAmbiance();
    // Camp transition SFX fires on entering the camp phase.
    if (phase === 'camp') {
      playSfxEvent(SfxEvent.CampStart, sfxVolume());
    }
  });

  // -- Ambient: respond to preference changes --
  // Use separate primitive selectors so each subscription fires only when
  // its own value changes — avoiding the "object selector always triggers"
  // bug where ({ master, music, muted }) creates a new object on every call.

  store.subscribe((s) => s.audioPrefs.muted, (muted) => {
    muteAmbiance(muted);
    // If unmuting, re-evaluate the correct track — biome/weather may have
    // changed while muted (updateAmbiance bails early when muted: true).
    if (!muted) updateAmbiance();
  });

  store.subscribe((s) => s.audioPrefs.master, updateAmbianceVolume);
  store.subscribe((s) => s.audioPrefs.music,  updateAmbianceVolume);

  // -- SFX: encounter trigger --

  let prevEncounter: unknown = null;
  store.subscribe((s) => s.pendingEncounter, (enc) => {
    if (enc !== null && prevEncounter === null) {
      playSfxEvent(SfxEvent.Encounter, sfxVolume());
    }
    prevEncounter = enc;
  });

  // -- SFX: waypoint arrival --

  let prevWaypoint: string | null = null;
  store.subscribe((s) => s.journey.waypoint, (wp) => {
    if (prevWaypoint !== null && wp !== prevWaypoint) {
      playSfxEvent(SfxEvent.Waypoint, sfxVolume());
    }
    prevWaypoint = wp;
  });

  // -- SFX: game end --

  store.subscribe((s) => s.gameEndState, (end) => {
    if (!end) return;
    stopAmbiance();
    if (end.reason === 'victory') {
      playSfxEvent(SfxEvent.Victory, sfxVolume());
    } else if (end.reason === 'death') {
      playSfxEvent(SfxEvent.GameOver, sfxVolume());
    }
  });

  // Evaluate initial store state so ambient music starts immediately on load,
  // rather than waiting for the first biome/weather/phase change.
  updateAmbiance();
}
