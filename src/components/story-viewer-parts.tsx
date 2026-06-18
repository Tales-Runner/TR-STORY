"use client";

import type { RefObject } from "react";
import type { StoryDetail, StoryListItem } from "@/lib/types";
import { formatDate, isSafeImageUrl, youtubeId } from "@/lib/format";
import { WebtoonImage } from "./webtoon-image";

export function ViewerTopBar({
  titleId,
  story,
  yearLabel,
  barClassTop,
  scrollProgress,
  closeBtnRef,
  onClose,
  isFavorite,
  onToggleFavorite,
  isBookmarked,
  onToggleBookmark,
}: {
  titleId: string;
  story: StoryDetail;
  yearLabel: string;
  barClassTop: string;
  scrollProgress: number;
  closeBtnRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  return (
    <div
      className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#13101f]/95 backdrop-blur-md px-3 py-2 transition-all duration-200 ${barClassTop}`}
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <button
        ref={closeBtnRef}
        onClick={onClose}
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
          className="text-sm font-bold truncate text-center"
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
          onClick={onToggleFavorite}
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
          onClick={onToggleBookmark}
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
  );
}

export function ViewerMedia({ story }: { story: StoryDetail }) {
  const hasVideo = story.images.some((img) => img.movieUrl);
  const videoUrl = story.images.find((img) => img.movieUrl)?.movieUrl;
  const vid = videoUrl ? youtubeId(videoUrl.trim()) : null;

  if (hasVideo && vid) {
    return (
      <div className="p-4" onClick={(e) => e.stopPropagation()}>
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
    );
  }

  return (
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
  );
}

export function ViewerSettingsPopover({
  brightness,
  onBrightnessChange,
  onResetBrightness,
  onClose,
}: {
  brightness: number;
  onBrightnessChange: (brightness: number) => void;
  onResetBrightness: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[79]" onClick={onClose}>
      <div
        className="absolute right-3 w-56 rounded-xl border border-white/10 bg-[#13101f] p-4 shadow-xl animate-scale-in"
        style={{
          bottom: "calc(7rem + env(safe-area-inset-bottom, 0px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <label className="mb-3 flex items-center justify-between text-xs text-white/55">
          <span>밝기</span>
          <span className="text-white/35 tabular-nums">{brightness}%</span>
        </label>
        <input
          type="range"
          min={50}
          max={150}
          value={brightness}
          onChange={(e) => onBrightnessChange(Number(e.target.value))}
          className="w-full accent-[var(--color-brand)]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-white/25">
          <span>어둡게</span>
          <span>밝게</span>
        </div>
        {brightness !== 100 && (
          <button
            onClick={onResetBrightness}
            className="mt-3 w-full rounded-lg bg-white/5 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}

export function ViewerEndCta({
  storyId,
  hasNext,
  nextSubject,
  isRead,
  onNext,
  onClose,
}: {
  storyId: number;
  hasNext: boolean;
  nextSubject?: string;
  isRead: boolean;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="py-12 px-4 text-center space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      {hasNext ? (
        <>
          <p className="text-xs text-white/40">다음 화</p>
          <button
            onClick={onNext}
            className="rounded-xl bg-[var(--color-brand)] px-6 py-3.5 text-sm font-medium text-white hover:bg-[var(--color-brand-strong)] transition-colors"
          >
            {nextSubject ?? "다음"} →
          </button>
        </>
      ) : (
        <p className="text-sm text-white/40">마지막 편입니다</p>
      )}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onClose}
          className="rounded-lg bg-white/5 px-5 py-2 text-sm text-white/60 hover:bg-white/10"
        >
          목록으로
        </button>
        <a
          href={`https://tr.game.onstove.com/archive/trstory/${storyId}`}
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
        {isRead && <span className="text-xs text-white/40">읽음</span>}
      </div>
    </div>
  );
}

export function ViewerBottomBar({
  barClass,
  scrollProgress,
  siblings,
  yearLabel,
  index,
  hasPrev,
  hasNext,
  zoom,
  canZoom,
  onOpenDrawer,
  onPrev,
  onNext,
  onOpenSettings,
  onToggleZoom,
}: {
  barClass: string;
  scrollProgress: number;
  siblings: StoryListItem[];
  yearLabel: string;
  index: number;
  hasPrev: boolean;
  hasNext: boolean;
  zoom: number;
  canZoom: boolean;
  onOpenDrawer: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenSettings: () => void;
  onToggleZoom: () => void;
}) {
  return (
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
          onClick={onOpenDrawer}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/5"
        >
          <span className="truncate">{yearLabel} 회차 목록</span>
          <span className="text-white/30">·</span>
          <span className="text-[var(--color-brand-soft)]/80 shrink-0">
            {index + 1}/{siblings.length}
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
          onClick={onPrev}
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
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            aria-label="뷰어 설정"
            title="밝기 설정"
            className="rounded-lg p-2 text-white/55 min-h-[40px] min-w-[40px] transition-colors hover:bg-white/10 hover:text-white/80"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </button>
          {canZoom && (
            <button
              onClick={onToggleZoom}
              aria-label="확대 비율 변경"
              title="확대"
              className="rounded-lg px-2 py-1.5 text-[12px] font-bold text-white/60 min-h-[40px] min-w-[44px] tabular-nums transition-colors hover:bg-white/10 hover:text-white/85"
            >
              {zoom}x
            </button>
          )}
        </div>
        <button
          onClick={onNext}
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
  );
}

export function ViewerToast({ message }: { message: string }) {
  return (
    <div className="fixed top-16 left-0 right-0 z-[80] flex justify-center pointer-events-none">
      <div className="rounded-lg border border-white/10 bg-[#13101f]/95 backdrop-blur-md px-4 py-2 text-sm text-white/85 shadow-lg animate-fade-in">
        {message}
      </div>
    </div>
  );
}

export function TapHint() {
  return (
    <div
      className="fixed inset-x-0 bottom-24 z-[78] flex justify-center pointer-events-none"
      role="status"
    >
      <div className="rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-[12px] text-white/85 animate-tap-hint">
        화면을 탭하면 메뉴가 다시 떠요
      </div>
    </div>
  );
}

export function ResumeBanner({
  resumePercent,
  onReset,
  onDismiss,
  onHoldChange,
}: {
  resumePercent: number;
  onReset: () => void;
  onDismiss: () => void;
  onHoldChange: (hold: boolean) => void;
}) {
  return (
    <div className="fixed top-16 left-0 right-0 z-[75] flex justify-center px-4 pointer-events-none">
      <div
        className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#13101f]/95 backdrop-blur-md px-3 py-2 text-sm text-white/85 shadow-lg animate-fade-in-up"
        onPointerEnter={() => onHoldChange(true)}
        onPointerLeave={() => onHoldChange(false)}
        onFocusCapture={() => onHoldChange(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            onHoldChange(false);
          }
        }}
      >
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
        <span>{resumePercent}% 지점부터 이어 보는 중</span>
        <button
          onClick={onReset}
          className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/85 hover:bg-white/20"
        >
          처음부터
        </button>
        <button
          onClick={onDismiss}
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
  );
}

export function ViewerHelpButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="키보드 단축키"
      title="키보드 단축키 (?)"
      className="hidden lg:grid place-items-center absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white text-sm font-bold"
    >
      ?
    </button>
  );
}
