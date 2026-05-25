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
  const [viewerToast, setViewerToast] = useState<string | null>(null);
  const [isRead, setIsRead] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [showHelp, setShowHelp] = useState(false);
  // 첫 진입 시 nav 가 자동 숨김되는 순간, 화면 어디나 탭하면 다시 떠오른다는
  // 힌트를 짧게 표시. localStorage 로 한 번만 노출.
  const [tapHint, setTapHint] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setViewerToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setViewerToast(null), 1800);
  }, []);

  useBodyScrollLock(true);
  // Disable the outer focus trap while a nested dialog is open — otherwise
  // both traps register keydown listeners and the outer one cycles Tab
  // through the inner dialog's buttons too.
  useFocusTrap(!showDrawer && !showHelp, rootRef, closeBtnRef);

  useEffect(() => {
    let cancelled = false;
    db.stories.getAll().then((entries) => {
      if (cancelled) return;
      setReadIds(new Set(entries.filter((e) => e.readAt > 0).map((e) => e.id)));
      const cur = entries.find((e) => e.id === story.id);
      setIsRead(!!(cur && cur.readAt > 0));
      setIsFavorite(!!(cur && (cur.favoritedAt ?? 0) > 0));
      setIsBookmarked(!!(cur && (cur.bookmarkedAt ?? 0) > 0));
    });
    return () => {
      cancelled = true;
    };
  }, [story.id]);

  const favPendingRef = useRef(false);
  const toggleFavorite = useCallback(async () => {
    if (favPendingRef.current) return;
    favPendingRef.current = true;
    try {
      const next = await db.stories.toggleFavoriteAtomic(story.id);
      setIsFavorite(next);
      showToast(next ? "즐겨찾기 추가" : "즐겨찾기 해제");
    } finally {
      favPendingRef.current = false;
    }
  }, [story.id, showToast]);

  const bookmarkPendingRef = useRef(false);

  const handleMarkRead = useCallback(async () => {
    // Auto read-mark when scroll passes the threshold. Silent — no toast.
    // Read state is a history record, not a user-facing action.
    if (isRead) return;
    setIsRead(true);
    setReadIds((p) => new Set(p).add(story.id));
    await db.stories.markReadAtomic(story.id);
  }, [story.id, isRead]);

  const toggleBookmark = useCallback(async () => {
    if (bookmarkPendingRef.current) return;
    bookmarkPendingRef.current = true;
    try {
      const next = await db.stories.toggleBookmarkAtomic(story.id);
      setIsBookmarked(next);
      showToast(next ? "책갈피 추가" : "책갈피 해제");
    } finally {
      bookmarkPendingRef.current = false;
    }
  }, [story.id, showToast]);

  // Reset auto-hide timer on every story change so each navigation gets a
  // fresh hide cycle (was previously empty-deps → only fired once on mount).
  // setState is the intended sync to the new "story" external input.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBarVisible(true);
    autoHideTimerRef.current = setTimeout(() => {
      setBarVisible(false);
      // 처음 자동 숨김되는 순간, 한 번만 "탭하면 메뉴" 힌트 노출.
      try {
        if (localStorage.getItem("tr-story-viewer-tap-hint") !== "1") {
          setTapHint(true);
          localStorage.setItem("tr-story-viewer-tap-hint", "1");
          setTimeout(() => setTapHint(false), 2200);
        }
      } catch {}
    }, 2500);
    return () => clearTimeout(autoHideTimerRef.current);
  }, [story.id]);

  // Defensive cleanup: clear ALL viewer-owned timers on unmount so they
  // don't fire setState on an unmounted component after `goClose`.
  useEffect(() => {
    return () => {
      clearTimeout(scrollTimerRef.current);
      clearTimeout(autoHideTimerRef.current);
      clearTimeout(toastTimerRef.current);
    };
  }, []);

  const [resumePercent, setResumePercent] = useState<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 사용자가 직접 다루지 않아도 4초 후 자동 사라짐 — 노출은 충분히 했고
  // 본문 위에 띄워둔 채로 두면 시각 방해.
  useEffect(() => {
    if (resumePercent === null) return;
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setResumePercent(null), 4000);
    return () => clearTimeout(resumeTimerRef.current);
  }, [resumePercent]);

  // story.id 가 바뀌면 옛 resume prompt 도 초기화. useScrollRestore 가
  // 새 회차에서 진행률이 있다면 다시 onResumeFromPercent 호출함.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResumePercent(null);
  }, [story.id]);

  const handleResumeReset = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setResumePercent(null);
    clearTimeout(resumeTimerRef.current);
  }, []);

  const { scrollProgress, handleScroll: restoreHandleScroll } =
    useScrollRestore({
      storyId: story.id,
      scrollRef,
      onMarkRead: handleMarkRead,
      onResumeFromPercent: setResumePercent,
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
          {/* 스크롤 진행률에 따라 타이틀 페이드 — 첫 진입 시 또렷, 본문 진입
              후엔 ~40% 까지 부드럽게 흐려져 본문 몰입을 덜 방해. 사용자가
              bar 를 살릴 때(barVisible) 보이는 상태만 변경되므로 항상 정보
              접근 가능. */}
          <h2
            id={titleId}
            className="text-sm font-bold truncate text-center transition-opacity duration-300"
            style={{
              opacity: Math.max(0.4, 1 - scrollProgress * 1.2),
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {story.subject}
          </h2>
          <p className="text-[11px] text-white/40 text-center">
            {formatDate(story.openDt)} · {yearLabel}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={toggleFavorite}
            aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
            aria-pressed={isFavorite}
            title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
            className={`rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
              isFavorite
                ? "text-amber-400 bg-amber-400/15"
                : "text-white/55 hover:bg-white/10"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isFavorite ? "currentColor" : "none"}
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={toggleBookmark}
            aria-label={isBookmarked ? "책갈피 해제" : "책갈피"}
            aria-pressed={isBookmarked}
            title={isBookmarked ? "책갈피 해제" : "책갈피로 표시"}
            className={`rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
              isBookmarked
                ? "text-[var(--color-brand)] bg-[var(--color-brand)]/15"
                : "text-white/55 hover:bg-white/10"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isBookmarked ? "currentColor" : "none"}
            >
              <path
                d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar"
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
          <div className="w-full">
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
            <a
              href={`https://tr.game.onstove.com/archive/trstory/${story.id}`}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg bg-white/5 px-5 py-2 text-sm text-white/60 hover:bg-white/10 inline-flex items-center gap-1.5"
              title="STOVE 공식 페이지의 이 회차에서 댓글 보기"
            >
              공식 댓글
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            {isRead && (
              <span className="text-xs text-white/40">읽음</span>
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
        <div className="flex items-center justify-between px-2 pb-1.5">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="이전 화"
            className={`rounded-lg px-3 py-1.5 text-[13px] min-h-[40px] transition-colors ${
              hasPrev
                ? "text-white/80 hover:bg-white/10"
                : "text-white/15 cursor-not-allowed"
            }`}
          >
            ← 이전
          </button>
          <button
            onClick={goNext}
            disabled={!hasNext}
            aria-label="다음 화"
            className={`rounded-lg px-3 py-1.5 text-[13px] min-h-[40px] transition-colors ${
              hasNext
                ? "text-white/80 hover:bg-white/10"
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

      {tapHint && (
        <div
          className="fixed inset-x-0 bottom-24 z-[78] flex justify-center pointer-events-none"
          aria-hidden
        >
          <div className="rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-[12px] text-white/85 animate-tap-hint">
            화면을 탭하면 메뉴가 다시 떠요
          </div>
        </div>
      )}

      {resumePercent !== null && (
        <div className="fixed top-16 left-0 right-0 z-[75] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#13101f]/95 backdrop-blur-md px-3 py-2 text-sm text-white/85 shadow-lg animate-fade-in-up">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[var(--color-brand-soft)]"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 7v5l3 2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>
              {resumePercent}% 지점부터 이어 보는 중
            </span>
            <button
              onClick={handleResumeReset}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/85 hover:bg-white/20"
            >
              처음부터
            </button>
            <button
              onClick={() => setResumePercent(null)}
              aria-label="알림 닫기"
              className="rounded-md p-1 text-white/55 hover:text-white/85 hover:bg-white/10"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
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

      {/* Desktop-only help button in the right gutter. prev/next 는 하단
          nav 에 이미 있으니 거터엔 두지 않는다 (이전에 중복 노출이었음). */}
      <button
        onClick={() => setShowHelp(true)}
        aria-label="키보드 단축키"
        title="키보드 단축키 (?)"
        className="hidden lg:grid place-items-center absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white text-sm font-bold"
      >
        ?
      </button>

    </div>
  );
}
