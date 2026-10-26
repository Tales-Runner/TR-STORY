/**
 * Canonical site origin. `layout` / `robots` / `sitemap` 이 공유한다.
 * 배포 타깃(GitHub Pages 서브패스 등)에서는 NEXT_PUBLIC_SITE_URL 로 덮어쓴다.
 */
import { absoluteSiteUrl, normalizeSiteUrl } from "./site-url";

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "https://tales-runner.github.io/TR-STORY"
);
export const siteUrl = (path = "/") => absoluteSiteUrl(SITE_URL, path);
export const INDEXABLE = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
export const SITE_TITLE = "테일즈런너 웹툰·스토리 모바일로 보기 | TR Story";
export const SITE_DESCRIPTION =
  "테일즈런너(테런) 웹툰과 스토리를 모바일에서 편하게 읽어보세요. 시리즈별 회차 순서, 읽던 위치 자동 저장, 책갈피와 즐겨찾기를 제공하는 비공식 뷰어입니다.";
export const OFFICIAL_OG_IMAGE = "https://trimage.rhaon.co.kr/images/trweb-public/og/share_img_800.png";
