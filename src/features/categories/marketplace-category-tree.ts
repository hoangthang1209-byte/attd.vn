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
  childCount: number;
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
  parentId?: string | null;
  _count: { products: number };
  products: { featuredImage: string | null }[];
  children?: DbCategory[];
};

const DEMO_PLACEHOLDER = categoryDemoImages["ao-thun-tron"];

const categoryInclude = {
  _count: { select: { products: { where: { status: "ACTIVE" as const } } } },
  products: {
    where: { status: "ACTIVE" as const },
    take: 1,
    select: { featuredImage: true },
    orderBy: { createdAt: "desc" as const },
  },
};

/** Resolve image: category.imageUrl → first product image → demo only in static-empty-DB mode. */
function resolveCategoryImage(
  category: Pick<DbCategory, "slug" | "imageUrl" | "products">,
  allowDemoFallback: boolean,
): string | null {
  if (category.imageUrl && isValidImageSrc(category.imageUrl)) {
    return category.imageUrl;
  }
  const productImage = category.products[0]?.featuredImage;
  if (productImage && isValidImageSrc(productImage)) {
    return productImage;
  }
  if (allowDemoFallback) {
    const demo = categoryDemoImages[category.slug];
    if (demo && isValidImageSrc(demo)) return demo;
    return DEMO_PLACEHOLDER;
  }
  return null;
}

function mapDbChild(
  category: DbCategory,
  allowDemoFallback: boolean,
): MarketplaceCategoryTreeChild {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: resolveCategoryImage(category, allowDemoFallback),
    productCount: category._count.products,
    href: catalogCategoryHref(category.slug),
  };
}

function mapDbParent(
  category: DbCategory,
  allowDemoFallback: boolean,
): MarketplaceCategoryTreeNode {
  const children = (category.children ?? []).map((child) =>
    mapDbChild(child, allowDemoFallback),
  );
  const childrenProductCount = children.reduce((sum, c) => sum + c.productCount, 0);
  const productCount = category._count.products + childrenProductCount;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    skuCode: category.skuCode,
    imageUrl: resolveCategoryImage(category, allowDemoFallback),
    productCount,
    childCount: children.length,
    viewAllHref: catalogCategoryHref(category.slug),
    children,
  };
}

function buildChildFromStatic(
  staticChild: StaticCategoryChild,
  bySlug: Map<string, DbCategory>,
  groupId: string,
  childIndex: number,
): MarketplaceCategoryTreeChild | null {
  const db = bySlug.get(staticChild.slug);
  if (db) {
    return mapDbChild(db, true);
  }
  return null;
}

/** Static marketing groups — only when CMS has zero categories. */
function buildTreeFromStaticGroups(
  allCategories: DbCategory[],
): MarketplaceCategoryTreeNode[] {
  const bySlug = new Map(allCategories.map((c) => [c.slug, c]));

  return MARKETPLACE_PARENT_GROUPS.map((group) => {
    const dbParent = bySlug.get(group.slug);
    const children = group.children
      .map((child, childIndex) =>
        buildChildFromStatic(child, bySlug, group.id, childIndex),
      )
      .filter((c): c is MarketplaceCategoryTreeChild => c !== null);

    const uniqueChildren = Array.from(
      new Map(children.map((c) => [c.id, c])).values(),
    );

    const productCount =
      (dbParent?._count.products ?? 0) +
      uniqueChildren.reduce((sum, c) => sum + c.productCount, 0);

    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      skuCode: dbParent?.skuCode ?? null,
      imageUrl: dbParent
        ? resolveCategoryImage(dbParent, true)
        : uniqueChildren[0]?.imageUrl ?? null,
      productCount,
      childCount: uniqueChildren.length,
      viewAllHref: catalogCategoryHref(group.slug),
      children: uniqueChildren,
    };
  });
}

/**
 * Marketplace category tree for mega menu.
 * Source of truth: CMS Category parent/child hierarchy from `/admin/products/categories`.
 * Static B2B groups are used only when the database has no categories at all.
 */
export async function getMarketplaceCategoryTree(): Promise<
  MarketplaceCategoryTreeNode[]
> {
  const totalCategories = await prisma.category.count();
  if (totalCategories === 0) {
    return buildTreeFromStaticGroups([]);
  }

  const hasHierarchy = (await prisma.category.count({
    where: { parentId: { not: null } },
  })) > 0;

  if (hasHierarchy) {
    const parentCategories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        children: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: categoryInclude,
        },
        ...categoryInclude,
      },
    });

    return parentCategories.map((parent) => mapDbParent(parent, false));
  }

  const rootCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: categoryInclude,
  });

  return rootCategories.map((category) =>
    mapDbParent({ ...category, children: [] }, false),
  );
}
