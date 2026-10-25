"use client";

import { useEffect, useState } from "react";

/** Relative dates are computed after hydration, never frozen into an export. */
export function useClientNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
