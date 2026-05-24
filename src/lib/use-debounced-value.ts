"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value` only after it has been stable for `delay` ms. Used to throttle
 * search-input → filter recomputation on long lists (cards count rises with the
 * archive, and filtering on every keystroke causes visible jank on mobile).
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
