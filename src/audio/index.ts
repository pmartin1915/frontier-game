/**
 * Frontier Audio System Initialization
 *
 * Sets up the audio system, including:
 * - Volume persistence
 * - System mute state
 * - Subscriptions to game state changes
 *
 * @module audio
 * @date 2026-06-04
 */

import { store } from '../store';
import { switchAmbianceTrack, setAmbianceVolume, muteAmbiance } from './ambiance';

/**
 * Initializes the audio system and sets up subscriptions to game state changes.
 */
export function initAudio(): void {
  // Subscribe to volume changes
  store.subscribe(
    (s) => [s.settings.masterVolume, s.settings.musicVolume, s.settings.muted],
    ([masterVol, musicVol, muted]) => {
      setAmbianceVolume(masterVol, musicVol);
      muteAmbiance(muted);
    },
  );

  // Subscribe to biome changes for ambient music
  store.subscribe(
    (s) => [s.world.biome, s.world.weather, s.settings.masterVolume, s.settings.musicVolume],
    ([biome, weather, masterVol, musicVol]) => {
      const track = getBiomeTrack(biome, weather);
      switchAmbianceTrack(track, masterVol, musicVol);
    },
  );
}

/**
 * Determines the appropriate ambient track based on biome and weather.
 * @param {string} biome - Current biome
 * @param {string} weather - Current weather
 * @returns {string} The ambient track to play
 */
function getBiomeTrack(biome: string, weather: string): string {
  // Implementation would map biome/weather combinations to track names
  // This is a placeholder - actual implementation would be more comprehensive
  if (weather === 'storm') return 'storm';
  if (biome === 'desert') return 'desert-day';
  if (biome === 'forest') return 'forest-day';
  return 'plains-day';
}