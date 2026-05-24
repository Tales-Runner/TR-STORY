import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { fetchStoryList } from "@/lib/api";
import type { StoryListItem } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "TR Story — 테런 스토리 뷰어",
  description: "테일즈런너 웹툰 아카이브 뷰어",
};

export const revalidate = 1800;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let stories: StoryListItem[] = [];
  try {
    stories = await fetchStoryList();
  } catch {
    stories = [];
  }

  return (
    <html lang="ko">
      <body>
        <Suspense fallback={<div className="fixed top-0 left-0 right-0 h-[68px] bg-white border-b border-[var(--color-border)]" />}>
          <TopBar />
        </Suspense>
        <div className="flex min-h-screen pt-[68px]">
          <Suspense fallback={null}>
            <Sidebar stories={stories} />
          </Suspense>
          <main className="flex-1 min-w-0 pl-0 lg:pl-[230px]">
            <div className="px-4 lg:px-8 py-6">{children}</div>
            <footer className="mt-12 border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-text-muted)]">
              <p>
                데이터 출처:{" "}
                <Link
                  href="https://tr.game.onstove.com/archive/trstory"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  테일즈런너 공식 라이브러리
                </Link>
                . 본 사이트는 비공식 미러로, 모든 콘텐츠 권리는 RHAON
                Entertainment 및 Blomics 에 있습니다.
              </p>
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
