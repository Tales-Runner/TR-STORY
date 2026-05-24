import type { Metadata } from "next";
import { fetchStoryList } from "@/lib/api";
import { HomeShell } from "@/components/home-shell";

/**
 * 홈은 가장 최근 회차의 thumbnail 을 og:image 로 채워 X(트위터) /
 * 카카오톡 카드 미리보기가 큰 이미지로 뜨도록 한다. 회차 페이지는 자체
 * generateMetadata 에서 자기 thumbnail 을 쓰니까 영향 없음.
 */
export async function generateMetadata(): Promise<Metadata> {
  const list = await fetchStoryList().catch(() => []);
  const latest = list
    .slice()
    .sort((a, b) => b.openDt.localeCompare(a.openDt))[0];
  const image = latest?.thumbnail;
  return {
    openGraph: image
      ? {
          images: [
            {
              url: image,
              width: 560,
              height: 316,
              alt: "TR Story — 테일즈런너 웹툰 뷰어",
            },
          ],
        }
      : undefined,
    twitter: image
      ? {
          card: "summary_large_image",
          images: [image],
        }
      : undefined,
  };
}

export default async function HomePage() {
  const stories = await fetchStoryList();
  return <HomeShell stories={stories} />;
}
