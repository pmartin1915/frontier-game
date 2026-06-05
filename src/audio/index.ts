/**
 * Frontier Audio System Initialization
 *
 * Sets up the audio context and connects to the game store for
 * ambient music and sound effect management.
 *
 * @module audio
 * @date 2026-06-05
 */

import { store } from '../store';
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

/**
 * Initializes the audio system by setting up store subscriptions.
 * This connects the audio system to game state changes for:
 * - Ambient music based on biome and weather
 * - Volume control
 * - Mute state
 */
export function initAudio(): void {
  // Subscribe to biome/weather changes for ambient music
  store.subscribe(
    (state) => ({
      biome: state.world.biome,
      weather: state.world.weather,
      masterVolume: state.settings.masterVolume,
      musicVolume: state.settings.musicVolume,
      muted: state.settings.muted,
    }),
    ({ biome, weather, masterVolume, musicVolume, muted }) => {
      const track = getAmbianceTrackForConditions(biome, weather);
      switchAmbianceTrack(track, masterVolume, musicVolume);
      muteAmbiance(muted);
    }
  );

  // Subscribe to volume changes
  store.subscribe(
    (state) => ({
      masterVolume: state.settings.masterVolume,
      musicVolume: state.settings.musicVolume,
    }),
    ({ masterVolume, musicVolume }) => {
      setAmbianceVolume(masterVolume, musicVolume);
    }
  );

  // Subscribe to mute state changes
  store.subscribe(
    (state) => state.settings.muted,
    (muted) => {
      muteAmbiance(muted);
    }
  );

  // Subscribe to game end state
  store.subscribe(
    (state) => state.gameEndState,
    (gameEndState) => {
      if (gameEndState !== null) {
        stopAmbiance();
      }
    }
  );
}

/**
 * Determines the appropriate ambient track based on biome and weather conditions.
 * @param {string} biome - Current biome
 * @param {string} weather - Current weather
 * @returns {string} The track name to play
 */
function getAmbianceTrackForConditions(biome: string, weather: string): string {
  // Implementation would map biomes/weather to specific tracks
  // This is a placeholder - actual implementation would be more complex
  return biome.toLowerCase();
}