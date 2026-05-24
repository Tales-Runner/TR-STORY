# TR Story

테일즈런너 공식 라이브러리의 *웹툰/스토리*만 가볍게 따로 보기 위한 비공식 미러.

## Currently implemented
- 연도별 스토리 목록 (이미지 / 리스트 토글)
- 카테고리 필터 (웹툰 / 영상) + 키워드 검색
- 세로 스크롤 웹툰 뷰어 (lazy load, 이전·다음·맨위·맨아래 fab)
- 좌측 사이드바: 연도 트리, 현재 회차 하이라이트
- 데이터는 빌드 타임 정적 페치가 아닌 **런타임 API 프록시** — `/api/stories/list`, `/api/stories/detail/[id]` 를 거쳐 `tr.rhaon.co.kr/webb` 에서 가져옴 (30분 ISR)

## Planned
- 즐겨찾기 / 읽음 표시 (로컬 IndexedDB)
- 이미지 확대 및 밝기 조절
- 모바일 사이드바 제스처

## Design intent
- 공식 페이지(https://tr.game.onstove.com/archive/trstory)와 사이드바·카드 그리드·"웹툰" 보라 배지·연도 헤딩 등의 픽셀 톤을 가깝게 따라가되, 코드는 독립 미러로 분리하여 tr-archive 와의 결합을 끊는다.
- tr-archive 의 학자 페르소나(엘림스/R) 코멘트나 IndexedDB 의존성 등은 제거하여 **순수 뷰어**로만 동작.

## Non-goals
- 캐릭터·맵·코스튬·확률 정보 등 tr-archive 의 나머지 도메인은 다루지 않음.
- 비로그인 사용자만 대상. 계정·소셜 기능 없음.
- 원본 이미지 호스팅을 대체하지 않음 — 모든 미디어는 `trimage.rhaon.co.kr` 직링.

## Redacted
- 외부 인물·계정·내부 사례는 본 저장소에서 다루지 않는다.

## Stack
- Next.js 16 (App Router) / React 19 / Tailwind CSS 4
- TypeScript, Pretendard

## Local dev
```bash
npm install
npm run dev
```
서버는 기본적으로 `http://localhost:3000` 에서 뜬다. 첫 진입 시 30분 캐시 채우기 위해 약 1초 지연이 있을 수 있다.

## Disclaimer
- 본 프로젝트는 **비공식 미러**이며, 모든 콘텐츠 권리는 RHAON Entertainment 및 Blomics 에 있다.
- 공식 페이지에서 직접 보기는: <https://tr.game.onstove.com/archive/trstory>
