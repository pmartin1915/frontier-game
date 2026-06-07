# Frontier Audio System

**Date:** 2026-06-07

## Overview
The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Modules

### `ambiance.ts`
Handles ambient music playback with crossfading between tracks. Tracks are loaded lazily and respond to volume/mute controls.

**Key Features:**
- Crossfading between tracks (2.5s default)
- Lazy loading of audio files
- Volume and mute control
- Graceful handling of missing audio files
- No-op in Node.js/Vitest environments

**Usage:**
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('prairie_day', 0.8, 0.7);

// Update volume
setAmbianceVolume(0.5, 0.9);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

## Audio File Structure
All audio files should be placed in the `public/audio/` directory with the following structure:

```
public/audio/
├── ambient/
│   ├── prairie_day.mp3
│   ├── prairie_day.ogg
│   ├── mountain_day.mp3
│   ├── mountain_day.ogg
│   └── ...
├── sfx/
│   ├── horse_neigh.mp3
│   ├── gunshot.mp3
│   └── ...
└── voice/
    ├── encounter_1.mp3
    └── ...
```

## TypeScript Types
Audio-related types are defined in `@/types/audio.ts`. The main type is:

```typescript
export type AmbianceTrack =
  | 'prairie_day'
  | 'prairie_night'
  | 'mountain_day'
  | 'mountain_night'
  | 'forest_day'
  | 'forest_night'
  | 'desert_day'
  | 'desert_night'
  | 'storm'
  | 'blizzard';
```

## Development Notes
- Audio files should be provided in both MP3 and OGG formats for cross-browser compatibility
- Missing audio files are logged in development mode but fail silently in production
- The audio system is disabled in Node.js/Vitest environments
- Volume levels are clamped between 0 and 1

## Future Work
- [ ] Add sound effect management
- [ ] Implement voiceover system
- [ ] Add audio event hooks for game state changes
- [ ] Implement dynamic audio mixing based on game state