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
      <nav aria-label="현재 위치" className="flex flex-wrap items-center gap-x-2 text-sm text-[var(--color-text-soft)]">
        <Link href="/" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">테런 스토리</Link>
        <span aria-hidden="true">/</span><span aria-current="page">{label}</span>
      </nav>
      <p className="text-xs font-semibold text-[var(--color-brand-strong)]">테일즈런너 웹툰·스토리</p>
      <h1 className="text-2xl font-bold">{label}</h1>
      <p className="text-sm leading-relaxed text-[var(--color-text-soft)]">
        {stories.length}편 · {readCount}편 읽음
      </p>
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
      <h2 className="mb-3 text-lg font-bold">전체 회차</h2>
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
      비공식 뷰어 · 콘텐츠 권리: RHAON Entertainment 및 Blomics
    </p>
    <BottomNav />
  </main>;
}
