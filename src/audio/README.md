```
# Frontier Audio System

Date: 2026-06-03

## Overview
The audio system in Frontier provides ambient music, sound effects, and voiceovers to enhance immersion. It is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Directory Structure
```
src/audio/
├── ambiance.ts       # Ambient music management with crossfading
├── effects.ts        # Sound effects management
├── voice.ts          # Voiceover management
├── index.ts          # Audio system initialization
└── README.md         # This documentation
```

## Ambient Music System (`ambiance.ts`)
Manages background music tracks with smooth crossfading between biomes, weather conditions, and game states.

### Key Features
- Lazy-loaded Howl instances to avoid upfront loading
- Crossfading between tracks (2.5s default)
- Volume control with master and music sub-volume
- Mute capability
- Graceful handling of missing audio files

### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track (crossfades automatically)
switchAmbianceTrack('plains-day', 1.0, 0.8);

// Update volume without crossfading
setAmbianceVolume(1.0, 0.5);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

### Audio File Requirements
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

## Sound Effects System (`effects.ts`)
Manages one-shot sound effects like footsteps, gunshots, and UI sounds.

## Voiceover System (`voice.ts`)
Handles character voiceovers with queueing and priority management.

## Initialization
The audio system is initialized in `src/audio/index.ts` which sets up global volume controls and system subscriptions.

## Development Notes
- The system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development but fail silently in production
- All audio files should be preloaded for best performance
```