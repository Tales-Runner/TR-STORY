"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryDetail, StoryListItem } from "@/lib/types";
import { formatDate, isSafeImageUrl, youtubeId } from "@/lib/format";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDocumentKeydown } from "@/lib/use-document-keydown";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useSwipeNav } from "@/lib/use-swipe-nav";
import { db } from "@/lib/db";
import { WebtoonImage } from "./webtoon-image";
import { EpisodeDrawer } from "./episode-drawer";
import { KeyboardHelp } from "./keyboard-help";
import { useScrollRestore } from "./use-scroll-restore";

const BRIGHTNESS_KEY = "tr-story-brightness";
const ZOOM_LEVELS = [1, 1.2, 1.5] as const;

export function StoryViewer({
  story,
  siblings,
  yearLabel,
  nextPreloadImages,
}: {
  story: StoryDetail;
  siblings: StoryListItem[];
  yearLabel: string;
  nextPreloadImages?: string[];
}) {
  const router = useRouter();
  const idx = siblings.findIndex((s) => s.id === story.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const hasPrev = !!prev;
  const hasNext = !!next;

  const [barVisible, setBarVisible] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [brightness, setBrightness] = useState(() => {
    if (typeof window === "undefined") return 100;
    try {
      const saved = localStorage.getItem(BRIGHTNESS_KEY);
      if (saved) {
        const n = Number(saved);
        if (Number.isFinite(n)) return n;
      }
    } catch {}
    return 100;
  });
  const [viewerToast, setViewerToast] = useState<string | null>(null);
  const [isRead, setIsRead] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const zoom = ZOOM_LEVELS[zoomIdx];

  const showToast = useCallback((msg: string) => {
    setViewerToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setViewerToast(null), 1800);
  }, []);

  const handleBrightness = useCallback((v: number) => {
    setBrightness(v);
    try {
      localStorage.setItem(BRIGHTNESS_KEY, String(v));
    } catch {}
  }, []);

  useBodyScrollLock(true);
  useFocusTrap(true, rootRef, closeBtnRef);

  useEffect(() => {
    db.stories.getAll().then((entries) => {
      setReadIds(new Set(entries.filter((e) => e.readAt > 0).map((e) => e.id)));
      const cur = entries.find((e) => e.id === story.id);
      setIsRead(!!(cur && cur.readAt > 0));
    });
  }, [story.id]);

  const handleMarkRead = useCallback(async () => {
    if (isRead) return;
    setIsRead(true);
    setReadIds((p) => new Set(p).add(story.id));
    const existing = await db.stories.get(story.id);
    await db.stories.put({
      id: story.id,
      readAt: Date.now(),
      scrollProgress: existing?.scrollProgress,
    });
    showToast("읽음 표시");
  }, [story.id, isRead, showToast]);

  const toggleRead = useCallback(async () => {
    const existing = await db.stories.get(story.id);
    if (isRead) {
      await db.stories.put({
        id: story.id,
        readAt: 0,
        scrollProgress: existing?.scrollProgress,
      });
      setIsRead(false);
      setReadIds((p) => {
        const n = new Set(p);
        n.delete(story.id);
        return n;
      });
      showToast("읽음 해제");
    } else {
      await handleMarkRead();
    }
  }, [story.id, isRead, handleMarkRead, showToast]);

  useEffect(() => {
    autoHideTimerRef.current = setTimeout(() => setBarVisible(false), 2500);
    return () => clearTimeout(autoHideTimerRef.current);
  }, []);

  const { scrollProgress, handleScroll: restoreHandleScroll } =
    useScrollRestore({
      storyId: story.id,
      scrollRef,
      onMarkRead: handleMarkRead,
      onToast: showToast,
      isRead,
    });

  const goPrev = useCallback(() => {
    if (prev) router.push(`/stories/${prev.id}`);
  }, [prev, router]);
  const goNext = useCallback(() => {
    if (next) router.push(`/stories/${next.id}`);
  }, [next, router]);
  const goClose = useCallback(() => {
    router.push("/");
  }, [router]);
  const goJump = useCallback(
    (id: number) => {
      router.push(`/stories/${id}`);
    },
    [router]
  );

  useDocumentKeydown(
    useCallback(
      (e: KeyboardEvent) => {
        // Don't capture keys while user is typing in a form control.
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (e.key === "Escape") {
          if (showHelp) setShowHelp(false);
          else if (showDrawer) setShowDrawer(false);
          else goClose();
        } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
          setShowHelp((v) => !v);
        } else if (
          (e.key === "ArrowLeft" || e.key === "j") &&
          hasPrev &&
          !showHelp &&
          !showDrawer
        ) {
          goPrev();
        } else if (
          (e.key === "ArrowRight" || e.key === "k") &&
          hasNext &&
          !showHelp &&
          !showDrawer
        ) {
          goNext();
        }
      },
      [goClose, goPrev, goNext, hasPrev, hasNext, showHelp, showDrawer]
    )
  );

  // Prefetch the next story's first image so continue-reading feels instant.
  useEffect(() => {
    if (!nextPreloadImages?.length) return;
    for (const url of nextPreloadImages) {
      if (!url) continue;
      const preload = new Image();
      preload.src = url;
    }
  }, [nextPreloadImages]);

  const handleScroll = useCallback(() => {
    restoreHandleScroll();
    setBarVisible(false);
    clearTimeout(scrollTimerRef.current);
    clearTimeout(autoHideTimerRef.current);
    scrollTimerRef.current = setTimeout(() => setBarVisible(true), 1800);
  }, [restoreHandleScroll]);

  const toggleBar = useCallback(() => {
    clearTimeout(scrollTimerRef.current);
    clearTimeout(autoHideTimerRef.current);
    setBarVisible((v) => !v);
  }, []);

  const { onTouchStart, onTouchEnd } = useSwipeNav({
    onPrev: goPrev,
    onNext: goNext,
    hasPrev,
    hasNext,
  });

  const hasVideo = story.images.some((img) => img.movieUrl);
  const videoUrl = story.images.find((img) => img.movieUrl)?.movieUrl;
  const vid = videoUrl ? youtubeId(videoUrl.trim()) : null;

  const barClass = barVisible
    ? "opacity-100 translate-y-0"
    : "opacity-0 pointer-events-none translate-y-1";
  const barClassTop = barVisible
    ? "opacity-100 translate-y-0"
    : "opacity-0 pointer-events-none -translate-y-1";

  const titleId = `story-viewer-title-${story.id}`;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[70] flex flex-col bg-black"
    >
      {/* Outer dark gutter; inner shell grows on larger viewports */}
      <div className="absolute inset-0 mx-auto max-w-[480px] md:max-w-[560px] lg:max-w-[720px] flex flex-col bg-[#0a0612] shadow-2xl">
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#13101f]/95 backdrop-blur-md px-3 py-2 transition-all duration-200 ${barClassTop}`}
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
      >
        <button
          ref={closeBtnRef}
          onClick={goClose}
          aria-label="목록으로"
          className="shrink-0 rounded-lg p-2 text-white/70 hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1 px-2">
          <h2
            id={titleId}
            className="text-sm font-bold text-white/95 truncate text-center"
          >
            {story.subject}
          </h2>
          <p className="text-[11px] text-white/40 text-center">
            {formatDate(story.openDt)} · {yearLabel}
          </p>
        </div>
        <button
          onClick={toggleRead}
          aria-label={isRead ? "읽음 해제" : "읽음 표시"}
          aria-pressed={isRead}
          className={`shrink-0 rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
            isRead
              ? "text-[var(--color-brand)] bg-[var(--color-brand)]/15"
              : "text-white/55 hover:bg-white/10"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5 9-11"
              stroke="currentColor"
              strokeWidth={isRead ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          overflowX: zoom > 1 ? "auto" : "hidden",
          filter:
            brightness !== 100 ? `brightness(${brightness}%)` : undefined,
        }}
        onScroll={handleScroll}
        onClick={toggleBar}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {hasVideo && vid ? (
          <div
            className="p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${vid}`}
                className="h-full w-full"
                title={story.subject}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <div
            className={zoom === 1 ? "w-full" : ""}
            style={
              zoom > 1
                ? { width: `${zoom * 30}rem`, maxWidth: "none" }
                : undefined
            }
          >
            {story.images
              .filter((img) => isSafeImageUrl(img.imageUrl))
              .map((img, i) => (
                <WebtoonImage
                  key={`${story.id}-${i}`}
                  src={img.imageUrl}
                  alt={`${story.subject} - ${i + 1}`}
                  priority={i < 2}
                />
              ))}
          </div>
        )}

        {/* End CTA */}
        <div
          className="py-12 px-4 text-center space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {hasNext ? (
            <>
              <p className="text-xs text-white/40">다음 화</p>
              <button
                onClick={goNext}
                className="rounded-xl bg-[var(--color-brand)] px-6 py-3.5 text-sm font-medium text-white hover:bg-[var(--color-brand-strong)] transition-colors"
              >
                {next?.subject ?? "다음"} →
              </button>
            </>
          ) : (
            <p className="text-sm text-white/40">마지막 편입니다</p>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={goClose}
              className="rounded-lg bg-white/5 px-5 py-2 text-sm text-white/60 hover:bg-white/10"
            >
              목록으로
            </button>
            {isRead && (
              <span className="text-xs text-[var(--color-brand-soft)]/80">
                읽음 ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-[#13101f]/95 backdrop-blur-md transition-all duration-200 ${barClass}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[2px] bg-white/5">
          <div
            className="h-full bg-[var(--color-brand)] transition-[width] duration-150"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
        {siblings.length >= 2 && (
          <button
            onClick={() => setShowDrawer(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/5"
          >
            <span className="truncate">{yearLabel} 회차 목록</span>
            <span className="text-white/30">·</span>
            <span className="text-[var(--color-brand-soft)]/80 shrink-0">
              {idx + 1}/{siblings.length}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 9l-7 7-7-7"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div className="flex items-center justify-between px-2 pb-2">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="이전 화"
            className={`rounded-lg px-3 py-2.5 text-sm min-h-[44px] transition-colors ${
              hasPrev
                ? "bg-white/5 text-white/75 hover:bg-white/10"
                : "text-white/15 cursor-not-allowed"
            }`}
          >
            ← 이전
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings((v) => !v)}
              aria-label="밝기 설정"
              className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/55 hover:text-white/85 hover:bg-white/5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 2v3m0 14v3M4.93 4.93l2.12 2.12m9.9 9.9l2.12 2.12M2 12h3m14 0h3M4.93 19.07l2.12-2.12m9.9-9.9l2.12-2.12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {!hasVideo && (
              <button
                onClick={() =>
                  setZoomIdx((i) => (i + 1) % ZOOM_LEVELS.length)
                }
                aria-label={`확대 ${zoom}배`}
                className="rounded-lg px-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/55 hover:text-white/85 hover:bg-white/5 text-xs font-bold tabular-nums"
              >
                {zoom}×
              </button>
            )}
            <span className="text-[10px] text-white/35 tabular-nums w-9 text-center">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>
          <button
            onClick={goNext}
            disabled={!hasNext}
            aria-label="다음 화"
            className={`rounded-lg px-3 py-2.5 text-sm min-h-[44px] transition-colors ${
              hasNext
                ? "bg-white/5 text-white/75 hover:bg-white/10"
                : "text-white/15 cursor-not-allowed"
            }`}
          >
            다음 →
          </button>
        </div>
      </div>

      {viewerToast && (
        <div className="fixed top-16 left-0 right-0 z-[80] flex justify-center pointer-events-none">
          <div className="rounded-lg border border-white/10 bg-[#13101f]/95 backdrop-blur-md px-4 py-2 text-sm text-white/85 shadow-lg animate-fade-in">
            {viewerToast}
          </div>
        </div>
      )}

      {showDrawer && (
        <EpisodeDrawer
          yearLabel={yearLabel}
          episodes={siblings.slice().reverse()}
          currentId={story.id}
          readIds={readIds}
          onSelect={goJump}
          onClose={() => setShowDrawer(false)}
        />
      )}

      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
      </div>

      {/* Desktop-only gutter prev/next + help button — sits OUTSIDE the
          mobile-width container so it occupies the viewport gutters. */}
      <div className="hidden lg:flex pointer-events-none absolute inset-y-0 left-0 right-0 z-20 items-center justify-between">
        <div className="pointer-events-auto pl-4">
          {hasPrev ? (
            <button
              onClick={goPrev}
              aria-label="이전 화"
              title="이전 화 (←)"
              className="grid place-items-center w-14 h-28 rounded-2xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <span className="block w-14 h-28" aria-hidden />
          )}
        </div>
        <div className="pointer-events-auto pr-4 flex flex-col items-end gap-3">
          {hasNext ? (
            <button
              onClick={goNext}
              aria-label="다음 화"
              title="다음 화 (→)"
              className="grid place-items-center w-14 h-28 rounded-2xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <span className="block w-14 h-28" aria-hidden />
          )}
          <button
            onClick={() => setShowHelp(true)}
            aria-label="키보드 단축키"
            title="키보드 단축키 (?)"
            className="grid place-items-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white text-sm font-bold"
          >
            ?
          </button>
        </div>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 z-[80]"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="absolute w-60 rounded-xl bg-[#1a1530] border border-white/10 p-4 shadow-xl"
            style={{
              bottom: "calc(6.5rem + env(safe-area-inset-bottom, 0px))",
              right: "calc(50% - 240px + 1rem)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <label className="flex items-center justify-between text-xs text-white/55 mb-3">
              <span>밝기</span>
              <span className="text-white/35 tabular-nums">
                {brightness}%
              </span>
            </label>
            <input
              type="range"
              min={50}
              max={150}
              value={brightness}
              onChange={(e) => handleBrightness(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--color-brand)" }}
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>어둡게</span>
              <span>밝게</span>
            </div>
            {brightness !== 100 && (
              <button
                onClick={() => handleBrightness(100)}
                className="mt-3 w-full rounded-lg bg-white/5 py-1.5 text-xs text-white/55 hover:bg-white/10"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
