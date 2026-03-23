/**
 * Frontier — Persistence Module
 *
 * Re-exports for clean imports:
 *   import { saveGame, loadGame } from '@/persistence';
 */

export {
  openDatabase,
  closeDatabase,
  deleteDatabase,
} from './db';

export {
  saveGame,
  loadGame,
  autoSave,
  getSaveSlots,
  deleteSaveSlot,
  exportToJSON,
  importFromJSON,
} from './save-load';

export type { SaveSlotMeta } from './save-load';
