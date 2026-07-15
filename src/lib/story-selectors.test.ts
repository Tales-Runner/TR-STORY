import { describe, expect, it } from "vitest";
import type { StoryEntry } from "./db";
import {
  filterStories,
  getContinueReading,
  getReadTimeline,
  getSeriesCards,
  getSeriesCounts,
  getSeriesReadCounts,
  getSeriesProgress,
  getStoryNavigation,
  getTimedStories,
  groupVisibleStories,
  mapStoriesById,
} from "./story-selectors";
import type { StoryDetail, StoryListItem } from "./types";

function story(overrides: Partial<StoryListItem> = {}): StoryListItem {
  return {
    id: 1,
    subject: "기본 회차",
    category: 1,
    openDt: "20260101",
    openYear: "2026",
    hashTagSubject: "웹툰,라라",
    thumbnail: "https://trimage.rhaon.co.kr/a.jpg",
    hasImages: true,
    ...overrides,
  };
}

function detail(overrides: Partial<StoryDetail> = {}): StoryDetail {
  const base = story(overrides);
  return {
    ...base,
    images: [],
    ...overrides,
  };
}

describe("story selectors", () => {
  const stories = [
    story({
      id: 1,
      subject: "라라 첫 번째",
      openDt: "20240101",
      openYear: "2024",
      hashTagSubject: "웹툰,라라",
    }),
    story({
      id: 2,
      subject: "라라 두 번째",
      openDt: "20250101",
      openYear: "2025",
      hashTagSubject: "웹툰,라라",
    }),
    story({
      id: 3,
      subject: "언더월드",
      openDt: "20250201",
      openYear: "2025",
      hashTagSubject: "웹툰,언더월드",
    }),
    story({
      id: 4,
      subject: "공식 전용",
      openDt: "20250301",
      openYear: "2025",
      hashTagSubject: "웹툰,라라",
      hasImages: false,
    }),
  ];

  it("filters by year, series, query, unread, continuation and bookmark state", () => {
    const readIds = new Set([2]);
    const bookmarkIds = new Set([3]);
    const progress = new Map([
      [1, 0.4],
      [2, 0.5],
      [3, 0.6],
    ]);

    expect(
      filterStories({
        stories,
        yearFilter: "2025",
        seriesFilter: "라라의 이야기",
        query: "두 번째",
        unreadOnly: false,
        continueOnly: false,
        bookmarkOnly: false,
        ready: true,
        readIds,
        bookmarkIds,
        progress,
      }).map((s) => s.id)
    ).toEqual([2]);

    expect(
      filterStories({
        stories,
        yearFilter: "all",
        seriesFilter: "all",
        query: "",
        unreadOnly: true,
        continueOnly: false,
        bookmarkOnly: false,
        ready: true,
        readIds,
        bookmarkIds,
        progress,
      }).map((s) => s.id)
    ).toEqual([1, 3, 4]);

    expect(
      filterStories({
        stories,
        yearFilter: "all",
        seriesFilter: "all",
        query: "",
        unreadOnly: false,
        continueOnly: true,
        bookmarkOnly: false,
        ready: true,
        readIds,
        bookmarkIds,
        progress,
      }).map((s) => s.id)
    ).toEqual([1, 3]);

    expect(
      filterStories({
        stories,
        yearFilter: "all",
        seriesFilter: "all",
        query: "",
        unreadOnly: false,
        continueOnly: false,
        bookmarkOnly: true,
        ready: true,
        readIds,
        bookmarkIds,
        progress,
      }).map((s) => s.id)
    ).toEqual([3]);
  });

  it("selects continue-reading stories by progress and unread state", () => {
    const progress = new Map([
      [1, 0.4],
      [2, 0.9],
      [3, 0.01],
      [4, 0.96],
    ]);

    expect(getContinueReading(stories, progress, new Set([2]), 4).map((s) => s.id))
      .toEqual([1]);
  });

  it("builds series cards and progress from shared series definitions", () => {
    const readIds = new Set([1, 3]);
    const seriesCounts = getSeriesCounts(stories);
    const seriesReadCounts = getSeriesReadCounts(stories, readIds);
    const cards = getSeriesCards({
      filtered: stories,
      seriesCounts,
      seriesReadCounts,
      sort: "desc",
    });

    expect(cards.map((c) => [c.label, c.count, c.readCount])).toEqual([
      ["라라의 이야기", 3, 1],
      ["언더월드", 1, 1],
    ]);
    expect(getSeriesProgress(stories, readIds)).toEqual([
      { label: "언더월드", total: 1, read: 1, percent: 100 },
      { label: "라라의 이야기", total: 3, read: 1, percent: 33 },
    ]);
  });

  it("series card counts read/total series-wide, not just within the filtered view", () => {
    const readIds = new Set([1, 3]); // 라라 id1 · 언더월드 id3 읽음
    const seriesCounts = getSeriesCounts(stories);
    const seriesReadCounts = getSeriesReadCounts(stories, readIds);
    // 필터로 라라 시리즈 중 "안 읽은" 회차 하나(id 2)만 남긴 상황
    const filtered = stories.filter((s) => s.id === 2);
    const cards = getSeriesCards({
      filtered,
      seriesCounts,
      seriesReadCounts,
      sort: "desc",
    });
    const lara = cards.find((c) => c.label === "라라의 이야기");
    expect(lara?.count).toBe(1); // 화면에 보이는 건 1편
    expect(lara?.totalCount).toBe(3); // 시리즈 전체는 3편
    expect(lara?.readCount).toBe(1); // 전역 읽음 1편 (filtered 스코프였다면 0)
  });

  it("groups visible stories using the selected sort direction", () => {
    const newestFirst = [stories[3], stories[2], stories[1], stories[0]];

    expect(groupVisibleStories(newestFirst, "desc", 2)).toEqual([
      { label: "2025", items: [stories[3], stories[2]] },
    ]);
    expect(groupVisibleStories(newestFirst, "asc", 2)).toEqual([
      { label: "2024", items: [stories[0]] },
      { label: "2025", items: [stories[1]] },
    ]);
  });

  it("derives personal-library timelines from raw IndexedDB entries", () => {
    const storyById = mapStoriesById(stories);
    const entries: StoryEntry[] = [
      { id: 1, readAt: Date.UTC(2026, 0, 2, 12), bookmarkedAt: 10 },
      { id: 2, readAt: Date.UTC(2026, 0, 2, 13), favoritedAt: 20 },
      { id: 999, readAt: Date.UTC(2026, 0, 1, 13), bookmarkedAt: 30 },
    ];

    expect(getTimedStories(entries, storyById, "bookmarkedAt")).toEqual([
      { story: stories[0], at: 10 },
    ]);
    expect(getTimedStories(entries, storyById, "favoritedAt")).toEqual([
      { story: stories[1], at: 20 },
    ]);
    expect(getReadTimeline(entries, storyById)).toEqual([
      {
        date: "2026.01.02",
        items: [
          { story: stories[1], at: Date.UTC(2026, 0, 2, 13) },
          { story: stories[0], at: Date.UTC(2026, 0, 2, 12) },
        ],
      },
    ]);
  });

  it("prefers same-series navigation and excludes official-only siblings", () => {
    const { siblings, yearLabel } = getStoryNavigation(
      detail({
        id: 1,
        subject: "라라 첫 번째",
        openDt: "20240101",
        openYear: "2024",
        hashTagSubject: "웹툰,라라",
      }),
      stories
    );

    expect(yearLabel).toBe("라라의 이야기");
    expect(siblings.map((s) => s.id)).toEqual([1, 2]);
  });
});
