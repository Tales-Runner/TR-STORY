import type { StoryListItem } from "./types";

// "웹툰"/"영상" 은 카테고리 표식이라 시리즈 식별에 쓸 수 없고, "OST" 도
// 같은 의미의 장르 태그 — 언더월드/라라 양쪽에 OST 가 붙어있어 시리즈
// 키로 잡으면 라라 OST 가 언더월드로 흘러가버림. 실제 시리즈명은 OST 뒤에
// 따로 붙어있으니 OST 도 generic 으로 처리.
const GENERIC_TAGS = new Set(["웹툰", "영상", "OST", ""]);

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

/**
 * 시리즈 카드의 대표 이미지로 강제 지정할 회차 id 매핑.
 *
 * 기본 동작은 "그 시리즈의 가장 최신 회차 썸네일"을 자동 사용하지만, "캐릭터
 * 스토리"처럼 회차들이 서로 무관한 단편 모음인 시리즈는 최신 회차 한 명을
 * 시리즈 전체의 얼굴로 쓰기 어색함. 대표성 있는 회차 id 를 여기에 박아 둠.
 * (해당 id 가 현재 필터 결과에 없으면 그냥 최신 fallback.)
 */
export const SERIES_REPRESENTATIVE_ID: Record<string, number> = {
  "캐릭터 스토리": 238, // 7th 마키
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
