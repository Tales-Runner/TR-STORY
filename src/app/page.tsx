import type { Metadata } from "next";
import { fetchStoryList } from "@/lib/api";
import { HomeShell } from "@/components/home-shell";

/**
 * 홈/소개 페이지의 og:image 는 테일즈런너 공식이 자체 사이트 메인 OG
 * 이미지로 쓰는 share_img_800.png (800×400) 를 그대로 사용한다.
 * - 사이트가 한 회차에 종속되지 않은 "테런 스토리 자체" 의 정체성을
 *   카드에 표현 → 매번 최신 회차 썸네일이 바뀌는 것보다 일관됨.
 * - X 의 summary_large_image 권장 비율(1.91:1) 에 근접한 2:1 이라 큰
 *   카드로 잘 표시됨.
 * - trimage.rhaon.co.kr 는 우리가 이미 의존 중인 도메인.
 * 회차 페이지는 자체 generateMetadata 에서 자기 회차 thumbnail 을 쓰므로
 * 영향 없다.
 */
const OFFICIAL_OG_IMAGE =
  "https://trimage.rhaon.co.kr/images/trweb-public/og/share_img_800.png";

export const metadata: Metadata = {
  openGraph: {
    images: [
      {
        url: OFFICIAL_OG_IMAGE,
        width: 800,
        height: 400,
        alt: "테일즈런너 — TR Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [OFFICIAL_OG_IMAGE],
  },
};

export default async function HomePage() {
  const stories = await fetchStoryList();
  return <HomeShell stories={stories} />;
}
