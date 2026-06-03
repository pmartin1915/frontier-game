```
# Frontier Audio System

Date: 2026-06-03

## Overview
The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and the core audio initialization system.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between different biomes and weather conditions.

#### Key Features
- Lazy-loaded Howl instances to avoid upfront loading
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

// Stop all ambient music
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats:
```
public/audio/ambient/
  plains.mp3
  plains.ogg
  mountains.mp3
  mountains.ogg
  storm.mp3
  storm.ogg
  ...
```

### `.gitkeep`
Placeholder file to ensure the directory exists in version control.

## Integration
The audio system is initialized in `src/audio/index.ts` (not shown in current files) which sets up the core audio context and connects to the game state.

## Development Notes
- The system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development but fail silently in production
- Crossfade duration is set to 2500ms by default
```