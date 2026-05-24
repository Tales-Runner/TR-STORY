"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";

interface Options {
  storyId: number;
  scrollRef: React.RefObject<HTMLElement | null>;
  onMarkRead?: () => void;
  onToast?: (msg: string) => void;
  isRead?: boolean;
  readThreshold?: number;
}

interface Result {
  scrollProgress: number;
  handleScroll: () => void;
}

/**
 * Persists per-story scroll position to IndexedDB, restores on mount, and
 * fires `onMarkRead` once the user crosses `readThreshold`.
 *
 * Important: the consumer (StoryViewer) is REUSED across storyId changes —
 * the scrollable div stays mounted, only its children change. Reading
 * `scrollRef.current.scrollTop` at unmount/effect-cleanup time would
 * therefore measure the NEW story's geometry. We avoid that by snapshotting
 * progress in `lastProgressRef` whenever scroll happens, and persisting that
 * snapshot in cleanup — never re-measuring the DOM.
 *
 * `db.stories.updateProgress` is a single-transaction read-modify-write,
 * so it cannot race with a concurrent `markReadAtomic` and clobber readAt.
 */
export function useScrollRestore({
  storyId,
  scrollRef,
  onMarkRead,
  onToast,
  isRead,
  readThreshold = 0.8,
}: Options): Result {
  const [scrollProgress, setScrollProgress] = useState(0);
  const markedReadRef = useRef(false);
  /** Last scroll fraction observed for THIS storyId; consumed in cleanup. */
  const lastProgressRef = useRef(0);

  useEffect(() => {
    markedReadRef.current = !!isRead;
  }, [storyId, isRead]);

  useEffect(() => {
    // Reset measured progress when story changes, so cleanup of the OLD
    // story never persists a value derived from the NEW story. The
    // setScrollProgress(0) is synchronizing UI to the new external state
    // (a new story), not derived state — the lint rule's heuristic flags
    // any in-effect setState so we suppress here.
    lastProgressRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollProgress(0);

    let cancelled = false;
    db.stories.get(storyId).then((entry) => {
      if (cancelled) return;
      const progress = entry?.scrollProgress;
      if (typeof progress === "number" && progress > 0.05 && progress < 0.95) {
        requestAnimationFrame(() => {
          const el = scrollRef.current;
          if (el)
            el.scrollTop = progress * (el.scrollHeight - el.clientHeight);
        });
        onToast?.("이어서 읽는 중");
      } else {
        scrollRef.current?.scrollTo(0, 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storyId, scrollRef, onToast]);

  useEffect(() => {
    const capturedId = storyId;
    return () => {
      const progress = lastProgressRef.current;
      // Only persist if the user actually scrolled this story. Writing 0 on
      // every navigation would clobber a meaningful saved position from a
      // previous session (e.g. user opens a story, taps close immediately).
      if (progress <= 0.02) return;
      db.stories.updateProgress(capturedId, progress);
    };
  }, [storyId]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const progress =
      el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1);
    const clamped = Math.min(Math.max(progress, 0), 1);
    lastProgressRef.current = clamped;
    setScrollProgress(clamped);
    if (clamped >= readThreshold && !markedReadRef.current) {
      markedReadRef.current = true;
      onMarkRead?.();
    }
  }, [scrollRef, onMarkRead, readThreshold]);

  return { scrollProgress, handleScroll };
}
