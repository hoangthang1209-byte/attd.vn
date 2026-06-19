import { prisma } from "@/lib/prisma";

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
        select: { products: { where: { status: "ACTIVE" } } },
      },
    },
  });
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

/**
 * Parent/child category tree for `/san-pham` filter sidebar.
 * Source: CMS categories from `/admin/products/categories`.
 */
export async function getCategoryTreeForCatalogFilter(): Promise<
  CatalogCategoryFilterNode[]
> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { products: { where: { status: "ACTIVE" } } },
      },
    },
  });

  const byParent = new Map<string | null, typeof categories>();
  for (const category of categories) {
    const key = category.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(category);
  }

  function sumDescendantProductCounts(categoryId: string): number {
    let total = 0;
    for (const child of byParent.get(categoryId) ?? []) {
      total += child._count.products + sumDescendantProductCounts(child.id);
    }
    return total;
  }

  const roots = byParent.get(null) ?? [];

  return roots.map((parent) => {
    const children = (byParent.get(parent.id) ?? []).map((child) => ({
      id: child.id,
      slug: child.slug,
      name: child.name,
      productCount: child._count.products,
    }));

    const productCount =
      parent._count.products + sumDescendantProductCounts(parent.id);

    return {
      id: parent.id,
      slug: parent.slug,
      name: parent.name,
      productCount,
      children,
    };
  });
}

/** Collect category id + all descendant ids for catalog filtering. */
export async function getCategoryFilterIdsBySlug(slug: string): Promise<string[]> {
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
  return prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: "ACTIVE" },
        select: {
          id: true, name: true, slug: true, productCode: true,
          featuredImage: true, gallery: true,
          defaultMoq: true, leadTime: true,
          supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
          variants: { select: { id: true, stockStatus: true } },
          images: {
            select: { imageUrl: true, altText: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
