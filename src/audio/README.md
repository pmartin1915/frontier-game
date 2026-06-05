```
# Audio System

**Date:** 2026-06-05

The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and the core audio initialization system.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading support. Uses Howler.js for audio playback.

#### Key Features:
- Lazy-loaded Howl instances for each track
- Crossfading between tracks with configurable duration
- Volume control with master and music volume levels
- Mute functionality
- Graceful handling of missing audio files

#### Usage:
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains', 1.0, 0.8);

// Update volume
setAmbianceVolume(1.0, 0.7);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

#### Audio File Requirements:
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility.

## Initialization
The audio system is initialized in `src/audio/index.ts` (not shown in current files). This sets up the audio context and connects to the game state.

## Development Notes
- The system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development but silently ignored in production
- Crossfade duration is set to 2500ms by default
```