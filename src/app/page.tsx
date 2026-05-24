import { fetchStoryList } from "@/lib/api";
import { HomeShell } from "@/components/home-shell";

export const revalidate = 1800;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; year?: string }>;
}) {
  const { q, cat, year } = await searchParams;
  let stories;
  try {
    stories = await fetchStoryList();
  } catch (err) {
    return (
      <div className="px-4 py-10">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          스토리 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          <p className="mt-2 text-xs text-rose-500">
            {err instanceof Error ? err.message : String(err)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <HomeShell
      stories={stories}
      initialQuery={q ?? ""}
      initialCat={cat ?? "all"}
      initialYear={year}
    />
  );
}
