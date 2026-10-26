import { mergeReadingEntries } from "./reading-backup";

const DB_NAME = "tr-story";
const STORE = "stories";

export interface ReadingPosition { panel: number; offset: number }
export interface StoryEntry {
  id: number;
  readAt: number;
  scrollProgress?: number;
  position?: ReadingPosition;
  lastReadAt?: number;
  favoritedAt?: number;
  bookmarkedAt?: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("indexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => {
      const idb = req.result;
      idb.onversionchange = () => { idb.close(); dbPromise = null; };
      resolve(idb);
    };
    req.onerror = () => reject(req.error);
  }).catch((error) => { dbPromise = null; throw error; });
  return dbPromise;
}

async function safe<T>(op: () => Promise<T>, fallback: T): Promise<T> {
  try { return await op(); } catch { return fallback; }
}

/** One transaction preserves other fields when reading and toggles overlap. */
async function update<T>(id: number, change: (entry: StoryEntry) => T): Promise<T | null> {
  return safe(async () => {
    const idb = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = idb.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const request = store.get(id);
      let result: T;
      request.onsuccess = () => {
        const entry: StoryEntry = request.result ?? { id, readAt: 0 };
        result = change(entry);
        store.put(entry);
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Storage transaction failed"));
    });
  }, null);
}

async function write(op: (store: IDBObjectStore) => void): Promise<void> {
  const idb = await open();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readwrite");
    op(tx.objectStore(STORE));
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error);
  });
}

export const db = {
  stories: {
    async exportEntries(): Promise<StoryEntry[]> {
      const idb = await open();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(STORE);
        const request = tx.objectStore(STORE).getAll();
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Storage unavailable"));
      });
    },
    async importEntries(entries: StoryEntry[]): Promise<void> {
      const idb = await open();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const request = store.getAll();
        request.onsuccess = () => {
          for (const entry of mergeReadingEntries(request.result, entries)) store.put(entry);
        };
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Storage unavailable"));
      });
    },
    getAll(): Promise<StoryEntry[]> {
      return safe(async () => {
        const idb = await open();
        return new Promise<StoryEntry[]>((resolve, reject) => {
          const req = idb.transaction(STORE).objectStore(STORE).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }, []);
    },
    get(id: number): Promise<StoryEntry | undefined> {
      return safe(async () => {
        const idb = await open();
        return new Promise<StoryEntry | undefined>((resolve, reject) => {
          const req = idb.transaction(STORE).objectStore(STORE).get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }, undefined);
    },
    put: (entry: StoryEntry) => safe(() => write((store) => { store.put(entry); }), undefined),
    remove: (id: number) => safe(() => write((store) => { store.delete(id); }), undefined),
    clear: () => safe(() => write((store) => { store.clear(); }), undefined),
    updateProgress(id: number, scrollProgress: number, position?: ReadingPosition) {
      return update(id, (entry) => {
        entry.scrollProgress = scrollProgress;
        entry.lastReadAt = Date.now();
        if (position) entry.position = position;
        return true;
      });
    },
    toggleReadAtomic(id: number) {
      return update(id, (entry) => {
        entry.readAt = entry.readAt > 0 ? 0 : Date.now();
        return entry.readAt > 0;
      });
    },
    toggleFavoriteAtomic(id: number) {
      return update(id, (entry) => {
        entry.favoritedAt = (entry.favoritedAt ?? 0) > 0 ? 0 : Date.now();
        return entry.favoritedAt > 0;
      });
    },
    toggleBookmarkAtomic(id: number) {
      return update(id, (entry) => {
        entry.bookmarkedAt = (entry.bookmarkedAt ?? 0) > 0 ? 0 : Date.now();
        return entry.bookmarkedAt > 0;
      });
    },
    markReadAtomic(id: number) {
      return update(id, (entry) => {
        if (entry.readAt > 0) return false;
        entry.readAt = Date.now();
        return true;
      });
    },
  },
};
