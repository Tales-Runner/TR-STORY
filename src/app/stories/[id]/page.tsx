import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchStoryDetail,
  fetchStoryList,
  listAllIds,
} from "@/lib/api";
import { StoryViewer } from "@/components/story-viewer";

export function generateStaticParams() {
  return listAllIds().map((id) => ({ id: String(id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await fetchStoryDetail(Number(id)).catch(() => null);
  if (!detail) return { title: "TR Story" };
  const tags = detail.hashTagSubject
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const description = `테일즈런너 ${tags.join(" · ")} ${detail.subject} (${detail.openYear} 공개). 모바일 친화 비공식 뷰어.`;
  const canonical = `/stories/${detail.id}/`;
  return {
    title: detail.subject,
    description,
    keywords: ["테일즈런너", "테런", ...tags, detail.subject],
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: `${detail.subject} — 테일즈런너`,
      description,
      url: canonical,
      images: detail.thumbnail
        ? [{ url: detail.thumbnail, alt: detail.subject }]
        : undefined,
      publishedTime: detail.openDt
        ? `${detail.openDt.slice(0, 4)}-${detail.openDt.slice(4, 6)}-${detail.openDt.slice(6, 8)}`
        : undefined,
    },
    twitter: {
      card: detail.thumbnail ? "summary_large_image" : "summary",
      title: `${detail.subject} — 테일즈런너`,
      description,
      images: detail.thumbnail ? [detail.thumbnail] : undefined,
    },
  };
}

export default async function StoryPage({
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

  // 같은 연도(또는 비-연도 그룹) 내에서 정렬: 과거 → 최신
  const siblings = list
    .filter((s) => s.openYear === detail.openYear)
    .slice()
    .sort((a, b) => a.openDt.localeCompare(b.openDt));

  // Next 회차의 첫 1~2 패널을 prefetch 후보로 전달 (이어 읽기 체감 속도용).
  const idx = siblings.findIndex((s) => s.id === n);
  const nextSibling =
    idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const nextDetail = nextSibling
    ? await fetchStoryDetail(nextSibling.id).catch(() => null)
    : null;
  const nextPreloadImages =
    nextDetail?.images
      .slice(0, 2)
      .map((i) => i.imageUrl)
      .filter(Boolean) ?? [];

  return (
    <StoryViewer
      story={detail}
      siblings={siblings}
      yearLabel={detail.openYear}
      nextPreloadImages={nextPreloadImages}
    />
  );
}
