/**
 * @file Audio System Index
 * @module audio
 * @description
 * Central export point for the Frontier audio system.
 *
 * @asOf 2026-06-07
 */

export * from './ambiance';

/**
 * Initializes the audio system.
 * Sets up Howler context and prepares audio subsystems.
 */
export function initAudio(): void {
  // Currently a no-op as Howler initializes on first use
  // Future: May include global Howler configuration
}