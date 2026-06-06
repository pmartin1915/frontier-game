# Frontier Audio System

**Date:** 2026-06-06

The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and the core audio initialization system.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading support. Uses Howler.js for audio playback.

#### Key Features
- Lazy-loading of audio tracks to minimize initial load time
- Crossfading between tracks with configurable duration
- Volume control with master and music-specific levels
- Mute functionality
- Graceful handling of missing audio files

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains', 0.8, 0.7);

// Update volume
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient audio
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats:
```
public/audio/ambient/
├── plains.mp3
├── plains.ogg
├── mountains.mp3
├── mountains.ogg
└── ...
```

### `index.ts` (Not yet implemented)
Will contain the core audio initialization system that:
- Sets up global audio context
- Manages volume levels
- Handles audio system lifecycle
- Provides hooks for other game systems

## Development Notes

1. **Browser Dependency**: The audio system requires a browser environment with AudioContext support. It will be a no-op in Node.js/Vitest environments.

2. **Error Handling**: Missing audio files are logged in development but silently ignored in production to prevent game-breaking errors.

3. **Performance**: Audio files are preloaded but only instantiated when first used to optimize memory usage.

4. **Testing**: Audio functionality should be tested manually in browser environments due to the dependency on browser APIs.

## Future Enhancements

- Sound effect management system
- Dynamic audio mixing based on game state
- Audio sprites for efficient sound effect playback
- Web Audio API effects (reverb, EQ, etc.)