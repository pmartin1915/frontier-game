/**
 * Frontier Audio System Initialization
 *
 * Sets up the audio context and connects to game state for dynamic
 * audio control based on game events.
 *
 * @module audio
 * @date 2026-06-05
 */

import { store } from '../store';
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

/**
 * Initializes the audio system by setting up subscriptions to game state changes.
 * This includes:
 * - Ambient music changes based on biome and weather
 * - Volume control based on settings
 * - Mute state based on game focus
 */
export function initAudio(): void {
  // Subscribe to biome/weather changes for ambient music
  store.subscribe(
    (s) => [s.world.biome, s.world.weather],
    ([biome, weather]) => {
      const trackMap: Record<string, string> = {
        'plains-clear': 'plains',
        'plains-storm': 'plains-storm',
        'mountains-clear': 'mountains',
        'mountains-storm': 'mountains-storm',
        // Add other biome-weather combinations as needed
      };

      const key = `${biome}-${weather}`;
      const track = trackMap[key] || 'default';
      const { masterVolume, musicVolume } = store.getState().settings.audio;
      switchAmbianceTrack(track as any, masterVolume, musicVolume);
    }
  );

  // Subscribe to volume changes
  store.subscribe(
    (s) => [s.settings.audio.masterVolume, s.settings.audio.musicVolume],
    ([masterVol, musicVol]) => {
      setAmbianceVolume(masterVol, musicVol);
    }
  );

  // Subscribe to mute state
  store.subscribe(
    (s) => s.settings.audio.muted,
    (muted) => {
      muteAmbiance(muted);
    }
  );

  // Subscribe to game end state
  store.subscribe(
    (s) => s.gameEndState,
    (gameEndState) => {
      if (gameEndState !== null) {
        stopAmbiance();
      }
    }
  );
}