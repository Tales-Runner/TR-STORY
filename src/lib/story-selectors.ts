import type { StoryEntry } from "./db";
import { seriesLabel, SERIES_REPRESENTATIVE_ID } from "./series";
import type { StoryDetail, StoryListItem } from "./types";

export type SortOrder = "desc" | "asc";

export interface YearGroup {
  label: string;
  items: StoryListItem[];
}

export interface SeriesCardData {
  label: string;
  count: number;
  totalCount: number;
  readCount: number;
  latestDt: string;
  latestThumbnail: string;
  sampleStory: StoryListItem;
}

export interface TimedStory {
  story: StoryListItem;
  at: number;
}

export interface ReadTimelineGroup {
  date: string;
  items: TimedStory[];
}

function rankYearLabel(label: string): [number, string] {
  const m = label.match(/^(\d{4})/);
  if (m) return [0, m[1]];
  return [1, label];
}

export function groupByYear(stories: StoryListItem[]): YearGroup[] {
  const map = new Map<string, StoryListItem[]>();
  for (const s of stories) {
    const arr = map.get(s.openYear) ?? [];
    arr.push(s);
    map.set(s.openYear, arr);
  }
  return [...map.entries()]
    .map(([label, items]) => ({
      label,
      items: items.slice().sort((a, b) => b.openDt.localeCompare(a.openDt)),
    }))
    .sort((a, b) => {
      const [ra, ka] = rankYearLabel(a.label);
      const [rb, kb] = rankYearLabel(b.label);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return kb.localeCompare(ka);
      return ka.localeCompare(kb);
    });
}

export function mapStoriesById(
  stories: StoryListItem[]
): Map<number, StoryListItem> {
  const map = new Map<number, StoryListItem>();
  for (const s of stories) map.set(s.id, s);
  return map;
}

export function getSeriesCounts(
  stories: StoryListItem[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of stories) {
    const k = seriesLabel(s);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function getSeriesReadCounts(
  stories: StoryListItem[],
  readIds: Set<number>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of stories) {
    const k = seriesLabel(s);
    if (!k || !readIds.has(s.id)) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function getSeriesChoices(stories: StoryListItem[]): string[] {
  const latest = new Map<string, string>();
  for (const s of stories) {
    const k = seriesLabel(s);
    if (!k) continue;
    const cur = latest.get(k);
    if (!cur || s.openDt > cur) latest.set(k, s.openDt);
  }
  return [...latest.entries()]
    .sort((a, b) => {
      if (a[0] === "캐릭터 스토리") return 1;
      if (b[0] === "캐릭터 스토리") return -1;
      return b[1].localeCompare(a[1]);
    })
    .map(([label]) => label);
}

export function filterStories({
  stories,
  yearFilter,
  seriesFilter,
  query,
  unreadOnly,
  continueOnly,
  bookmarkOnly,
  ready,
  readIds,
  bookmarkIds,
  progress,
}: {
  stories: StoryListItem[];
  yearFilter: string;
  seriesFilter: string;
  query: string;
  unreadOnly: boolean;
  continueOnly: boolean;
  bookmarkOnly: boolean;
  ready: boolean;
  readIds: Set<number>;
  bookmarkIds: Set<number>;
  progress: Map<number, number>;
}): StoryListItem[] {
  let list = stories;
  if (yearFilter !== "all") {
    list = list.filter((s) => s.openYear === yearFilter);
  }
  if (seriesFilter !== "all") {
    list = list.filter((s) => seriesLabel(s) === seriesFilter);
  }
  if (query.trim()) {
    const key = query.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.subject.toLowerCase().includes(key) ||
        s.hashTagSubject.toLowerCase().includes(key)
    );
  }
  if (unreadOnly && ready) {
    list = list.filter((s) => !readIds.has(s.id));
  }
  if (continueOnly && ready) {
    list = list.filter((s) => {
      const p = progress.get(s.id) ?? 0;
      return p > 0.02 && p < 0.95 && !readIds.has(s.id);
    });
  }
  if (bookmarkOnly && ready) {
    list = list.filter((s) => bookmarkIds.has(s.id));
  }
  return list;
}

export function getContinueReading(
  stories: StoryListItem[],
  progress: Map<number, number>,
  readIds: Set<number>,
  limit: number
): StoryListItem[] {
  return stories
    .filter((s) => {
      const p = progress.get(s.id) ?? 0;
      return p > 0.02 && p < 0.95 && !readIds.has(s.id);
    })
    .sort((a, b) => (progress.get(b.id) ?? 0) - (progress.get(a.id) ?? 0))
    .slice(0, limit);
}

function isSentinelSeries(label: string): boolean {
  return label === "캐릭터 스토리" || label === "기타";
}

export function getSeriesCards({
  filtered,
  readIds,
  seriesCounts,
  sort,
}: {
  filtered: StoryListItem[];
  readIds: Set<number>;
  seriesCounts: Map<string, number>;
  sort: SortOrder;
}): SeriesCardData[] {
  const buckets = new Map<string, StoryListItem[]>();
  for (const s of filtered) {
    const k = seriesLabel(s) ?? "기타";
    const arr = buckets.get(k) ?? [];
    arr.push(s);
    buckets.set(k, arr);
  }

  const result: SeriesCardData[] = [];
  for (const [label, items] of buckets) {
    const sorted = items
      .slice()
      .sort((a, b) => b.openDt.localeCompare(a.openDt));
    const latest = sorted[0];
    const overrideId = SERIES_REPRESENTATIVE_ID[label];
    const rep =
      (overrideId !== undefined && sorted.find((s) => s.id === overrideId)) ||
      latest;
    const readInFiltered = sorted.reduce(
      (acc, s) => (readIds.has(s.id) ? acc + 1 : acc),
      0
    );
    result.push({
      label,
      count: sorted.length,
      totalCount: seriesCounts.get(label) ?? sorted.length,
      readCount: readInFiltered,
      latestDt: latest.openDt,
      latestThumbnail: rep.thumbnail,
      sampleStory: rep,
    });
  }

  result.sort((a, b) => {
    const aSent = isSentinelSeries(a.label);
    const bSent = isSentinelSeries(b.label);
    if (aSent !== bSent) return aSent ? 1 : -1;
    return sort === "asc"
      ? a.latestDt.localeCompare(b.latestDt)
      : b.latestDt.localeCompare(a.latestDt);
  });
  return result;
}

export function groupVisibleStories(
  filtered: StoryListItem[],
  sort: SortOrder,
  visibleCount: number
): YearGroup[] {
  const slice =
    sort === "asc"
      ? filtered.slice().reverse().slice(0, visibleCount)
      : filtered.slice(0, visibleCount);
  const groups = groupByYear(slice);
  if (sort !== "asc") return groups;
  return groups
    .slice()
    .reverse()
    .map((group) => ({
      ...group,
      items: group.items.slice().reverse(),
    }));
}

export function getTimedStories(
  entries: StoryEntry[],
  storyById: Map<number, StoryListItem>,
  field: "bookmarkedAt" | "favoritedAt"
): TimedStory[] {
  return entries
    .filter((e) => (e[field] ?? 0) > 0)
    .sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))
    .map((e) => ({ story: storyById.get(e.id), at: e[field] ?? 0 }))
    .filter((x): x is TimedStory => !!x.story);
}

