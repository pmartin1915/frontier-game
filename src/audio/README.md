# Frontier Audio System

**Date:** 2026-06-10

## Overview
The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers. Audio is managed via Howler.js for cross-browser compatibility and dynamic loading.

## Modules

### `ambiance.ts`
Handles ambient music playback with crossfading between tracks. Tracks are loaded lazily and respond to volume adjustments in real time.

#### Key Features
- **Lazy Loading:** Tracks are loaded only when first accessed.
- **Crossfading:** Smooth transitions between tracks (2.5s fade).
- **Volume Control:** Supports master and music-specific volume levels.
- **Mute Support:** Tracks can be muted without stopping playback.

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume } from './ambiance';
import { AmbianceTrack } from '@/types/audio';

// Switch to a new track
switchAmbianceTrack(AmbianceTrack.Forest, 1.0, 0.8);

// Update volume
setAmbianceVolume(1.0, 0.6);
```

#### Track Requirements
Audio files must be placed in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser support. Missing files are logged in development but fail silently in production.

---

### `.gitkeep`
Placeholder to ensure the directory is tracked by Git.

## Integration
The audio system is initialized in `src/App.tsx` via `initAudio()`, which sets up subscriptions to game state changes (e.g., biome transitions) and manages volume levels.

## Development Notes
- **Testing:** Use `import.meta.env.DEV` to enable debug logging for missing tracks.
- **Node.js:** Audio modules are no-ops in Node.js/Vitest environments due to Howler's browser dependency.
- **Performance:** Lazy loading minimizes initial load time; ensure audio files are optimized for web.

## Future Work
- Add sound effects for encounters and UI interactions.
- Implement dynamic weather-based track layering (e.g., rain overlay on biome tracks).