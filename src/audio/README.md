# Audio System

**Date:** 2026-06-01

The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states.

#### Key Features
- Lazy-loaded Howl instances to avoid upfront loading of all audio files
- Crossfading between tracks with configurable duration (default: 2500ms)
- Volume control with master and music-specific volume levels
- Mute functionality
- Automatic cleanup of fading tracks to prevent memory leaks

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (crossfades automatically)
switchAmbianceTrack('plains-day', 0.8, 0.7);

// Update volume without changing tracks
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility. The system will automatically attempt to load both formats.

Example:
```
public/audio/ambient/
├── plains-day.mp3
├── plains-day.ogg
├── mountains-storm.mp3
├── mountains-storm.ogg
└── ...
```

#### Error Handling
In development mode, loading errors are logged to the console. In production, failed loads are silently ignored (the track simply won't play).

---

## Environment Considerations
- The audio system is a no-op in Node.js/Vitest environments since Howler requires a browser audio context
- All audio operations are non-blocking and won't affect game performance

## Future Extensions
- Sound effect management
- Voiceover system
- Dynamic audio mixing based on game state