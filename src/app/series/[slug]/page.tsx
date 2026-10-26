import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchStoryList } from "@/lib/api";
import { getSeriesPages, seriesDescription, seriesPath } from "@/lib/series-pages";
import { SITE_NAME, siteUrl } from "@/lib/constants";
import { SeriesShell } from "@/components/series-shell";
import { JsonLd } from "@/components/json-ld";

export async function generateStaticParams() {
  return getSeriesPages(await fetchStoryList()).map(({ slug }) => ({ slug }));
}

async function getSeries(slug: string) {
  let decoded: string;
  try { decoded = decodeURIComponent(slug); } catch { notFound(); }
  const series = getSeriesPages(await fetchStoryList()).find((item) => item.slug === decoded);
  if (!series) notFound();
  return series;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { label, episodes } = await getSeries((await params).slug);
  const title = `${label} 회차 모음 | 테일즈런너`;
  const description = seriesDescription(label, episodes.length);
  const url = siteUrl(seriesPath(label));
  const image = episodes.at(-1)?.thumbnail;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, siteName: SITE_NAME, locale: "ko_KR",
      images: image ? [{ url: image, alt: label }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description,
      images: image ? [image] : undefined },
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { label, episodes } = await getSeries((await params).slug);
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: siteUrl() },
        { "@type": "ListItem", position: 2, name: label, item: siteUrl(seriesPath(label)) },
      ] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage",
      name: `${label} 회차 모음`, description: seriesDescription(label, episodes.length),
      url: siteUrl(seriesPath(label)), inLanguage: "ko",
      mainEntity: { "@type": "ItemList", numberOfItems: episodes.length,
        itemListElement: episodes.map((story, index) => ({ "@type": "ListItem", position: index + 1,
          name: story.subject, url: siteUrl(`/stories/${story.id}/`) })) } }} />
    <SeriesShell label={label} stories={episodes} />
  </>;
}
