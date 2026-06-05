# Frontier Audio System

**Date:** 2026-06-05

The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and the core audio initialization system.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading support. Uses Howler.js for audio playback.

#### Key Features
- Lazy-loading of audio tracks to minimize initial load time
- Crossfading between tracks with configurable duration
- Volume control with master and music sub-volume support
- Mute functionality
- Graceful handling of missing audio files

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains-day', 0.8, 0.7);

// Update volume
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility.

### `.gitkeep`
Placeholder file to ensure the directory exists in version control.

## Integration
The audio system is initialized in `src/App.tsx` via the `initAudio()` function. This sets up the core audio context and connects it to the game state.

## Development Notes
- The audio system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development mode but fail silently in production
- Volume levels are clamped between 0 and 1