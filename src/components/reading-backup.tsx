"use client";

import { useId, useRef, useState } from "react";
import { db } from "@/lib/db";
import { createReadingBackup, MAX_BACKUP_BYTES, parseReadingBackup, type ReadingBackup as Backup } from "@/lib/reading-backup";

export function ReadingBackup({ onImported }: { onImported: () => Promise<void> }) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function download() {
    setBusy(true);
    try {
      const data = createReadingBackup(await db.stories.exportEntries());
      if (!data.entries.length) { setMessage("아직 내보낼 기록이 없어요."); return; }
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `tr-story-records-${data.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage(`${data.entries.length}개 회차 기록의 다운로드를 시작했어요. 새 주소의 마이페이지에서 가져올 수 있어요.`);
    } catch { setMessage("기록을 내보내지 못했어요. 브라우저의 사이트 저장소 설정을 확인해 주세요."); }
    finally { setBusy(false); }
  }

  async function readFile(file: File | undefined) {
    setBackup(null);
    setMessage("");
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("파일은 1MB 이하여야 해요.");
      const data = parseReadingBackup(await file.text());
      if (!data.entries.length) { setMessage("선택한 파일에 기록이 없어요."); return; }
      setBackup(data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "파일을 읽을 수 없어요."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function restore() {
    if (!backup) return;
    setBusy(true);
    try {
      await db.stories.importEntries(backup.entries);
      await onImported();
      setMessage(`${backup.entries.length}개 회차 기록을 합쳤어요. 기존 책갈피와 즐겨찾기는 유지하고, 더 최근에 읽던 위치를 사용해요.`);
      setBackup(null);
    } catch { setMessage("기록을 저장하지 못했어요. 브라우저의 사이트 저장소 설정을 확인해 주세요."); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="reading-backup-title" className="mt-8 rounded-xl border border-[var(--color-border)] p-4">
    <h2 id="reading-backup-title" className="text-base font-bold">읽기 기록 옮기기</h2>
    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-soft)]">
      기기나 사이트 주소가 바뀌어도 이어 보세요. 읽던 위치·책갈피·즐겨찾기를 파일로 보관하고 다른 브라우저에서 가져올 수 있어요. 파일은 서버로 전송되지 않습니다.
    </p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={download}
        className="min-h-11 rounded-lg bg-[var(--color-brand)] px-4 text-sm font-semibold text-white disabled:opacity-50">기록 내보내기</button>
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
        className="min-h-11 rounded-lg bg-[var(--color-brand-soft)] px-4 text-sm font-semibold text-[var(--color-brand-strong)] disabled:opacity-50">기록 파일 선택</button>
      <input id={inputId} ref={fileRef} type="file" accept=".json,application/json" className="hidden"
        aria-label="가져올 읽기 기록 파일" disabled={busy} onChange={(event) => { void readFile(event.target.files?.[0]); }} />
    </div>
    {backup && <div className="mt-4 rounded-lg bg-[var(--color-surface-alt)] p-3 text-sm">
      <p>{backup.entries.length}개 회차 기록을 가져올 준비가 됐어요. 현재 기록을 지우지 않고 합칩니다.</p>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={busy} onClick={restore} className="min-h-11 rounded-lg bg-[var(--color-brand)] px-3 font-semibold text-white disabled:opacity-50">기록 합치기</button>
        <button type="button" disabled={busy} onClick={() => setBackup(null)} className="min-h-11 px-3">취소</button>
      </div>
    </div>}
    <p role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed text-[var(--color-text-soft)]">{busy ? "처리 중…" : message}</p>
  </section>;
}
