"use client";

import { useMemo } from "react";
import Link from "next/link";
import { dataMeta } from "@/lib/api";
import { formatDate, formatISODate, relativeDays, parseHashTags } from "@/lib/format";
import { STORY_CATEGORY_LABEL } from "@/lib/types";
import type { StoryListItem } from "@/lib/types";
import { useReadStatus } from "@/lib/use-read-status";
import { seriesLabel } from "@/lib/series";

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}달 전`;
  return `${Math.floor(month / 12)}년 전`;
}

export function MyPageShell({ stories }: { stories: StoryListItem[] }) {
  const { readIds, progress, entries, ready } = useReadStatus();

  const storyById = useMemo(() => {
    const map = new Map<number, StoryListItem>();
    for (const s of stories) map.set(s.id, s);
    return map;
  }, [stories]);

  // 책갈피 (bookmarkedAt 내림차순)
  const bookmarks = useMemo(() => {
    return entries
      .filter((e) => (e.bookmarkedAt ?? 0) > 0)
      .sort((a, b) => (b.bookmarkedAt ?? 0) - (a.bookmarkedAt ?? 0))
      .map((e) => ({ story: storyById.get(e.id), at: e.bookmarkedAt ?? 0 }))
      .filter((x): x is { story: StoryListItem; at: number } => !!x.story);
  }, [entries, storyById]);

  // 즐겨찾기 (favoritedAt 내림차순)
  const favorites = useMemo(() => {
    return entries
      .filter((e) => (e.favoritedAt ?? 0) > 0)
      .sort((a, b) => (b.favoritedAt ?? 0) - (a.favoritedAt ?? 0))
      .map((e) => ({ story: storyById.get(e.id), at: e.favoritedAt ?? 0 }))
      .filter((x): x is { story: StoryListItem; at: number } => !!x.story);
  }, [entries, storyById]);

  // 이어 읽기 (progress 0.02~0.95, 안 읽음)
  const continueReading = useMemo(() => {
    return stories
      .filter((s) => {
        const p = progress.get(s.id) ?? 0;
        return p > 0.02 && p < 0.95 && !readIds.has(s.id);
      })
      .sort((a, b) => (progress.get(b.id) ?? 0) - (progress.get(a.id) ?? 0))
      .slice(0, 8);
  }, [stories, progress, readIds]);

  // 읽음 타임라인 (readAt 내림차순, 날짜별 그룹)
  const readTimeline = useMemo(() => {
    const byDate = new Map<string, { story: StoryListItem; at: number }[]>();
    for (const e of entries) {
      if (!(e.readAt > 0)) continue;
      const story = storyById.get(e.id);
      if (!story) continue;
      const d = new Date(e.readAt);
      const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      const arr = byDate.get(key) ?? [];
      arr.push({ story, at: e.readAt });
      byDate.set(key, arr);
    }
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => b.at - a.at),
      }));
  }, [entries, storyById]);

  // 시리즈별 진행률
  const seriesProgress = useMemo(() => {
    const total = new Map<string, number>();
    const read = new Map<string, number>();
    for (const s of stories) {
      const k = seriesLabel(s);
      if (!k) continue;
      total.set(k, (total.get(k) ?? 0) + 1);
      if (readIds.has(s.id)) read.set(k, (read.get(k) ?? 0) + 1);
    }
    return [...total.entries()]
      .map(([label, t]) => ({
        label,
        total: t,
        read: read.get(label) ?? 0,
        percent: Math.round(((read.get(label) ?? 0) / t) * 100),
      }))
      .filter((x) => x.read > 0)
      .sort((a, b) => b.percent - a.percent);
  }, [stories, readIds]);

  const totalRead = readIds.size;
  const totalBookmark = bookmarks.length;
  const totalFavorite = favorites.length;

  const readPercent = stories.length
    ? Math.round((totalRead / stories.length) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 pb-24 pt-6">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-text-soft)] hover:text-[var(--color-brand)]"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-[var(--color-text)]">
          마이페이지
        </h1>
        <p
          className="mt-2 text-[11px] text-[var(--color-text-muted)]"
          title={dataMeta.updatedAt}
        >
          사이트 데이터 {formatISODate(dataMeta.updatedAt)} (
          {relativeDays(dataMeta.updatedAt)}) · 전체 {dataMeta.totalCount}편
        </p>
      </header>

      {/* 통계 카드 — 클릭하면 해당 섹션으로 이동. 단순 표시용이 아니라
          섹션 헤드 역할까지 겸한다. */}
      <nav aria-label="요약" className="mb-8 grid grid-cols-3 gap-2">
        <StatCard
          href="#section-read"
          label="읽음"
          value={totalRead}
          accent="brand"
          sub={stories.length ? `${readPercent}%` : undefined}
          icon="clock"
        />
        <StatCard
          href="#section-bookmark"
          label="책갈피"
          value={totalBookmark}
          accent="brand"
          icon="bookmark"
        />
        <StatCard
          href="#section-favorite"
          label="즐겨찾기"
          value={totalFavorite}
          accent="amber"
          icon="star"
        />
      </nav>

      {!ready ? (
        <p className="text-center text-sm text-[var(--color-text-muted)] py-12">
          기록을 불러오는 중...
        </p>
      ) : (
        <>
          {/* 책갈피 */}
          <Section
            id="section-bookmark"
            title="책갈피"
            count={bookmarks.length}
            icon="bookmark"
          >
            {bookmarks.length === 0 ? (
              <Empty text="아직 책갈피한 회차가 없습니다. 카드의 🔖 버튼을 눌러 표시해두세요." />
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bookmarks.map(({ story, at }) => (
                  <li key={`bm-${story.id}`}>
                    <SmallCard
                      story={story}
                      timestampLabel={formatRelative(at)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 이어 읽기 */}
          <Section
            title="이어 읽기"
            count={continueReading.length}
            icon="bookopen"
          >
            {continueReading.length === 0 ? (
              <Empty text="중단된 회차가 없습니다." />
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {continueReading.map((s) => (
                  <li key={`con-${s.id}`}>
                    <SmallCard
                      story={s}
                      timestampLabel={`${Math.round((progress.get(s.id) ?? 0) * 100)}% 진행`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 즐겨찾기 */}
          <Section
            id="section-favorite"
            title="즐겨찾기"
            count={favorites.length}
            icon="star"
          >
            {favorites.length === 0 ? (
              <Empty text="즐겨찾기한 회차가 없습니다. 카드의 ★ 버튼으로 추가해보세요." />
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {favorites.map(({ story, at }) => (
                  <li key={`fav-${story.id}`}>
                    <SmallCard
                      story={story}
                      timestampLabel={formatRelative(at)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 시리즈 진행률 */}
          <Section
            title="시리즈 진행률"
            count={seriesProgress.length}
            icon="chart"
          >
            {seriesProgress.length === 0 ? (
              <Empty text="읽은 회차가 없어요. 한 편이라도 80%까지 읽으면 여기 표시됩니다." />
            ) : (
              <ul className="flex flex-col gap-2">
                {seriesProgress.map((s) => (
                  <li
                    key={s.label}
                    className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="text-sm font-bold text-[var(--color-text)]">
                        {s.label}
                      </span>
                      <span className="text-xs text-[var(--color-text-soft)] tabular-nums">
                        {s.read}/{s.total} · {s.percent}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-brand)]"
                        style={{ width: `${s.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 읽음 타임라인 */}
          <Section
            id="section-read"
            title="읽음 기록"
            count={readIds.size}
            icon="clock"
          >
            {readTimeline.length === 0 ? (
              <Empty text="80%까지 읽은 회차가 자동으로 여기 기록됩니다." />
            ) : (
              <ul className="flex flex-col gap-4">
                {readTimeline.map(({ date, items }) => (
                  <li key={date}>
                    <h3 className="mb-2 text-sm font-bold text-[var(--color-text-soft)] sticky top-0 bg-[var(--color-surface-alt)] -mx-1 px-1 py-1 rounded">
                      {date}
                      <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">
                        {items.length}편
                      </span>
                    </h3>
                    <ul className="flex flex-col gap-1.5">
                      {items.map(({ story, at }) => (
                        <li key={`tl-${story.id}-${at}`}>
                          <SmallCard
                            story={story}
                            timestampLabel={formatTimestamp(at).slice(11)}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      <footer className="mt-12 border-t border-[var(--color-border)] pt-6 text-center text-[11px] text-[var(--color-text-muted)]">
        <Link href="/privacy/" className="underline">
          개인정보 처리 안내
        </Link>
      </footer>
    </div>
  );
}

function Section({
  id,
  title,
  count,
  icon,
  children,
}: {
  id?: string;
  title: string;
  count: number;
  icon: "bookmark" | "bookopen" | "star" | "chart" | "clock";
  children: React.ReactNode;
}) {
  return (
    // scroll-mt 로 sticky 헤더가 없어도 위쪽 여유 — 통계 카드에서 점프 시
    // 섹션 제목이 화면 최상단에 딱 붙어 잘리지 않도록.
    <section id={id} className="mb-8 scroll-mt-4">
      <h2 className="mb-3 flex items-baseline gap-2 text-lg font-bold text-[var(--color-text)]">
        <SectionIcon name={icon} />
        {title}
        {count > 0 && (
          <span className="text-xs font-normal text-[var(--color-text-muted)]">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function StatCard({
  href,
  label,
  value,
  sub,
  accent,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  sub?: string;
  accent: "brand" | "amber";
  icon: "bookmark" | "star" | "clock";
}) {
  const colorClasses =
    accent === "amber"
      ? "text-amber-500"
      : "text-[var(--color-brand-strong)]";
  return (
    <a
      href={href}
      className="group flex flex-col gap-1 rounded-2xl border border-[var(--color-border)] bg-white px-3 py-3 text-left transition active:scale-[0.98] hover:border-[var(--color-brand)]/40 hover:shadow-sm"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-soft)]">
        <span className={colorClasses}>
          <SectionIcon name={icon} />
        </span>
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold tabular-nums ${colorClasses}`}>
          {value}
        </span>
        {sub && (
          <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
            {sub}
          </span>
        )}
      </span>
    </a>
  );
}

function SectionIcon({
  name,
}: {
  name: "bookmark" | "bookopen" | "star" | "chart" | "clock";
}) {
  const stroke = "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="inline">
      {name === "bookmark" && (
        <path
          d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}
      {name === "bookopen" && (
        <path
          d="M2 6c4-1 6 0 10 2 4-2 6-3 10-2v13c-4-1-6 0-10 2-4-2-6-3-10-2V6zM12 8v13"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}
      {name === "star" && (
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}
      {name === "chart" && (
        <path
          d="M4 20V10M10 20V4M16 20v-7M22 20H2"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.8" />
          <path
            d="M12 7v5l3 2"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white py-8 text-center text-xs text-[var(--color-text-muted)]">
      {text}
    </div>
  );
}

const CATEGORY_BG: Record<number, string> = {
  1: "bg-[var(--color-brand)]",
  2: "bg-rose-500",
};

function SmallCard({
  story,
  timestampLabel,
}: {
  story: StoryListItem;
  timestampLabel: string;
}) {
  const label = STORY_CATEGORY_LABEL[story.category] ?? "기타";
  const tags = parseHashTags(story.hashTagSubject).filter(
    (t) => t !== "웹툰" && t !== "영상"
  );
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const fullHref = `${basePath}/stories/${story.id}/`;
  return (
    <a
      href={fullHref}
      className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-white overflow-hidden transition active:scale-[0.99] hover:border-[var(--color-brand)]/40"
    >
      <div className="relative w-[80px] h-[54px] shrink-0 bg-[var(--color-surface-alt)] overflow-hidden">
        {story.thumbnail && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={story.thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
        <span
          className={`absolute top-1 left-1 rounded-md text-white text-[9px] font-bold px-1 py-0.5 ${
            CATEGORY_BG[story.category] ?? "bg-slate-500"
          }`}
        >
          {label}
        </span>
      </div>
      <div className="flex-1 min-w-0 py-2 pr-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {formatDate(story.openDt)}
          </p>
          <p className="text-[10px] text-[var(--color-brand-strong)] shrink-0">
            {timestampLabel}
          </p>
        </div>
        <h3 className="text-sm font-bold leading-tight line-clamp-1 mb-0.5 text-[var(--color-text)]">
          {story.subject}
        </h3>
        <p className="text-[10px] text-[var(--color-text-muted)] truncate">
          {tags.join(", ") || " "}
        </p>
      </div>
    </a>
  );
}
