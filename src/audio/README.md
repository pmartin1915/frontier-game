# Audio System

**Date:** 2026-06-07

The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and the core audio initialization system.

## Modules

### `ambiance.ts`
Handles ambient music playback with crossfading between tracks. Tracks are loaded lazily and respond to volume changes from the settings system.

**Key Features:**
- Crossfading between tracks with configurable duration
- Lazy loading of audio assets
- Volume control (master and music-specific)
- Graceful handling of missing audio files
- No-op in non-browser environments

**Usage:**
```typescript
import { switchAmbianceTrack, setAmbianceVolume, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('forest-day', 0.8, 0.7);

// Update volume
setAmbianceVolume(0.5, 0.9);

// Stop all ambient music
stopAmbiance();
```

### `index.ts` (Planned)
Core audio system initialization and global volume management. Will handle:
- Audio context creation
- Global volume settings
- System-wide mute state
- Integration with game state

## Audio File Structure

All audio files should be placed in the `public/audio` directory with the following structure:

```
public/audio/
├── ambient/          # Ambient music tracks
│   ├── plains-day.mp3
│   ├── plains-day.ogg
│   ├── forest-night.mp3
│   └── ...
├── effects/          # Sound effects
│   ├── horse-neigh.mp3
│   ├── campfire.mp3
│   └── ...
└── voice/            # Voice acting (future)
```

## Implementation Notes

1. **Format Support**: Each audio file should be provided in both MP3 and OGG formats for cross-browser compatibility.

2. **Performance**: Audio files are loaded lazily to minimize initial load time. Only the currently playing track and recently used tracks are kept in memory.

3. **Error Handling**: Missing audio files are logged in development mode but otherwise handled gracefully to prevent game crashes.

4. **Volume Control**: All audio respects both master volume and category-specific volume settings (music, effects, voice).

5. **Testing**: Audio modules should be tested in both browser and Node.js environments, with appropriate no-op behavior in the latter.

## Future Enhancements

1. **Sound Effects System**: Implementation of a sound effects manager similar to the ambient system.

2. **Voice Acting Support**: Integration of voice lines for narrative elements.

3. **Dynamic Audio**: System for dynamically mixing multiple audio layers based on game state.

4. **Audio Settings**: Persistent audio settings with presets.