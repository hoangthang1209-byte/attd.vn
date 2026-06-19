import { categoryDemoImages } from "@/features/demo/demo-image-map";
import { isValidImageSrc } from "@/lib/imagePaths";
import {
  getCmsCategoryTree,
  type CmsCategoryTreeChild,
  type CmsCategoryTreeNode,
} from "@/features/categories/services/category.service";
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

const DEMO_PLACEHOLDER = categoryDemoImages["ao-thun-tron"];

function resolveCategoryImage(
  category: Pick<CmsCategoryTreeNode | CmsCategoryTreeChild, "slug" | "imageUrl" | "featuredImage">,
  allowDemoFallback: boolean,
): string | null {
  if (category.imageUrl && isValidImageSrc(category.imageUrl)) {
    return category.imageUrl;
  }
  if (category.featuredImage && isValidImageSrc(category.featuredImage)) {
    return category.featuredImage;
  }
  if (allowDemoFallback) {
    const demo = categoryDemoImages[category.slug];
    if (demo && isValidImageSrc(demo)) return demo;
    return DEMO_PLACEHOLDER;
  }
  return null;
}

function mapCmsChildToMenu(child: CmsCategoryTreeChild): MarketplaceCategoryTreeChild {
  return {
    id: child.id,
    name: child.name,
    slug: child.slug,
    imageUrl: resolveCategoryImage(child, false),
    productCount: child.productCount,
    href: catalogCategoryHref(child.slug),
  };
}

function mapCmsParentToMenu(parent: CmsCategoryTreeNode): MarketplaceCategoryTreeNode {
  const children = parent.children.map(mapCmsChildToMenu);
  return {
    id: parent.id,
    name: parent.name,
    slug: parent.slug,
    skuCode: parent.skuCode,
    imageUrl: resolveCategoryImage(parent, false),
    productCount: parent.productCount,
    childCount: children.length,
    viewAllHref: catalogCategoryHref(parent.slug),
    children,
  };
}

function buildChildFromStatic(
  staticChild: StaticCategoryChild,
  bySlug: Map<string, { id: string; slug: string; name: string; imageUrl: string | null; featuredImage: string | null; productCount: number }>,
): MarketplaceCategoryTreeChild | null {
  const db = bySlug.get(staticChild.slug);
  if (!db) return null;
  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    imageUrl: resolveCategoryImage(db, true),
    productCount: db.productCount,
    href: catalogCategoryHref(db.slug),
  };
}

/** Static marketing groups — only when CMS has zero categories. */
function buildTreeFromStaticGroups(): MarketplaceCategoryTreeNode[] {
  return MARKETPLACE_PARENT_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    slug: group.slug,
    skuCode: null,
    imageUrl: null,
    productCount: 0,
    childCount: group.children.length,
    viewAllHref: catalogCategoryHref(group.slug),
    children: group.children.map((child, index) => ({
      id: `${group.id}-static-${index}-${child.slug}`,
      name: child.name,
      slug: child.slug,
      imageUrl: resolveCategoryImage({ slug: child.slug, imageUrl: null, featuredImage: null }, true),
      productCount: 0,
      href: catalogCategoryHref(child.slug),
    })),
  }));
}

/**
 * Marketplace category tree for mega menu + mobile nav.
 * Delegates to getCmsCategoryTree() — same source as `/san-pham` filter sidebar.
 * Static B2B groups only when the database has no categories at all.
 */
export async function getMarketplaceCategoryTree(): Promise<
  MarketplaceCategoryTreeNode[]
> {
  const cmsTree = await getCmsCategoryTree();

  if (cmsTree.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[MegaMenu] using static fallback because CMS category tree is empty",
      );
    }
    return buildTreeFromStaticGroups();
  }

  return cmsTree.map(mapCmsParentToMenu);
}

// Re-export for convenience — single entry point name used across the app.
export { getCmsCategoryTree };
