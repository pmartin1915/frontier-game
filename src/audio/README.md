```
# Frontier Audio System

Date: 2026-06-07

## Overview
The audio system provides ambient music, sound effects, and voiceovers for the Frontier game. It's built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Structure
```
src/audio/
├── ambiance.ts       # Ambient music management with crossfading
├── effects.ts        # Sound effects (TBD)
├── voice.ts          # Voiceover management (TBD)
└── index.ts          # Audio system initialization
```

## Ambient Music
The ambient music system (`ambiance.ts`) handles:
- Crossfading between tracks
- Volume control (master and music-specific)
- Mute functionality
- Automatic format selection (.mp3/.ogg)

### Track Management
Tracks are loaded lazily and cached. Supported tracks are defined in `src/types/audio.ts` as `AmbianceTrack` enum.

### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './audio/ambiance';

// Switch to a new track
switchAmbianceTrack('plains', 1.0, 0.8);

// Update volume
setAmbianceVolume(0.7, 0.9);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

### File Requirements
Place audio files in:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg
```

## Initialization
The audio system is initialized in `src/audio/index.ts`:
```typescript
import { initAudio } from './audio';

initAudio(); // Called once at application startup
```

## Development Notes
- The system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development mode
- Crossfading duration is set to 2500ms by default
- Volume levels are clamped between 0-1

## Future Work
- Sound effects system
- Voiceover management
- Dynamic audio mixing based on game state
```