import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache-tags";
import { sumDescendantProductCountsSafe } from "@/features/categories/category-product-count.utils";
import {
  filterPubliclyActiveCategoryTree,
  isCategoryPubliclyAccessibleBySlug,
  loadCategoryVisibilityNodes,
} from "@/features/categories/category-public-visibility";
import { PRODUCT_CARD_COLOR_VARIANT_SELECT } from "@/features/products/product-card-color-swatches";
import { buildPublicProductVisibilityWhere, isDemoOrSampleProductMetadata } from "@/features/products/product-public-visibility";
import {
  MEDIA_ASSET_PUBLIC_SELECT,
  resolveEntityMediaSrc,
} from "@/features/media/resolve-media";

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Categories with active product counts — for homepage marketplace grid. */
export async function getCategoriesWithCounts() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { products: { where: buildPublicProductVisibilityWhere() } },
      },
    },
  });
}

/** Shared child node from CMS parent/child hierarchy. */
export type CmsCategoryTreeChild = {
  id: string;
  slug: string;
  name: string;
  skuCode: string | null;
  imageUrl: string | null;
  mediaAssetId: string | null;
  productCount: number;
  featuredImage: string | null;
  isActive: boolean;
  sortOrder: number;
};

/** Shared parent node — single source of truth for mega menu + catalog filter. */
export type CmsCategoryTreeNode = {
  id: string;
  slug: string;
  name: string;
  skuCode: string | null;
  imageUrl: string | null;
  mediaAssetId: string | null;
  productCount: number;
  featuredImage: string | null;
  isActive: boolean;
  sortOrder: number;
  children: CmsCategoryTreeChild[];
};

const cmsCategoryInclude = {
  mediaAsset: { select: MEDIA_ASSET_PUBLIC_SELECT },
  _count: {
    select: { products: { where: buildPublicProductVisibilityWhere() } },
  },
  products: {
    where: buildPublicProductVisibilityWhere(),
    take: 1,
    select: { featuredImage: true },
    orderBy: { createdAt: "desc" as const },
  },
};

type CategoryRow = Awaited<
  ReturnType<
    typeof prisma.category.findMany<{ include: typeof cmsCategoryInclude }>
  >
>[number];

/**
 * CMS parent/child category tree (uncached DB read).
 * Used to build the public tree; do not call from public routes directly —
 * prefer getPublicCmsCategoryTree() which is tagged/cached.
 * Source: `/admin/products/categories` — parentId null = parent, parentId set = child.
 */
export async function getCmsCategoryTree(): Promise<CmsCategoryTreeNode[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: cmsCategoryInclude,
  });

  if (categories.length === 0) return [];

  const byParent = new Map<string | null, CategoryRow[]>();
  for (const category of categories) {
    const key = category.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(category);
  }

  function sumDescendantProductCounts(categoryId: string): number {
    const byParentCounts = new Map<string, Array<{ id: string; directProductCount: number }>>();
    for (const category of categories) {
      if (!category.parentId) continue;
      const siblings = byParentCounts.get(category.parentId) ?? [];
      siblings.push({ id: category.id, directProductCount: category._count.products });
      byParentCounts.set(category.parentId, siblings);
    }
    return sumDescendantProductCountsSafe(categoryId, byParentCounts);
  }

  const roots = (byParent.get(null) ?? []).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"),
  );

  return roots.map((parent) => ({
    id: parent.id,
    slug: parent.slug,
    name: parent.name,
    skuCode: parent.skuCode,
    mediaAssetId: parent.mediaAssetId,
    imageUrl:
      resolveEntityMediaSrc({
        mediaAsset: parent.mediaAsset,
        mediaAssetId: parent.mediaAssetId,
        imageUrl: parent.imageUrl,
      }) ?? parent.imageUrl,
    featuredImage: parent.products[0]?.featuredImage ?? null,
    productCount: parent._count.products + sumDescendantProductCounts(parent.id),
    isActive: parent.isActive,
    sortOrder: parent.sortOrder,
    children: (byParent.get(parent.id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"))
      .map((child) => ({
      id: child.id,
      slug: child.slug,
      name: child.name,
      skuCode: child.skuCode,
      mediaAssetId: child.mediaAssetId,
      imageUrl:
        resolveEntityMediaSrc({
          mediaAsset: child.mediaAsset,
          mediaAssetId: child.mediaAssetId,
          imageUrl: child.imageUrl,
        }) ?? child.imageUrl,
      productCount: child._count.products,
      featuredImage: child.products[0]?.featuredImage ?? null,
      isActive: child.isActive,
      sortOrder: child.sortOrder,
    })),
  }));
}

async function loadPublicCmsCategoryTree(): Promise<CmsCategoryTreeNode[]> {
  const [tree, visibilityNodes] = await Promise.all([
    getCmsCategoryTree(),
    loadCategoryVisibilityNodes(),
  ]);
  return filterPubliclyActiveCategoryTree(tree, visibilityNodes);
}

/** Public category tree for mega menu, catalog filters, and homepage grids. */
export async function getPublicCmsCategoryTree(): Promise<CmsCategoryTreeNode[]> {
  return unstable_cache(loadPublicCmsCategoryTree, ["public-cms-category-tree"], {
    tags: [PUBLIC_CACHE_TAGS.categories],
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
  })();
}

export type CatalogCategoryFilterChild = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
};

