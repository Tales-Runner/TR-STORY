import Link from "next/link";
import { formatDate, parseHashTags } from "@/lib/format";
import { STORY_CATEGORY_LABEL } from "@/lib/types";
import type { StoryListItem } from "@/lib/types";

const CATEGORY_BG: Record<number, string> = {
  1: "bg-[var(--color-brand)]",
  2: "bg-rose-500",
};

export function StoryCard({ story }: { story: StoryListItem }) {
  const label = STORY_CATEGORY_LABEL[story.category] ?? "기타";
  const tags = parseHashTags(story.hashTagSubject);
  return (
    <Link
      href={`/stories/${story.id}`}
      className="group block rounded-xl bg-white border border-[var(--color-border)] overflow-hidden transition hover:shadow-md hover:border-[var(--color-brand)]/40"
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-[var(--color-surface-alt)]">
        {story.thumbnail && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={story.thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition group-hover:scale-[1.02]"
          />
        )}
        <span
          className={`absolute top-3 left-3 rounded-md text-white text-xs font-bold px-2 py-1 ${CATEGORY_BG[story.category] ?? "bg-slate-500"}`}
        >
          {label}
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs text-[var(--color-text-muted)] mb-1">
          {formatDate(story.openDt)}
        </p>
        <h3 className="text-sm font-bold text-[var(--color-text)] line-clamp-2 mb-3 min-h-[2.5em]">
          {story.subject}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] truncate">
          {tags.join(", ")}
        </p>
      </div>
    </Link>
  );
}