export function getReadTimeline(
  entries: StoryEntry[],
  storyById: Map<number, StoryListItem>
): ReadTimelineGroup[] {
  const byDate = new Map<string, TimedStory[]>();
  for (const e of entries) {
    if (!(e.readAt > 0)) continue;
    const story = storyById.get(e.id);
    if (!story) continue;
    const d = new Date(e.readAt);
    const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}.${String(d.getDate()).padStart(2, "0")}`;
    const arr = byDate.get(key) ?? [];
    arr.push({ story, at: e.readAt });
    byDate.set(key, arr);
  }
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => b.at - a.at),
    }));
}

export function getSeriesProgress(
  stories: StoryListItem[],
  readIds: Set<number>
): Array<{ label: string; total: number; read: number; percent: number }> {
  const total = new Map<string, number>();
  const read = new Map<string, number>();
  for (const s of stories) {
    const k = seriesLabel(s);
    if (!k) continue;
    total.set(k, (total.get(k) ?? 0) + 1);
    if (readIds.has(s.id)) read.set(k, (read.get(k) ?? 0) + 1);
  }
  return [...total.entries()]
    .map(([label, t]) => ({
      label,
      total: t,
      read: read.get(label) ?? 0,
      percent: Math.round(((read.get(label) ?? 0) / t) * 100),
    }))
    .filter((x) => x.read > 0)
    .sort((a, b) => b.percent - a.percent);
}

export function getStoryNavigation(
  detail: StoryDetail,
  list: StoryListItem[]
): { siblings: StoryListItem[]; yearLabel: string } {
  const navPool = list.filter((s) => s.hasImages || s.id === detail.id);
  const seriesKey = seriesLabel(detail);
  const seriesSiblings = seriesKey
    ? navPool
        .filter((s) => seriesLabel(s) === seriesKey)
        .slice()
        .sort((a, b) => a.openDt.localeCompare(b.openDt))
    : [];
  const useSeriesNav = seriesSiblings.length >= 2;
  const siblings = useSeriesNav
    ? seriesSiblings
    : navPool
        .filter((s) => s.openYear === detail.openYear)
        .slice()
        .sort((a, b) => a.openDt.localeCompare(b.openDt));
  return {
    siblings,
    yearLabel: useSeriesNav ? seriesKey ?? detail.openYear : detail.openYear,
  };
}
