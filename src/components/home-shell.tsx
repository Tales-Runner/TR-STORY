"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDate, parseHashTags } from "@/lib/format";
import { STORY_CATEGORY_LABEL } from "@/lib/types";
import type { StoryListItem } from "@/lib/types";
import { useReadStatus } from "@/lib/use-read-status";

interface YearGroup {
  label: string;
  items: StoryListItem[];
}

function rank(label: string): [number, string] {
  const m = label.match(/^(\d{4})/);
  if (m) return [0, m[1]];
  return [1, label];
}

function groupByYear(stories: StoryListItem[]): YearGroup[] {
  const map = new Map<string, StoryListItem[]>();
  for (const s of stories) {
    const arr = map.get(s.openYear) ?? [];
    arr.push(s);
    map.set(s.openYear, arr);
  }
  return [...map.entries()]
    .map(([label, items]) => ({
      label,
      items: items.slice().sort((a, b) => b.openDt.localeCompare(a.openDt)),
    }))
    .sort((a, b) => {
      const [ra, ka] = rank(a.label);
      const [rb, kb] = rank(b.label);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return kb.localeCompare(ka);
      return ka.localeCompare(kb);
    });
}

type SortOrder = "desc" | "asc";

const GENERIC_TAGS = new Set(["웹툰", "영상", ""]);

/** hashTagSubject 의 첫 번째 비-제네릭 태그를 시리즈 키로 사용. */
function seriesKey(story: StoryListItem): string | null {
  for (const t of story.hashTagSubject.split(",")) {
    const k = t.trim();
    if (k && !GENERIC_TAGS.has(k)) return k;
  }
  return null;
}

