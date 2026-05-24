"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 웹툰 앱 표준 — 화면 최하단 고정 탭바. md 이상에서는 데스크탑이라 숨김
 * (헤더 마이페이지 링크와 키보드 단축 nav 가 대체). 뷰어 페이지는 자체
 * 풀스크린 dialog 라 BottomNav 가 렌더되지 않음(스토리 라우트는 이 컴포넌트를
 * 호출하지 않는다).
 */
export function BottomNav() {
  const pathname = usePathname();
  // basePath 가 prod 에서 /TR-STORY 로 prefix 되지만 next/navigation 의
  // usePathname 은 basePath 가 stripped 된 값을 반환한다.
  const isHome = pathname === "/" || pathname === "";
  const isMe = pathname?.startsWith("/me");

  return (
    <nav
      aria-label="주요 탐색"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-2">
        <li>
          <Link
            href="/"
            aria-current={isHome ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isHome
                ? "text-[var(--color-brand)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-7h4v7h4a1 1 0 001-1V10"
                stroke="currentColor"
                strokeWidth={isHome ? 2 : 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            홈
          </Link>
        </li>
        <li>
          <Link
            href="/me/"
            aria-current={isMe ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isMe
                ? "text-[var(--color-brand)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-soft)]"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth={isMe ? 2 : 1.6}
              />
              <path
                d="M4 21c0-4 4-7 8-7s8 3 8 7"
                stroke="currentColor"
                strokeWidth={isMe ? 2 : 1.6}
                strokeLinecap="round"
              />
            </svg>
            마이페이지
          </Link>
        </li>
      </ul>
    </nav>
  );
}
