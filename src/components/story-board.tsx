"use client";

import { useMemo, useState } from "react";
import type { StoryListItem } from "@/lib/types";
import { ViewToggle, type ViewMode } from "./view-toggle";
import { StoryCard } from "./story-card";
import { StoryRow } from "./story-row";

interface YearGroup {
  year: string;
  items: StoryListItem[];
}

function groupByYear(stories: StoryListItem[]): YearGroup[] {
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

export function StoryBoard({
  stories,
  searchQuery,
  category,
}: {
  stories: StoryListItem[];
  searchQuery?: string;
  category?: string;
}) {
  const [mode, setMode] = useState<ViewMode>("image");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    let list = stories;
    if (category && category !== "all") {
      const cat = Number(category);
      list = list.filter((s) => s.category === cat);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.subject.toLowerCase().includes(q) ||
          s.hashTagSubject.toLowerCase().includes(q)
      );
    }
    return list;
  }, [stories, searchQuery, category]);

  const groups = useMemo(() => groupByYear(filtered), [filtered]);

  function toggle(year: string) {
    setCollapsed((p) => ({ ...p, [year]: !p[year] }));
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-text-muted)]">
          조건에 맞는 결과가 없습니다.
        </div>
      ) : (
        groups.map((g) => {
          const isCollapsed = !!collapsed[g.year];
          return (
            <section key={g.year} className="mb-10">
              <button
                onClick={() => toggle(g.year)}
                className="flex items-center gap-2 mb-4 text-xl lg:text-2xl font-bold text-[var(--color-text)]"
                aria-expanded={!isCollapsed}
              >
                {g.year}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className={`transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                  fill="none"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {!isCollapsed &&
                (mode === "image" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {g.items.map((s) => (
                      <StoryCard key={s.id} story={s} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {g.items.map((s) => (
                      <StoryRow key={s.id} story={s} />
                    ))}
                  </div>
                ))}
            </section>
          );
        })
      )}
    </div>
  );
}
