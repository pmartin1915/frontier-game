import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store';

describe('Save/Load modal store', () => {
  beforeEach(() => {
    // Reset to initial state
    useStore.setState({ showSaveLoadModal: false });
  });

  it('showSaveLoadModal defaults to false', () => {
    expect(useStore.getState().showSaveLoadModal).toBe(false);
  });

  it('toggleSaveLoadModal toggles the boolean', () => {
    useStore.getState().toggleSaveLoadModal();
    expect(useStore.getState().showSaveLoadModal).toBe(true);

    useStore.getState().toggleSaveLoadModal();
    expect(useStore.getState().showSaveLoadModal).toBe(false);
  });

  it('loadState resets showSaveLoadModal to false', () => {
    useStore.setState({ showSaveLoadModal: true });

    // loadState should close modal
    const state = useStore.getState();
    useStore.getState().loadState({
      world: state.world,
      player: state.player,
      horse: state.horse,
      party: state.party,
      supplies: state.supplies,
      carryCapacity: state.carryCapacity,
      campPet: state.campPet,
      narrative: state.narrative,
      journey: state.journey,
      meta: state.meta,
    });

    expect(useStore.getState().showSaveLoadModal).toBe(false);
  });
});
