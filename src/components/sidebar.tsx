"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { StoryListItem } from "@/lib/types";

interface YearNode {
  year: string;
  items: StoryListItem[];
}

function groupByYear(stories: StoryListItem[]): YearNode[] {
  const map = new Map<string, StoryListItem[]>();
  for (const s of stories) {
    const arr = map.get(s.openYear) ?? [];
    arr.push(s);
    map.set(s.openYear, arr);
  }
  function rank(label: string): [number, string] {
    const m = label.match(/^(\d{4})/);
    if (m) return [0, m[1]];
    return [1, label];
  }
  return [...map.entries()]
    .map(([year, items]) => ({
      year,
      items: items.slice().sort((a, b) => b.openDt.localeCompare(a.openDt)),
    }))
    .sort((a, b) => {
      const [ra, ka] = rank(a.year);
      const [rb, kb] = rank(b.year);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return kb.localeCompare(ka);
      return ka.localeCompare(kb);
    });
}

export function Sidebar({ stories }: { stories: StoryListItem[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const currentId = useMemo(() => {
    const m = pathname?.match(/\/stories\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [pathname]);

  const years = useMemo(() => groupByYear(stories), [stories]);
  const initialYear = years[0]?.year ?? "";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [initialYear]: true,
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleYear(year: string) {
    setExpanded((prev) => ({ ...prev, [year]: !prev[year] }));
  }

  const qs = params.toString();
  const homeHref = qs ? `/?${qs}` : "/";

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="목차 열기"
        className="lg:hidden fixed bottom-4 left-4 z-30 rounded-full bg-[var(--color-brand)] text-white shadow-lg p-3"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Backdrop on mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed top-[68px] left-0 bottom-0 w-[230px] bg-white border-r border-[var(--color-border)] z-40 transform transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="h-full flex flex-col">
          <Link
            href={homeHref}
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-4 bg-[var(--color-sidebar-header)] text-[var(--color-sidebar-header-text)] border-b border-[#293056]"
          >
            <div className="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path d="M14 4v6h6" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span className="text-sm font-bold">테런 스토리</span>
            </div>
          </Link>

          <nav className="flex-1 overflow-y-auto scrollbar-thin">
            {years.map((y) => {
              const open = !!expanded[y.year];
              return (
                <div key={y.year} className="border-b border-[var(--color-border)]">
                  <button
                    onClick={() => toggleYear(y.year)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--color-sidebar-text)] hover:bg-[var(--color-surface-alt)]"
                    aria-expanded={open}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block w-1 h-1 rounded-full bg-[var(--color-sidebar-text-muted)]`}
                      />
                      {y.year}
                    </span>
                    <span className="text-[var(--color-sidebar-text-muted)]">
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open && (
                    <ul className="pb-2">
                      {y.items.map((s) => {
                        const active = currentId === s.id;
                        return (
                          <li key={s.id}>
                            <Link
                              href={`/stories/${s.id}`}
                              onClick={() => setMobileOpen(false)}
                              className={`block pl-10 pr-4 py-1.5 text-xs leading-tight truncate ${active ? "font-bold text-[var(--color-text)]" : "text-[var(--color-text-soft)] hover:text-[var(--color-text)]"}`}
                              title={s.subject}
                            >
                              {s.subject}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
            {years.length === 0 && (
              <p className="px-4 py-6 text-xs text-[var(--color-text-muted)]">
                목차를 불러올 수 없습니다.
              </p>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
