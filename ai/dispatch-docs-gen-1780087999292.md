# docs-gen

FILE: src/App.tsx
```
import './ui/layout/frontier-theme.css';

import DecisionOverlay from './ui/overlays/DecisionOverlay';
import BargainOverlay from './ui/overlays/BargainOverlay';
import MorningBriefing from './ui/overlays/MorningBriefing';
import SaveLoadModal from './ui/overlays/SaveLoadModal';
import CampOverlay from './ui/overlays/CampOverlay';
import GameEndScreen from './ui/overlays/GameEndScreen';
import NewGameScreen from './ui/overlays/NewGameScreen';
import ErrorToast from './ui/components/ErrorToast';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import DesktopLayout from './ui/layout/DesktopLayout';
import MobileLayout from './ui/layout/MobileLayout';
import { useIsMobile } from './ui/hooks/useIsMobile';
import { initAutoPlayer } from './engine/auto-player';
import { initAudio } from './audio';
import { store } from './store';

// Initialize the auto-player subscription once at module load.
initAutoPlayer();

// Initialize the audio system (subscriptions + Howler context).
initAudio();

// Dev-only: push game state to Vite agent bridge on every phase change.
if (import.meta.env.DEV) {
  store.subscribe(
    (s) => s.dailyCyclePhase,
    () => {
      const s = store.getState();
      const snapshot = {
        dailyCyclePhase: s.dailyCyclePhase,
        gameInitialized: s.gameInitialized,
        autoPlay: s.autoPlay,
        gameEndState: s.gameEndState,
        player: { health: s.player.health, morale: s.player.morale, fatigue: s.player.fatigue, skills: s.player.skills },
        horse: { health: s.horse.health, fatigue: s.horse.fatigue, lameness: s.horse.lameness },
        supplies: s.supplies,
        world: { biome: s.world.biome, weather: s.world.weather, totalMiles: s.world.totalMiles },
        journey: { daysElapsed: s.journey.daysElapsed, waypoint: s.journey.waypoint, pace: s.journey.pace },
        pendingEncounter: s.pendingEncounter
          ? { id: s.pendingEncounter.id, name: s.pendingEncounter.name, choices: s.pendingEncounter.choices }
          : null,
      };
      fetch('/api/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      }).catch(() => { /* non-fatal */ });
    },
  );

  const pollCommands = async () => {
    try {
      const resp = await fetch('/api/agent/command');
      if (!resp.ok) return;
      const { command } = await resp.json() as { command: unknown };
      if (!command) return;

      const cmd = command as Record<string, unknown>;
      const s = store.getState();
      switch (cmd.action) {
        case 'setAutoPlay':       s.setAutoPlay(Boolean(cmd.value)); break;
        case 'dismissOverlay':    s.dismissOverlay(); break;
        case 'startDailyCycle':   await s.startDailyCycle(); break;
        case 'setDailyDecisions': {
          const { Pace, DiscretionaryAction } = await import('./types/game-state');
          s.setDailyDecisions(
            (cmd.pace as typeof Pace[keyof typeof Pace]) ?? Pace.Normal,
            (cmd.discretionaryAction as typeof DiscretionaryAction[keyof typeof DiscretionaryAction]) ?? DiscretionaryAction.None,
            Boolean(cmd.nightTravel),
          );
          break;
        }
        case 'resolveEncounterChoice': await s.resolveEncounterChoice(String(cmd.choiceId)); break;
        case 'resolveBargainChoice':   await s.resolveBargainChoice(Boolean(cmd.accepted)); break;
        case 'initializeGame':
          s.initializeGame(String(cmd.playerName ?? 'Martin'), String(cmd.horseName ?? 'Horse'));
          break;
        default:
          console.warn('[agent-bridge] Unknown command:', cmd.action);
      }
    } catch { /* non-fatal */ }
  };

  setInterval(pollCommands, 1500);
}

/**
 * The root component of the Frontier application.
 *
 * This component is responsible for:
 * - Rendering the main layout, switching between `DesktopLayout` and `MobileLayout` based on screen size.
 * - Mounting all global UI overlays and modals (e.g., `MorningBriefing`, `DecisionOverlay`, `GameEndScreen`).
 * - Wrapping the entire application in an `ErrorBoundary` to catch and handle rendering errors gracefully.
 *
 * Note: Global systems like audio and the auto-player are initialized at the module level
 * before this component is ever rendered.
 * @returns {React.ReactElement} The main application structure.
 */
export default function App() {
  const isMobile = useIsMobile();

  return (
    <ErrorBoundary>
      <div style={styles.container}>
        {isMobile ? <MobileLayout /> : <DesktopLayout />}
        <MorningBriefing />
        <DecisionOverlay />
        <BargainOverlay />
        <SaveLoadModal />
        <CampOverlay />
        <GameEndScreen />
        <NewGameScreen />
        <ErrorToast />
      </div>
    </ErrorBoundary>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
  },
};
```
FILE: src/api/README.md
```
# /src/api

This directory is intended for server-side API route handlers, typically used for development-time features or integrations that require a backend component.

In the context of a Vite project, these can be implemented as a custom middleware.

## Agent Bridge

As of 2026-05-29, the primary use for this is the "Agent Bridge," a development tool that allows an external AI agent to observe and control the game state.

-   `POST /api/agent/state`: The game pushes a snapshot of its state to this endpoint on every major state change.
-   `GET /api/agent/command`: The game polls this endpoint to receive commands from the agent (e.g., make a decision, start the day).

This enables automated testing, evaluation, and interactive development workflows with AI-driven players.
```
FILE: src/audio/README.md
```
# /src/audio

This directory contains the game's audio system, built on top of [Howler.js](https://howlerjs.com/). The system is designed to be reactive to game state changes, managed through the central Zustand store.

## Architecture

The audio system is split into two main parts:

-   `ambiance.ts`: Manages background music and ambient soundscapes. It handles crossfading between tracks based on game state like biome, weather, or time of day.
-   `sfx.ts`: Manages one-shot sound effects for UI interactions, game events (like encounters or arriving at a waypoint), and other discrete actions.

The `index.ts` file serves as the central coordinator. It initializes the system and subscribes to relevant slices of the Zustand store. When a subscribed state changes, `index.ts` calls the appropriate functions in `ambiance.ts` or `sfx.ts` to play, stop, or modify audio.

This decoupled, reactive approach ensures that the core game engine and UI components do not need to have direct knowledge of the audio system. They simply update the game state, and the audio system responds accordingly.

## Audio File Placement

All audio assets should be placed in the `public/audio/` directory. The audio modules expect specific subdirectories:

-   Ambient tracks: `public/audio/ambient/`
-   Sound effects: `public/audio/sfx/`

Files should be provided in both `.mp3` and `.ogg` formats for maximum browser compatibility. Howler.js will automatically select the appropriate format.
```
FILE: src/audio/ambiance.ts
```
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

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
}

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

function getHowl(track: AmbianceTrack): Howl {
  if (!_tracks.has(track)) {
    _tracks.set(track, makeHowl(track));
  }
  return _tracks.get(track)!;
}

/**
 * Crossfades from the current ambient track to a new one.
 *
 * If the requested track is already the active one, this function will simply
 * adjust the volume to the new target. If a different track is playing, it will
 * be faded out while the new track is faded in.
 *
 * @param {AmbianceTrack} track The target ambient track to play.
 * @param {number} masterVol The current master volume level (0-1).
 * @param {number} musicVol The current music-specific volume level (0-1).
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
 * Updates the volume of the currently playing track without crossfading.
 * This is intended for immediate volume changes, such as when a user adjusts a volume slider.
 *
 * @param {number} masterVol The current master volume level (0-1).
 * @param {number} musicVol The current music-specific volume level (0-1).
 */
export function setAmbianceVolume(masterVol: number, musicVol: number): void {
  if (!isBrowser()) return;
  _targetVolume = Math.max(0, Math.min(1, masterVol * musicVol));
  if (_activeTrack !== null) {
    _tracks.get(_activeTrack)?.volume(_targetVolume);
  }
}

/**
 * Mutes or unmutes the active ambient track without stopping it.
 *
 * @param {boolean} muted `true` to mute the audio, `false` to unmute.
 */
export function muteAmbiance(muted: boolean): void {
  if (!isBrowser()) return;
  if (_activeTrack !== null) {
    _tracks.get(_activeTrack)?.mute(muted);
  }
}

/**
 * Fades out and stops the active ambient track.
 * This is typically used for game-end scenarios (victory or game over).
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
```
FILE: src/audio/index.ts
```
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
 * Initializes the audio system and attaches reactive Zustand subscriptions.
 * This function should be called once at application startup in a browser context.
 *
 * It performs the following actions:
 * - Sets up a one-time event listener to unlock the browser's AudioContext on the first user gesture,
 *   complying with modern autoplay policies.
 * - Subscribes to changes in the game state (e.g., biome, weather, game phase, encounters)
 *   to trigger appropriate ambient music changes and sound effects.
 * - Subscribes to audio preference changes (e.g., volume, mute) to update the audio output accordingly.
 * - Triggers an initial update to ensure ambient music starts playing immediately on game load.
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
```
