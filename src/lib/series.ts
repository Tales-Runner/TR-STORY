import type { StoryListItem } from "./types";

const GENERIC_TAGS = new Set(["웹툰", "영상", ""]);

/**
 * hashTagSubject 토큰 → 표시용 시리즈 라벨 매핑.
 *
 * 데이터 표기와 사용자 친화 표기가 어긋나는 케이스, 그리고 한 시리즈가 여러
 * hashTag 로 흩어진 케이스(예: "테일즈"/"테일즈 시크릿", "OST" 가 언더월드
 * OST)를 한 축으로 합쳐 보여주기 위한 맵. home-shell, my-page-shell,
 * stories/[id] 모두 같은 정의를 써야 시리즈 진행률·prev/next 네비게이션이
 * 일치한다.
 */
export const SERIES_TAG_TO_LABEL: Record<string, string> = {
  "테일즈아틀리에": "테일즈 아틀리에",
  "DashJump": "DashJump",
  "라스트카오스": "라스트 카오스",
  "데저트 킹덤": "데저트 킹덤",
  "도화연가": "도화연가",
  "바우나비 아일랜드": "바우나비 아일랜드",
  "차원관리국": "차원관리국",
  "저승컴퍼니": "저승컴퍼니",
  "이클립스": "이클립스",
  "감정의 제도": "감정의 제도",
  "테일즈 드림": "테일즈 드림",
  "언더월드": "언더월드",
  "테일즈 시크릿": "테일즈 시크릿",
  "테일즈": "테일즈 시크릿",
  "OST": "언더월드",
  "체이서": "체이서, 그 후 이야기",
  "이매망량": "이매망량",
  "테일즈프론티어": "테일즈 프론티어",
  "하랑": "하랑의 이야기",
  "라라": "라라의 이야기",
  "테일즈 아카데미": "라라in 테일즈 아카데미",
  "카오스제로": "카오스 제로",
  "시즌1": "시즌1 에필로그",
  "테런어드벤처": "테런어드벤처",
  "캐릭터 스토리": "캐릭터 스토리",
  "카오스 어둠의 날개": "카오스 어둠의 날개",
  "카오스대반격": "카오스 대반격",
  "카오스 냉기의 얼음산맥": "카오스 냉기의 얼음산맥",
  "카오스 새로운 시작": "카오스 새로운 시작",
  "카오스제너레이션": "카오스 제너레이션",
};

export function rawSeriesKey(story: StoryListItem): string | null {
  // "캐릭터 스토리" 묶음은 hashTag 가 아니라 openYear 로 판단.
  if (story.openYear === "캐릭터 스토리") return "캐릭터 스토리";
  for (const t of story.hashTagSubject.split(",")) {
    const k = t.trim();
    if (k && !GENERIC_TAGS.has(k)) return k;
  }
  return null;
}

export function seriesLabel(story: StoryListItem): string | null {
  const raw = rawSeriesKey(story);
  if (!raw) return null;
  return SERIES_TAG_TO_LABEL[raw] ?? raw;
}
