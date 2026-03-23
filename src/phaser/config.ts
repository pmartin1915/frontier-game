/**
 * Frontier — Phaser Game Configuration
 *
 * Shared config constants for the Phaser instance.
 * The actual Game is created in AnimationPanel.tsx.
 */

import Phaser from 'phaser';

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const baseConfig: Partial<Phaser.Types.Core.GameConfig> = {
  type: Phaser.AUTO,
  pixelArt: true,
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
