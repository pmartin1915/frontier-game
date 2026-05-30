# docs-gen

FILE: src/App.tsx
/**
 * @file Main application component for the Frontier game.
 * @module App
 * @description
 * This component sets up the primary UI layout, initializes core game systems,
 * and renders various overlays and screens based on the game state.
 * It also includes a development-only agent bridge for external control and state inspection.
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
 * The root React component for the Frontier game application.
 *
 * It determines the appropriate layout (desktop or mobile) based on the
 * `useIsMobile` hook and renders all primary UI elements, including
 * the main game layout, various overlays, and an error toast.
 * An `ErrorBoundary` wraps the entire application to catch and display
 * rendering errors gracefully.
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
 * If a track is currently fading out, its fade is immediately cancelled
 * and the track is stopped to prevent overlapping audio or leaked instances.
 *
 * @param {AmbianceTrack} track     The target ambient track to play.
 * @param {number} masterVol        The current master volume (0-1).
 * @param {number} musicVol         The current music sub-volume (0-1).
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
      const from
