# Frontier Audio System

**Date:** 2026-06-19

The audio system in Frontier is built on [Howler.js](https://howlerjs.com/) and provides ambient music, sound effects, and voiceovers. This directory contains modules for managing different audio categories with comprehensive volume control and state synchronization.

## Structure

```
src/audio/
├── ambiance.ts       # Ambient music manager with crossfading
├── effects.ts        # Sound effects system
├── voice.ts          # Voiceover system
├── volume.ts         # Volume control and persistence
├── index.ts          # Audio system initialization
└── types.ts          # Audio-related type definitions
```

## Ambient Music

The `ambiance.ts` module handles crossfading between ambient tracks based on game state (biome, weather, time of day). Tracks are loaded lazily and cached with memory management.

### Track Files

Place audio files in:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg  (for Firefox compatibility)
```

Supported track names are defined in `@/types/audio` as `AmbianceTrack`:
```typescript
export type AmbianceTrack =
  | 'plains-day'
  | 'plains-night'
  | 'forest-day'
  | 'forest-night'
  | 'mountain-day'
  | 'mountain-night'
  | 'desert-day'
  | 'desert-night'
  | 'storm'
  | 'blizzard'
  | 'calm';
```

### Usage

```typescript
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

// Switch to a new track with volume settings
switchAmbianceTrack('plains-day', 0.8, 0.7); // masterVol=0.8, musicVol=0.7

// Update volume (e.g., when sliders change)
setAmbianceVolume(0.9, 0.6);

// Mute/unmute
muteAmbiance(true);

// Stop all ambient music
stopAmbiance();

// Get current track status
const { currentTrack, isPlaying, isMuted } = getAmbianceStatus();
```

### Crossfading

- Crossfade duration: 2500ms (configurable via `CROSSFADE_DURATION_MS`)
- Tracks are faded out before stopping to prevent abrupt cuts
- Rapid track switches cancel pending fades to avoid audio leaks
- Memory management automatically unloads unused tracks after 5 minutes

## Sound Effects

The `effects.ts` module provides a priority-based sound effect system with spatial audio support.

### Effect Categories

```typescript
export type SoundEffect =
  | 'horse-neigh'
  | 'horse-trot'
  | 'horse-gallop'
  | 'footstep-dirt'
  | 'footstep-grass'
  | 'footstep-snow'
  | 'campfire'
  | 'rain'
  | 'wind'
  | 'thunder'
  | 'item-pickup'
  | 'item-drop'
  | 'ui-click'
  | 'ui-back'
  | 'ui-error';
```

### Usage

```typescript
import { playEffect, stopEffect, setEffectsVolume } from './effects';

// Play a sound effect
const effectId = playEffect('horse-gallop', {
  volume: 0.8,
  loop: false,
  rate: 1.0,
  spatial: { x: 0.5, y: 0.5 } // Normalized coordinates
});

// Stop a specific effect
stopEffect(effectId);

// Stop all effects
stopAllEffects();

// Set volume for all effects
setEffectsVolume(0.7);
```

### Features

- Priority system to prevent audio clipping
- Spatial audio positioning
- Volume normalization
- Effect pooling for performance
- Automatic cleanup of completed effects

## Voiceovers

The `voice.ts` module handles character voiceovers with queue management and subtitles.

### Voice Lines

Place voice files in:
```
public/audio/voice/<character>/<lineId>.mp3
public/audio/voice/<character>/<lineId>.ogg
```

### Usage

```typescript
import { playVoiceLine, stopVoice, setVoiceVolume } from './voice';

// Play a voice line with subtitles
playVoiceLine('narrator', 'intro-1', {
  volume: 0.9,
  subtitle: "The journey begins at dawn...",
  onComplete: () => console.log('Line finished')
});

// Stop current voice line
stopVoice();

// Set volume for all voice lines
setVoiceVolume(0.8);

// Get current voice status
const { isPlaying, currentLine, currentCharacter } = getVoiceStatus();
```

### Features

- Queue system for sequential voice lines
- Subtitle synchronization
- Character-specific volume settings
- Automatic subtitle display integration
- Priority handling for important messages

## Volume Control

The `volume.ts` module provides centralized volume management with persistence.

### Volume Settings

```typescript
export interface VolumeSettings {
  master: number;    // 0-1
  music: number;     // 0-1
  effects: number;   // 0-1
  voice: number;     // 0-1
  muted: boolean;
}
```

### Usage

```typescript
import { setVolume, getVolume, toggleMute, loadVolumeSettings } from './volume';

// Set individual volume levels
setVolume('music', 0.7);
setVolume('effects', 0.5);

// Get current settings
const settings = getVolume();

// Toggle mute
toggleMute();

// Load saved settings (called during initialization)
loadVolumeSettings();
```

### Features

- Persistence to localStorage
- Volume normalization
- Smooth transitions between volume levels
- Mute state management
- Automatic synchronization with audio subsystems

## Initialization

The audio system is initialized in `src/audio/index.ts`:

```typescript
/**
 * Initializes the audio system and connects it to the game state store.
 *
 * Sets up:
 * - Volume control synchronization
 * - Game state audio triggers
 * - Audio context management
 * - Error handling for audio failures
 *
 * @returns {Function} Cleanup function to stop all audio
 */
export function initAudio(): () => void;
```

### Integration Points

1. **Game State Synchronization**:
   - Biome/weather changes trigger ambient music updates
   - Time of day affects music selection
   - Player actions trigger sound effects

2. **UI Integration**:
   - Volume sliders in settings menu
   - Audio debug panel in development
   - Subtitle display system

3. **Error Handling**:
   - Graceful degradation when audio files are missing
   - Fallback to silent operation when audio context fails
   - Development warnings for missing audio assets

## Development Notes

- The system is a no-op in Node.js/Vitest environments (no audio context)
- Missing audio files are logged in development mode but don't crash the game
- All audio is muted by default until explicitly enabled
- Audio files are preloaded during game initialization
- Memory management automatically unloads unused audio assets

## Performance Considerations

- Audio files are loaded on-demand
- Unused tracks are unloaded after 5 minutes of inactivity
- Effect pooling prevents garbage collection pressure
- Spatial audio calculations are optimized
- Volume changes are debounced to prevent rapid updates

## Testing

The audio system includes comprehensive tests:
- Volume control persistence
- Crossfade behavior
- Effect priority system
- Memory management
- Error handling

Run audio-specific tests with:
```bash
npm test audio
```