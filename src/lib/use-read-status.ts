"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, type StoryEntry } from "./db";

export interface ReadStatus {
  readIds: Set<number>;
  favoriteIds: Set<number>;
  progress: Map<number, number>;
  ready: boolean;
  toggleRead: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReadStatus(): ReadStatus {
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const readPendingRef = useRef<Set<number>>(new Set());
  const favPendingRef = useRef<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    const list = await db.stories.getAll();
    setEntries(list);
    setReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const toggleRead = useCallback(
    async (id: number) => {
      if (readPendingRef.current.has(id)) return;
      readPendingRef.current.add(id);
      try {
        await db.stories.toggleReadAtomic(id);
        await refresh();
      } finally {
        readPendingRef.current.delete(id);
      }
    },
    [refresh]
  );

  const toggleFavorite = useCallback(
    async (id: number) => {
      if (favPendingRef.current.has(id)) return;
      favPendingRef.current.add(id);
      try {
        await db.stories.toggleFavoriteAtomic(id);
        await refresh();
      } finally {
        favPendingRef.current.delete(id);
      }
    },
    [refresh]
  );

  const { readIds, favoriteIds, progress } = useMemo(() => {
    const reads = new Set<number>();
    const favs = new Set<number>();
    const prog = new Map<number, number>();
    for (const e of entries) {
      if (e.readAt > 0) reads.add(e.id);
      if ((e.favoritedAt ?? 0) > 0) favs.add(e.id);
      if (typeof e.scrollProgress === "number" && e.scrollProgress > 0.02) {
        prog.set(e.id, e.scrollProgress);
      }
    }
    return { readIds: reads, favoriteIds: favs, progress: prog };
  }, [entries]);

  return {
    readIds,
    favoriteIds,
    progress,
    ready,
    toggleRead,
    toggleFavorite,
    refresh,
  };
}
