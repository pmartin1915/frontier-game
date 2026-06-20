```
# Frontier Audio System

**Date:** 2026-06-20

The audio system in Frontier is built on [Howler.js](https://howlerjs.com/) and provides ambient music, sound effects, and voiceovers. This directory contains modules for managing different audio categories with lazy loading and crossfading capabilities.

## Structure

```
src/audio/
├── ambiance.ts       # Ambient music manager with crossfading
├── effects.ts        # Sound effects system
├── voice.ts          # Voiceover system
├── index.ts          # Audio system initialization and global controls
└── types.ts          # Audio-specific type definitions
```

## Ambient Music

The `ambiance.ts` module handles crossfading between ambient tracks based on game state (biome, weather, time of day). Tracks are loaded lazily and cached to minimize initial load time.

### Track Files

Place audio files in:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg  (for Firefox compatibility)
```

Supported track names are defined in `@/types/audio` as `AmbianceTrack` enum:
```typescript
export enum AmbianceTrack {
  PlainsDay = 'plains-day',
  PlainsNight = 'plains-night',
  ForestDay = 'forest-day',
  ForestNight = 'forest-night',
  MountainsDay = 'mountains-day',
  MountainsNight = 'mountains-night',
  DesertDay = 'desert-day',
  DesertNight = 'desert-night',
  Storm = 'storm',
  Blizzard = 'blizzard',
  Silence = 'silence'
}
```

### Usage

```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track with volume settings
switchAmbianceTrack(AmbianceTrack.ForestDay, 0.8, 0.7); // masterVol=0.8, musicVol=0.7

// Update volume (e.g., when sliders change)
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();
```

### Crossfading

- Crossfade duration: 2500ms (configurable via `CROSSFADE_DURATION_MS` constant)
- Tracks are faded out before stopping to prevent abrupt cuts
- Rapid track switches cancel pending fades to avoid audio leaks
- Volume changes are smoothly interpolated

## Sound Effects

The `effects.ts` module manages short sound effects for UI interactions and game events.

### Supported Effects

```typescript
export enum SoundEffect {
  ButtonClick = 'button-click',
  Notification = 'notification',
  HorseNeigh = 'horse-neigh',
  Footstep = 'footstep',
  Rain = 'rain',
  Wind = 'wind',
  Fire = 'fire',
  ItemPickup = 'item-pickup',
  ItemDrop = 'item-drop',
  Error = 'error'
}
```

### Usage

```typescript
import { playEffect, setEffectsVolume, muteEffects } from './effects';

// Play a sound effect
playEffect(SoundEffect.ButtonClick, 0.5); // volume=0.5

// Update effects volume
setEffectsVolume(0.7);

// Mute/unmute effects
muteEffects(true);
```

### Implementation Details

- Effects are loaded on first use and cached
- Multiple instances of the same effect can play simultaneously
- Effects are automatically stopped when completed
- Missing effect files are logged in development but don't crash the game

## Voiceovers

The `voice.ts` module handles narrative voiceovers for story events and encounters.

### Usage

```typescript
import { playVoiceover, stopVoiceover, setVoiceVolume, muteVoice } from './voice';

// Play a voiceover (automatically stops any currently playing voiceover)
playVoiceover('encounter-trader-01', 0.8);

// Stop current voiceover
stopVoiceover();

// Update voice volume
setVoiceVolume(0.6);

// Mute/unmute voice
muteVoice(true);
```

### Voiceover Files

Place voiceover files in:
```
public/audio/voice/<voiceId>.mp3
public/audio/voice/<voiceId>.ogg
```

Voice IDs should match encounter IDs or follow a naming convention like:
- `encounter-<id>`
- `event-<id>`
- `narrative-<id>`

## Global Audio Controls

The `index.ts` module provides initialization and global audio controls:

```typescript
import { initAudio, setMasterVolume, muteAll, getAudioState } from './audio';

// Initialize audio system (called once at app start)
initAudio();

// Set master volume (0-1)
setMasterVolume(0.8);

// Mute/unmute all audio
muteAll(true);

// Get current audio state
const state = getAudioState();
/*
{
  masterVolume: number,
  ambiance: {
    currentTrack: AmbianceTrack | null,
    volume: number,
    muted: boolean
  },
  effects: {
    volume: number,
    muted: boolean
  },
  voice: {
    volume: number,
    muted: boolean,
    currentVoice: string | null
  }
}
*/
```

## Initialization

The audio system is initialized in `src/audio/index.ts`, which:
1. Sets up global volume controls
2. Connects to the game state store for automatic ambiance switching
3. Handles audio context suspension/resumption
4. Provides a no-op implementation for Node.js/Vitest environments

## Development Notes

- The system is a no-op in Node.js/Vitest environments (no audio context)
- Missing audio files are logged in development mode but don't crash the game
- All audio is muted by default until explicitly enabled
- Audio files are preloaded when first used and cached
- Volume changes are smoothly interpolated to prevent audio pops

## Audio File Guidelines

1. **Formats**: Provide both MP3 and OGG versions for cross-browser compatibility
2. **Bitrate**: 128-192 kbps for music, 96-128 kbps for effects/voice
3. **Length**:
   - Ambient tracks: 2-5 minutes (loopable)
   - Sound effects: <5 seconds
   - Voiceovers: <30 seconds
4. **Naming**: Use kebab-case for filenames (e.g., `plains-day.mp3`)
5. **Normalization**: Ensure consistent volume levels across all files
```