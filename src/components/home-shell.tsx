"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { dataMeta } from "@/lib/api";
import {
  formatISODate,
  daysAgo,
  relativeDays,
} from "@/lib/format";
import type { StoryListItem } from "@/lib/types";
import { useReadStatus } from "@/lib/use-read-status";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { seriesLabel } from "@/lib/series";
import {
  filterStories,
  getContinueReading,
  getSeriesCards,
  getSeriesChoices,
  getSeriesCounts,
  getSeriesReadCounts,
  groupByYear,
  groupVisibleStories,
  type SeriesCardData,
} from "@/lib/story-selectors";
import { BottomNav } from "./bottom-nav";
import { useHomeFilters } from "@/lib/use-home-filters";
import { useClientNow } from "@/lib/use-client-now";
import { readListReturn, rememberList } from "@/lib/list-navigation";
import {
  FilterSelect,
  SeriesCard,
  StatusToggle,
  StoryRow,
  ViewTab,
} from "./home-shell-parts";

/** 무한 스크롤 페이지 크기 — 모바일 첫 화면에 ~2~3 줄이 보이도록. */
const PAGE_SIZE = 12;

export function HomeShell({ stories }: { stories: StoryListItem[] }) {
  const { filters, update, loaded: filtersLoaded } = useHomeFilters();
  const { q, year: yearFilter, series: seriesFilter, sort, view } = filters;
  const unreadOnly = filters.status === "unread";
  const continueOnly = filters.status === "continue";
  const bookmarkOnly = filters.status === "bookmark";
  const now = useClientNow();
  const [showFilters, setShowFilters] = useState(false);


  const {
    readIds,
    favoriteIds,
    bookmarkIds,
    progress,
    lastReadAt,
    ready,
    toggleFavorite,
    toggleBookmark,
  } = useReadStatus();

  const allGroups = useMemo(() => groupByYear(stories), [stories]);

  // 시리즈별 총편수 / 읽은 편수 — 모든 스토리 기준 (필터와 무관).
  const seriesCounts = useMemo(() => getSeriesCounts(stories), [stories]);
  const seriesReadCounts = useMemo(
    () => getSeriesReadCounts(stories, readIds),
    [stories, readIds]
  );

  // 검색어는 200ms 디바운스 — 키 입력마다 198편 전체 재필터링하면 모바일에서
  // 체감 끊김이 생긴다. (즉시 반응성이 필요한 셀렉트 필터는 디바운스 안 함.)
  const debouncedQ = useDebouncedValue(q, 200);

  const filtered = useMemo(
    () =>
      filterStories({
        stories,
        yearFilter,
        seriesFilter,
        query: debouncedQ,
        unreadOnly,
        continueOnly,
        bookmarkOnly,
        ready,
        readIds,
        bookmarkIds,
        progress,
      }),
    [
      stories,
      yearFilter,
      seriesFilter,
      debouncedQ,
      unreadOnly,
      continueOnly,
      bookmarkOnly,
      ready,
      readIds,
      bookmarkIds,
      progress,
    ]
  );

  // ── 시리즈 카드 ────────────────────────────────────────────────────
  // 시리즈 뷰는 filtered 결과를 시리즈로 묶어서 보여줌 — 필터(카테고리/연도/검색/
  // 안 읽음/즐겨찾기)가 그대로 시리즈 단위로 전파됨. 즉 "웹툰만 + 안 읽음" =
  // 안 읽은 웹툰 회차가 1편이라도 있는 시리즈들. 대표 이미지는 그 시리즈의
  // (filtered 안에서) 가장 최신 회차 썸네일. 시리즈 라벨이 없는 회차는 "기타"
  // 버킷으로 묶음.
  const seriesCards = useMemo<SeriesCardData[]>(
    () => getSeriesCards({ filtered, seriesCounts, seriesReadCounts, sort }),
    [filtered, seriesCounts, seriesReadCounts, sort]
  );

  // ── Infinite scroll (회차 뷰 전용) ──────────────────────────────────
  // 필터 결과 중 PAGE_SIZE 씩 증가시키며 노출. 필터/검색이 바뀌면 visibleCount 를
  // 다시 PAGE_SIZE 로 리셋한다 (다른 필터 결과를 끝까지 펼친 상태에서 위에 머무
  // 르면 어색하므로). render-phase setState 로 동기화 (effect 한 프레임 늦으면
  // 이전 필터 카드들이 잠깐 깜빡임).
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prevFilterKey, setPrevFilterKey] = useState("");
  const filterKey = `${yearFilter}|${seriesFilter}|${debouncedQ}|${unreadOnly}|${continueOnly}|${bookmarkOnly}|${sort}`;
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  // 시리즈 뷰에서는 28개 안팎이라 페이징이 의미 없음 — 회차 뷰일 때만 hasMore.
  const hasMore = view === "episode" && visibleCount < filtered.length;
  const sentinelRef = useRef<HTMLDivElement>(null);
  // visibleCount 를 deps 에 포함시키는 게 중요. 데스크탑 3-col 그리드에서는 한
  // 배치(12장)가 ~320px 만 늘어나는데 rootMargin 이 600px 라 sentinel 이 한 번
  // 트리거된 뒤에도 여전히 intersecting 상태 — 같은 상태가 유지되면 콜백이
  // 다시 안 불려서 "평생 스피너" 가 됨. 매 배치마다 observer 를 재생성하면
  // observe() 가 초기 상태를 다시 fire 해 sentinel 이 화면에 보이는 동안엔
  // 연쇄적으로 다음 배치들을 로드해준다 (hasMore=false 되면 자동 정지).
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((v) => v + PAGE_SIZE);
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  // Unfinished episodes, ordered by the most recent reading checkpoint.
  const continueReading = useMemo(() => {
    if (!ready) return [];
    return getContinueReading(stories, progress, lastReadAt, 3);
  }, [stories, progress, lastReadAt, ready]);

  // 어떤 필터/검색도 적용 안 됐을 때만 "이어 읽기" 보여줌.
  const isFreshList =
    !q.trim() &&
    yearFilter === "all" &&
    seriesFilter === "all" &&
    !unreadOnly &&
    !continueOnly &&
    !bookmarkOnly;

  const resetFilters = () => update({ q: "", year: "all", series: "all", status: "all", sort: "desc" }, true);

  // 시리즈 옵션: 데이터에서 자동 추출 + 가장 최근 회차 기준 내림차순.
  // "캐릭터 스토리" 는 단편 모음(서로 다른 캐릭터별 1~3편) 이라 다른 시리즈와
  // 같은 축으로 정렬하면 어색하다 — 항상 맨 뒤 sentinel 로 강제.
  const seriesChoices = useMemo(() => getSeriesChoices(stories), [stories]);

  const groups = useMemo(() => {
    return groupVisibleStories(filtered, sort, visibleCount);
  }, [filtered, sort, visibleCount]);

  const handleToggleBookmark = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      toggleBookmark(id);
    },
    [toggleBookmark]
  );

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(id);
    },
    [toggleFavorite]
  );

  const yearChoices = allGroups.map((g) => g.label);

  const handleSeriesFilter = useCallback((value: string) => {
    update({ series: value, sort: value === "all" ? "desc" : "asc",
      view: value === "all" ? "series" : "episode" }, true);
  }, [update]);

  useEffect(() => {
    if (!filtersLoaded) return;
    const saved = readListReturn();
    if (saved?.href === window.location.pathname + window.location.search) {
      // Restore the expanded episode list before its scroll offset.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleCount(Math.max(PAGE_SIZE, Math.min(stories.length, saved.visibleCount)));
    }
  }, [filtersLoaded, stories.length]);

  const restoredList = useRef(false);
  useEffect(() => {
    if (!filtersLoaded || !ready || restoredList.current) return;
    const saved = readListReturn();
    if (!saved || saved.href !== window.location.pathname + window.location.search) return;
    if (view === "episode" && visibleCount < Math.min(filtered.length, saved.visibleCount)) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, saved.scrollY);
      restoredList.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [filtersLoaded, ready, visibleCount, filtered.length, view]);

  const selectedSeries = seriesFilter === "all" ? [] : stories
    .filter((story) => seriesLabel(story) === seriesFilter)
    .sort((a, b) => a.openDt.localeCompare(b.openDt) || a.id - b.id);
  const firstEpisode = selectedSeries.find((story) => story.hasImages);
  const resumeEpisode = getContinueReading(selectedSeries, progress, lastReadAt, 1)[0];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <div className="mx-auto w-full max-w-[1280px] pb-28 md:pb-12"
      onClickCapture={(event) => {
        const link = (event.target as Element).closest("a");
        if (link?.getAttribute("href")?.startsWith(basePath + "/stories/")) rememberList(visibleCount);
      }}>
      {/* Search and view switch stay visible; secondary filters expand on demand. */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-2 font-bold text-[var(--color-text)] shrink-0"
          >
            <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white text-[11px] font-bold">
              TR
            </span>
            <span className="text-base hidden xs:inline sm:inline">테런 스토리</span>
          </Link>

          {/* Search input — borderless, surface-tinted background */}
          <div className="relative flex-1 min-w-0">
            <input
              type="search"
              value={q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="제목·태그 검색"
              aria-label="제목·태그 검색"
              className="w-full rounded-full bg-[var(--color-surface-alt)] pl-9 pr-12 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--color-text)]/10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              width="14"
              height="14"
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
                onClick={() => update({ q: "" })}
                aria-label="검색어 지우기"
                className="absolute right-0 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
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

          {/* Desktop-only 마이페이지 링크 — 모바일은 BottomNav 가 담당 */}
          <Link
            href="/me/"
            prefetch={false}
            title="내 책갈피 · 읽은 회차 모아보기"
            className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-soft)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M4 21c0-4 4-7 8-7s8 3 8 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            마이페이지
          </Link>
        </div>

        <div id="home-filters" hidden={!showFilters}>
        {/* Secondary filters expand on demand. */}
        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              <FilterSelect
                value={yearFilter}
                onChange={(year) => update({ year })}
                ariaLabel="연도"
                options={[
                  { value: "all", label: "전체 연도" },
                  ...yearChoices.map((y) => ({ value: y, label: y })),
                ]}
              />
              <FilterSelect
                value={seriesFilter}
                onChange={handleSeriesFilter}
                ariaLabel="시리즈"
                options={[
                  { value: "all", label: "전체 시리즈" },
                  ...seriesChoices.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => update({ sort: sort === "desc" ? "asc" : "desc" })}
            aria-pressed={sort === "asc"}
            title={
              sort === "desc"
                ? "최신순 (눌러서 과거순)"
                : "과거순 (눌러서 최신순)"
            }
            className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-text-soft)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] min-h-[32px]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
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
        </div>

        {/* 아랫줄: 상태 토글 — 이어 읽기 / 안 읽음 / 북마크. 셋은 서로 배타. */}
        <div className="px-3 pb-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            <StatusToggle
              active={continueOnly}
              onClick={() => update({ status: filters.status === "continue" ? "all" : "continue" })}
              accent="dark"
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M2 6c4-1 6 0 10 2 4-2 6-3 10-2v13c-4-1-6 0-10 2-4-2-6-3-10-2V6zM12 8v13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              이어 읽기
            </StatusToggle>
            <StatusToggle
              active={unreadOnly}
              onClick={() => update({ status: filters.status === "unread" ? "all" : "unread" })}
              accent="dark"
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
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
              }
            >
              안 읽음
            </StatusToggle>
            <StatusToggle
              active={bookmarkOnly}
              onClick={() => update({ status: filters.status === "bookmark" ? "all" : "bookmark" })}
              accent="dark"
              icon={
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill={bookmarkOnly ? "currentColor" : "none"}
                >
                  <path
                    d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              책갈피
            </StatusToggle>
          </div>
        </div>

        </div>
        {/* View tabs */}
        <div className="flex items-end px-4 border-b border-[var(--color-border)]">
          <ViewTab
            active={view === "series"}
            onClick={() => update({ view: "series", series: "all" }, true)}
            count={seriesCards.length}
          >
            시리즈
          </ViewTab>
          <ViewTab
            active={view === "episode"}
            onClick={() => update({ view: "episode" }, true)}
            count={filtered.length}
          >
            회차
          </ViewTab>
          <button type="button" aria-expanded={showFilters} aria-controls="home-filters"
            onClick={() => setShowFilters((shown) => !shown)}
            className="ml-auto min-h-11 px-3 text-sm text-[var(--color-text-soft)]">
            {showFilters ? "필터 닫기" : "필터"}{(yearFilter !== "all" || seriesFilter !== "all" || filters.status !== "all") && " · 적용 중"}
          </button>
        </div>
      </header>

      {now !== null && daysAgo(dataMeta.updatedAt, now) >= 30 && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12px] leading-snug text-amber-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M12 9v6M12 17.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div className="flex-1">
            데이터가 {relativeDays(dataMeta.updatedAt, now ?? 0)} 기준입니다. 그동안
            새로 올라온 회차는 빠져 있을 수 있어요.{" "}
            <a
              href="https://tr.game.onstove.com/archive/trstory"
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              공식 페이지에서 확인 →
            </a>
          </div>
        </div>
      )}

      {/* Body */}
      <main className="px-4 pt-4">
        {seriesFilter === "all" && <section className="mb-5 space-y-2">
          <h1 className="text-xl font-bold">테일즈런너 웹툰</h1>
          <p className="text-sm leading-relaxed text-[var(--color-text-soft)]">
            웹툰·영상 {stories.length}편
          </p>
        </section>}
        {seriesFilter !== "all" && (
          <section aria-label="선택한 시리즈" className="mb-6 space-y-3 border-b border-[var(--color-border)] pb-5">
            <button onClick={() => update({ series: "all", view: "series", sort: "desc" }, true)}
              className="min-h-11 text-sm text-[var(--color-text-soft)]">← 전체 시리즈</button>
            <h1 className="text-2xl font-bold">{seriesFilter}</h1>
            <p className="text-sm text-[var(--color-text-soft)]">
              총 {selectedSeries.length}편 · {seriesReadCounts.get(seriesFilter) ?? 0}편 읽음
            </p>
            <div className="flex flex-wrap gap-2">
              {resumeEpisode && <Link href={"/stories/" + resumeEpisode.id + "/"}
                className="rounded-lg bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white">
                이어 읽기 · {Math.round((progress.get(resumeEpisode.id) ?? 0) * 100)}%
              </Link>}
              {firstEpisode && <Link href={"/stories/" + firstEpisode.id + "/?start=1"}
                className="rounded-lg bg-[var(--color-brand-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-brand-strong)]">
                처음부터 읽기
              </Link>}
            </div>
          </section>
        )}
        {isFreshList && continueReading.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-baseline gap-2 text-lg font-bold text-[var(--color-text)]">
              이어 읽기
              <span className="text-xs font-normal text-[var(--color-text-muted)]">
                {continueReading.length}편
              </span>
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-4 divide-y divide-[var(--color-border)] sm:divide-y-0">
              {continueReading.map((s) => {
                const read = readIds.has(s.id);
                const prog = progress.get(s.id) ?? 0;
                const sk = seriesLabel(s);
                const seriesTotal = sk ? seriesCounts.get(sk) ?? 0 : 0;
                const seriesRead = sk ? seriesReadCounts.get(sk) ?? 0 : 0;
                return (
                  <li key={`continue-${s.id}`}>
                    <StoryRow
                      story={s}
                      read={read}
                      bookmark={bookmarkIds.has(s.id)}
                      favorite={favoriteIds.has(s.id)}
                      progress={prog}
                      seriesLabel={sk}
                      seriesRead={seriesRead}
                      seriesTotal={seriesTotal}
                      hideSeriesProgress={seriesFilter !== "all"}
                      onToggleBookmark={(e) =>
                        handleToggleBookmark(e, s.id)
                      }
                      onToggleFavorite={(e) =>
                        handleToggleFavorite(e, s.id)
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!isFreshList && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p role="status" className="text-[var(--color-text-soft)]">
            {debouncedQ.trim() ? `‘${debouncedQ.trim()}’ 검색 결과 · ` : "필터 결과 · "}
            {view === "series" ? `${seriesCards.length}개 시리즈` : `${filtered.length}편`}
          </p>
          <button type="button" onClick={resetFilters} className="min-h-11 px-3 font-medium text-[var(--color-brand-strong)]">
            검색·필터 초기화
          </button>
        </div>}

        {view === "series" ? (
          seriesCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-text-muted)]">
              조건에 맞는 시리즈가 없습니다.
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-5">
              {seriesCards.map((sc) => (
                <li key={`series-${sc.label}`}>
                  <SeriesCard
                    data={sc}
                  />
                </li>
              ))}
            </ul>
          )
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-text-muted)]">
            조건에 맞는 결과가 없습니다.
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="mb-6">
              <h2 className="mb-1 flex items-baseline gap-2 text-[15px] font-bold text-[var(--color-text-soft)]">
                {g.label}
                <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                  {g.items.length}
                </span>
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-4 divide-y divide-[var(--color-border)] sm:divide-y-0">
                {g.items.map((s) => {
                  const read = readIds.has(s.id);
                  const prog = progress.get(s.id) ?? 0;
                  const sk = seriesLabel(s);
                  const seriesTotal = sk ? seriesCounts.get(sk) ?? 0 : 0;
                  const seriesRead = sk ? seriesReadCounts.get(sk) ?? 0 : 0;
                  return (
                    <li key={s.id}>
                      <StoryRow
                        story={s}
                        read={read}
                        bookmark={bookmarkIds.has(s.id)}
                        favorite={favoriteIds.has(s.id)}
                        progress={prog}
                        seriesLabel={sk}
                        seriesRead={seriesRead}
                        seriesTotal={seriesTotal}
                        hideSeriesProgress={seriesFilter !== "all"}
                        onToggleBookmark={(e) =>
                          handleToggleBookmark(e, s.id)
                        }
                        onToggleFavorite={(e) =>
                          handleToggleFavorite(e, s.id)
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {hasMore && (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center py-8"
            aria-hidden
          >
            <span className="h-5 w-5 rounded-full border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] animate-spin" />
          </div>
        )}

        <div className="mt-12 mb-6 px-2 text-center text-xs text-[var(--color-text-soft)] leading-relaxed space-y-2">
          <p>
            <span title={dataMeta.updatedAt}>
              마지막 데이터 갱신:{" "}
              <span className="font-semibold text-[var(--color-text-soft)]">
                {formatISODate(dataMeta.updatedAt)}
              </span>{" "}
              {now !== null && "(" + relativeDays(dataMeta.updatedAt, now) + ")"}
            </span>
            {now !== null && daysAgo(dataMeta.updatedAt, now) >= 30 && (
              <>
                {" · "}
                <a
                  href="https://tr.game.onstove.com/archive/trstory"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-amber-600"
                >
                  공식 페이지에서 최신 회차 확인 →
                </a>
              </>
            )}
          </p>
          <p>
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
            본 사이트는 모바일 가독성을 위한 비공식 미러로, 모든 콘텐츠
            권리는 RHAON Entertainment 및 Blomics 에 있습니다.
          </p>
          <p>
            <Link
              href="/privacy"
              className="underline text-[var(--color-text-soft)] hover:text-[var(--color-brand)]"
            >
              개인정보 처리 안내
            </Link>
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
