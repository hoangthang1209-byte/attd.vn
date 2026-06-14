import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WholesaleLandingPage from "@/components/seo/WholesaleLandingPage";
import { canonicalUrl } from "@/lib/seo";
import {
  buildWholesaleMetadata,
  loadWholesalePage,
} from "@/features/landing-pages/load-wholesale-page";

const SLUG = "kho-ao-polo-tron";

export async function generateMetadata(): Promise<Metadata> {
  return buildWholesaleMetadata(SLUG);
}

export default async function KhoAoPoloTronPage() {
  const content = await loadWholesalePage(SLUG);
  if (!content) notFound();
  return (
    <WholesaleLandingPage
      slug={SLUG}
      content={content}
      canonicalUrl={canonicalUrl(`/${SLUG}`)}
    />
  );
}
