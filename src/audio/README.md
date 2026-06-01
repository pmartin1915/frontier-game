# Audio System

**Date:** 2026-06-01

The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states.

#### Key Features
- Lazy-loaded Howl instances to avoid upfront loading of all audio files
- Crossfading between tracks (2.5s default)
- Volume control with master/music sub-volume support
- Mute functionality
- Automatic cleanup of fading tracks to prevent memory leaks

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (crossfades automatically)
switchAmbianceTrack('plains-day', 0.8, 0.7);

// Update volume without track change
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility. Example:
```
public/audio/ambient/
├── plains-day.mp3
├── plains-day.ogg
├── mountains-storm.mp3
├── mountains-storm.ogg
└── ...
```

#### Environment Notes
- Automatically no-ops in Node.js/Vitest environments
- Missing audio files are logged in development but fail silently in production

---

## Integration Points

The audio system is initialized in `src/App.tsx` via the `initAudio()` function, which sets up subscriptions to the game state store for automatic audio updates based on:
- Current biome
- Weather conditions
- Time of day
- Game state (playing, paused, game over)

## Future Development

Planned audio features:
- Dynamic weather sound effects
- Character voiceovers for encounters
- Interactive sound effects for UI elements
- Audio settings persistence