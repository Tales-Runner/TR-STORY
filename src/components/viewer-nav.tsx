"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ViewerNav({
  prevId,
  nextId,
  currentUrl,
}: {
  prevId: number | null;
  nextId: number | null;
  currentUrl: string;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && prevId !== null)
        router.push(`/stories/${prevId}`);
      else if (e.key === "ArrowRight" && nextId !== null)
        router.push(`/stories/${nextId}`);
      else if (e.key === "Escape") router.push("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevId, nextId, router]);

  function scrollTo(direction: "top" | "bottom") {
    if (direction === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    else
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl);
    } catch {}
  }

  return (
    <div className="fixed right-4 bottom-1/2 translate-y-1/2 z-30 flex flex-col gap-2">
      <button
        onClick={() => scrollTo("top")}
        aria-label="맨 위로"
        className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[var(--color-border)] shadow hover:bg-[var(--color-surface-alt)] text-[var(--color-text-soft)]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 10l4-4 4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="flex gap-2">
        {prevId !== null ? (
          <Link
            href={`/stories/${prevId}`}
            aria-label="이전 회차"
            className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[var(--color-border)] shadow hover:bg-[var(--color-surface-alt)] text-[var(--color-text-soft)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 4l-4 4 4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : (
          <span className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text-muted)] opacity-40">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 4l-4 4 4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        <button
          onClick={copyLink}
          aria-label="링크 복사"
          className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[var(--color-border)] shadow hover:bg-[var(--color-surface-alt)] text-[var(--color-text-soft)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M6.5 9.5a2.5 2.5 0 010-3.5l2-2a2.5 2.5 0 113.5 3.5L11 8.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M9.5 6.5a2.5 2.5 0 010 3.5l-2 2a2.5 2.5 0 11-3.5-3.5L5 7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {nextId !== null ? (
          <Link
            href={`/stories/${nextId}`}
            aria-label="다음 회차"
            className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[var(--color-border)] shadow hover:bg-[var(--color-surface-alt)] text-[var(--color-text-soft)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : (
          <span className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text-muted)] opacity-40">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
      <button
        onClick={() => scrollTo("bottom")}
        aria-label="맨 아래로"
        className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[var(--color-border)] shadow hover:bg-[var(--color-surface-alt)] text-[var(--color-text-soft)]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 6l-4 4-4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
