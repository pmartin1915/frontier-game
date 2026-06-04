```
# Frontier Audio System

Date: 2026-06-04

## Overview
The `audio` directory contains all audio-related systems for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states.

#### Key Features
- Lazy-loaded Howl instances to minimize initial load time
- Crossfading between tracks with configurable duration
- Volume control with master and music-specific levels
- Mute functionality
- Graceful handling of missing audio files

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (crossfades automatically)
switchAmbianceTrack('plains-day', 0.8, 0.7);

// Update volume without crossfading
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility:
```
public/audio/ambient/
├── plains-day.mp3
├── plains-day.ogg
├── mountains-day.mp3
├── mountains-day.ogg
├── storm.mp3
├── storm.ogg
└── ...
```

## Integration Points
The audio system is initialized in `src/App.tsx` via the `initAudio()` function, which sets up subscriptions to game state changes that affect audio playback.

## Development Notes
- The system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development mode but fail silently in production
- Rapid track switches are handled gracefully by canceling pending fades

## Future Enhancements
- Dynamic track layering (e.g., base biome track + weather effects)
- Spatial audio for positional sound effects
- Audio ducking for voiceovers
```