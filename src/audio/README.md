# Audio System

**Date:** 2026-06-02

The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/), a robust audio library for the web.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states.

#### Key Features
- **Lazy Loading**: Tracks are loaded only when first accessed to reduce initial load time.
- **Crossfading**: Smooth transitions between tracks with configurable fade duration (default: 2500ms).
- **Volume Control**: Supports master volume, music sub-volume, and muting.
- **Error Handling**: Silently handles missing audio files in production; logs warnings in development.

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (e.g., when entering a new biome)
switchAmbianceTrack('plains-day', 0.8, 0.7);

// Update volume (e.g., when user adjusts settings)
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music (e.g., on game over)
stopAmbiance();
```

#### Track Naming Convention
Audio files should be placed in `public/audio/ambient/` with the following naming pattern:
- `<biome>-<timeOfDay>.mp3` (e.g., `plains-day.mp3`, `mountains-night.mp3`)
- `<biome>-<weather>.mp3` (e.g., `forest-rain.mp3`)

Supported formats: `.mp3` (primary), `.ogg` (fallback for Firefox).

---

### `.gitkeep`
Placeholder file to ensure the directory is tracked by Git.

## Integration
The audio system is initialized in `src/App.tsx` via `initAudio()`, which sets up subscriptions to game state changes (e.g., biome, weather) and updates audio accordingly.

## Environment Notes
- **Browser-Only**: Howler.js requires a browser audio context. The system is a no-op in Node.js/Vitest environments.
- **Development Mode**: Missing audio files are logged to the console for debugging.

## Future Work
- Add sound effects for encounters, UI interactions, and horse movements.
- Implement dynamic mixing (e.g., reducing music volume during voiceovers).
- Support for user-uploaded audio packs.

---

**As of:** 2026-06-02 (UTC)