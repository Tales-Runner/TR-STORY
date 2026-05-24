import storiesJson from "@/data/stories.json";
import metaJson from "@/data/data-meta.json";
import type { StoryDetail, StoryListItem } from "./types";

const stories = storiesJson as StoryDetail[];

export interface DataMeta {
  /** ISO8601 timestamp of last fetch-data run. */
  updatedAt: string;
  totalCount: number;
  /** YYYYMMDD of newest story in the snapshot. */
  latestOpenDt: string | null;
}

export const dataMeta = metaJson as DataMeta;

export function fetchStoryList(): Promise<StoryListItem[]> {
  return Promise.resolve(
    stories.map<StoryListItem>((s) => ({
      id: s.id,
      subject: s.subject,
      category: s.category,
      openDt: s.openDt,
      openYear: s.openYear,
      hashTagSubject: s.hashTagSubject,
      thumbnail: s.thumbnail,
    }))
  );
}

export function fetchStoryDetail(id: number): Promise<StoryDetail | null> {
  const hit = stories.find((s) => s.id === id) ?? null;
  return Promise.resolve(hit);
}

export function listAllIds(): number[] {
  return stories.map((s) => s.id);
}
