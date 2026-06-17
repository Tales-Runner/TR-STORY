"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";

export function useStoryViewerStatus({
  storyId,
  showToast,
}: {
  storyId: number;
  showToast: (message: string) => void;
}) {
  const [isRead, setIsRead] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const favPendingRef = useRef(false);
  const bookmarkPendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    db.stories.getAll().then((entries) => {
      if (cancelled) return;
      setReadIds(new Set(entries.filter((e) => e.readAt > 0).map((e) => e.id)));
      const cur = entries.find((e) => e.id === storyId);
      setIsRead(!!(cur && cur.readAt > 0));
      setIsFavorite(!!(cur && (cur.favoritedAt ?? 0) > 0));
      setIsBookmarked(!!(cur && (cur.bookmarkedAt ?? 0) > 0));
    });
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const handleMarkRead = useCallback(async () => {
    if (isRead) return;
    setIsRead(true);
    setReadIds((p) => new Set(p).add(storyId));
    await db.stories.markReadAtomic(storyId);
  }, [storyId, isRead]);

  const toggleFavorite = useCallback(async () => {
    if (favPendingRef.current) return;
    favPendingRef.current = true;
    try {
      const next = await db.stories.toggleFavoriteAtomic(storyId);
      setIsFavorite(next);
      showToast(next ? "즐겨찾기 추가" : "즐겨찾기 해제");
    } finally {
      favPendingRef.current = false;
    }
  }, [storyId, showToast]);

  const toggleBookmark = useCallback(async () => {
    if (bookmarkPendingRef.current) return;
    bookmarkPendingRef.current = true;
    try {
      const next = await db.stories.toggleBookmarkAtomic(storyId);
      setIsBookmarked(next);
      showToast(next ? "책갈피 추가" : "책갈피 해제");
    } finally {
      bookmarkPendingRef.current = false;
    }
  }, [storyId, showToast]);

  return {
    isRead,
    isFavorite,
    isBookmarked,
    readIds,
    handleMarkRead,
    toggleFavorite,
    toggleBookmark,
  };
}
