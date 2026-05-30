# docs-gen

FILE: src/App.tsx
/**
 * @file The main application component for the Frontier game.
 *
 * This component sets up the overall layout (desktop or mobile) and renders
 * all primary UI overlays and screens, managing their visibility based on
 * the global game state. It also initializes core systems like audio and
 * the auto-player, and includes development-only agent bridge functionality.
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
 * The root React component for the Frontier game.
 *
 * It determines the appropriate layout (desktop or mobile) based on the
 * current viewport and renders all necessary UI components and overlays.
 * An ErrorBoundary wraps the entire application to catch and display
 * runtime errors gracefully.
 *
 * @returns {JSX.Element} The main application UI.
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

FILE: src/api/.gitkeep

FILE: src/audio/.gitkeep

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
 * Crossfade to a new ambient track.
 * If the track is already active, just updates the volume.
 *
 * @param track       Target AmbianceTrack
 * @param masterVol   Current master volume (0-1)
 * @param musicVol    Current music sub-volume (0-1)
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
 * Call this when the user moves a volume slider.
 *
 * @param masterVol   Current master volume (0-1)
 * @param musicVol    Current music sub-volume (0-1)
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
 * @param muted       True to mute, false to unmute.
 */
export function muteAmbiance(muted: boolean): void {
  if (!isBrowser()) return;
  if (_activeTrack !== null) {
    _tracks.get(_activeTrack)?.mute(muted);
  }
}

/**
 * Fade out and stop the active track (used on game over / victory).
 *
 * @returns {void}
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
 * Initialize the audio system and attach reactive Zustand subscriptions.
 * Must be called once after the store is ready, in a browser context.
 *
 * This function also sets up event listeners to unlock the browser's
 * AudioContext on the first user interaction, adhering to autoplay policies.
 *
 * @returns {void}
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
    gestureEvents.
