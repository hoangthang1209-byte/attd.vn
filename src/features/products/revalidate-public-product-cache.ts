import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isIndexableCategoryLanding } from "@/lib/seo/indexable-category-routes";
import {
  PUBLIC_CACHE_TAGS,
  revalidatePublicCacheTags,
  type PublicCacheTag,
} from "@/lib/public-cache-tags";

export type ProductCacheRevalidationInput = {
  productId?: string;
  slug?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  affectsHomepage?: boolean;
};

async function resolveCategorySlugs(input: ProductCacheRevalidationInput): Promise<string[]> {
  const slugs = new Set<string>();
  if (input.categorySlug) slugs.add(input.categorySlug);

  if (input.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: {
        slug: true,
        parent: { select: { slug: true } },
      },
    });
    if (category?.slug) slugs.add(category.slug);
    if (category?.parent?.slug) slugs.add(category.parent.slug);
  }

  if (input.productId && !input.categoryId) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: {
        category: {
          select: {
            slug: true,
            parent: { select: { slug: true } },
          },
        },
      },
    });
    if (product?.category.slug) slugs.add(product.category.slug);
    if (product?.category.parent?.slug) slugs.add(product.category.parent.slug);
  }

  return Array.from(slugs);
}

/** Pure plan of cache paths to revalidate — used by tests and revalidatePublicProductCache. */
export function planProductCacheRevalidationPaths(input: {
  slug?: string | null;
  categorySlugs?: string[];
  affectsHomepage?: boolean;
}): string[] {
  const paths = new Set<string>(["/san-pham", "/sitemap.xml"]);
  const slug = input.slug?.trim();
  if (slug) paths.add(`/san-pham/${slug}`);
  for (const categorySlug of input.categorySlugs ?? []) {
    paths.add(`/san-pham?category=${categorySlug}`);
    if (isIndexableCategoryLanding(categorySlug)) {
      paths.add(`/${categorySlug}`);
    }
  }
  if (input.affectsHomepage) paths.add("/");
  return Array.from(paths);
}

/** Revalidate public product surfaces after a successful product mutation. */
export async function revalidatePublicProductCache(
  input: ProductCacheRevalidationInput,
): Promise<void> {
  const tags: PublicCacheTag[] = [
    PUBLIC_CACHE_TAGS.products,
    PUBLIC_CACHE_TAGS.categories,
  ];
  if (input.affectsHomepage) {
    tags.push(PUBLIC_CACHE_TAGS.homepage);
  }
  revalidatePublicCacheTags(...tags);

  const categorySlugs = await resolveCategorySlugs(input);
  for (const path of planProductCacheRevalidationPaths({
    slug: input.slug,
    categorySlugs,
    affectsHomepage: input.affectsHomepage,
  })) {
    revalidatePath(path);
  }
}
