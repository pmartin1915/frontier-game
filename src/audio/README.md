# Audio System

**Date:** 2026-06-06

The `audio` directory contains all audio-related logic for the Frontier game, including ambient music, sound effects, and volume management.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading support. Tracks are loaded on-demand and cached for the session. The system supports:
- Seamless crossfading between tracks
- Volume adjustments (master and music sub-volume)
- Muting
- Automatic cleanup of fading tracks

#### Usage
```ts
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains-day', 0.8, 0.7);

// Update volume
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

#### Track Files
Place audio files in `public/audio/ambient/` with the following naming convention:
- `track-name.mp3` (primary format)
- `track-name.ogg` (fallback for Firefox)

Supported tracks are defined in `@/types/audio` as `AmbianceTrack`.

## Environment Notes
- The audio system is a no-op in Node.js/Vitest environments because Howler requires a browser audio context.
- Missing audio files are logged in development mode but silently ignored in production.

## Future Work
- Add sound effect management
- Implement dynamic track layering (e.g., storm sounds over biome music)
- Add volume normalization for consistent playback levels