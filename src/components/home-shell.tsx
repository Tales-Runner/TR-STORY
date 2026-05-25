"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { dataMeta } from "@/lib/api";
import {
  formatDate,
  formatISODate,
  daysAgo,
  relativeDays,
  parseHashTags,
} from "@/lib/format";
import { STORY_CATEGORY, STORY_CATEGORY_LABEL } from "@/lib/types";
import type { StoryListItem } from "@/lib/types";
import { useReadStatus } from "@/lib/use-read-status";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { seriesLabel, SERIES_REPRESENTATIVE_ID } from "@/lib/series";
import { BottomNav } from "./bottom-nav";

/** 무한 스크롤 페이지 크기 — 모바일 첫 화면에 ~2~3 줄이 보이도록. */
const PAGE_SIZE = 12;
const OFFICIAL_STORY_BASE = "https://tr.game.onstove.com/archive/trstory";

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

export function HomeShell({ stories }: { stories: StoryListItem[] }) {
  // Avoid useSearchParams: it requires a Suspense boundary, and the
  // boundary noticeably delays hydration of the card grid — first-time
  // mobile visitors tapped cards and nothing happened because Link's
  // client-side router wasn't ready yet. Read query params once in an
  // effect instead.
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
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
    const catParam = sp.get("cat");
    const yearParam = sp.get("year");
    const seriesParam = sp.get("series");
    // Loading URL query is an external-state sync at mount, not derived
    // state; suppress the overzealous in-effect-setState rule here.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (qParam !== null) setQ(qParam);
    if (catParam !== null) setCat(catParam);
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

  // 시리즈별 총편수 — 모든 스토리 기준 (필터와 무관).
  const seriesCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stories) {
      const k = seriesLabel(s);
      if (!k) continue;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [stories]);

  // 검색어는 200ms 디바운스 — 키 입력마다 198편 전체 재필터링하면 모바일에서
  // 체감 끊김이 생긴다. (즉시 반응성이 필요한 셀렉트 필터는 디바운스 안 함.)
  const debouncedQ = useDebouncedValue(q, 200);

  const filtered = useMemo(() => {
    let list = stories;
    if (cat !== "all") {
      const c = Number(cat);
      list = list.filter((s) => s.category === c);
    }
    if (yearFilter !== "all") {
      list = list.filter((s) => s.openYear === yearFilter);
    }
    if (seriesFilter !== "all") {
      list = list.filter((s) => seriesLabel(s) === seriesFilter);
    }
    if (debouncedQ.trim()) {
      const key = debouncedQ.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.subject.toLowerCase().includes(key) ||
          s.hashTagSubject.toLowerCase().includes(key)
      );
    }
    if (unreadOnly && ready) {
      list = list.filter((s) => !readIds.has(s.id));
    }
    if (favoriteOnly && ready) {
      list = list.filter((s) => favoriteIds.has(s.id));
    }
    return list;
  }, [
    stories,
    cat,
    yearFilter,
    seriesFilter,
    debouncedQ,
    unreadOnly,
    favoriteOnly,
    readIds,
    favoriteIds,
    ready,
  ]);

  // ── 시리즈 카드 ────────────────────────────────────────────────────
  // 시리즈 뷰는 filtered 결과를 시리즈로 묶어서 보여줌 — 필터(카테고리/연도/검색/
  // 안 읽음/즐겨찾기)가 그대로 시리즈 단위로 전파됨. 즉 "웹툰만 + 안 읽음" =
  // 안 읽은 웹툰 회차가 1편이라도 있는 시리즈들. 대표 이미지는 그 시리즈의
  // (filtered 안에서) 가장 최신 회차 썸네일. 시리즈 라벨이 없는 회차는 "기타"
  // 버킷으로 묶음.
  interface SeriesCardData {
    label: string;
    count: number;
    totalCount: number;
    readCount: number;
    latestDt: string;
    latestThumbnail: string;
    sampleStory: StoryListItem;
  }
  const seriesCards = useMemo<SeriesCardData[]>(() => {
    const buckets = new Map<string, StoryListItem[]>();
    for (const s of filtered) {
      const k = seriesLabel(s) ?? "기타";
      const arr = buckets.get(k) ?? [];
      arr.push(s);
      buckets.set(k, arr);
    }
    const result: SeriesCardData[] = [];
    for (const [label, items] of buckets) {
      // openDt 가 큰 (최신) 게 앞에 오도록 정렬해 대표 썸네일 / 정렬 키로 사용.
      const sorted = items.slice().sort((a, b) =>
        b.openDt.localeCompare(a.openDt)
      );
      const latest = sorted[0];
      // SERIES_REPRESENTATIVE_ID 에 강제 지정된 회차가 있고 현재 필터 결과 안에
      // 포함되어 있다면 그 회차의 썸네일을 시리즈 대표로 사용 (캐릭터 스토리 등).
      const overrideId = SERIES_REPRESENTATIVE_ID[label];
      const rep =
        (overrideId !== undefined &&
          sorted.find((s) => s.id === overrideId)) ||
        latest;
      const readInFiltered = sorted.reduce(
        (acc, s) => (readIds.has(s.id) ? acc + 1 : acc),
        0
      );
      result.push({
        label,
        count: sorted.length,
        totalCount: seriesCounts.get(label) ?? sorted.length,
        readCount: readInFiltered,
        latestDt: latest.openDt,
        latestThumbnail: rep.thumbnail,
        sampleStory: rep,
      });
    }
    result.sort((a, b) => {
      // "캐릭터 스토리"·"기타"는 다른 본 시리즈들 뒤에 sentinel 처리
      const aSent = a.label === "캐릭터 스토리" || a.label === "기타";
      const bSent = b.label === "캐릭터 스토리" || b.label === "기타";
      if (aSent !== bSent) return aSent ? 1 : -1;
      return sort === "asc"
        ? a.latestDt.localeCompare(b.latestDt)
        : b.latestDt.localeCompare(a.latestDt);
    });
    return result;
  }, [filtered, readIds, seriesCounts, sort]);

  // ── Infinite scroll (회차 뷰 전용) ──────────────────────────────────
  // 필터 결과 중 PAGE_SIZE 씩 증가시키며 노출. 필터/검색이 바뀌면 visibleCount 를
  // 다시 PAGE_SIZE 로 리셋한다 (다른 필터 결과를 끝까지 펼친 상태에서 위에 머무
  // 르면 어색하므로). render-phase setState 로 동기화 (effect 한 프레임 늦으면
  // 이전 필터 카드들이 잠깐 깜빡임).
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prevFilterKey, setPrevFilterKey] = useState("");
  const filterKey = `${cat}|${yearFilter}|${seriesFilter}|${debouncedQ}|${unreadOnly}|${favoriteOnly}|${sort}`;
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
    return stories
      .filter((s) => {
        const p = progress.get(s.id) ?? 0;
        return p > 0.02 && p < 0.95 && !readIds.has(s.id);
      })
      .sort((a, b) => (progress.get(b.id) ?? 0) - (progress.get(a.id) ?? 0))
      .slice(0, 6);
  }, [stories, progress, readIds, ready]);

  // 어떤 필터/검색도 적용 안 됐을 때만 "이어 읽기" 보여줌.
  const isFreshList =
    !q.trim() &&
    cat === "all" &&
    yearFilter === "all" &&
    seriesFilter === "all" &&
    !unreadOnly &&
    !favoriteOnly;

  // 시리즈 옵션: 데이터에서 자동 추출 + 가장 최근 회차 기준 내림차순.
  // "캐릭터 스토리" 는 단편 모음(서로 다른 캐릭터별 1~3편) 이라 다른 시리즈와
  // 같은 축으로 정렬하면 어색하다 — 항상 맨 뒤 sentinel 로 강제.
  const seriesChoices = useMemo(() => {
    const latest = new Map<string, string>();
    for (const s of stories) {
      const k = seriesLabel(s);
      if (!k) continue;
      const cur = latest.get(k);
      if (!cur || s.openDt > cur) latest.set(k, s.openDt);
    }
    return [...latest.entries()]
      .sort((a, b) => {
        if (a[0] === "캐릭터 스토리") return 1;
        if (b[0] === "캐릭터 스토리") return -1;
        return b[1].localeCompare(a[1]);
      })
      .map(([label]) => label);
  }, [stories]);

  const groups = useMemo(() => {
    // visibleCount 만큼만 노출 → 그 안에서만 그룹핑 / 정렬. 시리즈/연도가
    // 다양해도 PAGE_SIZE 가 작아 그룹은 1~2 개로 자연 수렴함.
    const slice =
      sort === "asc"
        ? [...filtered].reverse().slice(0, visibleCount)
        : filtered.slice(0, visibleCount);
    const g = groupByYear(slice);
    if (sort === "asc") {
      return g
        .slice()
        .reverse()
        .map((group) => ({
          ...group,
          items: group.items.slice().reverse(),
        }));
    }
    return g;
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

        {/* Category pills + active chips (좌측 스크롤) + 정렬 버튼(우측 고정).
            정렬은 자주 토글하는 컨트롤이라 시트에 묻지 않고 가시 영역에 둠.
            시트 안에도 동일한 정렬 컨트롤이 있으니 어느 쪽이든 사용 가능. */}
        <div className="flex items-center gap-2 px-3 pb-2.5">
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              <CategoryPill
                active={cat === "all"}
                onClick={() => setCat("all")}
              >
                전체
              </CategoryPill>
              <CategoryPill
                active={cat === "1"}
                onClick={() => setCat("1")}
              >
                웹툰
              </CategoryPill>
              <CategoryPill
                active={cat === "2"}
                onClick={() => setCat("2")}
              >
                영상
              </CategoryPill>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
            aria-pressed={sort === "asc"}
            title={sort === "desc" ? "최신순 (눌러서 과거순)" : "과거순 (눌러서 최신순)"}
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

        {/* 인라인 필터 행 — 연도 / 시리즈 selects + 안 읽음 / 즐겨찾기 토글.
            바텀시트 형태가 답답하다는 피드백을 받아 다시 헤더로 끌어올림.
            가로 스크롤 가능. */}
        <div className="px-3 pb-2.5 overflow-x-auto no-scrollbar">
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
            <button
              type="button"
              onClick={() => {
                setUnreadOnly((v) => !v);
                if (!unreadOnly) setFavoriteOnly(false);
              }}
              aria-pressed={unreadOnly}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium min-h-[32px] transition-colors ${
                unreadOnly
                  ? "bg-[var(--color-text)] text-white"
                  : "bg-[var(--color-surface-alt)] text-[var(--color-text-soft)] hover:bg-[var(--color-border)]"
              }`}
            >
              안 읽음
            </button>
            <button
              type="button"
              onClick={() => {
                setFavoriteOnly((v) => !v);
                if (!favoriteOnly) setUnreadOnly(false);
              }}
              aria-pressed={favoriteOnly}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium min-h-[32px] transition-colors ${
                favoriteOnly
                  ? "bg-amber-400 text-white"
                  : "bg-[var(--color-surface-alt)] text-[var(--color-text-soft)] hover:bg-[var(--color-border)]"
              }`}
            >
              ★ 즐겨찾기
            </button>
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
                const seriesRead = sk
                  ? stories.reduce(
                      (acc, st) =>
                        seriesLabel(st) === sk && readIds.has(st.id)
                          ? acc + 1
                          : acc,
                      0
                    )
                  : 0;
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
                  const seriesRead = sk
                    ? stories.reduce(
                        (acc, st) =>
                          seriesLabel(st) === sk && readIds.has(st.id)
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

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors min-h-[32px] ${
        active
          ? "bg-[var(--color-text)] text-white"
          : "bg-[var(--color-surface-alt)] text-[var(--color-text-soft)] hover:bg-[var(--color-border)]"
      }`}
    >
      {children}
    </button>
  );
}

function ViewTab({
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

function SeriesCard({
  data,
  onOpen,
}: {
  data: {
    label: string;
    count: number;
    totalCount: number;
    readCount: number;
    latestDt: string;
    latestThumbnail: string;
    sampleStory: StoryListItem;
  };
  onOpen: () => void;
}) {
  // 시리즈 카드는 클릭 시 회차 뷰 + 시리즈 필터 적용. 카드 자체는 <button> —
  // a 태그가 아닌 이유는 같은 페이지 내 상태 전환이지 새 URL 로 이동하는 게
  // 아니기 때문 (좋은 a11y).
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
      {/* 이미지 자체가 카드. 카드 바깥의 border/bg 제거. */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-[var(--color-surface-alt)]">
        {data.latestThumbnail && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={data.latestThumbnail}
            alt=""
            loading="lazy"
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
        {/* 진행률을 썸네일 하단 바로 표시 — 카드 내부에 또 박스를 만들지 않음. */}
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
          <span className="text-[var(--color-text-muted)]"> / {data.totalCount}</span>
        </p>
      </div>
    </button>
  );
}

function StoryRow({
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
  /** Auto-tracked read (80% scroll). Drives the dim/grayscale visual. */
  read: boolean;
  /** Manual bookmark (user-set). Drives the bookmark button. */
  bookmark: boolean;
  favorite: boolean;
  progress: number;
  seriesLabel: string | null;
  seriesRead: number;
  seriesTotal: number;
  /** 부모 리스트가 이미 한 시리즈로 필터링된 경우 row 마다 같은 진행률이
   *  반복돼 노이즈 — 끄기 위해 true 전달. */
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
  // 이 미러에 패널 이미지가 없으면 (영상이 외부 호스트로만 제공되거나 데이터에
  // 누락) 내부 뷰어로 보내봤자 빈 화면이라 의미가 없음 — 공식 페이지로 새창 폴백.
  const hasImages = story.hasImages;
  const fullHref = hasImages
    ? `${basePath}/stories/${story.id}/`
    : `${OFFICIAL_STORY_BASE}/${story.id}`;
  const isVideo = story.category === STORY_CATEGORY.VIDEO;
  return (
    /* GitHub Pages 정적 호스팅에서 Next.js Link 의 client-side router.push 가
       silent fail 하는 케이스가 있어 (HEAD prefetch → 503, RSC payload 가
       HTML 으로 반환됨), 일반 <a> 로 hard-navigate 강제. 정적 사이트라
       SPA 라우팅 가치가 크지 않고, SSR 된 HTML 이 즉시 표시되어 체감 속도도
       무해. */
    <a
      href={fullHref}
      {...(!hasImages
        ? { target: "_blank", rel: "noreferrer noopener" }
        : null)}
      className={`relative flex gap-3 py-2 transition active:scale-[0.99] ${
        read ? "opacity-65" : ""
      }`}
    >
      {/* Thumbnail — 이미지 자체가 카드. 외곽 라인/배경 제거하고 코너만 살짝. */}
      <div className="relative w-[136px] h-[92px] shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-alt)]">
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

      {/* Meta */}
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

      {/* Bookmark + Favorite — meta 영역 우상단 (오버레이 chrome 없이 raw icon) */}
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

      {/* Progress bar — 썸네일 하단에 얇은 라인 */}
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
