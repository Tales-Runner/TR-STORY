export type StoryCategory = 1 | 2;

export const STORY_CATEGORY = { WEBTOON: 1, VIDEO: 2 } as const;

export const STORY_CATEGORY_LABEL: Record<number, string> = {
  [STORY_CATEGORY.WEBTOON]: "웹툰",
  [STORY_CATEGORY.VIDEO]: "영상",
};

export interface StoryListItem {
  id: number;
  subject: string;
  category: number;
  openDt: string;
  openYear: string;
  hashTagSubject: string;
  thumbnail: string;
}

export interface StoryImage {
  imageUrl: string;
  movieUrl: string | null;
  viewOrder: number;
}

export interface StoryDetail extends StoryListItem {
  images: StoryImage[];
}