export function HomeShell({ stories }: { stories: StoryListItem[] }) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState(params.get("cat") ?? "all");
  const [yearFilter, setYearFilter] = useState<string>(
    params.get("year") ?? "all"
  );
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sort, setSort] = useState<SortOrder>("desc");

  const { readIds, progress, ready, toggleRead } = useReadStatus();

  const allGroups = useMemo(() => groupByYear(stories), [stories]);

  // 시리즈별 총편수 — 모든 스토리 기준 (필터와 무관).
  const seriesCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stories) {
      const k = seriesKey(s);
      if (!k) continue;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [stories]);

  const filtered = useMemo(() => {
    let list = stories;
    if (cat !== "all") {
      const c = Number(cat);
      list = list.filter((s) => s.category === c);
    }
    if (yearFilter !== "all") {
      list = list.filter((s) => s.openYear === yearFilter);
    }
    if (q.trim()) {
      const key = q.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.subject.toLowerCase().includes(key) ||
          s.hashTagSubject.toLowerCase().includes(key)
      );
    }
    if (unreadOnly && ready) {
      list = list.filter((s) => !readIds.has(s.id));
    }
    return list;
  }, [stories, cat, yearFilter, q, unreadOnly, readIds, ready]);

  const groups = useMemo(() => {
    const g = groupByYear(filtered);
    if (sort === "asc") {
      // 그룹 자체 + 그룹 내 회차 모두 오름차순(과거 → 최신).
      return g
        .slice()
        .reverse()
        .map((group) => ({
          ...group,
          items: group.items.slice().reverse(),
        }));
    }
    return g;
  }, [filtered, sort]);

  const handleToggleRead = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      toggleRead(id);
    },
    [toggleRead]
  );

  const yearChoices = allGroups.map((g) => g.label);

  return (
    <div className="mx-auto w-full max-w-[1280px] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-[var(--color-text)]"
          >
            <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white text-[11px] font-bold">
              TR
            </span>
            <span className="text-base">테런 스토리</span>
          </Link>
          <div className="ml-auto text-xs text-[var(--color-text-muted)]">
            {stories.length}편
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목·태그 검색"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] pl-9 pr-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 focus:bg-white"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
            >
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
              <path
                d="M14 14L17 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="검색어 지우기"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <FilterSelect
            value={cat}
            onChange={setCat}
            ariaLabel="카테고리"
            options={[
              { value: "all", label: "전체" },
              { value: "1", label: "웹툰" },
              { value: "2", label: "영상" },
            ]}
          />
          <FilterSelect
            value={yearFilter}
            onChange={setYearFilter}
            ariaLabel="연도"
            options={[
              { value: "all", label: "전체 연도" },
              ...yearChoices.map((y) => ({ value: y, label: y })),
            ]}
          />
          <button
            onClick={() =>
              setSort((s) => (s === "desc" ? "asc" : "desc"))
            }
            aria-label={sort === "desc" ? "최신순" : "오래된순"}
            aria-pressed={sort === "asc"}
            className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-2 text-xs font-medium text-[var(--color-text-soft)] hover:border-[var(--color-brand)]/40 min-h-[40px]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              {sort === "desc" ? (
                <path
                  d="M8 3v10M4 9l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M8 13V3M4 7l4-4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            {sort === "desc" ? "최신순" : "과거순"}
          </button>
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            aria-label="안 읽음만 보기"
            aria-pressed={unreadOnly}
            title="안 읽음만 보기"
            className={`shrink-0 grid place-items-center w-10 h-10 rounded-lg border transition-colors ${
              unreadOnly
                ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                : "bg-white text-[var(--color-text-soft)] border-[var(--color-border)] hover:border-[var(--color-brand)]/40"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              {!unreadOnly && (
                <path
                  d="M4 4l16 16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="px-4 pt-4">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-text-muted)]">
            조건에 맞는 결과가 없습니다.
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="mb-8">
              <h2 className="sticky top-[140px] z-20 -mx-4 mb-3 bg-white/95 backdrop-blur px-4 py-2 flex items-baseline gap-2 text-lg font-bold text-[var(--color-text)]">
                {g.label}
                <span className="text-xs font-normal text-[var(--color-text-muted)]">
                  {g.items.length}편
                </span>
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.map((s) => {
                  const read = readIds.has(s.id);
                  const prog = progress.get(s.id) ?? 0;
                  const sk = seriesKey(s);
                  const seriesTotal = sk ? seriesCounts.get(sk) ?? 0 : 0;
                  const seriesRead = sk
                    ? stories.reduce(
                        (acc, st) =>
                          seriesKey(st) === sk && readIds.has(st.id)
                            ? acc + 1
                            : acc,
                        0
                      )
                    : 0;
                  return (
                    <li key={s.id}>
                      <StoryRow
                        story={s}
                        read={read}
                        progress={prog}
                        seriesLabel={sk}
                        seriesRead={seriesRead}
                        seriesTotal={seriesTotal}
                        onToggleRead={(e) => handleToggleRead(e, s.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
        <p className="mt-12 mb-6 px-2 text-center text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          데이터 출처:{" "}
          <a
            href="https://tr.game.onstove.com/archive/trstory"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            테일즈런너 공식 라이브러리
          </a>
          .<br />
          본 사이트는 모바일 가독성을 위한 비공식 미러로, 모든 콘텐츠 권리는
          RHAON Entertainment 및 Blomics 에 있습니다.
        </p>
      </main>
    </div>
  );
}

function FilterSelect({
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
        className={`appearance-none rounded-lg border pl-3 pr-8 py-2 text-xs font-medium min-h-[40px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
          nonDefault
            ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border-[var(--color-brand)]/40"
            : "bg-white text-[var(--color-text-soft)] border-[var(--color-border)]"
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
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]"
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

function StoryRow({
  story,
  read,
  progress,
  seriesLabel,
  seriesRead,
  seriesTotal,
  onToggleRead,
}: {
  story: StoryListItem;
  read: boolean;
  progress: number;
  seriesLabel: string | null;
  seriesRead: number;
  seriesTotal: number;
  onToggleRead: (e: React.MouseEvent) => void;
}) {
  const label = STORY_CATEGORY_LABEL[story.category] ?? "기타";
  const tags = parseHashTags(story.hashTagSubject).filter(
    (t) => t !== "웹툰" && t !== "영상"
  );
  const showSeriesProgress =
    seriesLabel && seriesTotal >= 2 && seriesRead > 0;
  return (
    <Link
      href={`/stories/${story.id}`}
      prefetch
      className={`relative flex gap-3 rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden transition active:scale-[0.99] hover:border-[var(--color-brand)]/40 hover:shadow-sm ${
        read ? "opacity-70" : ""
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-[120px] h-[80px] shrink-0 bg-[var(--color-surface-alt)] overflow-hidden">
        {story.thumbnail && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={story.thumbnail}
            alt=""
            loading="lazy"
            className={`w-full h-full object-cover ${
              read ? "grayscale opacity-50" : ""
            }`}
          />
        )}
        <span
          className={`absolute top-1.5 left-1.5 rounded-md text-white text-[10px] font-bold px-1.5 py-0.5 ${
            CATEGORY_BG[story.category] ?? "bg-slate-500"
          }`}
        >
          {label}
        </span>
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0 py-3 pr-3">
        <p className="text-[11px] text-[var(--color-text-muted)] mb-0.5">
          {formatDate(story.openDt)}
        </p>
        <h3
          className={`text-sm font-bold leading-snug line-clamp-2 mb-1 ${
            read ? "text-[var(--color-text-soft)]" : "text-[var(--color-text)]"
          }`}
        >
          {story.subject}
        </h3>
        <p className="text-[11px] text-[var(--color-text-muted)] truncate">
          {tags.join(", ") || " "}
        </p>
        {showSeriesProgress && (
          <p className="mt-1 text-[10px] text-[var(--color-brand-strong)]">
            {seriesLabel} {seriesRead}/{seriesTotal}
          </p>
        )}
      </div>

      {/* Read toggle */}
      <button
        onClick={onToggleRead}
        aria-label={read ? "읽음 해제" : "읽음 표시"}
        aria-pressed={read}
        className={`shrink-0 self-stretch px-3 flex items-center transition-colors ${
          read
            ? "text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-brand)]"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5 9-11"
            stroke="currentColor"
            strokeWidth={read ? 2.5 : 1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Progress bar */}
      {progress > 0.02 && progress < 0.99 && !read && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-brand-soft)]"
          aria-hidden
        >
          <div
            className="h-full bg-[var(--color-brand)]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}
