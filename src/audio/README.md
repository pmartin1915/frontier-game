# Frontier Audio System

**Date:** 2026-06-06

The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and the core audio initialization system.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading support. Uses Howler.js for audio playback.

#### Key Features
- Lazy-loaded Howl instances for each ambient track
- Crossfading between tracks with configurable duration
- Volume control (master and music-specific)
- Mute functionality
- Graceful handling of missing audio files

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains-day', 0.8, 0.5);

// Update volume
setAmbianceVolume(0.7, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Structure
Place audio files in:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg
```

The system automatically falls back to `.ogg` for Firefox compatibility.

---

### `.gitkeep`
Placeholder file to ensure the directory is tracked by Git.

## Environment Notes
- The audio system is a no-op in Node.js/Vitest environments as it requires a browser audio context.
- In development mode, missing audio files are logged to the console.

## Integration
The audio system is initialized via `initAudio()` in `src/audio/index.ts`, which should be called once at application startup.