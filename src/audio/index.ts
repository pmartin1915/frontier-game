/**
 * Frontier Audio System Initialization
 *
 * Sets up the Howler.js context and initializes all audio subsystems.
 * This module should be imported and called once at application startup.
 *
 * @module audio
 * @date 2026-06-05
 */

import { store } from '../store';
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance, stopAmbiance } from './ambiance';

/**
 * Initializes the audio system by setting up Redux subscriptions for:
 * - Ambient music changes (biome/weather)
 * - Volume settings
 * - Game state changes (pause, game over)
 */
export function initAudio(): void {
  // Subscribe to ambient music changes
  store.subscribe(
    (state) => ({
      biome: state.world.biome,
      weather: state.world.weather,
      timeOfDay: state.world.timeOfDay,
    }),
    ({ biome, weather, timeOfDay }) => {
      const trackMap: Record<string, Record<string, string>> = {
        plains: {
          clear: `plains-${timeOfDay}`,
          storm: `plains-storm`,
          fog: `plains-fog`,
        },
        mountains: {
          clear: `mountains-${timeOfDay}`,
          storm: `mountains-storm`,
          fog: `mountains-fog`,
        },
        // Add other biomes as needed
      };

      const track = trackMap[biome]?.[weather] || `plains-${timeOfDay}`;
      const { masterVolume, musicVolume } = store.getState().settings.audio;
      switchAmbianceTrack(track as any, masterVolume, musicVolume);
    }
  );

  // Subscribe to volume changes
  store.subscribe(
    (state) => ({
      masterVolume: state.settings.audio.masterVolume,
      musicVolume: state.settings.audio.musicVolume,
    }),
    ({ masterVolume, musicVolume }) => {
      setAmbianceVolume(masterVolume, musicVolume);
    }
  );

  // Subscribe to mute state
  store.subscribe(
    (state) => state.settings.audio.muted,
    (muted) => {
      muteAmbiance(muted);
    }
  );

  // Subscribe to game state changes
  store.subscribe(
    (state) => state.gameEndState,
    (gameEndState) => {
      if (gameEndState) {
        stopAmbiance();
      }
    }
  );
}