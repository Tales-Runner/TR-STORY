/**
 * IndexedDB — TR Story 읽기 진행률 추적.
 *
 * stories 스토어 하나만 둔다. id별로 readAt(읽음 마크 시점)과
 * scrollProgress(0~1)를 저장.
 */

const DB_NAME = "tr-story";
const DB_VERSION = 1;
const STORE = "stories";

export interface StoryEntry {
  id: number;
  readAt: number;
  scrollProgress?: number;
  /** Unix ms when favorited; 0/undefined = not favorited. */
  favoritedAt?: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("indexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(STORE)) {
        idb.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      const idb = req.result;
      idb.onversionchange = () => {
        idb.close();
        dbPromise = null;
      };
      resolve(idb);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function safe<T>(op: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await op();
  } catch {
    return fallback;
  }
}

export const db = {
  stories: {
    getAll(): Promise<StoryEntry[]> {
      return safe(async () => {
        const idb = await open();
        return new Promise<StoryEntry[]>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readonly");
          const req = tx.objectStore(STORE).getAll();
          req.onsuccess = () => resolve(req.result as StoryEntry[]);
          req.onerror = () => reject(req.error);
        });
      }, []);
    },
    get(id: number): Promise<StoryEntry | undefined> {
      return safe(async () => {
        const idb = await open();
        return new Promise<StoryEntry | undefined>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readonly");
          const req = tx.objectStore(STORE).get(id);
          req.onsuccess = () => resolve(req.result as StoryEntry | undefined);
          req.onerror = () => reject(req.error);
        });
      }, undefined);
    },
    put(entry: StoryEntry): Promise<void> {
      return safe(async () => {
        const idb = await open();
        return new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(entry);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }, undefined);
    },
    remove(id: number): Promise<void> {
      return safe(async () => {
        const idb = await open();
        return new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readwrite");
          tx.objectStore(STORE).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }, undefined);
    },
    clear(): Promise<void> {
      return safe(async () => {
        const idb = await open();
        return new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readwrite");
          tx.objectStore(STORE).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }, undefined);
    },

    /**
     * Atomic read-modify-write: update scrollProgress while preserving readAt.
     * Done in a single IDB transaction so concurrent writes (e.g. mark-read)
     * cannot interleave and clobber the readAt field.
     */
    updateProgress(id: number, scrollProgress: number): Promise<void> {
      return safe(async () => {
        const idb = await open();
        return new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readwrite");
          const store = tx.objectStore(STORE);
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            const existing = getReq.result as StoryEntry | undefined;
            store.put({
              id,
              readAt: existing?.readAt ?? 0,
              scrollProgress,
              favoritedAt: existing?.favoritedAt,
            });
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }, undefined);
    },

    /**
     * Atomic read-modify-write: toggle readAt while preserving scrollProgress.
     * Returns the new read state (true = marked read).
     */
    toggleReadAtomic(id: number): Promise<boolean> {
      return safe(async () => {
        const idb = await open();
        return new Promise<boolean>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readwrite");
          const store = tx.objectStore(STORE);
          const getReq = store.get(id);
          let nextRead = false;
          getReq.onsuccess = () => {
            const existing = getReq.result as StoryEntry | undefined;
            nextRead = !(existing && existing.readAt > 0);
            store.put({
              id,
              readAt: nextRead ? Date.now() : 0,
              scrollProgress: existing?.scrollProgress,
              favoritedAt: existing?.favoritedAt,
            });
          };
          tx.oncomplete = () => resolve(nextRead);
          tx.onerror = () => reject(tx.error);
        });
      }, false);
    },

    /**
     * Atomic favorite toggle. Returns the new favorited state.
     */
    toggleFavoriteAtomic(id: number): Promise<boolean> {
      return safe(async () => {
        const idb = await open();
        return new Promise<boolean>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readwrite");
          const store = tx.objectStore(STORE);
          const getReq = store.get(id);
          let next = false;
          getReq.onsuccess = () => {
            const existing = getReq.result as StoryEntry | undefined;
            next = !(existing && (existing.favoritedAt ?? 0) > 0);
            store.put({
              id,
              readAt: existing?.readAt ?? 0,
              scrollProgress: existing?.scrollProgress,
              favoritedAt: next ? Date.now() : 0,
            });
          };
          tx.oncomplete = () => resolve(next);
          tx.onerror = () => reject(tx.error);
        });
      }, false);
    },

    /**
     * Atomic mark-read (idempotent): sets readAt to now if not already > 0.
     * Returns true if a write occurred, false if it was already read.
     */
    markReadAtomic(id: number): Promise<boolean> {
      return safe(async () => {
        const idb = await open();
        return new Promise<boolean>((resolve, reject) => {
          const tx = idb.transaction(STORE, "readwrite");
          const store = tx.objectStore(STORE);
          const getReq = store.get(id);
          let wrote = false;
          getReq.onsuccess = () => {
            const existing = getReq.result as StoryEntry | undefined;
            if (existing && existing.readAt > 0) return; // already read
            store.put({
              id,
              readAt: Date.now(),
              scrollProgress: existing?.scrollProgress,
              favoritedAt: existing?.favoritedAt,
            });
            wrote = true;
          };
          tx.oncomplete = () => resolve(wrote);
          tx.onerror = () => reject(tx.error);
        });
      }, false);
    },
  },
};
