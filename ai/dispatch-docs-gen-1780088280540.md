# docs-gen

FILE: src/App.tsx
/**
 * @file The root component of the Frontier application.
 *
 * This component sets up the main application structure, including:
 * - Global theme styles
 * - Error boundaries for robust rendering
 * - Responsive layout switching between desktop and mobile views
 * - All top-level UI overlays and modals (e.g., briefings, encounters, menus)
 *
 * It also initializes global systems like the auto-player and audio manager.
 * In development mode, it includes a "Vite agent bridge" to allow external
 * tools to monitor and control the game state.
 */
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

// --- Vite Agent Bridge (Development-Only) ---
// This block sets up a simple API endpoint via Vite's dev server to allow
// an external process (e.g., a test harness, an AI agent) to observe and
// control the game state.
//
// - State Snapshots: On every phase change, a snapshot of the game state
//   is POSTed to `/api/agent/state`.
// - Command Polling: The app polls `/api/agent/command` periodically to
//   receive and execute commands from the external agent.
//
// This is not included in the production build.
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
 * The main application component.
 *
 * Renders the appropriate layout (desktop or mobile) and all overlay
 * components that can appear over the main game view.
 * @returns {React.ReactElement} The root JSX element for the application.
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
FILE: src/api/README.md
# Development Agent API

This directory contains a development-only API server middleware for Vite. It allows an external process, such as a test harness or an AI agent, to observe and control the game state without directly modifying the source code.

This API is **only available in development mode** (`npm run dev`) and is not included in the production build.

## Endpoints

### `POST /api/agent/state`

The game client pushes a snapshot of its current state to this endpoint whenever a significant state change occurs (e.g., a new day, an encounter starts). The external agent can listen for these POST requests to monitor the game's progress.

The payload is a JSON object representing a simplified view of the game state.

### `GET /api/agent/command`

The game client polls this endpoint periodically (e.g., every 1.5 seconds). The external agent's server should respond with a JSON object containing a command for the client to execute. If no command is pending, it should respond with an empty body or a `204 No Content` status.

Example command payload:
```json
{
  "command": {
    "action": "setDailyDecisions",
    "pace": "Normal",
    "discretionaryAction": "Rest",
    "nightTravel": false
  }
}
```

Supported actions are defined in the switch statement within `src/App.tsx`.
FILE: src/audio/README.md
# Audio System

This directory contains the audio management system for the Frontier game, built on top of [Howler.js](https://howlerjs.com/).

The system is designed to be reactive, with all audio changes (music, ambiance, sound effects) triggered by changes in the global [Zustand](https://github.com/pmndrs/zustand) store. This decouples the audio logic from the game engine and UI components.

## File Structure

-   `index.ts`: The main entry point. The `initAudio()` function is called once at application startup to set up all the necessary store subscriptions.
-   `ambiance.ts`: Manages background ambient music tracks, including logic for crossfading between them based on game state (e.g., biome, weather, time of day).
-   `sfx.ts`: (Or similar) Manages one-shot sound effects for events like button clicks, encounters, or game outcomes.

## Adding New Audio Files

Audio files are served from the `public/` directory.

### Ambient Tracks

1.  Place your audio files in `public/audio/ambient/`.
2.  Provide both `.mp3` and `.ogg` formats for maximum browser compatibility.
3.  Add a new entry to the `AmbianceTrack` enum in `src/types/audio.ts`. The enum value must match the filename (without the extension).
4.  Update the logic in `src/audio/index.ts` (e.g., in `biomeToTrack`) to determine when your new track should play.

### Sound Effects

1.  Place your audio files in `public/audio/sfx/`.
2.  Add a new entry to the `SfxEvent` enum in `src/types/audio.ts`.
3.  Map the new `SfxEvent` to its corresponding sound file(s) in `sfx.ts`.
4.  Trigger the sound effect from anywhere in the application by calling `store.getState().triggerSfx(SfxEvent.YourNewEvent)`.
FILE: src/audio/ambiance.ts
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
 * If the target track is already the active one, this function will simply
 * adjust the volume to the new target level without restarting or crossfading.
 * Handles rapid switches by immediately stopping any previously fading-out track.
 *
 * @param {AmbianceTrack} track The target ambient track to play.
 * @param {number} masterVol The master volume level (0-1).
 * @param {number} musicVol The music-specific volume level (0-1). The final
 *   target volume is `masterVol * musicVol`.
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
 * This should be used for immediate volume changes, like when a user adjusts
 * a volume slider in the settings. It does not crossfade.
 *
 * @param {number} masterVol The master volume level (0-1).
 * @param {number} musicVol The music-specific volume level (0-1).
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
 * This does not stop the track, allowing it to be resumed from the same
 * position when unmuted.
 *
 * @param {boolean} muted `true` to mute, `false` to unmute.
 */
export function muteAmbiance(muted: boolean): void {
  if (!isBrowser()) return;
  if (_activeTrack !== null) {
    _tracks.get(_activeTrack)?.mute(muted);
  }
}

/**
 * Fades out and stops all ambient audio.
 *
 * This is typically used when the game ends (victory or game over) to
 * provide a clean audio stop. It also cleans up any tracks that might be
 * in the middle of a fade-out transition.
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
FILE: src/audio/index.ts
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
 *
 * This function should be called once at application startup in a browser
 * environment. It performs the following setup:
