# Audio System

**Date:** 2026-06-06

The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states.

#### Key Features
- Lazy-loaded Howl instances to avoid upfront loading of all audio files
- Crossfading between tracks (2.5s default)
- Volume control with master and music sub-volume
- Mute functionality
- Graceful handling of missing audio files (logged in dev, silent in prod)

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (crossfades automatically)
switchAmbianceTrack('plains-day', 1.0, 0.8);

// Update volume without track change
setAmbianceVolume(1.0, 0.5);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility:
```
public/audio/ambient/
  plains-day.mp3
  plains-day.ogg
  mountains-storm.mp3
  mountains-storm.ogg
  ...
```

## Environment Considerations
- **Browser Only**: The audio system is a no-op in Node.js/Vitest environments as Howler requires a browser audio context.
- **Development Mode**: Missing audio files are logged to console in development but fail silently in production.

## Future Extensions
- Sound effect management
- Voiceover system
- Dynamic audio mixing based on game events

---

**As of:** 2026-06-06