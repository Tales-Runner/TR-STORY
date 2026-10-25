"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db, type ReadingPosition } from "@/lib/db";
import { PROGRESS } from "@/lib/progress";
import { capturePosition, positionScrollTop, validPosition } from "@/lib/reading-position";

interface Options {
  storyId: number;
  scrollRef: React.RefObject<HTMLElement | null>;
  onMarkRead?: () => void;
  onResumeFromPercent?: (percent: number) => void;
  onSaveError?: () => void;
  isRead?: boolean;
}

export function useScrollRestore({ storyId, scrollRef, onMarkRead, onResumeFromPercent, onSaveError, isRead }: Options) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [restoreThrough, setRestoreThrough] = useState(-1);
  const restoring = useRef(true);
  const markedRead = useRef(false);
  const snapshot = useRef<{ progress: number; position?: ReadingPosition } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveFailed = useRef(false);
  const cancelRestoreRef = useRef<() => void>(() => {});
  const cancelRestore = useCallback(() => cancelRestoreRef.current(), []);

  useEffect(() => { markedRead.current = !!isRead; }, [storyId, isRead]);

  const save = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    const value = snapshot.current;
    if (!value) return;
    snapshot.current = null;
    void db.stories.updateProgress(storyId, value.progress, value.position).then((result) => {
      if (result === null && !saveFailed.current) {
        saveFailed.current = true;
        onSaveError?.();
      }
    });
  }, [storyId, onSaveError]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden") save(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", save);
    };
  }, [save]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    let schedule = () => {};
    restoring.current = true;
    snapshot.current = null;
    saveFailed.current = false;
    // Reset the state belonging to the previous episode.
    setScrollProgress(0);
    setRestoreThrough(-1);
    const finish = () => {
      restoring.current = false;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      el.removeEventListener("load", schedule, true);
      el.removeEventListener("error", schedule, true);
    };
    cancelRestoreRef.current = finish;
    const interrupt = () => finish();
    el.addEventListener("wheel", interrupt, { passive: true });
    el.addEventListener("touchstart", interrupt, { passive: true });
    el.addEventListener("pointerdown", interrupt);
    el.addEventListener("keydown", interrupt);

    void db.stories.get(storyId).then((entry) => {
      if (cancelled || !restoring.current) return;
      const progress = Number.isFinite(entry?.scrollProgress) ? entry!.scrollProgress! : 0;
      const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-panel]"));
      const position = validPosition(entry?.position, panels.length) ? entry.position : undefined;
      const search = new URLSearchParams(window.location.search);
      const startOver = search.get("start") === "1";
      if (startOver) {
        search.delete("start");
        window.history.replaceState(null, "", window.location.pathname + (search.size ? "?" + search.toString() : ""));
        void db.stories.updateProgress(storyId, 0, panels.length ? { panel: 0, offset: 0 } : undefined);
      }
      if (startOver || progress <= PROGRESS.RESUME_MIN || progress >= PROGRESS.RESUME_MAX) {
        el.scrollTop = 0;
        finish();
        return;
      }
      // Legacy percentage records need their full geometry loaded once.
      setRestoreThrough(position?.panel ?? panels.length - 1);
      setScrollProgress(progress);
      onResumeFromPercent?.(Math.round(progress * 100));
      const align = () => {
        if (cancelled || !restoring.current) return;
        const target = position ? positionScrollTop(el, position) : null;
        el.scrollTop = target ?? progress * (el.scrollHeight - el.clientHeight);
        const required = panels.slice(0, (position?.panel ?? panels.length - 1) + 1);
        if (required.every((panel) => panel.dataset.ready === "true")) finish();
      };
      schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(align); };
      observer = new ResizeObserver(schedule);
      panels.forEach((panel) => observer?.observe(panel));
      el.addEventListener("load", schedule, true);
      el.addEventListener("error", schedule, true);
      schedule();
    });
    return () => {
      cancelled = true;
      finish();
      el.removeEventListener("wheel", interrupt);
      el.removeEventListener("touchstart", interrupt);
      el.removeEventListener("pointerdown", interrupt);
      el.removeEventListener("keydown", interrupt);
    };
  }, [storyId, scrollRef, onResumeFromPercent]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || restoring.current) return;
    const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-panel]"));
    const position = capturePosition(el);
    const last = panels.at(-1);
    const atEnd = !!last && panels.every((panel) => panel.dataset.loaded === "true") &&
      last.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom + 8;
    const progress = atEnd ? 1 : position
      ? (position.panel + position.offset) / panels.length
      : el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1);
    const clamped = Math.min(Math.max(progress, 0), 1);
    snapshot.current = { progress: clamped, position };
    setScrollProgress(clamped);
    // Periodic checkpoints survive reloads; lifecycle events also flush.
    if (!saveTimer.current) saveTimer.current = setTimeout(save, 750);
    if (atEnd && !markedRead.current) {
      markedRead.current = true;
      onMarkRead?.();
    }
  }, [scrollRef, save, onMarkRead]);

  return { scrollProgress, handleScroll, restoreThrough, cancelRestore };
}
