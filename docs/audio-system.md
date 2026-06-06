# Frontier Audio System Documentation

**Date:** 2026-06-06

## Overview

The Frontier audio system provides immersive soundscapes and audio feedback to enhance the player experience. It consists of two primary components:

1. **Ambient Music System** - Manages background music with crossfading between tracks
2. **Core Audio System** - Handles global audio settings and initialization (planned)

## Ambient Music System

The ambient music system is implemented in `src/audio/ambiance.ts` and provides dynamic background music that adapts to the game state.

### Key Features

- **Crossfading**: Smooth transitions between tracks with configurable duration
- **Lazy Loading**: Audio files are loaded only when needed
- **Volume Control**: Independent master and music volume levels
- **Mute Functionality**: Ability to mute audio without stopping playback
- **Error Handling**: Graceful handling of missing audio files

### API Reference

#### `switchAmbianceTrack(track: AmbianceTrack, masterVol: number, musicVol: number): void`
Switches to a new ambient track with crossfading.

**Parameters:**
- `track`: The identifier of the track to switch to
- `masterVol`: Current master volume level (0-1)
- `musicVol`: Current music volume level (0-1)

#### `setAmbianceVolume(masterVol: number, musicVol: number): void`
Updates the volume of the currently playing track.

**Parameters:**
- `masterVol`: Current master volume level (0-1)
- `musicVol`: Current music volume level (0-1)

#### `muteAmbiance(muted: boolean): void`
Mutes or unmutes the active ambient track.

**Parameters:**
- `muted`: True to mute, false to unmute

#### `stopAmbiance(): void`
Stops the currently playing ambient track with a fade-out.

### Track Management

Ambient tracks are identified by the `AmbianceTrack` type (defined in `@/types/audio`). Each track requires corresponding audio files in both MP3 and OGG formats:

```
public/audio/ambient/
├── plains.mp3
├── plains.ogg
├── mountains.mp3
├── mountains.ogg
├── desert.mp3
├── desert.ogg
└── ...
```

### Implementation Details

1. **Howler.js Integration**: Uses Howler.js for audio playback with support for multiple formats
2. **Crossfade Logic**: Implements a 2.5-second crossfade between tracks
3. **State Management**: Tracks the currently active track and pending fades
4. **Browser Detection**: Only initializes in browser environments with AudioContext support

## Core Audio System

The core audio system (planned) will be implemented in `src/audio/index.ts` and will provide:

- Global audio context initialization
- Volume management (master, music, effects)
- Audio system lifecycle hooks
- Integration with game state changes
- Sound effect management

## Integration with Game Systems

The audio system integrates with other game systems through:

1. **Game State Subscriptions**: Listens to changes in game state (biome, weather, time of day) to determine appropriate ambient tracks
2. **Volume Settings**: Respects user volume preferences stored in game settings
3. **Game Events**: Responds to game events like game over, victory, or encounter resolution

## Example Usage

```typescript
import { switchAmbianceTrack, setAmbianceVolume } from '@/audio/ambiance';
import { store } from '@/store';

// Switch to plains biome music
switchAmbianceTrack('plains', 0.8, 0.7);

// Update volume when settings change
store.subscribe(
  (state) => [state.settings.masterVolume, state.settings.musicVolume],
  ([masterVol, musicVol]) => {
    setAmbianceVolume(masterVol, musicVol);
  }
);
```

## Development Guidelines

1. **Audio File Format**: Provide both MP3 and OGG formats for cross-browser compatibility
2. **File Size**: Keep audio files as small as possible without sacrificing quality
3. **Preloading**: Use Howler's preload option to minimize playback delay
4. **Error Handling**: Gracefully handle missing files in production
5. **Testing**: Test audio functionality across different browsers and devices

## Future Enhancements

1. **Sound Effects**: Implementation of a sound effect system
2. **Dynamic Mixing**: Adjust audio levels based on game context
3. **Audio Effects**: Web Audio API effects like reverb and EQ
4. **Audio Sprites**: Efficient management of multiple sound effects
5. **Spatial Audio**: Positional audio for immersive 3D soundscapes

## Troubleshooting

**Issue: No audio playback**
- Verify audio files exist in the correct location
- Check browser console for Howler.js errors
- Ensure the browser supports the audio formats provided
- Verify the audio system is initialized in a browser environment

**Issue: Audio glitches during crossfading**
- Check for rapid track switching that might interrupt fades
- Verify the crossfade duration is appropriate for the audio content
- Ensure the audio files are properly looped

**Issue: Memory leaks**
- Verify all Howl instances are properly stopped when no longer needed
- Check for lingering fade timers that aren't being cleared