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
const UPSTREAM_USER_AGENT =
  "Mozilla/5.0 (compatible; tr-story/1.0; +https://github.com/heznpc/TR-STORY)";
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
  viewOrder: number;
  movieUrl: string | null;
  imageUrl: string;
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
        Accept: "application/json",
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
  images: { imageUrl: string; movieUrl: string | null; viewOrder: number }[];
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

  const items: { item: UpstreamListYear["itemList"][0]; openYear: string }[] =
    [];
  for (const g of list.list) {
    for (const it of g.itemList) {
      items.push({ item: it, openYear: g.openYear });
    }
  }
  console.log(`  found ${items.length} stories; fetching details…`);

  const out: OutputStory[] = [];
  let i = 0;
  for (const { item, openYear } of items) {
    i++;
    process.stdout.write(`\r  [${i}/${items.length}] ${item.id} ${item.subject.slice(0, 32)}                     `);
    await sleep(DELAY_MS);
    const detail = await upstream<UpstreamDetailResponse>(
      `/trlibrary/trstory/${item.id}`
    );
    const images = (detail?.info?.itemList ?? [])
      .slice()
      .sort((a, b) => a.viewOrder - b.viewOrder)
      .map((x) => ({
        imageUrl: x.imageUrl,
        movieUrl: x.movieUrl,
        viewOrder: x.viewOrder,
      }));
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

  const root = join(new URL(".", import.meta.url).pathname, "..");
  const outPath = join(root, "src", "data", "stories.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`✅ Wrote ${out.length} stories → ${outPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
