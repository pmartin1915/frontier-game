```
# Frontier Audio System

**Date:** 2026-06-20

The audio system in Frontier is built on [Howler.js](https://howlerjs.com/) and provides ambient music, sound effects, and voiceovers. This system handles dynamic audio loading, crossfading, and state-based audio management.

## Structure

```
src/audio/
├── ambiance.ts       # Ambient music manager with crossfading
├── effects.ts        # Sound effects system
├── voice.ts          # Voiceover system
├── index.ts          # Audio system initialization and global controls
└── types.ts          # Audio-related type definitions
```

## Ambient Music

The `ambiance.ts` module handles crossfading between ambient tracks based on game state (biome, weather, time of day). Tracks are loaded lazily and cached for performance.

### Track Files

Place audio files in:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg  (for Firefox compatibility)
```

Supported track names are defined in `@/types/audio` as `AmbianceTrack`:
- `plains-day` - Daytime plains ambiance
- `plains-night` - Nighttime plains ambiance
- `forest-day` - Daytime forest ambiance
- `forest-night` - Nighttime forest ambiance
- `mountain-day` - Daytime mountain ambiance
- `mountain-night` - Nighttime mountain ambiance
- `desert-day` - Daytime desert ambiance
- `desert-night` - Nighttime desert ambiance
- `storm` - Storm/rain ambiance
- `campfire` - Campfire ambiance

### API

```ts
/**
 * Switches the current ambient track with crossfading
 * @param track - The track name to switch to
 * @param masterVolume - Global volume (0-1)
 * @param musicVolume - Music-specific volume (0-1)
 * @param fadeDuration - Crossfade duration in ms (default: 2500)
 */
export function switchAmbianceTrack(
  track: AmbianceTrack,
  masterVolume: number,
  musicVolume: number,
  fadeDuration?: number
): void;

/**
 * Updates the volume levels for ambient music
 * @param masterVolume - Global volume (0-1)
 * @param musicVolume - Music-specific volume (0-1)
 */
export function setAmbianceVolume(masterVolume: number, musicVolume: number): void;

/**
 * Mutes or unmutes ambient music
 * @param muted - Whether to mute the audio
 */
export function muteAmbiance(muted: boolean): void;

/**
 * Stops all ambient music immediately
 */
export function stopAmbiance(): void;
```

### Crossfading Behavior

- Crossfade duration: 2500ms (configurable)
- Tracks are faded out before stopping to prevent abrupt cuts
- Rapid track switches cancel pending fades to avoid audio leaks
- Volume changes are applied immediately to all active tracks

## Sound Effects

The `effects.ts` module manages short sound effects for UI interactions and game events.

### Supported Effects

Effects are defined in `@/types/audio` as `SoundEffect`:
- `button-click` - UI button press
- `notification` - Alert/notification sound
- `horse-neigh` - Horse sound
- `footstep` - Walking sound
- `rain` - Light rain sound
- `thunder` - Thunder sound
- `fire-crackle` - Campfire sound
- `item-pickup` - Inventory item pickup
- `error` - Error sound

### API

```ts
/**
 * Plays a sound effect
 * @param effect - The sound effect to play
 * @param volume - Volume level (0-1, default: 1)
 * @param loop - Whether to loop the sound (default: false)
 * @returns Howl instance for manual control
 */
export function playSoundEffect(
  effect: SoundEffect,
  volume?: number,
  loop?: boolean
): Howl;

/**
 * Sets the global volume for sound effects
 * @param volume - Volume level (0-1)
 */
export function setEffectsVolume(volume: number): void;

/**
 * Mutes or unmutes all sound effects
 * @param muted - Whether to mute the effects
 */
export function muteEffects(muted: boolean): void;
```

## Voiceovers

The `voice.ts` module handles narrative voiceovers for story events and encounters.

### API

```ts
/**
 * Plays a voiceover line
 * @param lineId - The voiceover line identifier
 * @param volume - Volume level (0-1, default: 1)
 * @returns Promise that resolves when playback completes
 */
export function playVoiceover(lineId: string, volume?: number): Promise<void>;

/**
 * Stops all currently playing voiceovers
 */
export function stopAllVoiceovers(): void;

/**
 * Sets the global volume for voiceovers
 * @param volume - Volume level (0-1)
 */
export function setVoiceVolume(volume: number): void;

/**
 * Mutes or unmutes all voiceovers
 * @param muted - Whether to mute the voiceovers
 */
export function muteVoice(muted: boolean): void;
```

## Initialization

The audio system is initialized in `src/audio/index.ts`, which:
- Sets up global volume controls
- Connects to the game state store for state-based audio management
- Provides global mute/unmute functionality
- Handles environment detection (no audio in Node.js/Vitest)

### Global API

```ts
/**
 * Initializes the audio system and connects to game state
 */
export function initAudio(): void;

/**
 * Sets global volume levels
 * @param master - Master volume (0-1)
 * @param music - Music volume (0-1)
 * @param effects - Effects volume (0-1)
 * @param voice - Voice volume (0-1)
 */
export function setGlobalVolume(
  master: number,
  music: number,
  effects: number,
  voice: number
): void;

/**
 * Mutes or unmutes all audio
 * @param muted - Whether to mute all audio
 */
export function muteAll(muted: boolean): void;

/**
 * Stops all audio playback
 */
export function stopAllAudio(): void;
```

## Development Notes

- The system is a no-op in Node.js/Vitest environments (no audio context)
- Missing audio files are logged in development mode but don't crash the game
- All audio is muted by default until explicitly enabled
- Audio files should be optimized for web (MP3/OGG format, <500KB per file)
- Voiceovers should be recorded at 44.1kHz, 16-bit, mono for best compatibility

## Audio File Naming Convention

```
public/audio/
├── ambient/
│   ├── plains-day.mp3
│   ├── plains-day.ogg
│   └── ...
├── effects/
│   ├── button-click.mp3
│   ├── button-click.ogg
│   └── ...
└── voice/
    ├── encounter-001.mp3
    ├── encounter-001.ogg
    └── ...
```

## Performance Considerations

- Audio files are loaded on-demand and cached
- Only one ambient track plays at a time (with crossfading)
- Sound effects are limited to 3 concurrent instances per effect type
- Voiceovers are queued to prevent overlap
```