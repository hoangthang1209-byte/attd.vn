import { getCollectionContent } from "@/lib/collectionContent";
import { getPublishedLandingPage } from "@/features/landing-pages/services/landing-page.service";
import { mergeCollectionContent } from "@/features/landing-pages/landing-page-merge";
import { LANDING_PAGE_SLUGS, type LandingPageSlug } from "@/features/landing-pages/types";

const MANAGED_COLLECTION_SLUGS = new Set<LandingPageSlug>(["ao-thun-tron", "ao-polo-tron"]);

export async function loadCollectionContent(slug: string) {
  const staticContent = getCollectionContent(slug);
  if (!MANAGED_COLLECTION_SLUGS.has(slug as LandingPageSlug)) {
    return staticContent;
  }

  const cms = await getPublishedLandingPage(slug);
  return mergeCollectionContent(staticContent, cms);
}

export function isManagedCollectionSlug(slug: string): boolean {
  return MANAGED_COLLECTION_SLUGS.has(slug as LandingPageSlug);
}

export { LANDING_PAGE_SLUGS };
