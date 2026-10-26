"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { StoryListItem } from "@/lib/types";
import { useReadStatus } from "@/lib/use-read-status";
import { getContinueReading } from "@/lib/story-selectors";
import { readListReturn, rememberList } from "@/lib/list-navigation";
import { StoryRow } from "./home-shell-parts";
import { BottomNav } from "./bottom-nav";

export function SeriesShell({ label, stories }: { label: string; stories: StoryListItem[] }) {
  const { readIds, bookmarkIds, favoriteIds, progress, lastReadAt, ready, toggleBookmark, toggleFavorite } = useReadStatus();
  const first = stories.find((story) => story.hasImages);
  const resume = getContinueReading(stories, progress, lastReadAt, 1)[0];
  const readCount = stories.filter((story) => readIds.has(story.id)).length;

  useEffect(() => {
    if (!ready) return;
    const saved = readListReturn();
    if (!saved || saved.href !== window.location.pathname + window.location.search) return;
    const frame = requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  return <main className="mx-auto max-w-[900px] px-4 pb-28 pt-6" onClickCapture={(event) => {
    if ((event.target as Element).closest("a")?.getAttribute("href")?.includes("/stories/")) rememberList(stories.length);
  }}>
    <header className="mb-7 space-y-3">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-[var(--color-text-soft)]">← 전체 시리즈</Link>
      <p className="text-xs font-semibold text-[var(--color-brand-strong)]">테일즈런너 웹툰·스토리</p>
      <h1 className="text-2xl font-bold">{label}</h1>
      <p className="text-sm leading-relaxed text-[var(--color-text-soft)]">
        총 {stories.length}편을 공개 순서대로 모았어요. 모바일에서 편하게 읽고, 읽던 위치부터 이어 보세요.
      </p>
      <p className="text-xs text-[var(--color-text-soft)]">{readCount} / {stories.length}편 읽음 · 기록은 이 브라우저에 저장됩니다.</p>
      <div className="flex flex-wrap gap-2">
        {resume && <Link href={`/stories/${resume.id}/`} prefetch={false}
          className="rounded-lg bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-white">
          이어 읽기 · {Math.round((progress.get(resume.id) ?? 0) * 100)}%
        </Link>}
        {first && <Link href={`/stories/${first.id}/?start=1`} prefetch={false}
          className="rounded-lg bg-[var(--color-brand-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-brand-strong)]">
          처음부터 읽기
        </Link>}
      </div>
    </header>
    <section aria-label={`${label} 전체 회차`}>
      <h2 className="mb-3 text-lg font-bold">전체 회차 <span className="text-xs font-normal text-[var(--color-text-soft)]">첫 회차부터</span></h2>
      <ol className="grid grid-cols-1 gap-x-6 divide-y divide-[var(--color-border)] sm:grid-cols-2 sm:divide-y-0">
        {stories.map((story) => <li key={story.id}>
          <StoryRow story={story} read={readIds.has(story.id)} bookmark={bookmarkIds.has(story.id)}
            favorite={favoriteIds.has(story.id)} progress={progress.get(story.id) ?? 0}
            seriesLabel={label} seriesRead={readCount} seriesTotal={stories.length} hideSeriesProgress
            onToggleBookmark={() => { void toggleBookmark(story.id); }}
            onToggleFavorite={() => { void toggleFavorite(story.id); }} />
        </li>)}
      </ol>
    </section>
    <p className="mt-8 text-xs leading-relaxed text-[var(--color-text-soft)]">
      공식 콘텐츠를 모바일에서 읽기 편하게 정리한 비공식 뷰어입니다. 모든 콘텐츠의 권리는 원저작권자에게 있습니다.
    </p>
    <BottomNav />
  </main>;
}
