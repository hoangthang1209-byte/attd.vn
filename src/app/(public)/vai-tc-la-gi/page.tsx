import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KnowledgeLandingPage from "@/components/seo/KnowledgeLandingPage";
import { getKnowledgeContent } from "@/lib/knowledgeContent";
import { canonicalUrl } from "@/lib/seo";

const SLUG = "vai-tc-la-gi";

export function generateMetadata(): Metadata {
  const content = getKnowledgeContent(SLUG);
  if (!content) return {};
  const url = canonicalUrl(`/${SLUG}`);
  return {
    title: content.seoTitle,
    description: content.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: content.seoTitle, description: content.metaDescription, url, type: "website" },
    twitter: { card: "summary_large_image", title: content.seoTitle, description: content.metaDescription },
  };
}

export default function VaiTcLaGiPage() {
  const content = getKnowledgeContent(SLUG);
  if (!content) notFound();
  return <KnowledgeLandingPage slug={SLUG} content={content} canonicalUrl={canonicalUrl(`/${SLUG}`)} />;
}
