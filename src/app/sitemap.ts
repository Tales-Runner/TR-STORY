import type { MetadataRoute } from "next";
import { fetchStoryList } from "@/lib/api";
import { siteUrl } from "@/lib/constants";
import { getSeriesPages, seriesPath } from "@/lib/series-pages";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const list = await fetchStoryList();

  const home: MetadataRoute.Sitemap[0] = {
    url: siteUrl(),
    changeFrequency: "daily",
    priority: 1,
  };

  // Publication dates and build times are not reliable page modification dates.
  const stories: MetadataRoute.Sitemap = list.map(({ id }) => ({
      url: siteUrl(`/stories/${id}/`),
      changeFrequency: "monthly",
      priority: 0.8,
    }));
  const series: MetadataRoute.Sitemap = getSeriesPages(list).map(({ label }) => ({
    url: siteUrl(seriesPath(label)), changeFrequency: "monthly", priority: 0.9,
  }));

  return [home, ...series, ...stories];
}
