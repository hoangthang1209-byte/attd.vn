import { prisma } from "@/lib/prisma";
import { categoryDemoImages } from "@/features/demo/demo-image-map";
import { isValidImageSrc } from "@/lib/imagePaths";
import {
  MARKETPLACE_PARENT_GROUPS,
  catalogCategoryHref,
  type StaticCategoryChild,
} from "@/lib/marketplaceCategoryTree";

export type MarketplaceCategoryTreeChild = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
  href: string;
};

export type MarketplaceCategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  skuCode: string | null;
  imageUrl: string | null;
  productCount: number;
  viewAllHref: string;
  children: MarketplaceCategoryTreeChild[];
};

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  skuCode: string | null;
  imageUrl: string | null;
  sortOrder: number;
  _count: { products: number };
  products: { featuredImage: string | null }[];
  children?: DbCategory[];
};

const PLACEHOLDER_IMAGE = categoryDemoImages["ao-thun-tron"];

function resolveCategoryImage(
  category: Pick<DbCategory, "slug" | "imageUrl" | "products">,
): string | null {
  if (category.imageUrl && isValidImageSrc(category.imageUrl)) {
    return category.imageUrl;
  }
  const productImage = category.products[0]?.featuredImage;
  if (productImage && isValidImageSrc(productImage)) {
    return productImage;
  }
  const demo = categoryDemoImages[category.slug];
  if (demo && isValidImageSrc(demo)) {
    return demo;
  }
  return PLACEHOLDER_IMAGE;
}

function mapDbChild(
  category: DbCategory,
  labelOverride?: string,
): MarketplaceCategoryTreeChild {
  return {
    id: category.id,
    name: labelOverride ?? category.name,
    slug: category.slug,
    imageUrl: resolveCategoryImage(category),
    productCount: category._count.products,
    href: catalogCategoryHref(category.slug),
  };
}

function mapDbParent(category: DbCategory): MarketplaceCategoryTreeNode {
  const children =
    category.children && category.children.length > 0
      ? category.children.map((child) => mapDbChild(child))
      : [mapDbChild(category)];

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    skuCode: category.skuCode,
    imageUrl: resolveCategoryImage(category),
    productCount: category._count.products,
    viewAllHref: catalogCategoryHref(category.slug),
    children,
  };
}

function buildChildFromStatic(
  staticChild: StaticCategoryChild,
  bySlug: Map<string, DbCategory>,
): MarketplaceCategoryTreeChild {
  const db = bySlug.get(staticChild.slug);
  if (db) {
    return mapDbChild(db, staticChild.name);
  }
  const demo = categoryDemoImages[staticChild.slug];
  return {
    id: `static-${staticChild.slug}-${staticChild.name}`,
    name: staticChild.name,
    slug: staticChild.slug,
    imageUrl: demo && isValidImageSrc(demo) ? demo : PLACEHOLDER_IMAGE,
    productCount: 0,
    href: catalogCategoryHref(staticChild.slug),
  };
}

function buildTreeFromStaticGroups(
  allCategories: DbCategory[],
): MarketplaceCategoryTreeNode[] {
  const bySlug = new Map(allCategories.map((c) => [c.slug, c]));

  return MARKETPLACE_PARENT_GROUPS.map((group) => {
    const dbParent = bySlug.get(group.slug);
    const children = group.children.map((child) =>
      buildChildFromStatic(child, bySlug),
    );
    const productCount =
      dbParent?._count.products ??
      children.reduce((sum, c) => sum + c.productCount, 0);

    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      skuCode: dbParent?.skuCode ?? null,
      imageUrl: dbParent
        ? resolveCategoryImage(dbParent)
        : children[0]?.imageUrl ?? PLACEHOLDER_IMAGE,
      productCount,
      viewAllHref: catalogCategoryHref(group.slug),
      children,
    };
  });
}

/** Marketplace category tree for mega menu — DB hierarchy first, static B2B groups as fallback. */
export async function getMarketplaceCategoryTree(): Promise<
  MarketplaceCategoryTreeNode[]
> {
  const parentCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { products: { where: { status: "ACTIVE" } } } },
          products: {
            where: { status: "ACTIVE" },
            take: 1,
            select: { featuredImage: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
      products: {
        where: { status: "ACTIVE" },
        take: 1,
        select: { featuredImage: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const hasHierarchy = parentCategories.some((c) => c.children.length > 0);
  if (hasHierarchy) {
    return parentCategories.map(mapDbParent);
  }

  const allCategories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
      products: {
        where: { status: "ACTIVE" },
        take: 1,
        select: { featuredImage: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return buildTreeFromStaticGroups(allCategories);
}
