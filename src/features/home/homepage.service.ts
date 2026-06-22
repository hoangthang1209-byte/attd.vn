import {
  getCmsCategoryTree,
  type CmsCategoryTreeNode,
} from "@/features/categories/services/category.service";
import { getProductsForPublicListing } from "@/features/products/services/product.service";
import { getPublishedBlogPosts } from "@/features/blog/services/blog-public.service";
import { catalogCategoryHref } from "@/lib/marketplaceCategoryTree";
import { getPrimaryProductImageFromProduct } from "@/lib/productImages";
import { isValidImageSrc } from "@/lib/imagePaths";
import type {
  HomepageBlogPostItem,
  HomepageCategoryItem,
  HomepageData,
  HomepageHeroConfig,
  HomepageProductItem,
} from "@/features/home/homepage.types";
import { DEFAULT_HOMEPAGE_HERO } from "@/features/home/homepage-hero-defaults";
import {
  validateHomepageHeroInput,
  type HomepageHeroInput,
} from "@/features/home/homepage-hero-validation";
import { prisma } from "@/lib/prisma";

const AVAILABILITY_LABELS = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết",
  OUT_OF_STOCK: "Hết hàng",
} as const;

type PublicListingProduct = Awaited<
  ReturnType<typeof getProductsForPublicListing>
>["products"][number];

function resolveCategoryImageUrl(parent: CmsCategoryTreeNode): string | null {
  if (parent.imageUrl && isValidImageSrc(parent.imageUrl)) {
    return parent.imageUrl;
  }
  if (parent.featuredImage && isValidImageSrc(parent.featuredImage)) {
    return parent.featuredImage;
  }
  return null;
}

function mapParentCategory(parent: CmsCategoryTreeNode): HomepageCategoryItem | null {
  if (parent.productCount <= 0) {
    return null;
  }

  return {
    id: parent.id,
    name: parent.name,
    slug: parent.slug,
    href: catalogCategoryHref(parent.slug),
    imageUrl: resolveCategoryImageUrl(parent),
    productCount: parent.productCount,
  };
}

function deriveAvailabilityLabel(
  variants: PublicListingProduct["variants"],
): string | null {
  if (variants.length === 0) {
    return null;
  }

  const statuses = variants.map((variant) => variant.stockStatus);
  if (statuses.includes("IN_STOCK")) {
    return AVAILABILITY_LABELS.IN_STOCK;
  }
  if (statuses.includes("LOW_STOCK")) {
    return AVAILABILITY_LABELS.LOW_STOCK;
  }
  if (statuses.includes("OUT_OF_STOCK")) {
    return AVAILABILITY_LABELS.OUT_OF_STOCK;
  }

  return null;
}

function mapProduct(product: PublicListingProduct): HomepageProductItem {
  const primaryImage = getPrimaryProductImageFromProduct(product);
  const imageAlt =
    product.images[0]?.altText?.trim() || product.name;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    href: `/san-pham/${product.slug}`,
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    imageUrl: primaryImage && isValidImageSrc(primaryImage) ? primaryImage : null,
    imageAlt,
    minimumOrderQuantity: product.defaultMoq ?? null,
    productionLeadTime: product.leadTime ?? null,
    availabilityLabel: deriveAvailabilityLabel(product.variants),
  };
}

function mapBlogPost(post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: Date | null;
}): HomepageBlogPostItem {
  const imageUrl =
    post.featuredImageUrl && isValidImageSrc(post.featuredImageUrl)
      ? post.featuredImageUrl
      : null;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    href: `/blog/${post.slug}`,
    excerpt: post.excerpt,
    imageUrl,
    publishedAt: post.publishedAt?.toISOString() ?? null,
  };
}

/** Load CMS hero configuration with safe defaults. */
export async function getHomepageHeroConfig(): Promise<HomepageHeroConfig> {
  try {
    const row = await prisma.homepageSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) return DEFAULT_HOMEPAGE_HERO;
    return {
      eyebrow: row.heroEyebrow.trim() || DEFAULT_HOMEPAGE_HERO.eyebrow,
      heading: row.heroHeading.trim() || DEFAULT_HOMEPAGE_HERO.heading,
      description: row.heroDescription.trim() || DEFAULT_HOMEPAGE_HERO.description,
      primaryCtaLabel: row.heroPrimaryCtaLabel.trim() || DEFAULT_HOMEPAGE_HERO.primaryCtaLabel,
      primaryCtaUrl: row.heroPrimaryCtaUrl.trim() || DEFAULT_HOMEPAGE_HERO.primaryCtaUrl,
      secondaryCtaLabel:
        row.heroSecondaryCtaLabel.trim() || DEFAULT_HOMEPAGE_HERO.secondaryCtaLabel,
      secondaryCtaUrl:
        row.heroSecondaryCtaUrl.trim() || DEFAULT_HOMEPAGE_HERO.secondaryCtaUrl,
    };
  } catch {
    return DEFAULT_HOMEPAGE_HERO;
  }
}

export async function upsertHomepageHeroConfig(
  input: HomepageHeroInput,
): Promise<{ hero: HomepageHeroConfig } | { error: string }> {
  const validationError = validateHomepageHeroInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const data = {
    heroEyebrow: input.eyebrow.trim(),
    heroHeading: input.heading.trim(),
    heroDescription: input.description.trim(),
    heroPrimaryCtaLabel: input.primaryCtaLabel.trim(),
    heroPrimaryCtaUrl: input.primaryCtaUrl.trim(),
    heroSecondaryCtaLabel: input.secondaryCtaLabel.trim(),
    heroSecondaryCtaUrl: input.secondaryCtaUrl.trim(),
  };

  await prisma.homepageSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  const hero = await getHomepageHeroConfig();
  return { hero };
}

/** Single CMS-backed data loader for the public homepage. */
export async function getHomepageData(): Promise<HomepageData> {
  const [{ products }, categoryTree, { posts: blogPostsRaw }, hero] =
    await Promise.all([
      getProductsForPublicListing({ page: 1, perPage: 12 }),
      getCmsCategoryTree(),
      getPublishedBlogPosts(1, 3),
      getHomepageHeroConfig(),
    ]);

  const categories = categoryTree
    .map(mapParentCategory)
    .filter((category): category is HomepageCategoryItem => category != null);

  const latestProducts = products.map(mapProduct);
  const blogPosts = blogPostsRaw.map(mapBlogPost);

  return {
    hero,
    categories,
    latestProducts,
    blogPosts,
  };
}
