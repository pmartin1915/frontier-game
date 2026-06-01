```
# Audio System

Date: 2026-06-01

## Overview
The `audio` directory contains all audio-related systems for the Frontier game, including ambient music, sound effects, and voiceovers. This system is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes, weather conditions, and game states.

#### Key Features
- Lazy-loaded Howl instances to minimize initial load time
- Crossfading between tracks (2.5s fade duration)
- Volume control with master and music-specific levels
- Mute functionality
- Graceful handling of missing audio files

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains-day', 1.0, 0.8);

// Update volume
setAmbianceVolume(1.0, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats:
```
public/audio/ambient/
├── plains-day.mp3
├── plains-day.ogg
├── mountains-night.mp3
├── mountains-night.ogg
└── ...
```

## Integration Points
The audio system is initialized in `src/App.tsx` via `initAudio()` and controlled through the game state system.

## Development Notes
- The system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development mode but fail silently in production
- Crossfading can be interrupted for rapid track changes without audio leaks

## Future Enhancements
- Dynamic layering of ambient tracks (e.g., wind + rain)
- Spatial audio for 3D environments
- Audio event triggers for game events
```