export type CatalogCategoryFilterNode = {
  id: string;
  slug: string;
  name: string;
  /** Direct products + all descendant products (matches parent filter scope). */
  productCount: number;
  children: CatalogCategoryFilterChild[];
};

export type CatalogCategoryContext = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentSlug: string | null;
  parentName: string | null;
  isChild: boolean;
  hasChildren: boolean;
  title: string;
  subtitle: string;
};

/** Catalog filter sidebar tree — same CMS hierarchy as mega menu. */
export async function getCategoryTreeForCatalogFilter(): Promise<
  CatalogCategoryFilterNode[]
> {
  const tree = await getPublicCmsCategoryTree();
  return tree.map((parent) => ({
    id: parent.id,
    slug: parent.slug,
    name: parent.name,
    productCount: parent.productCount,
    children: parent.children.map((child) => ({
      id: child.id,
      slug: child.slug,
      name: child.name,
      productCount: child.productCount,
    })),
  }));
}

/** Collect category id + all descendant ids for catalog filtering. */
export async function getCategoryFilterIdsBySlug(slug: string): Promise<string[]> {
  const accessible = await isCategoryPubliclyAccessibleBySlug(slug);
  if (!accessible) return [];

  const [target, all] = await Promise.all([
    prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    }),
    prisma.category.findMany({
      select: { id: true, parentId: true },
    }),
  ]);

  if (!target) return [];

  const byParent = new Map<string, string[]>();
  for (const category of all) {
    if (category.parentId) {
      const siblings = byParent.get(category.parentId) ?? [];
      siblings.push(category.id);
      byParent.set(category.parentId, siblings);
    }
  }

  const ids = new Set<string>([target.id]);
  const stack = [target.id];

  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const childId of byParent.get(id) ?? []) {
      if (!ids.has(childId)) {
        ids.add(childId);
        stack.push(childId);
      }
    }
  }

  return Array.from(ids);
}

/** Resolve heading/breadcrumb context for selected catalog category slug. */
export async function resolveCatalogCategoryContext(
  slug: string,
): Promise<CatalogCategoryContext | null> {
  const accessible = await isCategoryPubliclyAccessibleBySlug(slug);
  if (!accessible) return null;

  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      parentId: true,
      parent: { select: { slug: true, name: true } },
      children: { select: { id: true }, take: 1 },
    },
  });

  if (!category) return null;

  const isChild = category.parentId != null;
  const hasChildren = category.children.length > 0;

  let subtitle: string;
  if (isChild) {
    subtitle = "Danh sách sản phẩm thuộc danh mục này.";
  } else if (hasChildren) {
    subtitle =
      "Bao gồm sản phẩm trong danh mục này và các danh mục con.";
  } else {
    subtitle = "Danh sách sản phẩm thuộc danh mục này.";
  }

  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    parentId: category.parentId,
    parentSlug: category.parent?.slug ?? null,
    parentName: category.parent?.name ?? null,
    isChild,
    hasChildren,
    title: category.name,
    subtitle,
  };
}

export async function getCategoryBySlug(slug: string) {
  const accessible = await isCategoryPubliclyAccessibleBySlug(slug);
  if (!accessible) return null;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      mediaAsset: { select: MEDIA_ASSET_PUBLIC_SELECT },
      products: {
        where: buildPublicProductVisibilityWhere(),
        select: {
          id: true, name: true, slug: true, productCode: true,
          featuredImage: true, gallery: true,
          defaultMoq: true, leadTime: true,
          supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
          metadata: true,
          variants: {
            where: { variantStatus: "ACTIVE" as const },
            select: PRODUCT_CARD_COLOR_VARIANT_SELECT,
          },
          images: {
            select: { imageUrl: true, altText: true, sortOrder: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!category) return null;
  const resolvedImageUrl =
    resolveEntityMediaSrc({
      mediaAsset: category.mediaAsset,
      mediaAssetId: category.mediaAssetId,
      imageUrl: category.imageUrl,
    }) ?? category.imageUrl;
  return {
    ...category,
    imageUrl: resolvedImageUrl,
    products: category.products.filter(
      (product) => !isDemoOrSampleProductMetadata(product.metadata),
    ),
  };
}
