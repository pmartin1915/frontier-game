# Audio System

**As of: 2026-06-07**

The `audio` directory contains all audio-related modules for the Frontier game, including ambient music, sound effects, and voiceovers.

## Modules

### `ambiance.ts`
Handles ambient music playback with crossfading between tracks. Tracks are loaded on-demand and cached for performance.

#### Key Features:
- Crossfading between tracks with configurable duration
- Volume control (master and music-specific)
- Mute support
- Graceful handling of missing audio files
- No-op in non-browser environments

#### Usage:
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('forest-day', 0.8, 0.7);

// Update volume
setAmbianceVolume(0.5, 0.9);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

### Audio File Structure
All audio files should be placed in the `public/audio/` directory with the following structure:
```
public/audio/
├── ambient/
│   ├── plains-day.mp3
│   ├── plains-day.ogg
│   ├── storm.mp3
│   └── ...
├── sfx/
│   ├── horse-neigh.mp3
│   └── ...
└── voice/
    ├── narrator-01.mp3
    └── ...
```

## Development Notes

1. **File Formats**: Always provide both `.mp3` and `.ogg` versions of audio files for cross-browser compatibility.

2. **Preloading**: Ambient tracks are preloaded when first accessed, while sound effects are typically loaded on-demand.

3. **Volume Levels**: All volume parameters should be in the range 0-1.

4. **Error Handling**: Missing audio files are logged in development mode but handled gracefully in production.

## Future Work
- [ ] Add sound effect management system
- [ ] Implement voiceover system for narration
- [ ] Add audio event hooks for game state changes
- [ ] Implement dynamic audio mixing based on game state