/**
 * Frontier — Zustand Store
 *
 * Single source of shared state between React and Phaser.
 * See CLAUDE.md for ownership rules.
 *
 * Phaser reads via store.subscribe() in scene create().
 * React reads via atomic selectors (see selectors.ts).
 * Only engine/daily-cycle.ts should call bulk state mutations.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  Act,
  Biome,
  Pace,
  TimeOfDay,
  Weather,
  Terrain,
  DiscretionaryAction,
  EquipmentSlot,
} from '@/types/game-state';
import type {
  GameState,
  GameEndState,
  WorldState,
  PlayerState,
  HorseState,
  Supplies,
  CarryCapacity,
} from '@/types/game-state';
import { TRANSPORT_CAPACITY } from '@/types/game-state';
import type { GameCommand } from '@/types/animation';
import { AuthorVoice } from '@/types/narrative';
import type { NarratorResponse, EventRecord } from '@/types/narrative';
import type { DayResults } from '@/types/game-state';
import type { Encounter, DevilsBargainEntry } from '@/types/encounters';
import { DEFAULT_AUDIO_PREFS } from '@/types/audio';
import type { AudioPrefs, SfxEvent } from '@/types/audio';

// Re-export DayResults for existing consumers
export type { DayResults } from '@/types/game-state';

/** A single Travel Log entry (ephemeral UI state, not persisted to IndexedDB). */
export interface LogEntry {
  day: number;
  voice: AuthorVoice | null;
  text: string;
  /** True when this entry used the offline fallback instead of the API */
  fallback?: boolean;
}

const LOG_ENTRIES_MAX = 50;

// ============================================================
// STORE INTERFACE
// ============================================================

export interface FrontierStore extends GameState {
  // --- UI State (not persisted) ---
  /** Whether the game is in a loading state */
  loading: boolean;
  /** Current phase of the daily cycle */
  dailyCyclePhase: 'briefing' | 'decisions' | 'travel' | 'event' | 'camp' | 'evening' | 'idle';
  /** Active encounter (if any) */
  activeEncounterId: string | null;
  /** Consecutive API fallbacks (for HUD warning) */
  consecutiveFallbacks: number;
  /** Whether the Save/Load modal is open */
  showSaveLoadModal: boolean;
  /** Whether current camp is a full-day camp (Rest action) */
  pendingCampIsFullDay: boolean;
  /** Game end state (victory/death/abandon) — null while game is active */
  gameEndState: GameEndState | null;
  /** True after initializeGame() or loadState() — hides NewGameScreen */
  gameInitialized: boolean;
  /** Whether the auto-player is running */
  autoPlay: boolean;
  /** Volume preferences (persisted to localStorage, not to IndexedDB) */
  audioPrefs: AudioPrefs;
  /** Accumulated Travel Log entries for the current session (not persisted) */
  logEntries: LogEntry[];
  /** Ephemeral error message shown as a toast (auto-clears) */
  errorMessage: string | null;
  /** General-purpose toast (success/error) with auto-clear */
  toastMessage: { text: string; type: 'error' | 'success' } | null;
  setToast: (text: string, type: 'error' | 'success') => void;

  // --- Encounter/Bargain Ephemeral State ---
  /** Pending encounter waiting for player choice */
  pendingEncounter: Encounter | null;
  /** Pending bargain if encounter crisis triggers one */
  pendingBargain: DevilsBargainEntry | null;
  /** EventRecord saved mid-cycle for post-encounter completion */
  pendingEventRecord: EventRecord | null;
  /** DayResults saved mid-cycle for post-encounter completion */
  pendingDayResults: DayResults | null;
  /** Rolling buffer of recent EventRecords for ledger generation (last 5 days) */
  recentEventRecords: EventRecord[];

  // --- Phaser Bridge ---
  /** Command queue: React → Phaser */
  commandQueue: GameCommand[];
  pushCommand: (cmd: GameCommand) => void;
  clearCommands: () => void;

