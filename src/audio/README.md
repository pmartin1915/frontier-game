# Frontier Audio System

**Date:** 2026-06-02

The audio system provides ambient music, sound effects, and voiceovers for the Frontier game. It is built on [Howler.js](https://howlerjs.com/) and designed for seamless crossfading, lazy loading, and volume control.

## Directory Structure

```
src/audio/
├── ambiance.ts        # Ambient music manager
├── effects.ts         # Sound effects manager (TBD)
├── voice.ts           # Voiceover manager (TBD)
└── index.ts           # Audio system initialization
```

## Ambient Music

The ambient music system (`ambiance.ts`) manages crossfading between tracks based on game state (biome, weather, time of day). Tracks are loaded on-demand and cached for subsequent plays.

### Track Files

Place audio files in:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg
```

Supported formats:
- `.mp3` (primary)
- `.ogg` (fallback for Firefox)

Missing files are logged in development mode but fail silently in production.

### API

```typescript
/**
 * Switches to a new ambient track with crossfading.
 * @param track - The track to switch to (AmbianceTrack enum).
 * @param masterVol - Current master volume (0-1).
 * @param musicVol - Current music sub-volume (0-1).
 */
export function switchAmbianceTrack(track: AmbianceTrack, masterVol: number, musicVol: number): void;

/**
 * Updates the volume of the currently playing track.
 * @param masterVol - Current master volume (0-1).
 * @param musicVol - Current music sub-volume (0-1).
 */
export function setAmbianceVolume(masterVol: number, musicVol: number): void;

/**
 * Mutes or unmutes the active ambient track.
 * @param muted - True to mute, false to unmute.
 */
export function muteAmbiance(muted: boolean): void;

/**
 * Stops the active ambient track with fade-out.
 */
export function stopAmbiance(): void;
```

### Usage Example

```typescript
import { switchAmbianceTrack, setAmbianceVolume } from './audio/ambiance';
import { AmbianceTrack } from '@/types/audio';

// Switch to desert track
switchAmbianceTrack(AmbianceTrack.Desert, 0.8, 0.7);

// Update volume
setAmbianceVolume(0.5, 0.9);
```

## Sound Effects

*Coming soon* - The `effects.ts` module will manage one-shot sound effects (e.g., gunshots, footsteps).

## Voiceovers

*Coming soon* - The `voice.ts` module will handle character voiceovers with subtitles.

## Initialization

The audio system is initialized in `src/audio/index.ts`:

```typescript
/**
 * Initializes the audio system and sets up subscriptions to game state.
 */
export function initAudio(): void;
```

## Development Notes

- The system is a no-op in Node.js/Vitest environments (Howler requires a browser).
- Volume levels are clamped to the range [0, 1].
- Crossfades are 2.5 seconds by default (`CROSSFADE_MS` constant).