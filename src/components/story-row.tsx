import Link from "next/link";
import { formatDate } from "@/lib/format";
import { STORY_CATEGORY_LABEL } from "@/lib/types";
import type { StoryListItem } from "@/lib/types";

const CATEGORY_BG: Record<number, string> = {
  1: "bg-[var(--color-brand)]",
  2: "bg-rose-500",
};

export function StoryRow({ story }: { story: StoryListItem }) {
  const label = STORY_CATEGORY_LABEL[story.category] ?? "기타";
  return (
    <Link
      href={`/stories/${story.id}`}
      className="grid grid-cols-[110px_60px_1fr_auto] items-center gap-4 rounded-xl bg-white border border-[var(--color-border)] px-5 py-4 transition hover:border-[var(--color-brand)]/40 hover:shadow-sm"
    >
      <span className="text-sm text-[var(--color-text-muted)]">
        {formatDate(story.openDt)}
      </span>
      <span
        className={`justify-self-start rounded-md text-white text-xs font-bold px-2 py-1 ${CATEGORY_BG[story.category] ?? "bg-slate-500"}`}
      >
        {label}
      </span>
      <span className="text-sm font-bold text-[var(--color-text)] truncate">
        {story.subject}
      </span>
      <span className="hidden md:block text-xs text-[var(--color-text-muted)] truncate max-w-[260px]">
        {story.hashTagSubject}
      </span>
    </Link>
  );
}
