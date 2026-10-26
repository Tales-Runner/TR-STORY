"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { prepareMeasurement } from "@/lib/analytics-privacy";
import { SITE_URL } from "@/lib/constants";

const siteOrigin = new URL(SITE_URL).origin;
function beforeSend<T extends { url: string }>(event: T) {
  return prepareMeasurement(event, siteOrigin);
}

export function SiteAnalytics() {
  return <>
    <Analytics beforeSend={beforeSend} debug={false} />
    <SpeedInsights beforeSend={beforeSend} debug={false} />
  </>;
}
