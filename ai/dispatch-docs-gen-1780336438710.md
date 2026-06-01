# docs-gen

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
 *
 * @module audio/ambiance
 * @date 2026-06-01
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
 * Creates a new Howl instance for the given track.
 * @param {AmbianceTrack} track - The track name to load.
 * @returns {Howl} A new Howl instance configured for ambient playback.
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
 * Gets or creates a Howl instance for the given track.
 * @param {AmbianceTrack} track - The track to retrieve.
 * @returns {Howl} The Howl instance for the requested track.
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

FILE: src/audio/README.md
# Frontier Audio System

**Date:** 2026-06-01

The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and the core audio initialization system.

## Modules

### `ambiance.ts`
Handles ambient music playback with crossfading between tracks. Uses Howler.js for audio management.

#### Key Features
- Lazy-loading of audio tracks to minimize initial load time
- Crossfading between tracks with configurable duration
- Volume control with master and music-specific levels
- Mute functionality
- Graceful handling of missing audio files

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains', 0.8, 0.7);

// Update volume
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility.

### `index.ts` (Not yet implemented)
Will contain the core audio initialization system that:
- Sets up the Howler context
- Manages global volume settings
- Provides hooks for other audio systems

## Development Notes

1. **Browser Dependency**: Audio functionality requires a browser environment with AudioContext support. Modules are no-op in Node.js/Vitest environments.

2. **Error Handling**: Missing audio files are logged in development but silently ignored in production to prevent game-breaking errors.

3. **Performance**: Audio tracks are loaded lazily to minimize initial load time.

4. **Testing**: Audio functionality should be tested in multiple browsers to ensure compatibility.

## Future Enhancements

- Sound effect management
- Dynamic audio mixing based on game state
- Audio sprites for efficient sound effect playback
- Web Audio API effects (reverb, equalization)

FILE: src/README.md
# Frontier Game Engine

**Date:** 2026-06-01

The `src` directory contains the core game engine and user interface components for Frontier.

## Directory Structure

```
src/
├── api/            # API-related modules (currently empty)
├── audio/          # Audio system modules
├── engine/         # Core game logic and state management
├── store/          # State management (likely Zustand)
├── types/          # TypeScript type definitions
├── ui/             # User interface components
│   ├── components/ # Reusable UI components
│   ├── hooks/      # Custom React hooks
│   ├── layout/     # Layout components
│   └── overlays/   # Game overlay screens
└── App.tsx         # Main application component
```

## Core Components

### `App.tsx`
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout
- Renders all primary UI overlays and screens
- Dynamically switches between mobile and desktop layouts
- Includes development-only agent bridge for external tools

#### Key Features
- Error boundary for graceful error handling
- Responsive layout switching
- Overlay management system
- Development agent bridge for state observation and control

#### Development Agent Bridge
In development mode, the application:
1. Pushes game state snapshots to `/api/agent/state` on phase changes
2. Polls `/api/agent/command` every 1.5 seconds for external commands
3. Supports commands for:
   - Auto-play control
   - Overlay dismissal
   - Daily cycle management
   - Encounter resolution
   - Game initialization

## UI Architecture

The UI is built with a layered overlay system:

1. **Layout**: `DesktopLayout` or `MobileLayout` based on screen size
2. **Overlays**: Game screens that appear on top of the layout
   - `MorningBriefing`: Daily status report
   - `DecisionOverlay`: Daily decision making
   - `BargainOverlay`: Trading and negotiation
   - `CampOverlay`: Camp management
   - `GameEndScreen`: Victory/defeat screens
   - `NewGameScreen`: Game initialization
3. **Components**: Reusable UI elements
   - `ErrorToast`: Error notification system
   - `ErrorBoundary`: Global error handling

## Initialization Systems

### Auto-Player
Initialized via `initAutoPlayer()` in `engine/auto-player.ts`. Manages automated game progression when enabled.

### Audio System
Initialized via `initAudio()` in `audio/index.ts`. Sets up:
- Howler.js context
- Ambient music system
- Sound effect management
- Volume controls

## Development Environment

The application includes several development-only features:
- State snapshot API for external tools
- Command polling for external control
- Detailed error logging
- Environment-specific behavior (DEV vs PROD)

## Future Development

1. **API Integration**: Implement the `api` directory for backend communication
2. **Enhanced Audio**: Expand the audio system with sound effects and dynamic mixing
3. **Performance Optimization**: Further optimize asset loading and rendering
4. **Accessibility**: Improve accessibility features across all components
5. **Testing**: Expand test coverage for core game logic and UI components

FILE: src/audio/index.ts
/**
 * @fileoverview
 * Frontier Audio System Initialization
 *
 * Sets up the global Howler context, manages volume settings,
 * and provides initialization for all audio subsystems.
 *
 * @module audio
 * @date 2026-06-01
 */

import { Howler } from 'howler';
import { store } from '../store';

/**
 * Initializes the audio system.
 * - Sets up Howler context
 * - Subscribes to volume changes in the store
 * - Initializes ambient music system
 */
export function initAudio(): void {
  // Set up Howler global settings
  Howler.autoUnlock = true;
  Howler.html5PoolSize = 10;

  // Subscribe to volume changes in the store
  store.subscribe(
    (state) => ({
      masterVolume: state.settings.masterVolume,
      musicVolume: state.settings.musicVolume,
      sfxVolume: state.settings.sfxVolume,
      muted: state.settings.muted,
    }),
    ({ masterVolume, musicVolume, sfxVolume, muted }) => {
      Howler.volume(masterVolume);
      Howler.mute(muted);
      // Additional volume updates for specific audio systems would go here
    }
  );

  // Initialize ambient music system
  // (Implementation would be imported from ambiance.ts)
}

/**
 * Preloads audio assets for faster playback.
 * @param {string[]} trackNames - Array of track names to preload
 */
export async function preloadAudio(trackNames: string[]): Promise<void> {
  // Implementation would load audio files in the background
  // to reduce latency when they're first played
}

/**
 * Cleans up audio resources.
 * Should be called when the game is unmounted or reset.
 */
export function cleanupAudio(): void {
  Howler.unload();
}
```
