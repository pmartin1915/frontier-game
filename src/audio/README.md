# Audio System

**Date:** 2026-06-03

The audio system in Frontier is built on [Howler.js](https://howlerjs.com/) and provides ambient music, sound effects, and voiceovers. This directory contains modules for managing different audio subsystems.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states.

#### Key Features
- Lazy-loaded Howl instances to avoid upfront loading
- Crossfading between tracks (2.5s default)
- Volume control with master and music-specific levels
- Mute functionality
- Graceful handling of missing audio files

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains-day', 0.8, 0.7);

// Update volume
setAmbianceVolume(0.9, 0.6);

// Mute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility.

Example:
```
public/audio/ambient/
├── plains-day.mp3
├── plains-day.ogg
├── mountains-day.mp3
├── mountains-day.ogg
└── ...
```

## Integration
The audio system is initialized in `src/audio/index.ts` (not yet documented). All audio modules should be imported through this central module.

## Development Notes
- The system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development but fail silently in production
- Volume levels are clamped between 0-1