/**
 * Canonical site origin. `layout` / `robots` / `sitemap` 이 공유한다.
 * 배포 타깃(GitHub Pages 서브패스 등)에서는 NEXT_PUBLIC_SITE_URL 로 덮어쓴다.
 */
import { absoluteSiteUrl, normalizeSiteUrl } from "./site-url";

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "https://tr-story.vercel.app"
);
export const siteUrl = (path = "/") => absoluteSiteUrl(SITE_URL, path);
export const INDEXABLE = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
export const SITE_NAME = "테런 스토리";
export const SITE_TITLE = "테일즈런너 웹툰 | 테런 스토리 모바일 뷰어";
export const SITE_DESCRIPTION =
  "테일즈런너 웹툰·영상 회차 모음. 테일즈 아틀리에, 라스트 카오스, 테일즈 드림 등 시리즈별 목록과 이어 읽기·책갈피를 제공하는 테런 스토리 비공식 모바일 뷰어.";
export const OFFICIAL_OG_IMAGE = "https://trimage.rhaon.co.kr/images/trweb-public/og/share_img_800.png";
