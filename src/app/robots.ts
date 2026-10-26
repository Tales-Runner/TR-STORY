import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL, siteUrl } from "@/lib/constants";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: INDEXABLE ? siteUrl("/sitemap.xml") : undefined,
    host: new URL(SITE_URL).origin,
  };
}
