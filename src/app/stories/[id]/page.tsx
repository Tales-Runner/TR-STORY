import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchStoryDetail,
  fetchStoryList,
  listAllIds,
} from "@/lib/api";
import { getStoryNavigation } from "@/lib/story-selectors";
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

  // prev/next 네비게이션 기준 선택:
  // 1순위 — 같은 시리즈(≥2편): 시즌제 웹툰을 1편부터 따라가는 게 자연스럽다.
  //          연도가 갈리면 같은 시리즈인데도 끊겨 보였던 문제가 있었음.
  // 2순위 — 같은 연도 그룹: 시리즈가 아니거나 단편이면 fallback.
  // viewer 안에서 다음 화 버튼은 같은 뷰어가 뜬다는 전제이므로, 이미지가 없는
  // 회차(공식 페이지로 폴백되는 회차)는 후보에서 제외한다.
  // 어느 경우든 chronological(과거 → 최신)로 정렬.
  const { siblings, yearLabel } = getStoryNavigation(detail, list);

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
      yearLabel={yearLabel}
      nextPreloadImages={nextPreloadImages}
    />
  );
}
