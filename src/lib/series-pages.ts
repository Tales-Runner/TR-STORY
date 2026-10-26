import { seriesLabel } from "./series";
import type { StoryListItem } from "./types";

export function seriesSlug(label: string): string {
  return label.normalize("NFC").trim().replace(/\s+/g, "-");
}

export function seriesPath(label: string): string {
  return `/series/${encodeURIComponent(seriesSlug(label))}/`;
}

export function getSeriesPages(stories: StoryListItem[]) {
  const groups = new Map<string, StoryListItem[]>();
  for (const story of stories) {
    const label = seriesLabel(story) ?? "기타";
    const group = groups.get(label) ?? [];
    group.push(story);
    groups.set(label, group);
  }
  return Array.from(groups, ([label, episodes]) => ({
    label,
    slug: seriesSlug(label),
    episodes: episodes.sort((a, b) => a.openDt.localeCompare(b.openDt) || a.id - b.id),
  }));
}

export function seriesDescription(label: string, count: number): string {
  return `테일즈런너 ${label} 회차 목록. 웹툰·영상 ${count}편, 공개순 정렬, 이어 읽기와 책갈피. 테런 스토리 비공식 모바일 뷰어.`;
}
