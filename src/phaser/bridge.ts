/**
 * Frontier — React-Phaser Bridge Utilities
 *
 * Helpers for the bidirectional communication layer.
 * See CLAUDE.md for bridge architecture rules.
 */

import { store } from '@/store';
import type { GameCommand } from '@/types/animation';

/**
 * Push a command from React to Phaser.
 */
export function sendToPhaser(command: GameCommand): void {
  store.getState().pushCommand(command);
}

/**
 * Subscribe a Phaser scene to a specific store slice.
 * Returns an unsubscribe function. Call in scene shutdown().
 */
export function subscribePhaser<T>(
  selector: (state: ReturnType<typeof store.getState>) => T,
  callback: (value: T) => void,
): () => void {
  return store.subscribe(selector, callback);
}
