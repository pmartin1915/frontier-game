/**
 * Frontier — Zustand Atomic Selectors
 *
 * Use these in React components to prevent unnecessary re-renders.
 * Each selector extracts the minimum data a component needs.
 *
 * Usage: const water = useStore(selectWater);
 */

import type { FrontierStore } from './index';

// --- World ---
export const selectBiome = (s: FrontierStore) => s.world.biome;
export const selectTimeOfDay = (s: FrontierStore) => s.world.timeOfDay;
export const selectWeather = (s: FrontierStore) => s.world.weather;
export const selectDate = (s: FrontierStore) => s.world.date;
export const selectCurrentAct = (s: FrontierStore) => s.world.currentAct;
export const selectTotalMiles = (s: FrontierStore) => s.world.totalMiles;
export const selectDistanceToWaypoint = (s: FrontierStore) => s.world.distanceToWaypoint;

// --- Player ---
export const selectPlayerHealth = (s: FrontierStore) => s.player.health;
export const selectPlayerMorale = (s: FrontierStore) => s.player.morale;
export const selectPlayerFatigue = (s: FrontierStore) => s.player.fatigue;
export const selectPlayerConditions = (s: FrontierStore) => s.player.conditions;
export const selectPlayerEquipment = (s: FrontierStore) => s.player.equipment;

// --- Horse ---
export const selectHorseHealth = (s: FrontierStore) => s.horse.health;
export const selectHorseFatigue = (s: FrontierStore) => s.horse.fatigue;
export const selectHorseLameness = (s: FrontierStore) => s.horse.lameness;

// --- Supplies ---
export const selectWater = (s: FrontierStore) => s.supplies.water;
export const selectFood = (s: FrontierStore) => s.supplies.food;
export const selectCoffee = (s: FrontierStore) => s.supplies.coffee;
export const selectAmmo = (s: FrontierStore) => s.supplies.ammo;
export const selectFunds = (s: FrontierStore) => s.supplies.funds;
export const selectAllSupplies = (s: FrontierStore) => s.supplies;

// --- Party ---
export const selectCompanions = (s: FrontierStore) => s.party.companions;
export const selectActiveCompanionCount = (s: FrontierStore) =>
  s.party.companions.filter((c) => c.status === 'active').length;

// --- Camp Pet ---
export const selectCampPet = (s: FrontierStore) => s.campPet;

// --- Journey ---
export const selectDaysElapsed = (s: FrontierStore) => s.journey.daysElapsed;
export const selectWaypoint = (s: FrontierStore) => s.journey.waypoint;
export const selectPace = (s: FrontierStore) => s.journey.pace;
export const selectNightTravel = (s: FrontierStore) => s.journey.nightTravel;
export const selectDiscretionaryAction = (s: FrontierStore) => s.journey.discretionaryAction;
export const selectFailForwardsUsed = (s: FrontierStore) => s.journey.failForwardsUsed;

// --- Narrative ---
export const selectPreviousEntry = (s: FrontierStore) => s.narrative.previousEntry;
export const selectCurrentVoice = (s: FrontierStore) => s.narrative.currentVoice;
export const selectStructuredLedger = (s: FrontierStore) => s.narrative.structuredLedger;

// --- UI ---
export const selectDailyCyclePhase = (s: FrontierStore) => s.dailyCyclePhase;
export const selectLoading = (s: FrontierStore) => s.loading;
export const selectConsecutiveFallbacks = (s: FrontierStore) => s.consecutiveFallbacks;
export const selectShowSaveLoadModal = (s: FrontierStore) => s.showSaveLoadModal;

// --- Game End ---
export const selectGameEndState = (s: FrontierStore) => s.gameEndState;

// --- Auto-play / initialization ---
export const selectGameInitialized = (s: FrontierStore) => s.gameInitialized;
export const selectAutoPlay = (s: FrontierStore) => s.autoPlay;

// --- Encounter/Bargain ---
export const selectPendingEncounter = (s: FrontierStore) => s.pendingEncounter;
export const selectPendingBargain = (s: FrontierStore) => s.pendingBargain;
export const selectActiveEncounterId = (s: FrontierStore) => s.activeEncounterId;
export const selectIsEncounterActive = (s: FrontierStore) => s.pendingEncounter !== null;
export const selectIsBargainActive = (s: FrontierStore) => s.pendingBargain !== null;
export const selectCanUseBargain = (s: FrontierStore) =>
  s.journey.failForwardsUsed < 3;

// --- Transport ---
export const selectTransportMode = (s: FrontierStore) => s.carryCapacity.transport;
export const selectWaterCapacity = (s: FrontierStore) => s.carryCapacity.water;
export const selectFoodCapacity = (s: FrontierStore) => s.carryCapacity.food;

// --- Camp ---
export const selectPendingCampIsFullDay = (s: FrontierStore) => s.pendingCampIsFullDay;
export const selectPendingEventRecord = (s: FrontierStore) => s.pendingEventRecord;
export const selectPendingDayResults = (s: FrontierStore) => s.pendingDayResults;

// --- Audio ---
export const selectAudioPrefs  = (s: FrontierStore) => s.audioPrefs;
export const selectAudioMuted  = (s: FrontierStore) => s.audioPrefs.muted;
export const selectAudioMaster = (s: FrontierStore) => s.audioPrefs.master;
export const selectAudioMusic  = (s: FrontierStore) => s.audioPrefs.music;
export const selectAudioSfx    = (s: FrontierStore) => s.audioPrefs.sfx;

// --- Errors / Toasts ---
export const selectErrorMessage = (s: FrontierStore) => s.errorMessage;
export const selectToastMessage = (s: FrontierStore) => s.toastMessage;

// --- Travel Log ---
export const selectLogEntries = (s: FrontierStore) => s.logEntries;

// --- Phaser Bridge ---
export const selectCommandQueue = (s: FrontierStore) => s.commandQueue;
