import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TR Story — 테런 스토리 뷰어",
  description:
    "테일즈런너 웹툰을 모바일에서 편하게 읽기 위한 비공식 뷰어. 진행률 자동 저장, 밝기·확대, 스와이프 이동 지원.",
  applicationName: "TR Story",
  manifest: "/manifest.webmanifest",
  themeColor: "#ffffff",
  openGraph: {
    title: "TR Story",
    description: "모바일에서 편하게 보는 테런 스토리",
    type: "website",
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
        <div className="mx-auto w-full max-w-[480px] min-h-dvh bg-white">
          {children}
        </div>
      </body>
    </html>
  );
}
