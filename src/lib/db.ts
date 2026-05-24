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
  },
};
