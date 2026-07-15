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
  type SortOrder,
} from "@/lib/story-selectors";
import { BottomNav } from "./bottom-nav";
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
  // Avoid useSearchParams: it requires a Suspense boundary, and the
  // boundary noticeably delays hydration of the card grid — first-time
  // mobile visitors tapped cards and nothing happened because Link's
  // client-side router wasn't ready yet. Read query params once in an
  // effect instead.
  const [q, setQ] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  // 진행 중인 회차만 (스크롤 진행률 0.02~0.95 + 미완독).
  const [continueOnly, setContinueOnly] = useState(false);
  // 책갈피 표시한 회차만.
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const [sort, setSort] = useState<SortOrder>("desc");
  // 메인 화면 기본 보기는 "시리즈 카드" — 웹툰 앱 표준 패턴. 사용자가 "회차"
  // 탭을 누르면 기존의 연도별 회차 리스트를 본다. 시리즈 필터를 켜면 자연스럽게
  // 회차 뷰로 전환됨(applySheet 참고).
  const [view, setView] = useState<"series" | "episode">("series");
  const [showOnboarding, setShowOnboarding] = useState(false);

  // First-visit hint about the read/favorite buttons. Shown once,
  // dismissible. localStorage keeps the dismissal across sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dismissed =
        localStorage.getItem("tr-story-onboarding-dismissed") === "1";
      if (!dismissed) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowOnboarding(true);
      }
    } catch {}
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("tr-story-onboarding-dismissed", "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const qParam = sp.get("q");
    const yearParam = sp.get("year");
    const seriesParam = sp.get("series");
    // Loading URL query is an external-state sync at mount, not derived
    // state; suppress the overzealous in-effect-setState rule here.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (qParam !== null) setQ(qParam);
    if (yearParam !== null) setYearFilter(yearParam);
    if (seriesParam !== null) setSeriesFilter(seriesParam);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const {
    readIds,
    favoriteIds,
    bookmarkIds,
    progress,
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

  // "이어 읽기" 후보: 스크롤 진행은 있는데 아직 읽음 마킹 안 된 회차.
  // 최근에 본 것이 위에 오도록 progress 큰 순으로.
  const continueReading = useMemo(() => {
    if (!ready) return [];
    return getContinueReading(stories, progress, readIds, 6);
  }, [stories, progress, readIds, ready]);

  // 어떤 필터/검색도 적용 안 됐을 때만 "이어 읽기" 보여줌.
  const isFreshList =
    !q.trim() &&
    yearFilter === "all" &&
    seriesFilter === "all" &&
    !unreadOnly &&
    !continueOnly &&
    !bookmarkOnly;

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

  // 시리즈를 고르면 회차 순서대로 보는 게 자연스러우니 sort=asc + 회차 뷰 전환.
  // 풀면 다시 최신순으로.
  const handleSeriesFilter = useCallback((v: string) => {
    setSeriesFilter(v);
    if (v === "all") {
      setSort("desc");
    } else {
      setSort("asc");
      setView("episode");
    }
  }, []);

  const openSeries = useCallback((label: string) => {
    setSeriesFilter(label);
    setSort("asc");
    setView("episode");
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1280px] pb-28 md:pb-12">
      {/* Slim sticky header — 로고 + 검색 + 필터버튼 + 데스크탑 마이페이지 링크.
          연도/시리즈/정렬/안 읽음/즐겨찾기 5개는 FilterSheet 로 이동.
          본문 카드들이 borderless 라 header 도 underline 1 줄로만 분리. */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Link
            href="/"
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
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목·태그 검색"
              aria-label="제목·태그 검색"
              className="w-full rounded-full bg-[var(--color-surface-alt)] pl-9 pr-8 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--color-text)]/10"
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
                onClick={() => setQ("")}
                aria-label="검색어 지우기"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1"
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

        {/* 윗줄: 연도 / 시리즈 selects (좌측) + 정렬 (우측). */}
        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              <FilterSelect
                value={yearFilter}
                onChange={setYearFilter}
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
            onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
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
              onClick={() => {
                setContinueOnly((v) => !v);
                if (!continueOnly) {
                  setUnreadOnly(false);
                  setBookmarkOnly(false);
                }
              }}
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
              onClick={() => {
                setUnreadOnly((v) => !v);
                if (!unreadOnly) {
                  setContinueOnly(false);
                  setBookmarkOnly(false);
                }
              }}
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
              onClick={() => {
                setBookmarkOnly((v) => !v);
                if (!bookmarkOnly) {
                  setUnreadOnly(false);
                  setContinueOnly(false);
                }
              }}
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
              북마크
            </StatusToggle>
          </div>
        </div>

        {/* View tabs — 시리즈 / 회차. 네이버웹툰 식 underline 탭. */}
        <div className="flex items-end px-4 border-b border-[var(--color-border)]">
          <ViewTab
            active={view === "series"}
            onClick={() => setView("series")}
            count={seriesCards.length}
          >
            시리즈
          </ViewTab>
          <ViewTab
            active={view === "episode"}
            onClick={() => setView("episode")}
            count={filtered.length}
          >
            회차
          </ViewTab>
        </div>
      </header>

      {daysAgo(dataMeta.updatedAt) >= 30 && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12px] leading-snug text-amber-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M12 9v6M12 17.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div className="flex-1">
            데이터가 {relativeDays(dataMeta.updatedAt)} 기준입니다. 그동안
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

      {showOnboarding && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-[var(--color-brand-soft)] px-3 py-2.5 text-[12px] leading-snug text-[var(--color-brand-strong)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div className="flex-1">
            카드 우측의 <span className="font-bold">🔖 책갈피</span>로
            표시해두기, <span className="font-bold">★ 별</span>로 즐겨찾기.
            진행률은 자동 저장돼서 다시 들어가도 이어 읽기 가능.
          </div>
          <button
            onClick={dismissOnboarding}
            aria-label="안내 닫기"
            className="shrink-0 rounded-md px-2 py-0.5 text-[11px] text-[var(--color-brand-strong)]/70 hover:bg-white/50"
          >
            닫기
          </button>
        </div>
      )}

      {/* Body */}
      <main className="px-4 pt-4">
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

        {view === "series" ? (
          seriesCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-text-muted)]">
              조건에 맞는 시리즈가 없습니다.
            </div>
          ) : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-5">
              {seriesCards.map((sc) => (
                <li key={`series-${sc.label}`}>
                  <SeriesCard
                    data={sc}
                    onOpen={() => openSeries(sc.label)}
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

        <div className="mt-12 mb-6 px-2 text-center text-[11px] text-[var(--color-text-muted)] leading-relaxed space-y-2">
          <p>
            <span title={dataMeta.updatedAt}>
              마지막 데이터 갱신:{" "}
              <span className="font-semibold text-[var(--color-text-soft)]">
                {formatISODate(dataMeta.updatedAt)}
              </span>{" "}
              ({relativeDays(dataMeta.updatedAt)})
            </span>
            {daysAgo(dataMeta.updatedAt) >= 30 && (
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
