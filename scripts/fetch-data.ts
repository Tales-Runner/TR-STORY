/**
 * 빌드 타임 데이터 페치 — tr.rhaon.co.kr/webb 의 list + 모든 detail 을 한
 * 번에 받아 `src/data/stories.json` 으로 굳힌다. GitHub Pages 정적 export
 * 흐름이라 런타임 프록시가 없다.
 *
 * 사용:  npx tsx scripts/fetch-data.ts
 *        또는 npm run fetch-data
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const API_BASE = "https://tr.rhaon.co.kr/webb";
// 업스트림은 일반 브라우저처럼 보이는 요청만 받으므로 UA·Referer·
// Accept-Language 를 채워 보낸다.
//
// ⚠️ Origin 헤더는 절대 보내지 않는다 — 이 API 는 Origin 이 붙은 요청을
//    "Invalid CORS request" 로 403 처리한다(브라우저 XHR 이 아니라 서버-투-
//    서버 호출을 상정한 듯). Origin 을 빼면 Referer 만으로도, 아예 헤더가
//    없어도 200 이 떨어진다. 과거엔 이 403 을 GitHub runner IP 차단으로
//    오인해 CI 자동 갱신(cron)을 꺼 두었는데, 실제 원인의 최소 일부는 이
//    Origin 헤더였다. CI 재활성화를 고려한다면 이 헤더 제거가 선행 조건.
const UPSTREAM_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const UPSTREAM_REFERER = "https://tr.game.onstove.com/";
const DELAY_MS = 300;
const RETRIES = 2;

interface Envelope<T> {
  resCd: string;
  rspMsg: string;
  result: T;
}

interface UpstreamListYear {
  openYear: string;
  itemList: Array<{
    id: number;
    subject: string;
    category: number;
    categoryName: string | null;
    openYearType: string | null;
    openDt: string;
    hashTagSubject: string;
    thumbnail: string;
  }>;
}

interface UpstreamListResponse {
  list: UpstreamListYear[];
  totalCount: number;
}

interface UpstreamDetailItem {
  itemId: number;
  id: number;
  // 영상(category 2) 패널은 imageUrl·viewOrder 가 null 이고 movieUrl 만 있다.
  viewOrder: number | null;
  movieUrl: string | null;
  imageUrl: string | null;
  comments: string;
}

interface UpstreamDetailResponse {
  info: {
    subject: string;
    openDt: string;
    hashTagSubject: string;
    itemList: UpstreamDetailItem[];
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function upstream<T>(path: string, attempt = 0): Promise<T | null> {
  const url = `${API_BASE}${path}`;
  try {
    if (attempt > 0) {
      console.log(`  ↻ retry ${attempt} ${path}`);
      await sleep(1000 * attempt);
    }
    const res = await fetch(url, {
      headers: {
        "User-Agent": UPSTREAM_USER_AGENT,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: UPSTREAM_REFERER,
        // NOTE: Origin 은 의도적으로 생략 — 붙이면 403. 상단 주석 참고.
      },
    });
    if (!res.ok) {
      console.warn(`  ⚠ ${res.status} ${res.statusText} ${path}`);
      if (attempt < RETRIES) return upstream<T>(path, attempt + 1);
      return null;
    }
    const json = (await res.json()) as Envelope<T>;
    if (json.resCd !== "0000") {
      console.warn(`  ⚠ API error ${json.resCd} ${json.rspMsg} ${path}`);
      if (attempt < RETRIES) return upstream<T>(path, attempt + 1);
      return null;
    }
    return json.result;
  } catch (err) {
    console.warn(`  ⚠ fetch error: ${err}`);
    if (attempt < RETRIES) return upstream<T>(path, attempt + 1);
    return null;
  }
}

interface OutputStory {
  id: number;
  subject: string;
  category: number;
  openDt: string;
  openYear: string;
  hashTagSubject: string;
  thumbnail: string;
  // 영상 패널은 imageUrl·viewOrder 가 null (movieUrl 만 존재).
  images: {
    imageUrl: string | null;
    movieUrl: string | null;
    viewOrder: number | null;
  }[];
}

// ── 런타임 스키마 검증 ──────────────────────────────────────────────
// src/lib/api.ts 는 stories.json 을 `as StoryDetail[]` 로 캐스팅만 하고
// (무검증) 런타임에 쓰므로, 업스트림 응답 형태가 바뀌면 깨진 데이터가
// 조용히 굳어 그대로 배포까지 흘러간다. 그 드리프트를 스냅샷으로 "굳히기
// 전에" 여기서 잡는다. 형태가 어긋나면 던져서 빌드/페치를 실패시킨다.
class SchemaError extends Error {}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function validateListResponse(
  res: UpstreamListResponse
): asserts res is UpstreamListResponse {
  if (!res || !Array.isArray(res.list)) {
    throw new SchemaError("list 응답에 result.list 배열이 없음");
  }
  for (const g of res.list) {
    if (!isNonEmptyString(g.openYear) || !Array.isArray(g.itemList)) {
      throw new SchemaError(
        `연도 그룹 형태 이상: ${JSON.stringify(g).slice(0, 120)}`
      );
    }
    for (const it of g.itemList) {
      if (
        typeof it.id !== "number" ||
        !isNonEmptyString(it.subject) ||
        typeof it.category !== "number" ||
        !isNonEmptyString(it.openDt) ||
        typeof it.thumbnail !== "string"
      ) {
        throw new SchemaError(
          `list item 형태 이상: ${JSON.stringify(it).slice(0, 160)}`
        );
      }
    }
  }
}

// detail 은 개별 실패를 관용한다(누락 회차는 공식 페이지 폴백). 단, 응답이
// 왔는데 "형태"가 어긋나면(패널에 imageUrl/viewOrder 가 없음) 조용히 넘기지
// 않고 던진다 — 그건 개별 누락이 아니라 API 계약 변경 신호이기 때문.
function validateDetail(
  res: UpstreamDetailResponse,
  id: number
): UpstreamDetailResponse | null {
  if (!res || !res.info || !Array.isArray(res.info.itemList)) {
    console.warn(`\n  ⚠ detail(${id}) result.info.itemList 없음 — 이미지 0`);
    return null;
  }
  // 각 패널은 imageUrl(웹툰) 또는 movieUrl(영상) 중 하나는 반드시 렌더 가능
  // 해야 한다. 영상 패널은 imageUrl·viewOrder 가 null 이므로 그건 허용하되,
  // 둘 다 없는 패널은 계약 위반으로 던진다.
  for (const it of res.info.itemList) {
    const hasImage = isNonEmptyString(it.imageUrl);
    const hasMovie = isNonEmptyString(it.movieUrl);
    if (!hasImage && !hasMovie) {
      throw new SchemaError(
        `detail(${id}) 패널에 imageUrl·movieUrl 이 모두 없음: ${JSON.stringify(it).slice(0, 160)}`
      );
    }
  }
  return res;
}

async function main() {
  console.log("📚 Fetching stories…");
  const list = await upstream<UpstreamListResponse>(
    "/trlibrary/trstory/list"
  );
  if (!list) {
    console.error("List fetch failed.");
    process.exit(1);
  }
  validateListResponse(list);

  const items: { item: UpstreamListYear["itemList"][0]; openYear: string }[] =
    [];
  for (const g of list.list) {
    for (const it of g.itemList) {
      items.push({ item: it, openYear: g.openYear });
    }
  }
  console.log(`  found ${items.length} stories; fetching details…`);

  const out: OutputStory[] = [];
  let emptyCount = 0;
  let i = 0;
  for (const { item, openYear } of items) {
    i++;
    process.stdout.write(`\r  [${i}/${items.length}] ${item.id} ${item.subject.slice(0, 32)}                     `);
    await sleep(DELAY_MS);
    const detail = await upstream<UpstreamDetailResponse>(
      `/trlibrary/trstory/${item.id}`
    );
    const validDetail = detail ? validateDetail(detail, item.id) : null;
    const images = (validDetail?.info?.itemList ?? [])
      .slice()
      .sort((a, b) => (a.viewOrder ?? 0) - (b.viewOrder ?? 0))
      .map((x) => ({
        imageUrl: x.imageUrl,
        movieUrl: x.movieUrl,
        viewOrder: x.viewOrder,
      }));
    if (images.length === 0) emptyCount++;
    out.push({
      id: item.id,
      subject: item.subject,
      category: item.category,
      openDt: item.openDt,
      openYear,
      hashTagSubject: item.hashTagSubject,
      thumbnail: item.thumbnail,
      images,
    });
  }
  process.stdout.write("\n");

  // 대량 실패 방어: 상당수가 이미지 0 이면 업스트림 장애로 보고, 기존
  // stories.json 스냅샷을 "덮어쓰지 않고" 중단한다. 이게 없으면 업스트림이
  // 잠시 흔들린 순간에 페치가 멀쩡한 스냅샷을 빈 데이터로 갈아엎을 수 있다.
  if (emptyCount > 0) {
    console.warn(`  ⚠ ${emptyCount}/${out.length} 편이 이미지 0 개`);
  }
  if (out.length > 0 && emptyCount > out.length / 2) {
    console.error(
      `✖ 이미지 없는 편이 과반(${emptyCount}/${out.length}) — 업스트림 장애로 판단. ` +
        `기존 stories.json 을 보존하고 중단합니다.`
    );
    process.exit(1);
  }

  const root = join(new URL(".", import.meta.url).pathname, "..");
  const outPath = join(root, "src", "data", "stories.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`✅ Wrote ${out.length} stories → ${outPath}`);

  // 데이터 갱신 시각 / 총 편수 메타. 사이트가 이걸 읽어 푸터에 노출하므로
  // 사용자가 수동 갱신 흐름이 중단됐는지 한 눈에 확인 가능.
  const metaPath = join(root, "src", "data", "data-meta.json");
  const latestOpenDt = out
    .map((s) => s.openDt)
    .sort()
    .reverse()[0];
  const meta = {
    updatedAt: new Date().toISOString(),
    totalCount: out.length,
    latestOpenDt: latestOpenDt ?? null,
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log(`✅ Wrote meta → ${metaPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
