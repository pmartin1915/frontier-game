```
# Frontier Audio System

Date: 2026-06-05

## Overview
The audio system provides ambient music, sound effects, and voiceovers for the Frontier game. It is built on [Howler.js](https://howlerjs.com/) for cross-browser audio support.

## Directory Structure
```
src/audio/
├── ambiance.ts       # Ambient music management with crossfading
├── effects.ts        # Sound effects (TBD)
├── voice.ts          # Voiceover management (TBD)
└── index.ts          # Audio system initialization
```

## Ambient Music
The ambient music system (`ambiance.ts`) manages dynamic crossfading between tracks based on game state (biome, weather, time of day).

### Key Features
- **Lazy Loading**: Tracks are loaded on first access to minimize initial load time
- **Crossfading**: Smooth transitions between tracks (2.5s crossfade by default)
- **Volume Control**: Independent master and music volume controls
- **Error Handling**: Silent failure for missing audio files in production

### Usage
```typescript
import { switchAmbianceTrack, setAmbianceVolume } from './ambiance';

// Switch to a new track
switchAmbianceTrack('plains-day', 1.0, 0.8);

// Update volume (e.g. when user adjusts settings)
setAmbianceVolume(1.0, 0.7);
```

### Audio File Requirements
Place audio files in `public/audio/ambient/` with both `.mp3` and `.ogg` formats:
```
public/audio/ambient/
├── plains-day.mp3
├── plains-day.ogg
├── mountains-night.mp3
├── mountains-night.ogg
└── ...
```

## Sound Effects
*(TBD - Implementation planned for v0.3.0)*

## Voiceovers
*(TBD - Implementation planned for v0.4.0)*

## Initialization
The audio system is initialized in `src/audio/index.ts`:
```typescript
import { initAudio } from './audio';

initAudio(); // Sets up Howler context and initial subscriptions
```

## Development Notes
- The system is a no-op in Node.js/Vitest environments
- Missing audio files are logged in development but fail silently in production
- Volume levels are clamped between 0-1
- Crossfading can be interrupted for rapid track changes
```