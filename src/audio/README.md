# Audio System

Date: 2026-06-04

The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states. Tracks are loaded lazily and cached for performance.

#### Key Features
- Crossfading between tracks (2.5s default)
- Volume control with master/music sub-volume support
- Mute functionality
- Graceful handling of missing audio files (silent failure in production, logged in development)
- Automatic cleanup of fading tracks to prevent memory leaks

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (crossfades automatically)
switchAmbianceTrack('plains-day', 1.0, 0.8);

// Update volume without track change
setAmbianceVolume(1.0, 0.7);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility:
```
public/audio/ambient/
├── plains-day.mp3
├── plains-day.ogg
├── mountains-storm.mp3
├── mountains-storm.ogg
└── ...
```

## Environment Considerations
- **Browser Only**: The audio system is disabled in Node.js/Vitest environments as Howler requires a browser audio context.
- **Development Mode**: Missing audio files are logged to console in development but fail silently in production.

## Future Enhancements
- Sound effect management system
- Voiceover support for narrative events
- Dynamic audio mixing based on game state

---