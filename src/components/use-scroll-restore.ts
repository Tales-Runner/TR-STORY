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

  useEffect(() => {
    markedReadRef.current = !!isRead;
  }, [storyId, isRead]);

  useEffect(() => {
    db.stories.get(storyId).then((entry) => {
      const progress = entry?.scrollProgress;
      if (typeof progress === "number" && progress > 0.05 && progress < 0.95) {
        requestAnimationFrame(() => {
          const el = scrollRef.current;
          if (el) el.scrollTop = progress * (el.scrollHeight - el.clientHeight);
        });
        onToast?.("이어서 읽는 중");
      } else {
        scrollRef.current?.scrollTo(0, 0);
      }
    });
  }, [storyId, scrollRef, onToast]);

  useEffect(() => {
    const capturedId = storyId;
    const capturedEl = scrollRef.current;
    return () => {
      const el = capturedEl;
      if (!el) return;
      const progress =
        el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1);
      db.stories.get(capturedId).then((existing) => {
        db.stories.put({
          id: capturedId,
          readAt: existing?.readAt ?? 0,
          scrollProgress: progress,
        });
      });
    };
  }, [storyId, scrollRef]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const progress =
      el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1);
    setScrollProgress(Math.min(progress, 1));
    if (progress >= readThreshold && !markedReadRef.current) {
      markedReadRef.current = true;
      onMarkRead?.();
    }
  }, [scrollRef, onMarkRead, readThreshold]);

  return { scrollProgress, handleScroll };
}
