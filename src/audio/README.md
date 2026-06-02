```
# Frontier Audio System

**Date:** 2026-06-02

The audio system in Frontier is built around [Howler.js](https://howlerjs.com/) for cross-browser audio support with Web Audio API fallback. This directory contains modules for managing different audio categories in the game.

## Modules

### `ambiance.ts`
Manages ambient music tracks with crossfading between biomes and weather conditions.

#### Key Features:
- Lazy-loaded Howl instances (tracks load only when needed)
- Crossfading between tracks (2.5 second fade)
- Volume control with master and music-specific levels
- Mute functionality
- Automatic cleanup of fading tracks

#### Usage:
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

#### Track Files:
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility.

## Audio Categories

1. **Ambient Music** - Background tracks that change with biomes and weather
2. **Sound Effects** - (Planned) One-shot sounds for actions and events
3. **Voice** - (Planned) Character dialogue and narration

## Development Notes

- The audio system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development but fail silently in production
- All audio is preloaded for immediate playback when needed
- Volume levels are always clamped between 0-1

## Future Improvements

- Add sound effect management
- Implement dynamic audio mixing based on game state
- Add spatial audio for certain events
- Implement audio ducking for important sounds
```