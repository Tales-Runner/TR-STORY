import { describe, expect, it } from "vitest";
import stories from "../data/stories.json";
import { absoluteSiteUrl, normalizeSiteUrl } from "./site-url";
import { getSeriesPages, seriesPath } from "./series-pages";
import { localListPath } from "./list-navigation";

describe("searchable routes across deployment hosts", () => {
  it("preserves the Pages prefix and supports a root-domain deployment", () => {
    expect(absoluteSiteUrl("https://tales-runner.github.io/TR-STORY/", "/stories/260/"))
      .toBe("https://tales-runner.github.io/TR-STORY/stories/260/");
    expect(absoluteSiteUrl("https://example.vercel.app/", "/stories/260/"))
      .toBe("https://example.vercel.app/stories/260/");
    for (const url of ["javascript:alert(1)", "https://example.com/?bad=1", "https://user:pass@example.com/"]) {
      expect(() => normalizeSiteUrl(url)).toThrow();
    }
  });

  it("gives every episode one discoverable series with a unique path", () => {
    const pages = getSeriesPages(stories.map((story) => ({ ...story, hasImages: story.images.length > 0 })));
    expect(new Set(pages.map(({ label }) => seriesPath(label))).size).toBe(pages.length);
    expect(pages.flatMap(({ episodes }) => episodes)).toHaveLength(stories.length);
    for (const page of pages) {
      expect(decodeURIComponent(seriesPath(page.label))).toBe(`/series/${page.slug}/`);
      const dates = page.episodes.map((episode) => episode.openDt);
      expect(dates).toEqual([...dates].sort());
    }
  });

  it("returns to a series without accepting external or malformed destinations", () => {
    const path = seriesPath("테일즈 아틀리에");
    expect(localListPath(`/TR-STORY${path}`, "/TR-STORY")).toBe(path);
    expect(localListPath(path, "")).toBe(path);
    for (const invalid of ["/other/series/a/", "/TR-STORY/series/a/b/", "/TR-STORY/series/../../admin/", "//evil.test/series/a/"]) {
      expect(localListPath(invalid, "/TR-STORY")).toBeNull();
    }
  });
});
