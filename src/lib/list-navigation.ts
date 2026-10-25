export interface HomeFilters {
  q: string;
  year: string;
  series: string;
  status: "all" | "continue" | "unread" | "bookmark";
  sort: "asc" | "desc";
  view: "series" | "episode";
}

export function parseHomeFilters(search: string): HomeFilters {
  const params = new URLSearchParams(search);
  const series = params.get("series") || "all";
  const status = params.get("status");
  return {
    q: params.get("q") ?? "",
    year: params.get("year") || "all",
    series,
    status: status === "continue" || status === "unread" || status === "bookmark" ? status : "all",
    sort: params.get("sort") === "asc" || (!params.has("sort") && series !== "all") ? "asc" : "desc",
    view: params.get("view") === "episode" || series !== "all" ? "episode" : "series",
  };
}

export function homeQuery(filters: HomeFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.year !== "all") params.set("year", filters.year);
  if (filters.series !== "all") params.set("series", filters.series);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.sort !== "desc" || filters.series !== "all") params.set("sort", filters.sort);
  if (filters.view !== "series") params.set("view", filters.view);
  const query = params.toString();
  return query ? `?${query}` : "";
}

const RETURN_KEY = "tr-story-list-return";
export interface ListReturn { href: string; scrollY: number; visibleCount: number }

export function localListPath(href: string, basePath: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const url = new URL(href, "https://local.invalid");
  if (url.origin !== "https://local.invalid") return null;
  if (url.pathname !== `${basePath}/` && url.pathname !== `${basePath}/me/`) return null;
  return `${url.pathname.slice(basePath.length)}${url.search}`;
}

export function readListReturn(): ListReturn | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null");
    if (!value || typeof value.href !== "string" ||
      !localListPath(value.href, process.env.NEXT_PUBLIC_BASE_PATH ?? "") ||
      !Number.isFinite(value.scrollY) || !Number.isFinite(value.visibleCount)) return null;
    return value;
  } catch { return null; }
}

export function rememberList(visibleCount = 12) {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({
      href: window.location.pathname + window.location.search,
      scrollY: window.scrollY,
      visibleCount,
    }));
  } catch { /* Reading remains available when storage is disabled. */ }
}
