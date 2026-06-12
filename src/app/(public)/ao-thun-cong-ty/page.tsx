import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IndustryLandingPage from "@/components/seo/IndustryLandingPage";
import { getIndustryContent } from "@/lib/industryContent";
import { canonicalUrl } from "@/lib/seo";

const SLUG = "ao-thun-cong-ty";

export function generateMetadata(): Metadata {
  const content = getIndustryContent(SLUG);
  if (!content) return {};
  const url = canonicalUrl(`/${SLUG}`);
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

export default function AoThunCongTyPage() {
  const content = getIndustryContent(SLUG);
  if (!content) notFound();
  return (
    <IndustryLandingPage
      slug={SLUG}
      content={content}
      canonicalUrl={canonicalUrl(`/${SLUG}`)}
    />
  );
}
