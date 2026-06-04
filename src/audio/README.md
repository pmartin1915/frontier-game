# Audio System

**Date:** 2026-06-04

The `audio` directory contains all audio-related modules for the Frontier game. This includes ambient music, sound effects, and the core audio initialization system.

## Modules

### `ambiance.ts`
Manages crossfading ambient music tracks using Howler.js. Tracks are loaded on-demand and cached for the session. Volume and crossfade transitions are handled automatically based on game state (biome, weather, time of day).

#### Key Functions
- `switchAmbianceTrack(track: AmbianceTrack, masterVol: number, musicVol: number)`: Crossfades to a new ambient track.
- `setAmbianceVolume(masterVol: number, musicVol: number)`: Updates the volume of the currently playing track.
- `muteAmbiance(muted: boolean)`: Mutes or unmutes the active ambient track.
- `stopAmbiance()`: Fades out and stops the active ambient track.

#### File Structure
Ambient audio files should be placed in:
```
public/audio/ambient/<trackName>.mp3
public/audio/ambient/<trackName>.ogg
```

### `index.ts` (Planned)
Core audio initialization and global volume management. Will handle:
- Master volume control
- Music and SFX sub-volume controls
- Audio context initialization
- Global mute state

## Integration
The audio system is initialized in `src/App.tsx` via `initAudio()`. This sets up subscriptions to game state changes that affect audio (e.g., biome transitions, weather changes).

## Development Notes
- The system is a no-op in Node.js/Vitest environments because Howler requires a browser audio context.
- Missing audio files are logged in development mode but silently ignored in production.
- Crossfade duration is set to 2500ms by default.

## TypeScript Types
Audio-related types are defined in `@/types/audio.ts`:
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
  | 'campfire';
```