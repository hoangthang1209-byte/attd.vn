import type { Metadata } from "next";
import { getWholesaleContent } from "@/lib/wholesaleContent";
import { canonicalUrl } from "@/lib/seo";
import { getPublishedLandingPage } from "@/features/landing-pages/services/landing-page.service";
import { mergeWholesaleContent } from "@/features/landing-pages/landing-page-merge";

export async function loadWholesalePage(slug: string) {
  const staticContent = getWholesaleContent(slug);
  if (!staticContent) return null;

  const cms = await getPublishedLandingPage(slug);
  return mergeWholesaleContent(staticContent, cms);
}

export async function buildWholesaleMetadata(slug: string): Promise<Metadata> {
  const content = await loadWholesalePage(slug);
  if (!content) return {};

  const url = canonicalUrl(`/${slug}`);
  return {
    title: content.seoTitle,
    description: content.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: content.seoTitle,
      description: content.metaDescription,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: content.seoTitle,
      description: content.metaDescription,
    },
  };
}
