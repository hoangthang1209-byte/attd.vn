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

/** Real product image for hero mosaic — derived from latestProducts. */
export type HomepageHeroProductImage = {
  slug: string;
  label: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
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
  categories: HomepageCategoryItem[];
  latestProducts: HomepageProductItem[];
  heroProductImages: HomepageHeroProductImage[];
  blogPosts: HomepageBlogPostItem[];
};
