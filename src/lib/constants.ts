/**
 * Canonical site origin. `layout` / `robots` / `sitemap` 이 공유한다.
 * 배포 타깃(GitHub Pages 서브패스 등)에서는 NEXT_PUBLIC_SITE_URL 로 덮어쓴다.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://tales-runner.github.io/TR-STORY";
