import { API_BASE, UPSTREAM_USER_AGENT } from "./constants";
import type { StoryDetail, StoryListItem, StoryImage } from "./types";

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

interface UpstreamEnvelope<T> {
  resCd: string;
  rspMsg: string;
  result: T;
}

async function upstream<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "User-Agent": UPSTREAM_USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 60 * 30 },
  });
  if (!res.ok) {
    throw new Error(`Upstream ${res.status} ${path}`);
  }
  const json = (await res.json()) as UpstreamEnvelope<T>;
  if (json.resCd !== "0000") {
    throw new Error(`Upstream ${json.resCd} ${json.rspMsg} ${path}`);
  }
  return json.result;
}

export async function fetchStoryList(): Promise<StoryListItem[]> {
  const data = await upstream<UpstreamListResponse>("/trlibrary/trstory/list");
  const out: StoryListItem[] = [];
  for (const group of data.list) {
    for (const it of group.itemList) {
      out.push({
        id: it.id,
        subject: it.subject,
        category: it.category,
        openDt: it.openDt,
        openYear: group.openYear,
        hashTagSubject: it.hashTagSubject,
        thumbnail: it.thumbnail,
      });
    }
  }
  return out;
}

export async function fetchStoryDetail(id: number): Promise<StoryDetail | null> {
  const list = await fetchStoryList();
  const head = list.find((s) => s.id === id);
  if (!head) return null;
  const detail = await upstream<UpstreamDetailResponse>(
    `/trlibrary/trstory/${id}`
  );
  const images: StoryImage[] = (detail.info.itemList ?? [])
    .slice()
    .sort((a, b) => a.viewOrder - b.viewOrder)
    .map((i) => ({
      imageUrl: i.imageUrl,
      movieUrl: i.movieUrl,
      viewOrder: i.viewOrder,
    }));
  return { ...head, images };
}
