import type { MetadataRoute } from "next";
import { listAllIds, fetchStoryList } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const list = await fetchStoryList().catch(() => []);
  const byId = new Map(list.map((s) => [s.id, s.openDt]));

  const home: MetadataRoute.Sitemap[0] = {
    url: `${SITE_URL}/`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  };

  const stories: MetadataRoute.Sitemap = listAllIds().map((id) => {
    const dt = byId.get(id);
    // openDt is YYYYMMDD; convert to YYYY-MM-DD for sitemap lastmod.
    const lastModified = dt
      ? new Date(`${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`)
      : undefined;
    return {
      url: `${SITE_URL}/stories/${id}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    };
  });

  return [home, ...stories];
}
