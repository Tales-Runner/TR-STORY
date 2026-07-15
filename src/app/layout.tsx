import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TR Story — 테일즈런너 웹툰·스토리 모바일 뷰어",
    template: "%s — TR Story",
  },
  description:
    "테일즈런너(테런) 공식 웹툰·영상 198편을 모바일에서 편하게 읽기 위한 비공식 뷰어. 진행률 자동 저장, 시리즈·연도별 필터, 회차 바텀시트. 테일즈 아틀리에·라스트 카오스·DashJump 등 전 시리즈.",
  applicationName: "TR Story",
  keywords: [
    "테일즈런너",
    "테런",
    "테런 스토리",
    "테일즈런너 웹툰",
    "테일즈런너 스토리",
    "테일즈 아틀리에",
    "라스트 카오스",
    "DashJump",
    "테일즈 드림",
    "언더월드",
    "카오스 제너레이션",
    "테런 라이브러리",
  ],
  authors: [{ name: "heznpc" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "TR Story",
    locale: "ko_KR",
    url: "/",
    title: "TR Story — 테일즈런너 웹툰·스토리 모바일 뷰어",
    description:
      "테일즈런너 공식 웹툰·영상 198편을 모바일에서 한 손에. 진행률 자동 저장, 시리즈·연도 필터, 다음 회차 prefetch.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TR Story — 테일즈런너 웹툰·스토리 모바일 뷰어",
    description:
      "테일즈런너 공식 웹툰 198편을 모바일에서 편하게. 진행률 자동 저장 + 시리즈 필터.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-dvh bg-white">{children}</div>
      </body>
    </html>
  );
}