  // --- Actions: Game Flow ---
  /** Initialize a new game with starting state (full reset + names) */
  initializeGame: (playerName: string, horseName: string) => void;
  /** Reset entire store to initial state */
  resetGame: () => void;
  /** Trigger game end (captures final stats) */
  triggerGameEnd: (reason: GameEndState['reason']) => void;
  /** Advance to the next daily cycle phase */
  advancePhase: () => void;
  /** Set player decisions for the day */
  setDailyDecisions: (pace: Pace, action: DiscretionaryAction, nightTravel: boolean) => void;
  /** Execute one full day cycle (dynamic import preserves boundary) */
  startDailyCycle: () => Promise<void>;

  // --- Actions: Encounter/Bargain Resolution ---
  /** Resolve a player's encounter choice (dynamic import to daily-cycle) */
  resolveEncounterChoice: (choiceId: string) => Promise<void>;
  /** Resolve a Devil's Bargain accept/decline */
  resolveBargainChoice: (accepted: boolean) => Promise<void>;
  /** Dismiss morning briefing or other overlays → idle */
  dismissOverlay: () => void;
  /** Resolve camp activities and continue the daily cycle */
  resolveCampActivities: (activities: import('@/types/camp').CampActivitySelection[]) => Promise<void>;

  // --- Actions: State Updates (called by engine) ---
  /** Bulk update after Game Logic resolves a day */
  applyDayResults: (results: DayResults) => void;
  /** Apply Narrator response to narrative state */
  applyNarratorResponse: (response: NarratorResponse) => void;
  /** Update a specific supply value */
  updateSupply: (key: keyof Supplies, delta: number) => void;

  // --- Actions: Persistence ---
  /** Serialize active state for IndexedDB save */
  serializeActiveState: () => string;
  /** Load state from IndexedDB or JSON import */
  loadState: (state: GameState) => void;

  // --- Actions: UI ---
  /** Toggle Save/Load modal visibility */
  toggleSaveLoadModal: () => void;
  /** Enable or disable the auto-player */
  setAutoPlay: (on: boolean) => void;
  /** Update a single audio preference (persisted to localStorage) */
  setAudioPref: (key: keyof AudioPrefs, value: number | boolean) => void;
  /** Fire a synthesized sound effect (dynamic import keeps boundary clean) */
  triggerSfx: (event: SfxEvent) => void;
  /** Show an ephemeral error toast (auto-clears after 5 seconds) */
  setError: (message: string) => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const INITIAL_WORLD: WorldState = {
  date: '1866-06-06',
  timeOfDay: TimeOfDay.Dawn,
  weather: Weather.Clear,
  biome: Biome.CrossTimbers,
  terrain: Terrain.Prairie,
  distanceToWaypoint: 130,
  totalMiles: 0,
  currentAct: Act.I,
  windSpeed: 15,
  temperature: 78,
};

const INITIAL_PLAYER: PlayerState = {
  name: 'Martin',
  health: 100,
  conditions: [],
  fatigue: 0,
  morale: 65,
  skills: { survival: 40, navigation: 30, combat: 35, barter: 25 },
  equipment: [
    { slot: EquipmentSlot.Saddle, durability: 100 },
    { slot: EquipmentSlot.Boots, durability: 100 },
    { slot: EquipmentSlot.Rifle, durability: 100 },
    { slot: EquipmentSlot.Canteen, durability: 100 },
    { slot: EquipmentSlot.Bedroll, durability: 100 },
  ],
};

const INITIAL_HORSE: HorseState = {
  name: 'Horse',
  health: 100,
  fatigue: 0,
  lameness: false,
  thirst: 0,
  hunger: 0,
  tackCondition: 100,
};

const INITIAL_SUPPLIES: Supplies = {
  water: 55,
  food: 45,
  coffee: 10,
  medical: 5,
  repair: 10,
  ammo: 20,
  tradeGoods: 15,
  funds: 50,
};

// ============================================================
// AUDIO PREFS (localStorage, not part of GameState)
// ============================================================

const AUDIO_PREFS_KEY = 'frontier_audio_prefs';

function loadAudioPrefs(): AudioPrefs {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_AUDIO_PREFS };
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_KEY);
    if (raw) return { ...DEFAULT_AUDIO_PREFS, ...(JSON.parse(raw) as Partial<AudioPrefs>) };
  } catch { /* ignore */ }
  return { ...DEFAULT_AUDIO_PREFS };
}

