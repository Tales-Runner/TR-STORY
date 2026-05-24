import { Suspense } from "react";
import { fetchStoryList } from "@/lib/api";
import { HomeShell } from "@/components/home-shell";

export default async function HomePage() {
  const stories = await fetchStoryList();
  return (
    <Suspense
      fallback={
        <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
          불러오는 중…
        </div>
      }
    >
      <HomeShell stories={stories} />
    </Suspense>
  );
}
