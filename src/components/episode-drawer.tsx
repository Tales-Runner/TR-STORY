"use client";

import { useEffect, useRef } from "react";
import { formatDate } from "@/lib/format";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type { StoryListItem } from "@/lib/types";

export function EpisodeDrawer({
  yearLabel,
  episodes,
  currentId,
  readIds,
  onSelect,
  onClose,
}: {
  yearLabel: string;
  episodes: StoryListItem[];
  currentId: number;
  readIds: Set<number>;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = `episode-drawer-title-${yearLabel}`;

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector('[data-current="true"]')
        ?.scrollIntoView({ block: "center" });
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useFocusTrap(true, rootRef);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl bg-[#13101f] border-t border-white/10 overflow-hidden animate-slide-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#13101f] px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 id={titleId} className="text-sm font-bold text-white/85">
              {yearLabel}
            </h3>
            <p className="text-xs text-white/40">{episodes.length}편</p>
          </div>
          <button
            onClick={onClose}
            aria-label="회차 목록 닫기"
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 min-h-[44px] flex items-center"
          >
            닫기
          </button>
        </div>
        <div
          ref={listRef}
          className="overflow-y-auto max-h-[calc(70vh-56px)] p-2"
        >
          {episodes.map((ep, i) => {
            const active = ep.id === currentId;
            const read = readIds.has(ep.id);
            return (
              <button
                key={ep.id}
                data-current={active}
                onClick={() => {
                  onSelect(ep.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-[var(--color-brand)]/20 border border-[var(--color-brand)]/40"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <span
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    active
                      ? "bg-[var(--color-brand)] text-white"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  {episodes.length - i}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm truncate ${
                        active
                          ? "font-bold text-white"
                          : read
                            ? "text-white/50"
                            : "text-white/85"
                      }`}
                    >
                      {ep.subject}
                    </p>
                    {read && !active && (
                      <span
                        className="text-[10px] text-[var(--color-brand-soft)]/70 shrink-0"
                        aria-label="읽음"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/35">
                    {formatDate(ep.openDt)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
