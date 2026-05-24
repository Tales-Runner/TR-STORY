"use client";

import { useEffect, useRef } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useFocusTrap } from "@/lib/use-focus-trap";

type SortOrder = "desc" | "asc";

export interface FilterSheetValues {
  yearFilter: string;
  seriesFilter: string;
  sort: SortOrder;
  unreadOnly: boolean;
  favoriteOnly: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  yearChoices: string[];
  seriesChoices: string[];
  /** Live values — parent owns state. Updates are immediate (no draft). */
  values: FilterSheetValues;
  onChange: (next: Partial<FilterSheetValues>) => void;
  onReset: () => void;
  /** "필터 적용 N 개" 칩 카운트와 동일한 값을 부모로부터 받아 표기. */
  activeCount: number;
}

/**
 * 모바일 웹툰 앱 식 바텀시트 — 시리즈 / 연도 / 정렬 / 안 읽음 / 즐겨찾기 필터.
 *
 * 의도적으로 "draft + 적용" 패턴이 아니라 변경 즉시 부모 상태에 반영. 사용자가
 * 한 번에 여러 필터를 조작하는 일은 적고, 즉시 결과(목록 변화)를 보고 싶어
 * 한다는 가정. 닫기는 X 버튼 / backdrop tap / Esc.
 */
export function FilterSheet({
  open,
  onClose,
  yearChoices,
  seriesChoices,
  values,
  onChange,
  onReset,
  activeCount,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(open);
  useFocusTrap(open, rootRef, closeBtnRef);

  // Esc 로 닫기. open 일 때만 listen 해야 다른 dialog 키 핸들러와 충돌 안 함.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="필터"
      className="fixed inset-0 z-50 flex flex-col justify-end animate-fade-in"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Sheet */}
      <div
        ref={rootRef}
        className="relative z-10 mx-auto w-full max-w-[640px] rounded-t-2xl bg-white shadow-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <span className="block h-1 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-bold text-[var(--color-text)]">
            필터{activeCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-brand)] text-white text-[10px] font-bold align-middle">
                {activeCount}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onReset}
              disabled={activeCount === 0}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-soft)] hover:bg-[var(--color-surface-alt)] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              초기화
            </button>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded-lg p-2 text-[var(--color-text-soft)] hover:bg-[var(--color-surface-alt)] min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[70dvh] overflow-y-auto">
          <Field label="연도">
            <SelectInput
              value={values.yearFilter}
              onChange={(v) => onChange({ yearFilter: v })}
              options={[
                { value: "all", label: "전체 연도" },
                ...yearChoices.map((y) => ({ value: y, label: y })),
              ]}
            />
          </Field>

          <Field label="시리즈">
            <SelectInput
              value={values.seriesFilter}
              onChange={(v) => onChange({ seriesFilter: v })}
              options={[
                { value: "all", label: "전체 시리즈" },
                ...seriesChoices.map((s) => ({ value: s, label: s })),
              ]}
            />
          </Field>

          <Field label="정렬">
            <div className="grid grid-cols-2 gap-2">
              <SegmentButton
                active={values.sort === "desc"}
                onClick={() => onChange({ sort: "desc" })}
              >
                최신순
              </SegmentButton>
              <SegmentButton
                active={values.sort === "asc"}
                onClick={() => onChange({ sort: "asc" })}
              >
                과거순
              </SegmentButton>
            </div>
          </Field>

          <Field label="상태">
            <div className="grid grid-cols-2 gap-2">
              <SegmentButton
                active={values.unreadOnly}
                onClick={() =>
                  onChange({
                    unreadOnly: !values.unreadOnly,
                    // unreadOnly 와 favoriteOnly 는 서로 배타
                    favoriteOnly: false,
                  })
                }
              >
                안 읽음만
              </SegmentButton>
              <SegmentButton
                active={values.favoriteOnly}
                accent="amber"
                onClick={() =>
                  onChange({
                    favoriteOnly: !values.favoriteOnly,
                    unreadOnly: false,
                  })
                }
              >
                즐겨찾기만
              </SegmentButton>
            </div>
          </Field>
        </div>

        <div className="px-5 pt-2 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--color-brand)] py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-strong)] transition-colors"
          >
            적용 완료
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const nonDefault = value !== "all";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm font-medium pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
          nonDefault
            ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border-[var(--color-brand)]/40"
            : "bg-white text-[var(--color-text)] border-[var(--color-border)]"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  accent = "brand",
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: "brand" | "amber";
  children: React.ReactNode;
}) {
  const activeCls =
    accent === "amber"
      ? "bg-amber-400 text-white border-amber-400"
      : "bg-[var(--color-brand)] text-white border-[var(--color-brand)]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
        active
          ? activeCls
          : "bg-white text-[var(--color-text-soft)] border-[var(--color-border)] hover:border-[var(--color-brand)]/40"
      }`}
    >
      {children}
    </button>
  );
}
