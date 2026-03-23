/**
 * Frontier — IndexedDB Persistence
 *
 * Low-level database access for game state persistence.
 * Two-bucket model:
 *   - 'active' — hot game state (current save slots)
 *   - 'archive' — cold journal archive (populated later)
 *
 * Imports: nothing (pure Web API).
 */

const DB_NAME = 'frontier-game';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

/**
 * Open (or reuse) the IndexedDB database.
 * Creates object stores on first run or version upgrade.
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('active')) {
        db.createObjectStore('active', { keyPath: 'slot' });
      }
      if (!db.objectStoreNames.contains('archive')) {
        db.createObjectStore('archive', { keyPath: 'slot' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Reset cached instance if the connection closes unexpectedly
      dbInstance.onclose = () => { dbInstance = null; };

      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
    };
  });
}

/**
 * Write a record to an object store.
 * The record must include the keyPath field ('slot').
 */
export function writeToStore(
  storeName: string,
  data: unknown,
): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(new Error(`IndexedDB write failed: ${request.error?.message}`));
      }),
  );
}

/**
 * Read a record by slot key from an object store.
 * Returns undefined if not found.
 */
export function readFromStore<T>(
  storeName: string,
  slot: number,
): Promise<T | undefined> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(slot);
        request.onsuccess = () => resolve(request.result as T | undefined);
        request.onerror = () =>
          reject(new Error(`IndexedDB read failed: ${request.error?.message}`));
      }),
  );
}

/**
 * Delete a record by slot key from an object store.
 */
export function deleteFromStore(
  storeName: string,
  slot: number,
): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(slot);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(new Error(`IndexedDB delete failed: ${request.error?.message}`));
      }),
  );
}

/**
 * List all slot keys in an object store.
 */
export function listSlots(storeName: string): Promise<number[]> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result as number[]);
        request.onerror = () =>
          reject(new Error(`IndexedDB listSlots failed: ${request.error?.message}`));
      }),
  );
}

/**
 * Close the database connection and clear the cached instance.
 * Useful for testing teardown.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete the entire database. Destructive — use only for testing or full reset.
 */
export function deleteDatabase(): Promise<void> {
  closeDatabase();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new Error(`IndexedDB deleteDatabase failed: ${request.error?.message}`));
  });
}
