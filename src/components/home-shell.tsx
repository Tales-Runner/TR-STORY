"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
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

/**
 * hashTagSubject 토큰 → 표시용 시리즈 라벨 매핑. 데이터 표기와 사용자
 * 친화 표기가 어긋나는 케이스, 그리고 한 시리즈가 여러 hashTag 로 흩어진
 * 케이스(예: "테일즈"/"테일즈 시크릿", "OST" 가 언더월드 OST) 를 합친다.
 */
const SERIES_TAG_TO_LABEL: Record<string, string> = {
  "테일즈아틀리에": "테일즈 아틀리에",
  "DashJump": "DashJump",
  "라스트카오스": "라스트 카오스",
  "데저트 킹덤": "데저트 킹덤",
  "도화연가": "도화연가",
  "바우나비 아일랜드": "바우나비 아일랜드",
  "차원관리국": "차원관리국",
  "저승컴퍼니": "저승컴퍼니",
  "이클립스": "이클립스",
  "감정의 제도": "감정의 제도",
  "테일즈 드림": "테일즈 드림",
  "언더월드": "언더월드",
  "테일즈 시크릿": "테일즈 시크릿",
  "테일즈": "테일즈 시크릿",
  "OST": "언더월드",
  "체이서": "체이서, 그 후 이야기",
  "이매망량": "이매망량",
  "테일즈프론티어": "테일즈 프론티어",
  "하랑": "하랑의 이야기",
  "라라": "라라의 이야기",
  "테일즈 아카데미": "라라in 테일즈 아카데미",
  "카오스제로": "카오스 제로",
  "시즌1": "시즌1 에필로그",
  "테런어드벤처": "테런어드벤처",
  "캐릭터 스토리": "캐릭터 스토리",
  "카오스 어둠의 날개": "카오스 어둠의 날개",
  "카오스대반격": "카오스 대반격",
  "카오스 냉기의 얼음산맥": "카오스 냉기의 얼음산맥",
  "카오스 새로운 시작": "카오스 새로운 시작",
  "카오스제너레이션": "카오스 제너레이션",
};

function rawSeriesKey(story: StoryListItem): string | null {
  // "캐릭터 스토리" 묶음은 hashTag 가 아니라 openYear 로 판단.
  if (story.openYear === "캐릭터 스토리") return "캐릭터 스토리";
  for (const t of story.hashTagSubject.split(",")) {
    const k = t.trim();
    if (k && !GENERIC_TAGS.has(k)) return k;
  }
  return null;
}

function seriesLabel(story: StoryListItem): string | null {
  const raw = rawSeriesKey(story);
  if (!raw) return null;
  return SERIES_TAG_TO_LABEL[raw] ?? raw;
}

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
  const [sort, setSort] = useState<SortOrder>("desc");

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

  const { readIds, progress, ready, toggleRead } = useReadStatus();

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
  }, [stories, cat, yearFilter, seriesFilter, q, unreadOnly, readIds, ready]);

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
            onChange={setSeriesFilter}
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
      // GitHub Pages 정적 호스팅은 Next.js 의 HEAD-기반 prefetch + RSC
      // payload 패턴을 거부 (HEAD → 503, GET ?_rsc=... → HTML 반환). 데스크탑
      // 크롬에서 prefetch 가 fail 상태로 cache 되어 router.push 가 silent
      // fail 했다. 정적 사이트라 prefetch 가치도 적으니 비활성화.
      prefetch={false}
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
