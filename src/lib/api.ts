import storiesJson from "@/data/stories.json";
import type { StoryDetail, StoryListItem } from "./types";

const stories = storiesJson as StoryDetail[];

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
