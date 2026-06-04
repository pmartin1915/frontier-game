```
# Frontier Audio System

Date: 2026-06-04

## Overview
The audio system in Frontier provides ambient music, sound effects, and UI feedback to enhance immersion. It's built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Structure
```
src/audio/
├── ambiance.ts       # Ambient music management with crossfading
├── effects.ts        # Sound effects (TBD)
├── index.ts          # Audio system initialization
└── README.md         # This file
```

## Ambient Music
Managed by `ambiance.ts`, this system handles:
- Crossfading between tracks
- Volume control (master and music-specific)
- Mute functionality
- Automatic cleanup of fading tracks

### Track Management
Tracks are loaded lazily from `public/audio/ambient/` with both `.mp3` and `.ogg` formats for cross-browser compatibility. Missing files are logged in development but don't break the game.

### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (crossfades automatically)
switchAmbianceTrack('plains-day', 1.0, 0.8);

// Update volume without track change
setAmbianceVolume(1.0, 0.5);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

## Sound Effects
(TBD - Implementation planned for v1.2)

## Initialization
The audio system is initialized in `src/audio/index.ts` which sets up:
- Volume persistence
- System mute state
- Subscriptions to game state changes

## Development Notes
- Audio is disabled in Node.js/Vitest environments
- All audio files should be placed in `public/audio/`
- Volume levels are normalized to 0-1 range
- Crossfade duration is 2500ms by default
```