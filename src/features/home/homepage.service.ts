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
  HomepageHeroProductImage,
  HomepageProductItem,
} from "@/features/home/homepage.types";

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

function buildHeroProductImages(
  products: HomepageProductItem[],
): HomepageHeroProductImage[] {
  const images: HomepageHeroProductImage[] = [];

  for (const product of products) {
    if (!product.imageUrl || !isValidImageSrc(product.imageUrl)) {
      continue;
    }

    images.push({
      slug: product.slug,
      label: product.name,
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt,
      href: product.href,
    });

    if (images.length >= 4) {
      break;
    }
  }

  return images;
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

/** Single CMS-backed data loader for the public homepage. */
export async function getHomepageData(): Promise<HomepageData> {
  const [{ products }, categoryTree, { posts: blogPostsRaw }] =
    await Promise.all([
      getProductsForPublicListing({ page: 1, perPage: 12 }),
      getCmsCategoryTree(),
      getPublishedBlogPosts(1, 3),
    ]);

  const categories = categoryTree
    .map(mapParentCategory)
    .filter((category): category is HomepageCategoryItem => category != null);

  const latestProducts = products.map(mapProduct);
  const heroProductImages = buildHeroProductImages(latestProducts);
  const blogPosts = blogPostsRaw.map(mapBlogPost);

  return {
    categories,
    latestProducts,
    heroProductImages,
    blogPosts,
  };
}
