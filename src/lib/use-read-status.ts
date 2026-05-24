"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** Per-id flag preventing concurrent toggles from colliding. */
  const pendingRef = useRef<Set<number>>(new Set());

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
      // Drop overlapping requests for the same id — IDB's read-modify-write
      // already serializes, but blocking the UI-level second tap prevents
      // optimistic state flapping.
      if (pendingRef.current.has(id)) return;
      pendingRef.current.add(id);
      try {
        await db.stories.toggleReadAtomic(id);
        await refresh();
      } finally {
        pendingRef.current.delete(id);
      }
    },
    [refresh]
  );

  // Derive readIds / progress from entries inside useMemo so consumers see
  // stable Set/Map references and their own useMemo deps don't churn.
  const { readIds, progress } = useMemo(() => {
    const ids = new Set<number>();
    const prog = new Map<number, number>();
    for (const e of entries) {
      if (e.readAt > 0) ids.add(e.id);
      if (typeof e.scrollProgress === "number" && e.scrollProgress > 0.02) {
        prog.set(e.id, e.scrollProgress);
      }
    }
    return { readIds: ids, progress: prog };
  }, [entries]);

  return { readIds, progress, ready, toggleRead, refresh };
}
