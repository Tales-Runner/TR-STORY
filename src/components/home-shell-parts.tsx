"use client";

import type React from "react";
import { formatDate, parseHashTags } from "@/lib/format";
import { STORY_CATEGORY, STORY_CATEGORY_LABEL } from "@/lib/types";
import type { StoryListItem } from "@/lib/types";
import type { SeriesCardData } from "@/lib/story-selectors";

const OFFICIAL_STORY_BASE = "https://tr.game.onstove.com/archive/trstory";

export function StatusToggle({
  active,
  onClick,
  accent,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent: "dark" | "amber";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const activeCls =
    accent === "amber"
      ? "bg-amber-400 text-white"
      : "bg-[var(--color-text)] text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium min-h-[32px] transition-colors ${
        active
          ? activeCls
          : "bg-[var(--color-surface-alt)] text-[var(--color-text-soft)] hover:bg-[var(--color-border)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function ViewTab({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative inline-flex items-baseline gap-1.5 px-4 py-2.5 text-sm font-bold transition-colors ${
        active
          ? "text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
      }`}
    >
      {children}
      <span
        className={`text-[11px] font-medium tabular-nums ${
          active ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"
        }`}
      >
        {count}
      </span>
      {active && (
        <span
          aria-hidden
          className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-[var(--color-text)]"
        />
      )}
    </button>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  const nonDefault = value !== "all";
  return (
    <div className="relative shrink-0">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-full pl-3 pr-7 py-1.5 text-xs font-medium min-h-[32px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-text)]/20 ${
          nonDefault
            ? "bg-[var(--color-text)] text-white"
            : "bg-[var(--color-surface-alt)] text-[var(--color-text-soft)] hover:bg-[var(--color-border)]"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        width="10"
        height="10"
        viewBox="0 0 16 16"
        fill="none"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const CATEGORY_BG: Record<number, string> = {
  1: "bg-[var(--color-brand)]",
  2: "bg-rose-500",
};

export function SeriesCard({
  data,
  onOpen,
}: {
  data: SeriesCardData;
  onOpen: () => void;
}) {
  const isVideo = data.sampleStory.category === STORY_CATEGORY.VIDEO;
  const readPct = data.totalCount
    ? Math.min(100, Math.round((data.readCount / data.totalCount) * 100))
    : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full text-left transition active:scale-[0.98]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-[var(--color-surface-alt)]">
        {data.latestThumbnail && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={data.latestThumbnail}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.04]"
          />
        )}
        {isVideo && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="ml-0.5 text-white"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
          {data.count}편
        </span>
        {readPct === 100 && (
          <span className="absolute top-2 right-2 rounded-full bg-[var(--color-brand)] px-1.5 py-0.5 text-[9px] font-bold text-white">
            완독
          </span>
        )}
        {readPct > 0 && readPct < 100 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/30"
            aria-hidden
          >
            <div
              className="h-full bg-[var(--color-brand)]"
              style={{ width: `${readPct}%` }}
            />
          </div>
        )}
      </div>
      <div className="pt-2 pb-1 px-0.5">
        <h3 className="text-[13px] font-bold leading-snug text-[var(--color-text)] line-clamp-2 min-h-[2.6em]">
          {data.label}
        </h3>
        <p
          className="mt-0.5 text-[11px] tabular-nums text-[var(--color-text-muted)]"
          aria-label={`${data.readCount} 읽음 / 총 ${data.totalCount} 편`}
        >
          {data.readCount > 0 ? (
            <span className="text-[var(--color-brand-strong)] font-semibold">
              {data.readCount}
            </span>
          ) : (
            <span>0</span>
          )}
          <span className="text-[var(--color-text-muted)]">
            {" "}
            / {data.totalCount}
          </span>
        </p>
      </div>
    </button>
  );
}

export function StoryRow({
  story,
  read,
  bookmark,
  favorite,
  progress,
  seriesLabel,
  seriesRead,
  seriesTotal,
  hideSeriesProgress,
  onToggleBookmark,
  onToggleFavorite,
}: {
  story: StoryListItem;
  read: boolean;
  bookmark: boolean;
  favorite: boolean;
  progress: number;
  seriesLabel: string | null;
  seriesRead: number;
  seriesTotal: number;
  hideSeriesProgress?: boolean;
  onToggleBookmark: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const label = STORY_CATEGORY_LABEL[story.category] ?? "기타";
  const tags = parseHashTags(story.hashTagSubject).filter(
    (t) => t !== "웹툰" && t !== "영상"
  );
  const showSeriesProgress =
    !hideSeriesProgress &&
    seriesLabel &&
    seriesTotal >= 2 &&
    seriesRead > 0;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const hasImages = story.hasImages;
  const fullHref = hasImages
    ? `${basePath}/stories/${story.id}/`
    : `${OFFICIAL_STORY_BASE}/${story.id}`;
  const isVideo = story.category === STORY_CATEGORY.VIDEO;
  return (
    <a
      href={fullHref}
      {...(!hasImages
        ? { target: "_blank", rel: "noreferrer noopener" }
        : null)}
      className={`relative flex gap-3 py-2 transition active:scale-[0.99] ${
        read ? "opacity-65" : ""
      }`}
    >
      <div className="relative w-[136px] h-[92px] shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-alt)]">
        {story.thumbnail && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={story.thumbnail}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className={`w-full h-full object-cover ${
              read ? "grayscale opacity-50" : ""
            }`}
          />
        )}
        {isVideo && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="ml-0.5 text-white"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </div>
        )}
        <span
          className={`absolute top-1.5 left-1.5 rounded-md text-white text-[10px] font-bold px-1.5 py-0.5 ${
            CATEGORY_BG[story.category] ?? "bg-slate-500"
          }`}
        >
          {label}
        </span>
        {!hasImages && (
          <span
            className="absolute bottom-1 left-1.5 rounded-md bg-black/55 px-1 py-[1px] text-[9px] font-bold text-white"
            title="이 회차는 공식 페이지에서만 볼 수 있어요"
          >
            ↗ 공식
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-2 pt-0.5">
        <h3
          className={`text-[15px] font-bold leading-snug line-clamp-2 mb-0.5 pr-14 ${
            read ? "text-[var(--color-text-soft)]" : "text-[var(--color-text)]"
          }`}
        >
          {story.subject}
        </h3>
        <p className="text-[12px] text-[var(--color-text-muted)] truncate">
          {tags.join(" · ") || " "}
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 tabular-nums">
          {formatDate(story.openDt)}
        </p>
        {showSeriesProgress && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 truncate max-w-[88px]">
              {seriesLabel}
            </span>
            <div
              className="flex-1 h-1 rounded-full bg-[var(--color-brand-soft)] overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={seriesTotal}
              aria-valuenow={seriesRead}
              aria-label={`${seriesLabel} 진행률 ${seriesRead}/${seriesTotal}`}
            >
              <div
                className="h-full bg-[var(--color-brand)]"
                style={{ width: `${(seriesRead / seriesTotal) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-brand-strong)] tabular-nums shrink-0 font-semibold">
              {seriesRead}/{seriesTotal}
            </span>
          </div>
        )}
      </div>

      <div className="absolute top-2 right-0 flex items-center">
        <button
          onClick={onToggleBookmark}
          aria-label={bookmark ? "책갈피 해제" : "책갈피"}
          aria-pressed={bookmark}
          title={bookmark ? "책갈피 해제" : "책갈피로 표시"}
          className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${
            bookmark
              ? "text-[var(--color-brand)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={bookmark ? "currentColor" : "none"}
          >
            <path
              d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={onToggleFavorite}
          aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기"}
          aria-pressed={favorite}
          title={favorite ? "즐겨찾기 해제" : "즐겨찾기"}
          className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${
            favorite
              ? "text-amber-500"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={favorite ? "currentColor" : "none"}
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {progress > 0.02 && progress < 0.99 && !read && (
        <div
          className="absolute left-0 top-[88px] w-[136px] h-[3px] bg-black/10 overflow-hidden rounded-b-lg"
          aria-hidden
        >
          <div
            className="h-full bg-[var(--color-brand)]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </a>
  );
}
