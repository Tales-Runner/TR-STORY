"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useViewerToast() {
  const [viewerToast, setViewerToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setViewerToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setViewerToast(null), 1800);
  }, []);

  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  return { viewerToast, showToast };
}
