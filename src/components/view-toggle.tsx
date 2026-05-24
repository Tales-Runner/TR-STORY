"use client";

export type ViewMode = "image" | "list";

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-white p-1">
      <button
        onClick={() => onChange("image")}
        aria-pressed={mode === "image"}
        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${mode === "image" ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]" : "text-[var(--color-text-soft)] hover:bg-[var(--color-surface-alt)]"}`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.5" rx="1" />
          <rect x="9" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.5" rx="1" />
          <rect x="1" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" rx="1" />
          <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" rx="1" />
        </svg>
        이미지
      </button>
      <button
        onClick={() => onChange("list")}
        aria-pressed={mode === "list"}
        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${mode === "list" ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]" : "text-[var(--color-text-soft)] hover:bg-[var(--color-surface-alt)]"}`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        리스트
      </button>
    </div>
  );
}
