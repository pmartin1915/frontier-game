/**
 * Tests for game end state management:
 * - triggerGameEnd captures correct stats
 * - resetGame returns store to clean initial state
 * - initializeGame performs full reset + sets names
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store';

describe('triggerGameEnd', () => {
  beforeEach(() => {
    useStore.getState().resetGame();
  });

  it('captures victory state with correct stats', () => {
    // Set up some game state
    useStore.setState({
      journey: { ...useStore.getState().journey, daysElapsed: 32 },
      world: { ...useStore.getState().world, totalMiles: 700 },
      player: { ...useStore.getState().player, health: 65, morale: 72 },
      party: {
        companions: [
          { id: 'elias_coe', status: 'active', health: 80, loyalty: 60, dayJoined: 5 } as any,
          { id: 'luisa_vega', status: 'deserted', health: 0, loyalty: 0, dayJoined: 12 } as any,
        ],
        maxCompanions: 4,
      },
    });

    useStore.getState().triggerGameEnd('victory');
    const end = useStore.getState().gameEndState;

    expect(end).not.toBeNull();
    expect(end!.reason).toBe('victory');
    expect(end!.daysElapsed).toBe(32);
    expect(end!.totalMiles).toBe(700);
    expect(end!.finalHealth).toBe(65);
    expect(end!.finalMorale).toBe(72);
    expect(end!.companionsAlive).toBe(1);
    expect(end!.maxCompanions).toBe(4);
    expect(end!.journeyComplete).toBe(true);
  });

  it('captures death state', () => {
    useStore.setState({
      player: { ...useStore.getState().player, health: 0, morale: 15 },
    });

    useStore.getState().triggerGameEnd('death');
    const end = useStore.getState().gameEndState;

    expect(end).not.toBeNull();
    expect(end!.reason).toBe('death');
    expect(end!.finalHealth).toBe(0);
    expect(end!.journeyComplete).toBe(false);
  });
});

describe('resetGame', () => {
  it('returns store to clean initial state', () => {
    // Dirty up the state
    useStore.setState({
      journey: { ...useStore.getState().journey, daysElapsed: 20 },
      player: { ...useStore.getState().player, health: 30 },
      supplies: { ...useStore.getState().supplies, water: 5 },
    });
    useStore.getState().triggerGameEnd('death');

    // Reset
    useStore.getState().resetGame();
    const s = useStore.getState();

    expect(s.gameEndState).toBeNull();
    expect(s.journey.daysElapsed).toBe(0);
    expect(s.player.health).toBe(100);
    expect(s.player.name).toBe('Martin');
    expect(s.supplies.water).toBe(55);
    expect(s.dailyCyclePhase).toBe('idle');
    expect(s.pendingEncounter).toBeNull();
    expect(s.recentEventRecords).toEqual([]);
  });
});

describe('initializeGame', () => {
  beforeEach(() => {
    useStore.getState().resetGame();
  });

  it('performs full reset and sets names + briefing phase', () => {
    // Dirty up state first
    useStore.setState({
      journey: { ...useStore.getState().journey, daysElapsed: 10 },
      player: { ...useStore.getState().player, health: 50 },
    });

    useStore.getState().initializeGame('Sarah', 'Thunder');
    const s = useStore.getState();

    expect(s.player.name).toBe('Sarah');
    expect(s.horse.name).toBe('Thunder');
    expect(s.dailyCyclePhase).toBe('briefing');
    expect(s.journey.daysElapsed).toBe(0);
    expect(s.player.health).toBe(100);
    expect(s.supplies.water).toBe(55);
    expect(s.gameEndState).toBeNull();
  });
});
