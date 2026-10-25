"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { homeQuery, parseHomeFilters, type HomeFilters } from "./list-navigation";

export function useHomeFilters() {
  const [filters, setFilters] = useState(() => parseHomeFilters(""));
  const [loaded, setLoaded] = useState(false);
  const current = useRef(filters);

  useEffect(() => {
    const read = () => {
      current.current = parseHomeFilters(window.location.search);
      setFilters(current.current);
      setLoaded(true);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  const update = useCallback((patch: Partial<HomeFilters>, push = false) => {
    const next = { ...current.current, ...patch };
    current.current = next;
    const href = window.location.pathname + homeQuery(next);
    if (href !== window.location.pathname + window.location.search) {
      if (push) window.history.pushState(null, "", href);
      else window.history.replaceState(null, "", href);
    }
    setFilters(next);
  }, []);

  return { filters, update, loaded };
}
