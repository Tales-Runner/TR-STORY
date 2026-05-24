"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, type StoryEntry } from "./db";

export interface ReadStatus {
  readIds: Set<number>;
  favoriteIds: Set<number>;
  bookmarkIds: Set<number>;
  progress: Map<number, number>;
  ready: boolean;
  toggleRead: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  toggleBookmark: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReadStatus(): ReadStatus {
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const readPendingRef = useRef<Set<number>>(new Set());
  const favPendingRef = useRef<Set<number>>(new Set());
  const bookmarkPendingRef = useRef<Set<number>>(new Set());

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

  const toggleBookmark = useCallback(
    async (id: number) => {
      if (bookmarkPendingRef.current.has(id)) return;
      bookmarkPendingRef.current.add(id);
      try {
        await db.stories.toggleBookmarkAtomic(id);
        await refresh();
      } finally {
        bookmarkPendingRef.current.delete(id);
      }
    },
    [refresh]
  );

  const { readIds, favoriteIds, bookmarkIds, progress } = useMemo(() => {
    const reads = new Set<number>();
    const favs = new Set<number>();
    const bookmarks = new Set<number>();
    const prog = new Map<number, number>();
    for (const e of entries) {
      if (e.readAt > 0) reads.add(e.id);
      if ((e.favoritedAt ?? 0) > 0) favs.add(e.id);
      if ((e.bookmarkedAt ?? 0) > 0) bookmarks.add(e.id);
      if (typeof e.scrollProgress === "number" && e.scrollProgress > 0.02) {
        prog.set(e.id, e.scrollProgress);
      }
    }
    return {
      readIds: reads,
      favoriteIds: favs,
      bookmarkIds: bookmarks,
      progress: prog,
    };
  }, [entries]);

  return {
    readIds,
    favoriteIds,
    bookmarkIds,
    progress,
    ready,
    toggleRead,
    toggleFavorite,
    toggleBookmark,
    refresh,
  };
}
