"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

const RESUME_AUTO_DISMISS_MS = 6000;

export function useResumePrompt({
  storyId,
  scrollRef,
}: {
  storyId: number;
  scrollRef: RefObject<HTMLElement | null>;
}) {
  const [resumePercent, setResumePercent] = useState<number | null>(null);
  const [resumeHoldOpen, setResumeHoldOpen] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismissResume = useCallback(() => {
    setResumePercent(null);
    setResumeHoldOpen(false);
    clearTimeout(resumeTimerRef.current);
  }, []);

  useEffect(() => {
    if (resumePercent === null) return;
    if (resumeHoldOpen) {
      clearTimeout(resumeTimerRef.current);
      return;
    }
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(
      () => setResumePercent(null),
      RESUME_AUTO_DISMISS_MS
    );
    return () => clearTimeout(resumeTimerRef.current);
  }, [resumePercent, resumeHoldOpen]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setResumePercent(null);
    setResumeHoldOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storyId]);

  const handleResumeReset = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    dismissResume();
  }, [scrollRef, dismissResume]);

  return {
    resumePercent,
    setResumePercent,
    handleResumeReset,
    dismissResume,
    setResumeHoldOpen,
  };
}
