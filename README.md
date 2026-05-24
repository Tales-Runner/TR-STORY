# TR Story

테일즈런너 웹툰/스토리를 **모바일에서 편하게 보기 위한** 비공식 뷰어.
공식 페이지(`tr.game.onstove.com/archive/trstory`)는 데스크탑
사이드바·그리드를 그대로 모바일에 욱여넣어 한 손 감상이 어렵다.
TR Story 는 정렬·메타데이터·색감 등 공식 톤은 유지하면서 UI를
모바일 풍 하나로 통일했다.

라이브: <https://tales-runner.github.io/TR-STORY/>

## Currently implemented
- **모바일 풍 통일 레이아웃**: `max-w-[480px]` 중앙 정렬. 데스크탑에서도
  동일 폭으로 표시되고 양쪽은 다크 거터.
- **세로 스크롤 웹툰 뷰어**: 다크 풀스크린, 탭으로 토글되는 상·하단 바,
  스크롤 시 2.5초 자동 숨김.
- **읽기 진행률 자동 저장 (IndexedDB)**: 다시 들어가면 "이어서 읽는 중"
  토스트와 함께 마지막 위치로 복원. 80% 지점에서 자동 "읽음" 마킹.
- **수동 읽음 토글 + 진행률 인디케이터**: 메인 카드 우측 체크 버튼,
  카드 하단 2px 보라 프로그레스 바.
- **회차 바텀시트**: 같은 연도의 회차 목록을 시트로 즉시 이동. 현재
  회차 보라 강조, 읽음 회차 ✓ 표시.
- **필터 + 검색**: 전체 / 웹툰 / 영상 + 안 읽음만 + 연도 chip,
  제목·태그 디바운스 검색.
- **밝기/확대 조절**: 50%–150% 슬라이더(`localStorage` 저장),
  1× / 1.2× / 1.5× 줌 토글.
- **스와이프·키보드 회차 이동**: 좌우 스와이프, ←/→ /j/k 키.
- **데이터**: 빌드 타임에 `tr.rhaon.co.kr/webb` 의 list + 모든 detail 을
  한 번에 페치하여 `src/data/stories.json` 으로 굳힌 뒤 모든 회차
  페이지를 정적 생성. GitHub Pages 정적 호스팅 + Actions push trigger
  로 운영. Vercel / Functions 런타임 의존 없음.
- 정렬은 공식 페이지 방식 그대로(연도 그룹 + 최신순). 비-연도 그룹
  ("캐릭터 스토리" 등)은 맨 뒤로.

## Planned
- PWA 설치 + 오프라인 캐시(읽은 회차만).
- 진행률 데이터 export/import (IndexedDB JSON).
- 시리즈 묶음 보기 (예: "테일즈 아틀리에" 시리즈 한 화면).

## Design intent
- 공식 라이브러리는 *데스크탑* 디자인을 모바일에서 그대로 보여주는데,
  실제 사용자는 출퇴근·잠자기 전 휴대폰으로 한 손 감상이 대부분이다.
- 그래서 사이드바 230px, 카드 그리드 3열 같은 데스크탑 관성은 모두
  버리고, 한 손 엄지 범위 안에서 끝나는 흐름으로 재설계했다.
- 다만 색 팔레트·"웹툰" 보라 배지·연도 헤딩·Pretendard 등 *시각적
  연속성* 은 유지해서, 공식에서 넘어온 사용자가 이질감을 느끼지 않도록
  했다.
- IndexedDB 읽기 진행률은 네이버 / 카카오 웹툰의 관례를 차용했다 —
  이 컨텐츠는 호흡이 길고 회차가 많아 "어디까지 봤더라" 가 핵심이다.

## Non-goals
- 캐릭터·맵·코스튬·확률 정보 등 tr-archive 의 나머지 도메인은 다루지
  않는다 (`tr-archive` 가 별도로 존재).
- 회원·계정·소셜 기능 없음. 진행률은 *기기 로컬* 에만 남는다.
- 원본 이미지 호스팅 대체 아님 — 모든 미디어는 `trimage.rhaon.co.kr`
  로 직접 링크한다.
