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
  /** False = 본 미러에 패널 이미지가 없으므로 클릭 시 공식 페이지로 폴백. */
  hasImages: boolean;
}

export interface StoryImage {
  imageUrl: string;
  movieUrl: string | null;
  viewOrder: number;
}

export interface StoryDetail extends StoryListItem {
  images: StoryImage[];
}
