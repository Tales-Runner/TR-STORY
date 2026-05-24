"use client";

import { useCallback, useEffect, useState } from "react";
import { db, type StoryEntry } from "./db";

export interface ReadStatus {
  readIds: Set<number>;
  progress: Map<number, number>;
  ready: boolean;
  toggleRead: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReadStatus(): ReadStatus {
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const list = await db.stories.getAll();
    setEntries(list);
    setReady(true);
  }, []);

  useEffect(() => {
    // Loading from IndexedDB is an external-data sync, not derived state —
    // suppress the rule that flags any setState inside an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const toggleRead = useCallback(
    async (id: number) => {
      const existing = await db.stories.get(id);
      if (existing && existing.readAt > 0) {
        await db.stories.put({ ...existing, readAt: 0 });
      } else {
        await db.stories.put({
          id,
          readAt: Date.now(),
          scrollProgress: existing?.scrollProgress,
        });
      }
      await refresh();
    },
    [refresh]
  );

  const readIds = new Set<number>();
  const progress = new Map<number, number>();
  for (const e of entries) {
    if (e.readAt > 0) readIds.add(e.id);
    if (typeof e.scrollProgress === "number" && e.scrollProgress > 0.02) {
      progress.set(e.id, e.scrollProgress);
    }
  }

  return { readIds, progress, ready, toggleRead, refresh };
}
