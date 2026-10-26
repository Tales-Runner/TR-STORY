/** Keep measurements on the public site without search/filter values or personal pages. */
export function prepareMeasurement<T extends { url: string }>(event: T, siteOrigin: string): T | null {
  try {
    const url = new URL(event.url);
    if (url.origin !== siteOrigin || url.pathname === "/me" || url.pathname.startsWith("/me/")) return null;
    url.search = "";
    url.hash = "";
    return { ...event, url: url.href };
  } catch {
    return null;
  }
}
