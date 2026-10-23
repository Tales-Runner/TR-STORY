import { afterEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { dataDirectory, main, validateDetail, validateListResponse } from "./fetch-data";

vi.mock("node:fs", () => ({ mkdirSync: vi.fn(), writeFileSync: vi.fn() }));

const item = {
  id: 1, subject: "회차", category: 1, categoryName: null,
  openYearType: null, openDt: "20260204", hashTagSubject: "웹툰", thumbnail: "a.jpg",
};
const list = { totalCount: 1, list: [{ openYear: "2026년", itemList: [item] }] };
const panel = { itemId: 1, id: 1, imageUrl: "a.jpg", movieUrl: null, viewOrder: 1, comments: "" };
const detail = { info: { subject: "회차", openDt: "20260204", hashTagSubject: "웹툰", itemList: [panel] } };
const response = (result: unknown) => new Response(JSON.stringify({ resCd: "0000", result }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("snapshot validation", () => {
  it("decodes file URLs including spaces and Korean path names on the host OS", () => {
    const root = join(process.cwd(), "테스트 폴더");
    const moduleUrl = pathToFileURL(join(root, "scripts", "fetch-data.ts")).href;
    expect(dataDirectory(moduleUrl)).toBe(join(root, "src", "data") + (process.platform === "win32" ? "\\" : "/"));
  });

  it("rejects an empty or duplicate list before it can replace the snapshot", () => {
    expect(() => validateListResponse({ totalCount: 0, list: [] })).toThrow("빈 목록");
    expect(() => validateListResponse({ ...list, list: [{ openYear: "2026년", itemList: [item, item] }] })).toThrow("중복");
    // Upstream totalCount counts year groups, not individual episodes.
    expect(() => validateListResponse(list)).not.toThrow();
  });

  it("allows video panels with null image and ordering fields", () => {
    expect(() => validateDetail({ info: { ...detail.info, itemList: [{ ...panel, imageUrl: null, movieUrl: "https://youtu.be/example", viewOrder: null }] } }, 1)).not.toThrow();
  });

  it("rejects empty and unrenderable details", () => {
    expect(() => validateDetail({ info: { ...detail.info, itemList: [] } }, 1)).toThrow("빈 패널");
    expect(() => validateDetail({ info: { ...detail.info, itemList: [{ ...panel, imageUrl: null }] } }, 1)).toThrow("모두 없음");
  });
});

describe("refresh integrity", () => {
  it("preserves BOTH files if a later detail fails, including after retries", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ ...list, list: [{ openYear: "2026년", itemList: [item, { ...item, id: 2 }] }] }))
      .mockResolvedValueOnce(response(detail))
      .mockImplementation(async () => new Response("upstream unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    const check = expect(main()).rejects.toThrow("detail(2) 수집 실패");
    await vi.runAllTimersAsync();
    await check;
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(mkdirSync).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("writes both files only after a complete refresh, using bounded requests without Origin", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValueOnce(response(list)).mockResolvedValueOnce(response(detail));
    vi.stubGlobal("fetch", fetch);
    const refresh = main();
    await vi.runAllTimersAsync();
    await refresh;
    expect(writeFileSync).toHaveBeenCalledTimes(2);
    const writes = vi.mocked(writeFileSync).mock.calls;
    expect(JSON.parse(String(writes[0][1]))).toHaveLength(1);
    expect(JSON.parse(String(writes[1][1]))).toMatchObject({ totalCount: 1, latestOpenDt: "20260204" });
    for (const [, options] of fetch.mock.calls as unknown as [string, RequestInit][]) {
      expect(new Headers(options.headers).has("Origin")).toBe(false);
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
  });
});
