/**
 * Frontier — Daily Cycle Orchestrator
 *
 * The only module that calls across all three layers in sequence:
 *   1. Game Logic (calculate outcomes)
 *   2. Director (select voice, build prompt)
 *   3. Narrator (generate prose)
 *
 * Phase 2: Supports encounter pause/resume flow.
 * Phase 4: Supports camp pause/resume flow between encounters and Director.
 *
 * Flow: travel → [encounter] → camp → evening (Director+Narrator) → idle
 */

import { store } from '@/store';
import type { DayResults } from '@/types/game-state';
import { resolveDay } from '@/engine/game-logic';
import { selectVoice, assemblePrompt, shouldGenerateLedgerEntry, generateLedgerEntry } from '@/engine/director';
import { callNarrator } from '@/engine/narrator';
import { getMoraleState } from '@/systems/morale';
import type { EventRecord } from '@/types/narrative';
import type { GameState } from '@/types/game-state';
import { DiscretionaryAction } from '@/types/game-state';

/**
 * Execute one complete in-game day.
 * This is the main game loop entry point.
 *
 * Flow:
 *   1. Guard against re-entry
 *   2. Game Logic → resolve all mechanical outcomes + encounter check
 *   3. If encounter: pause cycle, store pending state, await player choice
 *   4. If no encounter: pause at camp phase for activity selection
 */
export async function executeDailyCycle(): Promise<void> {
  const currentPhase = store.getState().dailyCyclePhase;
  if (currentPhase !== 'idle') {
    console.warn(`Daily cycle already in progress (phase: ${currentPhase})`);
    return;
  }

  try {
    const state = store.getState();

    // Layer 1: Game Logic — resolve the day
    store.setState({ dailyCyclePhase: 'travel' });
    const { eventRecord, dayResults, encounter } = resolveDay(state);

    if (encounter) {
      // PAUSE: Store pending state, wait for player choice
      store.setState({
        dailyCyclePhase: 'event',
        pendingEncounter: encounter,
        pendingEventRecord: eventRecord,
        pendingDayResults: dayResults,
        activeEncounterId: encounter.id,
      });
      // UI will render DecisionOverlay.
      // Player choice triggers store.resolveEncounterChoice() → startCampPhase()
      return;
    }

    // No encounter: proceed to camp phase
    startCampPhase(eventRecord, dayResults, state);
  } catch (err) {
    console.error('Daily cycle failed:', err);
    store.setState({ dailyCyclePhase: 'idle' });
  }
}

/**
 * Pause the daily cycle at the camp phase.
 * The UI renders CampOverlay. Player selects activities.
 * Resumption via store.resolveCampActivities() → runPostEncounterCycle().
 *
 * Called after encounter/bargain resolution, or directly if no encounter.
 */
export function startCampPhase(
  eventRecord: EventRecord,
  dayResults: DayResults,
  preState: GameState,
): void {
  const isFullDay = preState.journey.discretionaryAction === DiscretionaryAction.Rest;

  store.setState({
    dailyCyclePhase: 'camp',
    pendingEventRecord: eventRecord,
    pendingDayResults: dayResults,
    pendingCampIsFullDay: isFullDay,
  });

  // Switch Phaser to camp scene
  store.getState().pushCommand({ type: 'changeScene', scene: 'camp' });
}

/**
 * Complete the daily cycle after camp resolution.
 * Runs Layer 2 (Director) and Layer 3 (Narrator), then applies results.
 *
 * Called by store.resolveCampActivities() after camp activities are resolved.
 */
export async function runPostEncounterCycle(
  eventRecord: EventRecord,
  dayResults: DayResults,
  preState: GameState,
): Promise<void> {
  try {
    // Layer 2: Director — select voice, build prompt
    store.setState({ dailyCyclePhase: 'evening' });
    const directive = selectVoice(eventRecord, preState);
    const prompt = assemblePrompt(directive, eventRecord, preState);

    // Layer 3: Narrator — generate prose (with fallback)
    const moraleState = getMoraleState(dayResults.player.morale ?? preState.player.morale);
    const narratorResponse = await callNarrator(
      prompt,
      preState.meta.hash,
      preState.world.biome,
      moraleState,
    );

    // Apply results to store
    store.getState().applyDayResults(dayResults);
    store.getState().applyNarratorResponse(narratorResponse);

    // Accumulate event record for multi-day ledger generation (keep last 5)
    const recentRecords = [...store.getState().recentEventRecords, eventRecord].slice(-5);
    store.setState({ recentEventRecords: recentRecords });

    // Ledger generation check (every 5 days)
    const postState = store.getState();
    const newDaysElapsed = postState.journey.daysElapsed;
    if (shouldGenerateLedgerEntry(newDaysElapsed)) {
      const ledgerEntry = generateLedgerEntry(postState, recentRecords);
      store.setState((s) => ({
        narrative: {
          ...s.narrative,
          structuredLedger: [...s.narrative.structuredLedger, ledgerEntry],
          activeThreads: ledgerEntry.activeThreads,
        },
      }));

      // Archive the ledger entry to IndexedDB cold storage
      try {
        const { archiveLedgerEntry } = await import('@/persistence/save-load');
        await archiveLedgerEntry(ledgerEntry);
      } catch {
        // Non-fatal: archive write failure should not break the game
      }
    }

    // Auto-save at end of each day
    try {
      const { autoSave } = await import('@/persistence/save-load');
      await autoSave();
    } catch {
      // Non-fatal: persistence may not be initialized yet
    }

    // Death check — player health reached 0 after applying day results
    if (store.getState().player.health <= 0) {
      store.getState().triggerGameEnd('death');
      return; // finally block handles cleanup
    }

    // Journey completion check
    if (eventRecord.waypointArrival?.journeyComplete) {
      store.getState().triggerGameEnd('victory');
      return; // finally block handles cleanup
    }
  } catch (err) {
    console.error('Post-encounter cycle failed:', err);
  } finally {
    // Clear all pending state and return to idle
    store.setState({
      dailyCyclePhase: 'idle',
      pendingEncounter: null,
      pendingBargain: null,
      pendingEventRecord: null,
      pendingDayResults: null,
      activeEncounterId: null,
      pendingCampIsFullDay: false,
    });
  }
}
