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
  categories: HomepageCategoryItem[];
  latestProducts: HomepageProductItem[];
  blogPosts: HomepageBlogPostItem[];
};
