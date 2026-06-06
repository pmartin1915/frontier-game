# Frontier Audio System

**Date:** 2026-06-06

The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes and weather conditions. Uses Howler.js for audio playback.

#### Key Features
- Lazy-loaded Howl instances to avoid upfront loading
- Crossfading between tracks (2.5s fade duration)
- Volume control with master and music sub-volume
- Mute functionality
- Graceful handling of missing audio files (silent failure in production)

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (crossfades automatically)
switchAmbianceTrack('forest', 0.8, 0.7);

// Update volume without crossfading
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
  forest.mp3
  forest.ogg
  desert.mp3
  desert.ogg
  ...
```

## Environment Notes
- The audio system is a no-op in Node.js/Vitest environments
- All audio functionality requires a browser with AudioContext support

## Future Enhancements
- Dynamic layering of ambient tracks (e.g., wind + rain)
- Volume normalization across tracks
- Preloading strategy for smoother transitions

---

**As of:** 2026-06-06