import { describe, expect, it } from "vitest";
import { createReadingBackup, mergeReadingEntries, parseReadingBackup } from "./reading-backup";

describe("portable reading records", () => {
  const entry = { id: 260, readAt: 100, bookmarkedAt: 200, favoritedAt: 300,
    lastReadAt: 400, scrollProgress: 0.4, position: { panel: 1, offset: 0.5 } };

  it("round trips records without carrying extra file fields into storage", () => {
    const text = JSON.stringify(createReadingBackup([{ ...entry, extra: "ignored" } as typeof entry]));
    expect(parseReadingBackup(text).entries).toEqual([entry]);
  });

  it("rejects unsupported, duplicate and corrupt records before importing", () => {
    const valid = createReadingBackup([entry]);
    for (const payload of [null, { ...valid, app: "other" }, { ...valid, version: 2 },
      { ...valid, entries: [entry, entry] }, { ...valid, entries: [{ ...entry, id: -1 }] },
      { ...valid, entries: [{ ...entry, scrollProgress: 1.5 }] },
      { ...valid, entries: [{ ...entry, position: { panel: 0, offset: -1 } }] },
      { ...valid, entries: [{ ...entry, favoritedAt: "bad" }] }]) {
      expect(() => parseReadingBackup(JSON.stringify(payload))).toThrow();
    }
    expect(() => parseReadingBackup("not json")).toThrow();
    expect(() => parseReadingBackup(" ".repeat(1024 * 1024 + 1))).toThrow();
  });

  it("preserves current favorites and the most recently read position when merging", () => {
    const older = { ...entry, readAt: 0, bookmarkedAt: 0, favoritedAt: 0, lastReadAt: 200, scrollProgress: 0.9 };
    expect(mergeReadingEntries([entry], [older])).toEqual([entry]);
    const newer = { ...older, lastReadAt: 500, scrollProgress: 0.2, position: { panel: 0, offset: 0.3 } };
    expect(mergeReadingEntries([entry], [newer])).toEqual([{ ...entry,
      lastReadAt: 500, scrollProgress: 0.2, position: newer.position }]);
    expect(mergeReadingEntries([entry], [{ id: 261, readAt: 0 }])).toHaveLength(2);
    expect(entry.lastReadAt).toBe(400);
  });

  it("removes a stale panel position when a newer legacy percentage is imported", () => {
    const [merged] = mergeReadingEntries([entry], [{ id: 260, readAt: 0, lastReadAt: 500, scrollProgress: 0.7 }]);
    expect(merged.position).toBeUndefined();
    expect(merged.scrollProgress).toBe(0.7);
  });
});
