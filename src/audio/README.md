# Frontier Audio System

**Date:** 2026-06-20

The Frontier audio system is built on [Howler.js](https://howlerjs.com/) and provides comprehensive audio support for the game, including ambient sounds, music, sound effects, and voiceovers.

## System Architecture

### Initialization

The audio system is initialized via `initAudio()` in `src/audio/index.ts`, which:
- Creates the Howler context
- Sets up global audio settings
- Establishes subscriptions to game state changes
- Manages audio zones and transitions

### Core Components

1. **Audio Manager** (`src/audio/audio-manager.ts`)
   - Central controller for all audio operations
   - Handles loading, playback, and cleanup
   - Manages audio zones and transitions

2. **Audio Zones** (`src/audio/audio-zones.ts`)
   - Biome-specific ambient sounds
   - Weather-specific audio layers
   - Time-of-day transitions

3. **Sound Effects** (`src/audio/sfx.ts`)
   - UI interaction sounds
   - Game event sounds
   - Environmental sounds

4. **Music System** (`src/audio/music.ts`)
   - Dynamic music tracks
   - Layered music for different game states
   - Crossfading between tracks

5. **Voiceover System** (`src/audio/voiceovers.ts`)
   - Character voice lines
   - Narrative voiceovers
   - Localization support

## Audio Features

### Dynamic Audio Zones

The system automatically adjusts audio based on:
- Current biome (forest, desert, mountains, etc.)
- Weather conditions (rain, wind, storm)
- Time of day (morning, afternoon, night)
- Player health and morale status

### Adaptive Music

Music dynamically responds to:
- Game state (normal, danger, victory, defeat)
- Player health and morale
- Current biome and weather
- Time of day

### Audio Cues

Important game events trigger specific audio cues:
- Health/morale/fatigue changes
- Supply consumption
- Encounter triggers
- Journey milestones

## Implementation Details

### Audio File Structure

```
public/audio/
├── ambient/          # Biome and weather ambient sounds
├── music/            # Background music tracks
├── sfx/              # Sound effects
│   ├── ui/           # UI interaction sounds
│   ├── events/       # Game event sounds
│   └── environment/  # Environmental sounds
└── voiceovers/       # Character and narrative voiceovers
    ├── en/           # English voiceovers
    └── [lang]/       # Other language support
```

### Audio Configuration

Audio settings are configured in `src/audio/config.ts`:
```typescript
interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  mute: boolean;
  audioZones: {
    [biome: string]: {
      ambient: string[];
      music: string[];
    };
  };
}
```

### State Integration

The audio system subscribes to game state changes in `src/store/` to:
- Update ambient sounds when biome/weather changes
- Adjust music when game state changes
- Play sound effects for important events
- Trigger voiceovers for narrative moments

## Development Guide

### Adding New Audio

1. Place audio files in the appropriate `public/audio/` directory
2. Add references to the audio configuration
3. Create or update the relevant audio zone or sound effect definition
4. Test audio transitions and volume levels

### Audio Testing

The system includes test hooks for development:
```typescript
// Play test ambient sound
audioManager.playAmbientTest('forest');

// Play test music
audioManager.playMusicTest('danger');

// Play test sound effect
audioManager.playSfxTest('button_click');
```

### Performance Considerations

- Audio files are loaded on demand
- Unused audio is unloaded when leaving zones
- Memory management for large audio files
- Volume normalization across all audio sources

## Accessibility Features

- Volume sliders for all audio channels
- Mute toggle
- Audio cues for important events
- Subtitles for voiceovers
- High contrast audio modes

## Localization

The audio system supports localized voiceovers:
- Voiceover files organized by language code
- Fallback to English if localized audio is missing
- Dynamic loading of language-specific audio