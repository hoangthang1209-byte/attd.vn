import type { PublicProductSalesBadge } from "@/features/products/product-sales-badges";
import type { ProductCardColorSwatch } from "@/features/products/product-card-color-swatches";

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

export type HomepageCompanyRealityLayout =
  | "FEATURED_PLUS_SUPPORTING"
  | "FOUR_EQUAL_ITEMS";

export type HomepageCompanyRealityIcon =
  | "TIMER"
  | "PACKAGE"
  | "BUILDING"
  | "FACTORY"
  | "SETTINGS"
  | "USERS"
  | "TRUCK";

export type HomepageCompanyRealityItemConfig = {
  itemKey: string;
  title: string;
  description: string;
  iconKey: HomepageCompanyRealityIcon;
  featured: boolean;
  active: boolean;
  sortOrder: number;
};

export type HomepageCompanyRealityConfig = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  layout: HomepageCompanyRealityLayout;
  items: HomepageCompanyRealityItemConfig[];
};

export type HomepageWorkshopGalleryLayout =
  | "EDITORIAL_GRID"
  | "COMPACT_GRID"
  | "HORIZONTAL_STRIP";

export type HomepageWorkshopMediaConfig = {
  id: string;
  mediaAssetId: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  altText: string | null;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  href: string | null;
};

export type HomepageWorkshopGalleryConfig = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  layout: HomepageWorkshopGalleryLayout;
  maxItems: number;
  items: HomepageWorkshopMediaConfig[];
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
  companyReality: HomepageCompanyRealityConfig;
  workshopGallery: HomepageWorkshopGalleryConfig;
};

/** Serializable homepage category row — parent CMS categories only. */
export type HomepageCategoryItem = {
  id: string;
  name: string;
  slug: string;
  href: string;
  imageUrl: string | null;
  productCount: number | null;
  /** Parent label for child category cards on the homepage grid. */
  parentName?: string | null;
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
  hoverImageUrl: string | null;
  imageAlt: string;
  minimumOrderQuantity: number | null;
  productionLeadTime: string | null;
  availabilityLabel: string | null;
  salesBadges: PublicProductSalesBadge[];
  availableColors: ProductCardColorSwatch[];
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
  /** Root categories for hero discovery rail — unchanged from CMS parents. */
  categories: HomepageCategoryItem[];
  /** Child categories for the homepage grid below the hero. */
  gridChildCategories: HomepageCategoryItem[];
  gridChildCategoryTotal: number;
  showGridCategoryViewAllCta: boolean;
  latestProducts: HomepageProductItem[];
  blogPosts: HomepageBlogPostItem[];
};

export type HomepageCmsPanel =
  | "hero"
  | "proof"
  | "pathways"
  | "oem"
  | "companyReality"
  | "workshopGallery"
  | "sections";
