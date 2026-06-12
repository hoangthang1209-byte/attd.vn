import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WholesaleLandingPage from "@/components/seo/WholesaleLandingPage";
import { getWholesaleContent } from "@/lib/wholesaleContent";
import { canonicalUrl } from "@/lib/seo";

const SLUG = "kho-ao-polo-tron";

export function generateMetadata(): Metadata {
  const content = getWholesaleContent(SLUG);
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

export default function KhoAoPoloTronPage() {
  const content = getWholesaleContent(SLUG);
  if (!content) notFound();
  return (
    <WholesaleLandingPage
      slug={SLUG}
      content={content}
      canonicalUrl={canonicalUrl(`/${SLUG}`)}
    />
  );
}
