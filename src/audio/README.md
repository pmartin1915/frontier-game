# Frontier Audio System

**Date:** 2026-06-02

The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states. Tracks are lazy-loaded and cached for performance.

#### Key Features
- Crossfading between tracks with configurable duration
- Volume control with master and music-specific levels
- Mute functionality
- Graceful handling of missing audio files
- No-op in non-browser environments (e.g., tests)

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (e.g., when entering a biome)
switchAmbianceTrack('plains-day', 0.8, 0.7);

// Update volume (e.g., when user adjusts settings)
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music (e.g., on game over)
stopAmbiance();
```

#### Audio File Structure
Place audio files in `public/audio/ambient/` with the following naming convention:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg  (for Firefox compatibility)
```

Supported track names are defined in `@/types/audio` as `AmbianceTrack`.

## Development Notes

1. **Environment Compatibility**: All audio modules are designed to be no-ops in Node.js/Vitest environments where audio APIs are unavailable.

2. **Error Handling**: Missing audio files are logged in development but silently ignored in production to prevent game-breaking errors.

3. **Performance**: Tracks are lazy-loaded on first use and cached to minimize initial load time.

4. **Testing**: Audio functionality should be tested in a browser environment. Unit tests can mock Howler.js or use the no-op behavior in Node.

## Future Enhancements

- Dynamic track layering (e.g., adding storm sounds over biome music)
- Volume normalization across tracks
- Preloading strategies for critical tracks
- Web Audio API effects (reverb, EQ)