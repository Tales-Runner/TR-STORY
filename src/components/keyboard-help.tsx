"use client";

import { useEffect, useRef } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["←", "j"], label: "이전 화" },
  { keys: ["→", "k"], label: "다음 화" },
  { keys: ["Esc"], label: "목록으로" },
  { keys: ["?"], label: "단축키 보기" },
];

export function KeyboardHelp({ onClose }: { onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(true, rootRef, closeBtnRef);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
      className="fixed inset-0 z-[85] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#13101f] border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            id="keyboard-help-title"
            className="text-sm font-bold text-white/90"
          >
            키보드 단축키
          </h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg px-2.5 py-1.5 text-xs text-white/55 bg-white/5 hover:bg-white/10"
          >
            닫기
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between text-sm text-white/75"
            >
              <span>{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md bg-white/10 border border-white/15 px-2 py-0.5 text-[11px] font-mono text-white/85"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-white/35 leading-relaxed">
          뷰어 안에서 키보드로도 회차를 넘길 수 있다.
        </p>
      </div>
    </div>
  );
}
