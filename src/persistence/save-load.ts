/**
 * Frontier — Save / Load API
 *
 * High-level persistence operations built on IndexedDB.
 * Handles serialization, integrity hashing, slot management,
 * and JSON export/import (Safari eviction insurance).
 *
 * Imports: @/types/game-state (types only), @/store, ./db
 */

import type { GameState } from '@/types/game-state';
import type { LedgerEntry } from '@/types/narrative';
import { store } from '@/store';
import { writeToStore, readFromStore, deleteFromStore, listSlots } from './db';

// ============================================================
// SAVE SLOT METADATA
// ============================================================

export interface SaveSlotMeta {
  slot: number;
  timestamp: string;
  waypoint: string;
  totalMiles: number;
  daysElapsed: number;
  currentAct: string;
  version: number;
}

interface SaveRecord {
  slot: number;
  state: string;
  hash: string;
  meta: SaveSlotMeta;
}

// ============================================================
// HASHING
// ============================================================

/**
 * Compute SHA-256 hex digest of a string using Web Crypto API.
 * Falls back to a simple checksum if crypto.subtle is unavailable
 * (e.g., non-HTTPS localhost without secure context).
 */
async function computeHash(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple FNV-1a 32-bit hash for non-secure contexts
    let hash = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}

// ============================================================
// SAVE
// ============================================================

/**
 * Save the current game state to a numbered slot.
 * Serializes via store, computes integrity hash, writes to IndexedDB.
 */
export async function saveGame(slot?: number): Promise<void> {
  const s = store.getState();
  const targetSlot = slot ?? s.meta.saveSlot;

  const serialized = s.serializeActiveState();
  const hash = await computeHash(serialized);

  // Update store meta with new hash and timestamp
  const timestamp = new Date().toISOString();
  store.setState((prev) => ({
    meta: { ...prev.meta, hash, timestamp },
  }));

  const meta: SaveSlotMeta = {
    slot: targetSlot,
    timestamp,
    waypoint: s.journey.waypoint,
    totalMiles: s.world.totalMiles,
    daysElapsed: s.journey.daysElapsed,
    currentAct: s.journey.currentAct,
    version: s.meta.version,
  };

  const record: SaveRecord = {
    slot: targetSlot,
    state: serialized,
    hash,
    meta,
  };

  await writeToStore('active', record);
}

/**
 * Auto-save to the current save slot.
 * Called at end of each daily cycle.
 */
export async function autoSave(): Promise<void> {
  await saveGame();
}

// ============================================================
// LOAD
// ============================================================

/**
 * Load game state from a numbered slot.
 * Verifies integrity hash, then hydrates the store.
 * Returns true on success, false on failure.
 */
export async function loadGame(slot: number): Promise<boolean> {
  const record = await readFromStore<SaveRecord>('active', slot);
  if (!record) {
    console.warn(`No save found in slot ${slot}`);
    return false;
  }

  // Verify integrity
  const hash = await computeHash(record.state);
  if (hash !== record.hash) {
    console.error(`Save integrity check failed for slot ${slot}`);
    return false;
  }

  try {
    const state: GameState = JSON.parse(record.state);
    store.getState().loadState(state);
    return true;
  } catch (err) {
    console.error(`Failed to parse save data for slot ${slot}:`, err);
    return false;
  }
}

// ============================================================
// SLOT MANAGEMENT
// ============================================================

/**
 * Get metadata for all occupied save slots.
 */
export async function getSaveSlots(): Promise<SaveSlotMeta[]> {
  const slots = await listSlots('active');
  const metas: SaveSlotMeta[] = [];

  for (const slot of slots) {
    const record = await readFromStore<SaveRecord>('active', slot);
    if (record?.meta) {
      metas.push(record.meta);
    }
  }

  return metas.sort((a, b) => a.slot - b.slot);
}

/**
 * Delete a save slot.
 */
export async function deleteSaveSlot(slot: number): Promise<void> {
  await deleteFromStore('active', slot);
}

// ============================================================
// JSON EXPORT / IMPORT (Safari eviction insurance)
// ============================================================

/**
 * Export current game state as a JSON string.
 * Can be downloaded as a file by the UI.
 */
export function exportToJSON(): string {
  return store.getState().serializeActiveState();
}

/**
 * Import game state from a JSON string.
 * Validates structure before loading.
 * Returns true on success, false on failure.
 */
export function importFromJSON(json: string): boolean {
  try {
    const state: GameState = JSON.parse(json);

    // Basic structural validation
    if (
      !state.world ||
      !state.player ||
      !state.horse ||
      !state.supplies ||
      !state.journey ||
      !state.meta
    ) {
      console.error('Import failed: missing required state sections');
      return false;
    }

    if (typeof state.world.totalMiles !== 'number') {
      console.error('Import failed: invalid world state');
      return false;
    }

    if (typeof state.journey.daysElapsed !== 'number') {
      console.error('Import failed: invalid journey state');
      return false;
    }

    store.getState().loadState(state);
    return true;
  } catch (err) {
    console.error('Import failed: invalid JSON', err);
    return false;
  }
}

// ============================================================
// ARCHIVE (Cold Ledger Storage)
// ============================================================

interface ArchiveRecord {
  slot: number;
  entry: LedgerEntry;
  timestamp: string;
}

/**
 * Archive a ledger entry to the 'archive' IndexedDB store.
 * Uses incrementing numeric slot keys (no DB version bump needed).
 */
export async function archiveLedgerEntry(entry: LedgerEntry): Promise<void> {
  const existingSlots = await listSlots('archive');
  const nextSlot = existingSlots.length > 0 ? Math.max(...existingSlots) + 1 : 1;
  const record: ArchiveRecord = {
    slot: nextSlot,
    entry,
    timestamp: new Date().toISOString(),
  };
  await writeToStore('archive', record);
}

/**
 * Retrieve all archived ledger entries, ordered by slot.
 */
export async function getArchivedEntries(): Promise<LedgerEntry[]> {
  const slots = await listSlots('archive');
  const entries: LedgerEntry[] = [];
  for (const slot of slots.sort((a, b) => a - b)) {
    const record = await readFromStore<ArchiveRecord>('archive', slot);
    if (record?.entry) entries.push(record.entry);
  }
  return entries;
}
