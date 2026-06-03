# Frontier Audio System

**Date:** 2026-06-03

The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and voiceovers.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading support. Uses Howler.js for audio playback.

#### Key Features
- Lazy-loading of audio tracks
- Crossfading between tracks
- Volume control and muting
- Graceful handling of missing audio files

#### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains', 1.0, 0.8);

// Update volume
setAmbianceVolume(1.0, 0.5);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

#### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility.

## Development Notes

1. **Browser Dependency**: Audio modules are no-op in Node.js/Vitest environments as they require browser audio context.

2. **Error Handling**: Missing audio files are logged in development but silently ignored in production.

3. **Performance**: Tracks are loaded lazily to minimize initial load time.

## Future Enhancements

- Add sound effect management
- Implement voiceover system
- Add audio event triggers for game events