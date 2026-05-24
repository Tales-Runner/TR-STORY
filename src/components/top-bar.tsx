"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const urlCat = params.get("cat") ?? "all";
  const [q, setQ] = useState(urlQ);
  const [cat, setCat] = useState<string>(urlCat);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  const [prevUrlCat, setPrevUrlCat] = useState(urlCat);
  if (prevUrlQ !== urlQ) {
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }
  if (prevUrlCat !== urlCat) {
    setPrevUrlCat(urlCat);
    setCat(urlCat);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (cat !== "all") next.set("cat", cat);
    const qs = next.toString();
    router.push(pathname === "/" ? `/${qs ? "?" + qs : ""}` : `/${qs ? "?" + qs : ""}`);
  }

  function onCat(value: string) {
    setCat(value);
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete("cat");
    else next.set("cat", value);
    const qs = next.toString();
    router.push(`/${qs ? "?" + qs : ""}`);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[68px] bg-white border-b border-[var(--color-border)]">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-[var(--color-text)] text-base"
        >
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white text-sm font-bold">
            TR
          </span>
          <span className="hidden sm:inline">테런 스토리</span>
        </Link>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 flex-1 max-w-xl ml-4"
        >
          <select
            value={cat}
            onChange={(e) => onCat(e.target.value)}
            aria-label="카테고리"
            className="hidden sm:block rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
          >
            <option value="all">전체</option>
            <option value="1">웹툰</option>
            <option value="2">영상</option>
          </select>
          <div className="relative flex-1">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색어를 입력해주세요"
              className="w-full rounded-lg border border-[var(--color-border)] bg-white pl-4 pr-10 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30"
            />
            <button
              type="submit"
              aria-label="검색"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-brand)]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="9"
                  cy="9"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M14 14L17 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </header>
  );
}