// ============================================================
// STORE CREATION
// ============================================================

export const useStore = create<FrontierStore>()(
  subscribeWithSelector((set, get) => ({
    // --- Initial Game State ---
    world: INITIAL_WORLD,
    player: INITIAL_PLAYER,
    horse: INITIAL_HORSE,
    party: { companions: [], maxCompanions: 4 },
    supplies: INITIAL_SUPPLIES,
    carryCapacity: { water: 80, food: 60, transport: 'wagon' as const },
    campPet: { adopted: false, name: null, dayAdopted: null, lost: false, dayLost: null },
    narrative: {
      structuredLedger: [],
      chapterSummaries: [],
      previousEntry: '',
      activeThreads: [],
      currentVoice: AuthorVoice.Adams,
    },
    journey: {
      currentAct: Act.I,
      waypoint: 'Middle Concho',
      routeChoices: [],
      daysElapsed: 0,
      failForwardsUsed: 0,
      fortSumnerDebt: false,
      nightTravel: false,
      pace: Pace.Normal,
      discretionaryAction: DiscretionaryAction.None,
      encounterHistory: [],
      detourMilesRemaining: 0,
    },
    meta: {
      saveSlot: 0,
      timestamp: new Date().toISOString(),
      hash: '',
      version: 1,
      playtimeMs: 0,
    },

    // --- UI State ---
    loading: false,
    dailyCyclePhase: 'idle',
    activeEncounterId: null,
    consecutiveFallbacks: 0,
    showSaveLoadModal: false,
    pendingCampIsFullDay: false,
    gameEndState: null,
    gameInitialized: false,
    autoPlay: false,
    audioPrefs: loadAudioPrefs(),
    logEntries: [],
    errorMessage: null,
    toastMessage: null,

    // --- Encounter/Bargain Ephemeral ---
    pendingEncounter: null,
    pendingBargain: null,
    pendingEventRecord: null,
    pendingDayResults: null,
    recentEventRecords: [],

    // --- Phaser Bridge ---
    commandQueue: [],
    pushCommand: (cmd) => set((s) => ({ commandQueue: [...s.commandQueue, cmd] })),
    clearCommands: () => set({ commandQueue: [] }),

    // --- Game Flow ---
    initializeGame: (playerName, horseName) => set({
      world: INITIAL_WORLD,
      player: { ...INITIAL_PLAYER, name: playerName },
      horse: { ...INITIAL_HORSE, name: horseName },
      party: { companions: [], maxCompanions: 4 },
      supplies: INITIAL_SUPPLIES,
      carryCapacity: { water: 80, food: 60, transport: 'wagon' as const },
      campPet: { adopted: false, name: null, dayAdopted: null, lost: false, dayLost: null },
      narrative: {
        structuredLedger: [],
        chapterSummaries: [],
        previousEntry: '',
        activeThreads: [],
        currentVoice: AuthorVoice.Adams,
      },
      journey: {
        currentAct: Act.I,
        waypoint: 'Middle Concho',
        routeChoices: [],
        daysElapsed: 0,
        failForwardsUsed: 0,
        fortSumnerDebt: false,
        nightTravel: false,
        pace: Pace.Normal,
        discretionaryAction: DiscretionaryAction.None,
        encounterHistory: [],
        detourMilesRemaining: 0,
        calmDayStreak: 0,
      },
      meta: { saveSlot: 0, timestamp: new Date().toISOString(), hash: '', version: 1, playtimeMs: 0 },
      loading: false,
      dailyCyclePhase: 'briefing',
      activeEncounterId: null,
      consecutiveFallbacks: 0,
      showSaveLoadModal: false,
      pendingCampIsFullDay: false,
      gameEndState: null,
      gameInitialized: true,
      pendingEncounter: null,
      pendingBargain: null,
      pendingEventRecord: null,
      pendingDayResults: null,
      recentEventRecords: [],
      commandQueue: [],
      logEntries: [],
    }),

    resetGame: () => set({
      world: INITIAL_WORLD,
      player: INITIAL_PLAYER,
      horse: INITIAL_HORSE,
      party: { companions: [], maxCompanions: 4 },
      supplies: INITIAL_SUPPLIES,
      carryCapacity: { water: 80, food: 60, transport: 'wagon' as const },
      campPet: { adopted: false, name: null, dayAdopted: null, lost: false, dayLost: null },
      narrative: {
        structuredLedger: [],
        chapterSummaries: [],
        previousEntry: '',
        activeThreads: [],
        currentVoice: AuthorVoice.Adams,
      },
      journey: {
        currentAct: Act.I,
        waypoint: 'Middle Concho',
        routeChoices: [],
        daysElapsed: 0,
        failForwardsUsed: 0,
        fortSumnerDebt: false,
        nightTravel: false,
        pace: Pace.Normal,
        discretionaryAction: DiscretionaryAction.None,
        encounterHistory: [],
        detourMilesRemaining: 0,
        calmDayStreak: 0,
      },
      meta: { saveSlot: 0, timestamp: new Date().toISOString(), hash: '', version: 1, playtimeMs: 0 },
      loading: false,
      dailyCyclePhase: 'idle',
      activeEncounterId: null,
      consecutiveFallbacks: 0,
      showSaveLoadModal: false,
      pendingCampIsFullDay: false,
      gameEndState: null,
      gameInitialized: false,
      autoPlay: false,
      // Preserve user audio preferences across game resets.
      audioPrefs: get().audioPrefs,
      pendingEncounter: null,
      pendingBargain: null,
      pendingEventRecord: null,
      pendingDayResults: null,
      recentEventRecords: [],
      commandQueue: [],
      logEntries: [],
    }),

    triggerGameEnd: (reason) => set((s) => ({
      gameEndState: {
        reason,
        daysElapsed: s.journey.daysElapsed,
        totalMiles: s.world.totalMiles,
        finalHealth: s.player.health,
        finalMorale: s.player.morale,
        companionsAlive: s.party.companions.filter((c) => c.status === 'active').length,
        maxCompanions: s.party.maxCompanions,
        journeyComplete: reason === 'victory',
      },
    })),

    advancePhase: () => set((s) => {
      const phases: FrontierStore['dailyCyclePhase'][] = [
        'briefing', 'decisions', 'travel', 'event', 'camp', 'evening', 'idle',
      ];
      const idx = phases.indexOf(s.dailyCyclePhase);
      const next = phases[(idx + 1) % phases.length];
      return { dailyCyclePhase: next };
    }),

    setDailyDecisions: (pace, action, nightTravel) => set((s) => ({
      journey: { ...s.journey, pace, discretionaryAction: action, nightTravel },
    })),

    startDailyCycle: async () => {
      const { executeDailyCycle } = await import('@/engine/daily-cycle');
      await executeDailyCycle();
    },

    // --- Encounter/Bargain Resolution ---
    resolveEncounterChoice: async (choiceId: string) => {
      try {
        const s = get();
        if (!s.pendingEncounter || !s.pendingEventRecord || !s.pendingDayResults) return;

        const { resolveEncounter, resolveDelta } = await import('@/systems/encounters');
        const result = resolveEncounter({
          encounter: s.pendingEncounter,
          choiceId,
          playerHealth: s.player.health,
          horseHealth: s.horse.health,
          companions: s.party.companions,
        });

        // Merge encounter events into pending EventRecord
        const updatedEventRecord: EventRecord = {
          ...s.pendingEventRecord,
          events: [...s.pendingEventRecord.events, ...result.events],
          companionEvents: [...s.pendingEventRecord.companionEvents, ...result.companionEvents],
        };

        // Merge encounter effects into pending DayResults
        let updatedDayResults = { ...s.pendingDayResults };

        for (const effect of result.effects) {
          switch (effect.type) {
            case 'supply': {
              const key = effect.target as keyof Supplies;
              const pendingVal = (updatedDayResults.supplies as Record<string, number>)[key]
                ?? s.supplies[key] ?? 0;
              const delta = resolveDelta(effect.delta, pendingVal);
              updatedDayResults = {
                ...updatedDayResults,
                supplies: { ...updatedDayResults.supplies, [key]: Math.max(0, pendingVal + delta) },
              };
              break;
            }
            case 'health': {
              if (effect.target === 'player') {
                const pendingVal = updatedDayResults.player?.health ?? s.player.health;
                const delta = resolveDelta(effect.delta, pendingVal);
                updatedDayResults = {
                  ...updatedDayResults,
                  player: { ...updatedDayResults.player, health: Math.max(0, Math.min(100, pendingVal + delta)) },
                };
              } else if (effect.target === 'horse') {
                const pendingVal = updatedDayResults.horse?.health ?? s.horse.health;
                const delta = resolveDelta(effect.delta, pendingVal);
                updatedDayResults = {
                  ...updatedDayResults,
                  horse: { ...updatedDayResults.horse, health: Math.max(0, Math.min(100, pendingVal + delta)) },
                };
              }
              break;
            }
            case 'morale': {
              const pendingVal = updatedDayResults.player?.morale ?? s.player.morale;
              const delta = resolveDelta(effect.delta, pendingVal);
              updatedDayResults = {
                ...updatedDayResults,
                player: { ...updatedDayResults.player, morale: Math.max(0, Math.min(100, pendingVal + delta)) },
              };
              break;
            }
            case 'equipment': {
              const equip = (updatedDayResults.player?.equipment ?? s.player.equipment).map((e) => {
                if (e.slot === effect.target) {
                  const delta = resolveDelta(effect.delta, e.durability);
                  return { ...e, durability: Math.max(0, e.durability + delta) };
                }
                return e;
              });
              updatedDayResults = {
                ...updatedDayResults,
                player: { ...updatedDayResults.player, equipment: equip },
              };
              break;
            }
            case 'transport': {
              const newTransport = effect.target as CarryCapacity['transport'];
              const cap = TRANSPORT_CAPACITY[newTransport];
              if (cap) {
                // Change transport mode and cap supplies at new capacity
                const currentWater = (updatedDayResults.supplies as Record<string, number>).water ?? s.supplies.water;
                const currentFood = (updatedDayResults.supplies as Record<string, number>).food ?? s.supplies.food;
                updatedDayResults = {
                  ...updatedDayResults,
                  carryCapacity: { water: cap.water, food: cap.food, transport: newTransport },
                  supplies: {
                    ...updatedDayResults.supplies,
                    water: Math.min(currentWater, cap.water),
                    food: Math.min(currentFood, cap.food),
                  },
                };
              }
              break;
            }
          }
        }

        // Track encounter in history for maxOccurrences filtering
        const encounterHistory = [...(s.journey.encounterHistory ?? []), result.encounter.id];
        updatedDayResults = {
          ...updatedDayResults,
          journey: { ...updatedDayResults.journey, encounterHistory },
        };

        if (result.triggersBargain) {
          const { findApplicableBargain } = await import('@/systems/fail-forward');
          const bargain = findApplicableBargain({
            state: s as GameState,
            isLethal: result.isLethal,
            encounter: result.encounter,
          });

          if (bargain) {
            set({
              pendingBargain: bargain,
              pendingEncounter: null,
              pendingEventRecord: updatedEventRecord,
              pendingDayResults: updatedDayResults,
            });
            return;
          }
        }

        // No bargain needed — proceed to camp phase
        const { startCampPhase } = await import('@/engine/daily-cycle');
        startCampPhase(updatedEventRecord, updatedDayResults, s as GameState);
      } catch (err) {
        console.error('resolveEncounterChoice failed:', err);
        set({
          dailyCyclePhase: 'idle',
          pendingEncounter: null,
          pendingBargain: null,
          pendingEventRecord: null,
          pendingDayResults: null,
          activeEncounterId: null,
          pendingCampIsFullDay: false,
        });
        get().setError('Something went wrong resolving the encounter.');
      }
    },

    resolveBargainChoice: async (accepted: boolean) => {
      try {
        const s = get();
        if (!s.pendingBargain || !s.pendingEventRecord || !s.pendingDayResults) return;

        const { applyBargainEffects } = await import('@/systems/fail-forward');
        const result = applyBargainEffects({
          bargain: s.pendingBargain,
          state: s as GameState,
          accepted,
        });

        // Apply bargain effects to pending day results
        let updatedDayResults = s.pendingDayResults;
        if (accepted) {
          // Merge supply deltas
          const mergedSupplies = { ...updatedDayResults.supplies };
          for (const [key, delta] of Object.entries(result.supplyDeltas)) {
            const current = (mergedSupplies as Record<string, number>)[key] ?? 0;
            (mergedSupplies as Record<string, number>)[key] = current + (delta as number);
          }

          // Merge equipment deltas (e.g., lose rifle)
          let mergedEquipment = updatedDayResults.player?.equipment ?? s.player.equipment;
          if (Object.keys(result.equipmentDeltas).length > 0) {
            mergedEquipment = mergedEquipment.map((e) => {
              const delta = result.equipmentDeltas[e.slot];
              if (delta !== undefined) {
                return { ...e, durability: Math.max(0, e.durability + delta) };
              }
              return e;
            });
          }

          updatedDayResults = {
            ...updatedDayResults,
            supplies: mergedSupplies,
            journey: {
              ...updatedDayResults.journey,
              failForwardsUsed: s.journey.failForwardsUsed + 1,
              ...(result.routeFlags.fortSumnerDebt ? { fortSumnerDebt: true } : {}),
              ...(result.routeFlags.detourMiles
                ? { detourMilesRemaining: s.journey.detourMilesRemaining + result.routeFlags.detourMiles }
                : {}),
            },
            player: {
              ...updatedDayResults.player,
              equipment: mergedEquipment,
              ...(result.moraleSet !== undefined ? { morale: result.moraleSet } : {}),
            },
          };
        }

        // Update EventRecord with bargain info
        const updatedEventRecord = {
          ...s.pendingEventRecord,
          devilsBargain: result.bargainEvent,
        };

        set({ pendingBargain: null });

        // Proceed to camp phase
        const { startCampPhase } = await import('@/engine/daily-cycle');
        startCampPhase(updatedEventRecord, updatedDayResults, s as GameState);
      } catch (err) {
        console.error('resolveBargainChoice failed:', err);
        set({
          dailyCyclePhase: 'idle',
          pendingEncounter: null,
          pendingBargain: null,
          pendingEventRecord: null,
          pendingDayResults: null,
          activeEncounterId: null,
          pendingCampIsFullDay: false,
        });
        get().setError('Something went wrong resolving the bargain.');
      }
    },

    dismissOverlay: () => set({ dailyCyclePhase: 'idle' }),

    resolveCampActivities: async (activities) => {
      try {
        const s = get();
        if (!s.pendingEventRecord || !s.pendingDayResults) return;

        const { resolveCamp } = await import('@/systems/camp');
        const { NarrativeEventType } = await import('@/types/narrative');

        const campResults = resolveCamp({
          activities,
          isFullDay: s.pendingCampIsFullDay,
          playerFatigue: s.pendingDayResults.player?.fatigue ?? s.player.fatigue,
          playerMorale: s.pendingDayResults.player?.morale ?? s.player.morale,
          playerHealth: s.pendingDayResults.player?.health ?? s.player.health,
          equipment: s.pendingDayResults.player?.equipment ?? s.player.equipment,
          supplies: { ...s.supplies, ...s.pendingDayResults.supplies } as Supplies,
          activeCompanionIds: (s.pendingDayResults.party?.companions ?? s.party.companions)
            .filter((c) => c.status === 'active')
            .map((c) => c.id),
          hasCampPet: s.campPet.adopted && !s.campPet.lost,
        });

        // Merge camp events into pending EventRecord
        // Only override dominantEvent for low-priority travel events
        const LOW_PRIORITY = [
          NarrativeEventType.RoutineTravel,
          NarrativeEventType.NightTravel,
          NarrativeEventType.WaypointArrival,
        ];
        const updatedEventRecord = {
          ...s.pendingEventRecord,
          events: [...s.pendingEventRecord.events, ...campResults.campEvents],
          ...(LOW_PRIORITY.includes(s.pendingEventRecord.dominantEvent)
            ? { dominantEvent: NarrativeEventType.Camp }
            : {}),
        };

        // Merge camp deltas into pending DayResults
        const currentFatigue = s.pendingDayResults.player?.fatigue ?? s.player.fatigue;
        const currentMorale = s.pendingDayResults.player?.morale ?? s.player.morale;
        const currentHealth = s.pendingDayResults.player?.health ?? s.player.health;

        let updatedDayResults = {
          ...s.pendingDayResults,
          player: {
            ...s.pendingDayResults.player,
            fatigue: Math.max(0, Math.min(100, currentFatigue + campResults.fatigueDelta)),
            morale: Math.max(0, Math.min(100, currentMorale + campResults.moraleDelta)),
            health: Math.max(0, Math.min(100, currentHealth + campResults.healthDelta)),
          },
        };

        // Merge supply deltas
        if (Object.keys(campResults.supplyDeltas).length > 0) {
          const mergedSupplies = { ...updatedDayResults.supplies };
          for (const [key, delta] of Object.entries(campResults.supplyDeltas)) {
            const current = (mergedSupplies as Record<string, number>)[key] ?? 0;
            (mergedSupplies as Record<string, number>)[key] = Math.max(0, current + (delta as number));
          }
          updatedDayResults = { ...updatedDayResults, supplies: mergedSupplies };
        }

        // Merge equipment repairs
        if (campResults.equipmentRepairs.length > 0) {
          const equip = (updatedDayResults.player?.equipment ?? s.player.equipment).map((e) => {
            const repair = campResults.equipmentRepairs.find((r) => r.slot === e.slot);
            if (repair) {
              return { ...e, durability: Math.min(100, e.durability + repair.durabilityDelta) };
            }
            return e;
          });
          updatedDayResults = {
            ...updatedDayResults,
            player: { ...updatedDayResults.player, equipment: equip },
          };
        }

        // Merge companion loyalty deltas
        if (campResults.companionLoyaltyDeltas.length > 0) {
          const companions = (updatedDayResults.party?.companions ?? s.party.companions).map((c) => {
            const delta = campResults.companionLoyaltyDeltas.find((d) => d.companionId === c.id);
            if (delta) {
              return { ...c, loyalty: Math.max(0, Math.min(100, c.loyalty + delta.loyaltyDelta)) };
            }
            return c;
          });
          updatedDayResults = {
            ...updatedDayResults,
            party: { ...updatedDayResults.party, companions },
          };
        }

        // Switch Phaser back to trail
        get().pushCommand({ type: 'changeScene', scene: 'trail' });

        // Clear camp state, update pending records for post-camp cycle
        set({
          pendingCampIsFullDay: false,
          pendingEventRecord: updatedEventRecord,
          pendingDayResults: updatedDayResults,
        });

        // Continue the daily cycle (Director + Narrator)
        const { runPostEncounterCycle } = await import('@/engine/daily-cycle');
        await runPostEncounterCycle(
          updatedEventRecord,
          updatedDayResults,
          s as GameState,
        );
      } catch (err) {
        console.error('resolveCampActivities failed:', err);
        set({
          dailyCyclePhase: 'idle',
          pendingEncounter: null,
          pendingBargain: null,
          pendingEventRecord: null,
          pendingDayResults: null,
          activeEncounterId: null,
          pendingCampIsFullDay: false,
        });
        get().setError('Something went wrong during camp.');
      }
    },

    // --- State Updates ---
    applyDayResults: (results) => set((s) => ({
      world: { ...s.world, ...results.world },
      player: { ...s.player, ...results.player },
      horse: { ...s.horse, ...results.horse },
      supplies: { ...s.supplies, ...results.supplies },
      party: { ...s.party, ...results.party },
      journey: { ...s.journey, ...results.journey },
      campPet: results.campPet ? { ...s.campPet, ...results.campPet } : s.campPet,
      carryCapacity: results.carryCapacity ? { ...s.carryCapacity, ...results.carryCapacity } : s.carryCapacity,
    })),

    applyNarratorResponse: (response) => set((s) => {
      const newEntry: LogEntry = {
        day: s.journey.daysElapsed,
        voice: response.voice,
        text: response.text,
        fallback: response.fallback || undefined,
      };
      const updatedLog = [...s.logEntries, newEntry];
      if (updatedLog.length > LOG_ENTRIES_MAX) updatedLog.shift();
      return {
        narrative: {
          ...s.narrative,
          previousEntry: response.text,
          currentVoice: response.voice,
        },
        consecutiveFallbacks: response.fallback
          ? s.consecutiveFallbacks + 1
          : 0,
        logEntries: updatedLog,
      };
    }),

    updateSupply: (key, delta) => set((s) => ({
      supplies: {
        ...s.supplies,
        [key]: Math.max(0, s.supplies[key] + delta),
      },
    })),

    // --- Persistence ---
    serializeActiveState: () => {
      const s = get();
      const active: GameState = {
        world: s.world,
        player: s.player,
        horse: s.horse,
        party: s.party,
        supplies: s.supplies,
        carryCapacity: s.carryCapacity,
        campPet: s.campPet,
        narrative: s.narrative,
        journey: s.journey,
        meta: { ...s.meta, timestamp: new Date().toISOString() },
      };
      return JSON.stringify(active);
    },

    loadState: (state) => set({
      ...state,
      carryCapacity: state.carryCapacity ?? { water: 80, food: 60, transport: 'wagon' as const },
      loading: false,
      dailyCyclePhase: 'briefing',
      activeEncounterId: null,
      consecutiveFallbacks: 0,
      commandQueue: [],
      pendingEncounter: null,
      pendingBargain: null,
      pendingEventRecord: null,
      pendingDayResults: null,
      recentEventRecords: [],
      showSaveLoadModal: false,
      pendingCampIsFullDay: false,
      gameInitialized: true,
      logEntries: [],
    }),

    // --- UI ---
    toggleSaveLoadModal: () => set((s) => ({ showSaveLoadModal: !s.showSaveLoadModal })),
    setAutoPlay: (on) => set({ autoPlay: on }),

    setError: (message) => {
      set({ errorMessage: message });
      setTimeout(() => set({ errorMessage: null }), 5000);
    },

    setToast: (text, type) => {
      set({ toastMessage: { text, type } });
      setTimeout(() => set({ toastMessage: null }), 4000);
    },

    setAudioPref: (key, value) => {
      // Update state first (pure), then persist as a side effect outside set().
      set((s) => ({ audioPrefs: { ...s.audioPrefs, [key]: value } }));
      try { localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(get().audioPrefs)); } catch { /* ignore */ }
    },

    // Dynamic import keeps store/ from statically depending on audio/.
    // Same pattern as startDailyCycle → engine/daily-cycle.
    triggerSfx: (event) => {
      const p = get().audioPrefs;
      const vol = p.muted ? 0 : p.master * p.sfx;
      import('@/audio/sfx')
        .then(({ playSfxEvent }) => playSfxEvent(event, vol))
        .catch((err: unknown) => {
          if (import.meta.env.DEV) {
            console.warn('[store] triggerSfx failed:', err);
          }
        });
    },
  }))
);

/**
 * Direct store access for Phaser scenes.
 * Use this in Phaser scene create() with subscribe():
 *
 * ```ts
 * import { store } from '@/store';
 * store.subscribe(
 *   (s) => s.world.biome,
 *   (biome) => this.updateBiome(biome)
 * );
 * ```
 */
export const store = useStore;
