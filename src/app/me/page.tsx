import type { Metadata } from "next";
import { fetchStoryList } from "@/lib/api";
import { MyPageShell } from "@/components/my-page-shell";

const OFFICIAL_OG_IMAGE =
  "https://trimage.rhaon.co.kr/images/trweb-public/og/share_img_800.png";

export const metadata: Metadata = {
  title: "마이페이지",
  description:
    "내가 책갈피한 회차, 즐겨찾기, 읽은 회차 타임라인을 한 자리에서 확인. 모든 기록은 본인 브라우저에만 저장됩니다.",
  alternates: { canonical: "/me/" },
  openGraph: {
    title: "마이페이지 — TR Story",
    description:
      "내 책갈피·즐겨찾기·읽은 시점을 한 자리에서 확인. 본인 브라우저에만 저장.",
    url: "/me/",
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
    title: "마이페이지 — TR Story",
    images: [OFFICIAL_OG_IMAGE],
  },
};

export default async function MyPage() {
  const stories = await fetchStoryList();
  return <MyPageShell stories={stories} />;
}
