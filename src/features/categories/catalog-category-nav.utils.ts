import type {
  CatalogCategoryFilterNode,
  CmsCategoryTreeNode,
} from "@/features/categories/services/category.service";
import { publicCategoryHref } from "@/features/categories/public-category-url";
import { buildCatalogUrl, type CatalogFilters } from "@/lib/catalog-filter-url";

export type CatalogQuickNavBaseFilters = Omit<CatalogFilters, "category">;

type NavTreeChild = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  sortOrder?: number;
  isActive?: boolean;
  imageUrl?: string | null;
};

type NavTreeNode = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  sortOrder?: number;
  isActive?: boolean;
  children: NavTreeChild[];
};

export type CatalogNavCategory = {
  id: string;
  name: string;
  slug: string;
  href: string;
  productCount: number;
  imageUrl?: string | null;
  parentName?: string | null;
};

export type CategoryPageNavContext = {
  parent: { name: string; slug: string; href: string } | null;
  children: CatalogNavCategory[];
  related: CatalogNavCategory[];
};

function toNavCategory(
  node: {
    id: string;
    slug: string;
    name: string;
    productCount: number;
    imageUrl?: string | null;
  },
  href: string,
  parentName?: string | null,
): CatalogNavCategory {
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    href,
    productCount: node.productCount,
    imageUrl: node.imageUrl ?? null,
    parentName: parentName ?? null,
  };
}

function isNavChildVisible(child: NavTreeChild): boolean {
  return child.productCount > 0 && child.isActive !== false;
}

function findParentSection(tree: NavTreeNode[], slug: string): NavTreeNode | null {
  for (const parent of tree) {
    if (parent.slug === slug) return parent;
    if (parent.children.some((child) => child.slug === slug)) return parent;
  }
  return null;
}

function findNode(
  tree: NavTreeNode[],
  slug: string,
): { parent: NavTreeNode | null; node: NavTreeNode | NavTreeChild } | null {
  for (const parent of tree) {
    if (parent.slug === slug) return { parent: null, node: parent };
    const child = parent.children.find((item) => item.slug === slug);
    if (child) return { parent, node: child };
  }
  return null;
}

/** Horizontal quick-nav chips for /san-pham — scoped to active section when possible. */
export function buildCatalogQuickNavCategories(
  tree: Array<CatalogCategoryFilterNode | CmsCategoryTreeNode>,
  activeCategorySlug?: string,
  baseFilters?: CatalogQuickNavBaseFilters,
): CatalogNavCategory[] {
  const navTree = tree as NavTreeNode[];
  const normalized = activeCategorySlug?.trim();
  const section = normalized ? findParentSection(navTree, normalized) : null;

  const sourceChildren = section
    ? section.children.filter(isNavChildVisible)
    : navTree.flatMap((parent) => parent.children.filter(isNavChildVisible));

  return sourceChildren
    .sort(
      (a, b) =>
        (section?.children.find((c) => c.id === a.id)?.sortOrder ?? 0) -
          (section?.children.find((c) => c.id === b.id)?.sortOrder ?? 0) ||
        a.name.localeCompare(b.name, "vi"),
    )
    .map((child) => {
      const parent = section ?? navTree.find((p) => p.children.some((c) => c.id === child.id));
      return toNavCategory(
        child,
        buildCatalogUrl({ ...baseFilters, category: child.slug }),
        parent?.name ?? null,
      );
    });
}

/** Child + related category discovery for SEO category landing pages. */
export function buildCategoryPageNavContext(
  tree: CmsCategoryTreeNode[],
  slug: string,
): CategoryPageNavContext {
  const navTree = tree as NavTreeNode[];
  const match = findNode(navTree, slug);
  if (!match) {
    return { parent: null, children: [], related: [] };
  }

  const { parent, node } = match;

  if (!parent) {
    const children = (node as NavTreeNode).children
      .filter(isNavChildVisible)
      .map((child) =>
        toNavCategory(child, publicCategoryHref(child.slug), node.name),
      );

    return {
      parent: null,
      children,
      related: [],
    };
  }

  const parentNode = parent;
  const children: CatalogNavCategory[] = [];
  const related = parentNode.children
    .filter((child) => isNavChildVisible(child) && child.slug !== slug)
    .map((child) =>
      toNavCategory(child, publicCategoryHref(child.slug), parentNode.name),
    );

  return {
    parent: {
      name: parentNode.name,
      slug: parentNode.slug,
      href: publicCategoryHref(parentNode.slug),
    },
    children,
    related,
  };
}
