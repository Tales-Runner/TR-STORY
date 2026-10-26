import type { StoryEntry } from "./db";

export const MAX_BACKUP_BYTES = 1024 * 1024;
const MAX_ENTRIES = 10000;
const timestamps = ["readAt", "lastReadAt", "favoritedAt", "bookmarkedAt"] as const;

export interface ReadingBackup {
  app: "tr-story";
  version: 1;
  exportedAt: string;
  entries: StoryEntry[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const nonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function parseReadingBackup(text: string): ReadingBackup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error("파일은 1MB 이하여야 해요.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("올바른 기록 파일이 아니에요."); }
  if (!record(value) || value.app !== "tr-story" || value.version !== 1 ||
      typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt)) ||
      !Array.isArray(value.entries) || value.entries.length > MAX_ENTRIES) {
    throw new Error("TR Story에서 내보낸 기록 파일을 선택해 주세요.");
  }
  const seen = new Set<number>();
  const entries = value.entries.map((entry): StoryEntry => {
    if (!record(entry) || !Number.isSafeInteger(entry.id) || (entry.id as number) <= 0 ||
        seen.has(entry.id as number) || !nonnegative(entry.readAt)) {
      throw new Error("파일의 회차 기록을 확인할 수 없어요.");
    }
    const clean: StoryEntry = { id: entry.id as number, readAt: entry.readAt };
    seen.add(clean.id);
    for (const field of timestamps) {
      if (entry[field] !== undefined) {
        if (!nonnegative(entry[field])) throw new Error("기록 시각이 올바르지 않아요.");
        clean[field] = entry[field];
      }
    }
    if (entry.scrollProgress !== undefined) {
      if (!nonnegative(entry.scrollProgress) || entry.scrollProgress > 1) throw new Error("읽기 진행률이 올바르지 않아요.");
      clean.scrollProgress = entry.scrollProgress;
    }
    if (entry.position !== undefined) {
      const position = entry.position;
      if (!record(position) || !Number.isSafeInteger(position.panel) || (position.panel as number) < 0 ||
          !nonnegative(position.offset) || position.offset > 1) throw new Error("읽던 위치가 올바르지 않아요.");
      clean.position = { panel: position.panel as number, offset: position.offset };
    }
    return clean;
  });
  return { app: "tr-story", version: 1, exportedAt: value.exportedAt, entries };
}

export function createReadingBackup(entries: StoryEntry[]): ReadingBackup {
  return parseReadingBackup(JSON.stringify({ app: "tr-story", version: 1, exportedAt: new Date().toISOString(), entries }));
}

export function mergeReadingEntries(existing: StoryEntry[], incoming: StoryEntry[]): StoryEntry[] {
  const merged = new Map(existing.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    const local = merged.get(entry.id);
    if (!local) { merged.set(entry.id, { ...entry }); continue; }
    const next = { ...local };
    for (const field of timestamps) {
      if (entry[field] !== undefined) next[field] = Math.max(local[field] ?? 0, entry[field]);
    }
    const newerPosition = (entry.lastReadAt ?? 0) > (local.lastReadAt ?? 0);
    if (entry.scrollProgress !== undefined && (local.scrollProgress === undefined || newerPosition)) {
      next.scrollProgress = entry.scrollProgress;
      if (entry.position) next.position = { ...entry.position };
      else delete next.position;
    }
    merged.set(entry.id, next);
  }
  return Array.from(merged.values());
}
