/** CMS-editable homepage hero copy and CTAs. */
export type HomepageHeroConfig = {
  eyebrow: string;
  heading: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
};

export type HomepageProofItemConfig = {
  itemKey: string;
  title: string;
  supportingText: string | null;
  iconKey: "PACKAGE" | "SETTINGS" | "USERS" | "TRUCK";
  enabled: boolean;
  sortOrder: number;
};

export type HomepageSourcingPathwayConfig = {
  slot: "STOCK" | "OEM" | "DEALER";
  microLabel: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  mediaAssetId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  enabled: boolean;
  sortOrder: number;
  visualFallbackKey: "stock" | "oem" | "dealer";
};

export type HomepageOemBannerConfig = {
  eyebrow: string;
  heading: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  mediaAssetId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  enabled: boolean;
  sectionOrder: number;
};

export type HomepageEditorialSectionsConfig = {
  proofStripEnabled: boolean;
  proofStripOrder: number;
  sourcingPathwaysEnabled: boolean;
  sourcingPathwaysOrder: number;
};

export type HomepageCmsConfig = {
  hero: HomepageHeroConfig;
  proofStrip: {
    enabled: boolean;
    order: number;
    items: HomepageProofItemConfig[];
  };
  sourcingPathways: {
    enabled: boolean;
    order: number;
    items: HomepageSourcingPathwayConfig[];
  };
  oemBanner: HomepageOemBannerConfig;
};

/** Serializable homepage category row — parent CMS categories only. */
export type HomepageCategoryItem = {
  id: string;
  name: string;
  slug: string;
  href: string;
  imageUrl: string | null;
  productCount: number | null;
};

/** Serializable homepage product row — latest public catalog items. */
export type HomepageProductItem = {
  id: string;
  name: string;
  slug: string;
  href: string;
  categoryName: string | null;
  categorySlug: string | null;
  imageUrl: string | null;
  imageAlt: string;
  minimumOrderQuantity: number | null;
  productionLeadTime: string | null;
  availabilityLabel: string | null;
};

/** Serializable homepage blog teaser row. */
export type HomepageBlogPostItem = {
  id: string;
  title: string;
  slug: string;
  href: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
};

/** Aggregated CMS-backed homepage payload. */
export type HomepageData = {
  hero: HomepageHeroConfig;
  cms: HomepageCmsConfig;
  categories: HomepageCategoryItem[];
  latestProducts: HomepageProductItem[];
  blogPosts: HomepageBlogPostItem[];
};

export type HomepageCmsPanel =
  | "hero"
  | "proof"
  | "pathways"
  | "oem"
  | "sections";
