import Link from "next/link";

export function SiteMoveNotice() {
  if (process.env.NEXT_PUBLIC_LEGACY_SITE !== "true") return null;

  return <aside aria-label="새 주소 안내" className="mx-auto max-w-[900px] border-b border-[var(--color-border)] bg-[var(--color-brand-soft)] px-4 py-3 text-sm leading-relaxed">
    <p className="font-semibold">TR Story의 새 주소가 생겼어요.</p>
    <p className="mt-1 text-[var(--color-text-soft)]">읽기 기록이 있다면 마이페이지에서 내보낸 뒤 새 주소에서 가져와 주세요.</p>
    <div className="mt-1 flex flex-wrap gap-x-5">
      <Link href="/me/#reading-backup-title" className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-strong)] underline underline-offset-4">기록 내보내기</Link>
      <a href="https://tr-story.vercel.app/" className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-strong)] underline underline-offset-4">새 주소로 이동</a>
    </div>
  </aside>;
}
