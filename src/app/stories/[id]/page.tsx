import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchStoryDetail, fetchStoryList } from "@/lib/api";
import { formatDate, parseHashTags, youtubeId } from "@/lib/format";
import { STORY_CATEGORY_LABEL } from "@/lib/types";
import { WebtoonImage } from "@/components/webtoon-image";
import { ViewerNav } from "@/components/viewer-nav";

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await fetchStoryDetail(Number(id)).catch(() => null);
  if (!detail) return { title: "TR Story" };
  return {
    title: `${detail.subject} — TR Story`,
    description: detail.hashTagSubject,
    openGraph: {
      title: detail.subject,
      description: detail.hashTagSubject,
      images: detail.thumbnail ? [{ url: detail.thumbnail }] : undefined,
    },
  };
}

export default async function StoryViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n)) notFound();

  const [detail, list] = await Promise.all([
    fetchStoryDetail(n),
    fetchStoryList().catch(() => []),
  ]);
  if (!detail) notFound();

  const sortedSameYear = list
    .slice()
    .sort((a, b) => a.openDt.localeCompare(b.openDt));
  const idx = sortedSameYear.findIndex((s) => s.id === n);
  const prevId = idx > 0 ? sortedSameYear[idx - 1].id : null;
  const nextId =
    idx >= 0 && idx < sortedSameYear.length - 1
      ? sortedSameYear[idx + 1].id
      : null;

  const tags = parseHashTags(detail.hashTagSubject);
  const label = STORY_CATEGORY_LABEL[detail.category] ?? "기타";

  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)] leading-tight">
            {detail.subject}
          </h1>
          <p className="shrink-0 text-sm text-[var(--color-text-muted)] pt-2">
            {formatDate(detail.openDt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-xs font-semibold px-3 py-1">
            {label}
          </span>
          {tags
            .filter((t) => t !== "웹툰" && t !== "영상")
            .map((t) => (
              <span
                key={t}
                className="rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-soft)] text-xs px-3 py-1"
              >
                {t}
              </span>
            ))}
        </div>
        <hr className="mt-5 border-[var(--color-border)]" />
      </header>

      <div className="flex flex-col">
        {detail.images.map((img, i) => {
          const yt = youtubeId(img.movieUrl);
          if (yt) {
            return (
              <div
                key={i}
                className="aspect-video w-full bg-black"
              >
                <iframe
                  src={`https://www.youtube.com/embed/${yt}`}
                  title={`${detail.subject} ${i + 1}`}
                  className="w-full h-full"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            );
          }
          return (
            <WebtoonImage
              key={i}
              src={img.imageUrl}
              alt={`${detail.subject} ${i + 1}컷`}
              priority={i === 0}
            />
          );
        })}
        {detail.images.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            표시할 이미지가 없습니다.
          </p>
        )}
      </div>

      <nav className="mt-10 flex justify-center gap-3">
        {prevId !== null && (
          <Link
            href={`/stories/${prevId}`}
            className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-text-soft)] hover:border-[var(--color-brand)]/40"
          >
            ← 이전
          </Link>
        )}
        <Link
          href="/"
          className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-text-soft)] hover:border-[var(--color-brand)]/40"
        >
          목록
        </Link>
        {nextId !== null && (
          <Link
            href={`/stories/${nextId}`}
            className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-text-soft)] hover:border-[var(--color-brand)]/40"
          >
            다음 →
          </Link>
        )}
      </nav>

      <ViewerNav
        prevId={prevId}
        nextId={nextId}
        currentUrl={`https://tr-story.vercel.app/stories/${n}`}
      />
    </article>
  );
}
