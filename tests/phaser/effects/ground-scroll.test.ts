/**
 * Frontier — GroundScroll Tests
 *
 * Tests the scrolling ground texture effect.
 * Uses lightweight Phaser mocks since the full Phaser runtime isn't
 * available in the Node.js test environment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroundScroll } from '@/phaser/effects/ground-scroll';
import { TimeOfDay } from '@/types/game-state';

// ============================================================
// PHASER MOCKS
// ============================================================

function createMockTileSprite() {
  return {
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    clearTint: vi.fn().mockReturnThis(),
    setTexture: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    tilePositionX: 0,
  };
}

function createMockCanvasTexture() {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
  };
  return {
    getContext: vi.fn().mockReturnValue(ctx),
    refresh: vi.fn(),
  };
}

function createMockScene() {
  const mockTileSprite = createMockTileSprite();

  return {
    scene: {
      cameras: {
        main: { width: 640, height: 360 },
      },
      add: {
        tileSprite: vi.fn().mockReturnValue(mockTileSprite),
      },
      textures: {
        exists: vi.fn().mockReturnValue(false),
        remove: vi.fn(),
        createCanvas: vi.fn().mockReturnValue(createMockCanvasTexture()),
      },
    },
    mockTileSprite,
  };
}

// ============================================================
// TESTS
// ============================================================

describe('GroundScroll', () => {
  let groundScroll: GroundScroll;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    groundScroll = new GroundScroll(mockScene.scene as never);
    groundScroll.create(270); // groundY = 75% of 360
  });

  describe('create()', () => {
    it('initializes without creating a tile sprite (deferred to setBiome)', () => {
      expect(groundScroll.tileSprite).toBeNull();
    });
  });

  describe('setBiome()', () => {
    it('creates tile sprite on first biome set', () => {
      groundScroll.setBiome('crossTimbers');
      expect(mockScene.scene.add.tileSprite).toHaveBeenCalled();
      expect(groundScroll.tileSprite).toBe(mockScene.mockTileSprite);
    });

    it('generates procedural texture when PNG not loaded', () => {
      mockScene.scene.textures.exists.mockReturnValue(false);
      groundScroll.setBiome('stakedPlains');
      expect(mockScene.scene.textures.createCanvas).toHaveBeenCalledWith(
        'ground_stakedPlains',
        512,
        128,
      );
    });

    it('does not recreate tile sprite on same biome', () => {
      groundScroll.setBiome('crossTimbers');
      const callCount = mockScene.scene.add.tileSprite.mock.calls.length;
      groundScroll.setBiome('crossTimbers');
      expect(mockScene.scene.add.tileSprite.mock.calls.length).toBe(callCount);
    });

    it('swaps texture on biome change', () => {
      groundScroll.setBiome('crossTimbers');
      groundScroll.setBiome('highDesert');
      expect(mockScene.mockTileSprite.setTexture).toHaveBeenCalledWith('ground_highDesert');
    });

    it('resets tilePositionX on biome change', () => {
      groundScroll.setBiome('crossTimbers');
      mockScene.mockTileSprite.tilePositionX = 100;
      groundScroll.setBiome('highDesert');
      expect(mockScene.mockTileSprite.tilePositionX).toBe(0);
    });

    it('sets correct depth', () => {
      groundScroll.setBiome('crossTimbers');
      expect(mockScene.mockTileSprite.setDepth).toHaveBeenCalledWith(0.85);
    });

    it('sets correct alpha', () => {
      groundScroll.setBiome('crossTimbers');
      expect(mockScene.mockTileSprite.setAlpha).toHaveBeenCalledWith(0.4);
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      groundScroll.setBiome('crossTimbers');
    });

    it('scrolls tilePositionX when moving', () => {
      groundScroll.update(16.667, true, 1.0);
      expect(mockScene.mockTileSprite.tilePositionX).toBeGreaterThan(0);
    });

    it('does not scroll when not moving', () => {
      groundScroll.update(16.667, false, 1.0);
      expect(mockScene.mockTileSprite.tilePositionX).toBe(0);
    });

    it('scrolls faster at higher pace speed', () => {
      groundScroll.update(16.667, true, 0.3);
      const slowDx = mockScene.mockTileSprite.tilePositionX;

      mockScene.mockTileSprite.tilePositionX = 0;
      groundScroll.update(16.667, true, 1.0);
      const fastDx = mockScene.mockTileSprite.tilePositionX;

      expect(fastDx).toBeGreaterThan(slowDx);
    });

    it('accumulates position over multiple frames', () => {
      groundScroll.update(16.667, true, 1.0);
      const dx1 = mockScene.mockTileSprite.tilePositionX;
      groundScroll.update(16.667, true, 1.0);
      const dx2 = mockScene.mockTileSprite.tilePositionX;
      expect(dx2).toBeCloseTo(dx1 * 2, 4);
    });
  });

  describe('setTimeOfDay()', () => {
    beforeEach(() => {
      groundScroll.setBiome('crossTimbers');
    });

    it('reduces alpha at night', () => {
      groundScroll.setTimeOfDay(TimeOfDay.Night);
      expect(mockScene.mockTileSprite.setAlpha).toHaveBeenCalledWith(0.2);
    });

    it('restores normal alpha when switching from night to day', () => {
      groundScroll.setTimeOfDay(TimeOfDay.Night);
      groundScroll.setTimeOfDay(TimeOfDay.Morning);
      const calls = mockScene.mockTileSprite.setAlpha.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe(0.4);
    });

    it('does not update on same time of day', () => {
      const callsBefore = mockScene.mockTileSprite.setAlpha.mock.calls.length;
      groundScroll.setTimeOfDay(TimeOfDay.Morning);
      expect(mockScene.mockTileSprite.setAlpha.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('destroy()', () => {
    it('destroys the tile sprite', () => {
      groundScroll.setBiome('crossTimbers');
      groundScroll.destroy();
      expect(mockScene.mockTileSprite.destroy).toHaveBeenCalled();
      expect(groundScroll.tileSprite).toBeNull();
    });

    it('handles destroy when no sprite exists', () => {
      expect(() => groundScroll.destroy()).not.toThrow();
    });
  });
});
