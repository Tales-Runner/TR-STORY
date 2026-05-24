import { fetchStoryList } from "@/lib/api";
import { StoryBoard } from "@/components/story-board";

export const revalidate = 1800;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  let stories;
  try {
    stories = await fetchStoryList();
  } catch (err) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        스토리 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        <p className="mt-2 text-xs text-rose-500">
          {err instanceof Error ? err.message : String(err)}
        </p>
      </div>
    );
  }

  return <StoryBoard stories={stories} searchQuery={q} category={cat} />;
}