- 데스크탑 전용 와이드 레이아웃 없음 — 의도된 단일 풍.

## Redacted
- 외부 인물·계정·내부 사례는 본 저장소에서 다루지 않는다.

## 기술 스택
- Next.js 16 (App Router) / React 19 / Tailwind CSS 4
- TypeScript 5, Pretendard Variable

## 로컬 개발
```bash
npm install
npm run fetch-data   # tr.rhaon.co.kr 에서 198편 list+detail 굳히기 (1회)
npm run dev
```
기본 `http://localhost:3000`. `stories.json` 이 이미 커밋되어 있으니
`fetch-data` 는 갱신이 필요할 때만 다시 돌리면 된다.

빌드 검증:
```bash
npm run typecheck && npm run lint && npm run build
# out/ 에 정적 export 결과물
```

## 배포 (GitHub Pages)
`.github/workflows/deploy.yml` 이 다음 두 가지 트리거로 동작한다:
- **push** to `main` — 코드 / 데이터 변경 시 즉시 배포.
- **workflow_dispatch** — Actions 탭에서 수동 trigger (페치 재시도용).

빌드 단계에서 `npm run fetch-data` 는 **best-effort** 로만 시도하고,
실패하면 커밋된 `src/data/stories.json` 스냅샷으로 그대로 빌드를 진행
한다 (`continue-on-error: true`). 그 다음
`NEXT_PUBLIC_BASE_PATH=/TR-STORY` 로 `output: "export"` 빌드,
`out/` 을 `actions/deploy-pages` 가 GitHub Pages 에 올린다.

저장소 설정에서 **Settings → Pages → Source: GitHub Actions** 만 한 번
켜주면 된다.

### 왜 cron 이 없는가
`tr.rhaon.co.kr` 이 GitHub-hosted runner IP 대역을 403 Forbidden 으로
차단한다. 따라서 CI 안에서 새 데이터를 끌어올 수 없다 (tr-archive 가
Vercel 배포에서 분기별 수동 재배포 부담을 겪는 것도 같은 원인일 가능성
이 매우 높다). 새 회차가 올라오면 **로컬에서** 데이터만 갱신한다:

```bash
npm run fetch-data
git commit -am "data: refresh stories"
git push
```
push 가 곧 배포 트리거이므로 별도 작업 없이 사이트에 반영된다.

## 면책
- 본 프로젝트는 **비공식 미러** 이며, 모든 콘텐츠 권리는 RHAON
  Entertainment 및 Blomics 에 있다.
- 공식 페이지 바로가기: <https://tr.game.onstove.com/archive/trstory>
- 원본 권리자가 콘텐츠 제거를 요청하시는 경우 본 저장소 issue 로 알려
  주시면 신속히 제거한다.

## 개인정보 / 데이터 처리
사이트 사용자에게는 다음을 고지한다 (전체 안내문은 `/privacy` 페이지).
- **사용자 계정 없음** — 로그인 / 회원가입 기능이 존재하지 않는다.
- **분석 · 광고 · 쿠키 없음** — Google Analytics, Vercel Analytics 등
  어떠한 분석 스크립트도 삽입되어 있지 않다. 사이트가 직접 쿠키를
  설정하지 않는다.
- **서버 측 로그 없음** — GitHub Pages 정적 파일만 서빙되며 별도
  application 서버가 없다.
- **모든 사용자 기록 (읽음 · 즐겨찾기 · 진행률) 은 사용자 본인의 브라우저
  IndexedDB 와 localStorage 에만 저장**되며 외부로 전송되지 않는다.
  운영자도 이를 조회할 수 없다.
- **제3자 fetch**: trimage.rhaon.co.kr (이미지), cdn.jsdelivr.net (폰트),
  tr.game.onstove.com (공식 댓글 외부 링크) 도메인으로 브라우저가 직접
  요청을 보낸다. 일반적인 HTTP 헤더(IP, User-Agent) 가 해당 제3자
  서버에 도달할 수 있으며 그 부분은 각 서비스 정책을 따른다.
