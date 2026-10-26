import type { Metadata, Viewport } from "next";
import { INDEXABLE, SITE_DESCRIPTION, SITE_TITLE, SITE_URL, siteUrl } from "@/lib/constants";
import { SiteMoveNotice } from "@/components/site-move-notice";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — TR Story",
  },
  description: SITE_DESCRIPTION,
  applicationName: "TR Story",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.svg` },
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
    canonical: siteUrl(),
  },
  openGraph: {
    type: "website",
    siteName: "TR Story",
    locale: "ko_KR",
    url: siteUrl(),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: INDEXABLE,
    follow: true,
    googleBot: { index: INDEXABLE, follow: true },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
      : undefined,
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
        <div className="min-h-dvh bg-white"><SiteMoveNotice />{children}</div>
      </body>
    </html>
  );
}
