import type { FaqItem } from "@/components/seo/FaqSchema";

export const LANDING_PAGE_SLUGS = [
  "ao-thun-tron",
  "ao-polo-tron",
  "kho-ao-thun-tron",
  "ao-thun-tron-si",
  "nguon-hang-ao-thun-tron",
  "kho-ao-polo-tron",
  "ao-polo-tron-si",
  "dai-ly",
  "nguon-hang",
  "oem",
  "qua-tang-doanh-nghiep",
] as const;

export type LandingPageSlug = (typeof LANDING_PAGE_SLUGS)[number];

export type LandingPageFaqItem = FaqItem;

export type LandingPageRecord = {
  id: string;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  seoContent: string;
  faqJson: LandingPageFaqItem[];
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LandingPageInput = Omit<
  LandingPageRecord,
  "id" | "createdAt" | "updatedAt"
>;

export type BespokeLandingDefaults = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  seoContent: string;
  faq: LandingPageFaqItem[];
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
};

export type ResolvedBespokeLanding = BespokeLandingDefaults;
