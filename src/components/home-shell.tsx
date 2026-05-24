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
import { seriesLabel } from "@/lib/series";

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

  // ── Infinite scroll ───────────────────────────────────────────────
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

  const hasMore = visibleCount < filtered.length;
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((v) => v + PAGE_SIZE);
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

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

  // 시리즈 필터를 켜면 회차 순서대로(과거 → 최신) 보는 게 자연스러움 — 시즌 1
  // 1편부터 따라가야 하니까. 풀면 다시 최신순으로 돌려놓는다. 사용자가 시리즈
  // 픽 후 직접 정렬 토글하면 그 선택을 덮어쓰지는 않음(이 핸들러는 setSort 를
  // 시리즈 변경 시점에만 호출하므로).
  const handleSeriesFilter = useCallback((v: string) => {
    setSeriesFilter(v);
    setSort(v === "all" ? "desc" : "asc");
  }, []);

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
          <Link
            href="/me/"
            title="내 책갈피 · 읽은 회차 모아보기"
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-soft)] hover:border-[var(--color-brand)]/40"
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
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
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
            onClick={() => {
              setUnreadOnly((v) => !v);
              if (!unreadOnly) setFavoriteOnly(false);
            }}
            aria-pressed={unreadOnly}
            title="아직 읽지 않은 회차만 보기"
            className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium min-h-[40px] transition-colors ${
              unreadOnly
                ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                : "bg-white text-[var(--color-text-soft)] border-[var(--color-border)] hover:border-[var(--color-brand)]/40"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
            안 읽음
          </button>
          <button
            onClick={() => {
              setFavoriteOnly((v) => !v);
              if (!favoriteOnly) setUnreadOnly(false);
            }}
            aria-pressed={favoriteOnly}
            title="즐겨찾기 한 회차만 보기"
            className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium min-h-[40px] transition-colors ${
              favoriteOnly
                ? "bg-amber-400 text-white border-amber-400"
                : "bg-white text-[var(--color-text-soft)] border-[var(--color-border)] hover:border-amber-400/60"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={favoriteOnly ? "currentColor" : "none"}>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            즐겨찾기
          </button>
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
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
  bookmark,
  favorite,
  progress,
  seriesLabel,
  seriesRead,
  seriesTotal,
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
  onToggleBookmark: (e: React.MouseEvent) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const label = STORY_CATEGORY_LABEL[story.category] ?? "기타";
  const tags = parseHashTags(story.hashTagSubject).filter(
    (t) => t !== "웹툰" && t !== "영상"
  );
  const showSeriesProgress =
    seriesLabel && seriesTotal >= 2 && seriesRead > 0;
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
            className="absolute bottom-1 right-1 rounded-md bg-black/55 px-1 py-[1px] text-[9px] font-bold text-white"
            title="이 회차는 공식 페이지에서만 볼 수 있어요"
          >
            ↗ 공식
          </span>
        )}
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

      {/* Bookmark + Favorite toggles */}
      <div className="shrink-0 self-stretch flex flex-col">
        <button
          onClick={onToggleBookmark}
          aria-label={bookmark ? "책갈피 해제" : "책갈피"}
          aria-pressed={bookmark}
          title={bookmark ? "책갈피 해제" : "책갈피로 표시"}
          className={`flex-1 px-3 min-w-[44px] flex items-center justify-center transition-colors ${
            bookmark
              ? "text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]/50"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={bookmark ? "currentColor" : "none"}
          >
            <path
              d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={onToggleFavorite}
          aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기"}
          aria-pressed={favorite}
          title={favorite ? "즐겨찾기 해제" : "즐겨찾기"}
          className={`flex-1 px-3 min-w-[44px] flex items-center justify-center transition-colors border-t border-[var(--color-border)] ${
            favorite
              ? "text-amber-500 hover:bg-amber-50"
              : "text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-50/50"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={favorite ? "currentColor" : "none"}
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

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
    </a>
  );
}
