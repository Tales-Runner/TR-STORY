"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryDetail, StoryListItem } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useDocumentKeydown } from "@/lib/use-document-keydown";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useSwipeNav } from "@/lib/use-swipe-nav";
import { EpisodeDrawer } from "./episode-drawer";
import { KeyboardHelp } from "./keyboard-help";
import { useScrollRestore } from "./use-scroll-restore";
import { useResumePrompt } from "./use-resume-prompt";
import { useStoryViewerStatus } from "./use-story-viewer-status";
import { useViewerToast } from "./use-viewer-toast";
import {
  ResumeBanner,
  TapHint,
  ViewerBottomBar,
  ViewerEndCta,
  ViewerHelpButton,
  ViewerMedia,
  ViewerToast,
  ViewerTopBar,
} from "./story-viewer-parts";

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
  const [showHelp, setShowHelp] = useState(false);
  // 첫 진입 시 nav 가 자동 숨김되는 순간, 화면 어디나 탭하면 다시 떠오른다는
  // 힌트를 짧게 표시. localStorage 로 한 번만 노출.
  const [tapHint, setTapHint] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tapHintTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { viewerToast, showToast } = useViewerToast();
  const {
    isRead,
    isFavorite,
    isBookmarked,
    readIds,
    handleMarkRead,
    toggleFavorite,
    toggleBookmark,
  } = useStoryViewerStatus({ storyId: story.id, showToast });

  useBodyScrollLock(true);
  // Disable the outer focus trap while a nested dialog is open — otherwise
  // both traps register keydown listeners and the outer one cycles Tab
  // through the inner dialog's buttons too.
  useFocusTrap(!showDrawer && !showHelp, rootRef, closeBtnRef);

  // Reset auto-hide timer on every story change so each navigation gets a
  // fresh hide cycle (was previously empty-deps → only fired once on mount).
  // setState is the intended sync to the new "story" external input.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBarVisible(true);
    autoHideTimerRef.current = setTimeout(() => {
      setBarVisible(false);
      // 처음 자동 숨김되는 순간, 한 번만 "탭하면 메뉴" 힌트 노출. 안쪽 타이머도
      // ref 에 기록해서 unmount cleanup 에서 같이 정리(leak 방지).
      try {
        if (localStorage.getItem("tr-story-viewer-tap-hint") !== "1") {
          setTapHint(true);
          localStorage.setItem("tr-story-viewer-tap-hint", "1");
          tapHintTimerRef.current = setTimeout(() => setTapHint(false), 2200);
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
      clearTimeout(tapHintTimerRef.current);
    };
  }, []);

  const {
    resumePercent,
    setResumePercent,
    handleResumeReset,
    dismissResume,
    setResumeHoldOpen,
  } = useResumePrompt({ storyId: story.id, scrollRef });

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
        <ViewerTopBar
          titleId={titleId}
          story={story}
          yearLabel={yearLabel}
          barClassTop={barClassTop}
          scrollProgress={scrollProgress}
          closeBtnRef={closeBtnRef}
          onClose={goClose}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggleBookmark}
        />

        {/* Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain no-scrollbar"
          onScroll={handleScroll}
          onClick={toggleBar}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <ViewerMedia story={story} />
          <ViewerEndCta
            storyId={story.id}
            hasNext={hasNext}
            nextSubject={next?.subject}
            isRead={isRead}
            onNext={goNext}
            onClose={goClose}
          />
        </div>

        <ViewerBottomBar
          barClass={barClass}
          scrollProgress={scrollProgress}
          siblings={siblings}
          yearLabel={yearLabel}
          index={idx}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onOpenDrawer={() => setShowDrawer(true)}
          onPrev={goPrev}
          onNext={goNext}
        />

        {viewerToast && <ViewerToast message={viewerToast} />}

        {tapHint && <TapHint />}

        {resumePercent !== null && (
          <ResumeBanner
            resumePercent={resumePercent}
            onReset={handleResumeReset}
            onDismiss={dismissResume}
            onHoldChange={setResumeHoldOpen}
          />
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
      <ViewerHelpButton onOpen={() => setShowHelp(true)} />

    </div>
  );
}
