# Frontier Audio System

**Date:** 2026-06-07

The audio system in Frontier is built on [Howler.js](https://howlerjs.com/) and provides ambient music, sound effects, and voiceovers. This directory contains modules for managing different audio categories.

## Structure

```
src/audio/
├── ambiance.ts       # Ambient music manager with crossfading
├── effects.ts        # Sound effects (WIP)
├── voice.ts          # Voiceover system (WIP)
└── index.ts          # Audio system initialization
```

## Ambient Music

The `ambiance.ts` module handles crossfading between ambient tracks based on game state (biome, weather, time of day). Tracks are loaded lazily and cached.

### Track Files

Place audio files in:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg  (for Firefox compatibility)
```

Supported track names are defined in `@/types/audio` as `AmbianceTrack`.

### Usage

```ts
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains-day', 0.8, 0.7); // masterVol=0.8, musicVol=0.7

// Update volume (e.g., when sliders change)
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

### Crossfading

- Crossfade duration: 2500ms
- Tracks are faded out before stopping to prevent abrupt cuts
- Rapid track switches cancel pending fades to avoid audio leaks

## Sound Effects

*(Coming soon - see `effects.ts` for planned implementation)*

## Voiceovers

*(Coming soon - see `voice.ts` for planned implementation)*

## Initialization

The audio system is initialized in `src/audio/index.ts`, which sets up global volume controls and connects to the game state store.

## Development Notes

- The system is a no-op in Node.js/Vitest environments (no audio context)
- Missing audio files are logged in development mode but don't crash the game
- All audio is muted by default until explicitly enabled