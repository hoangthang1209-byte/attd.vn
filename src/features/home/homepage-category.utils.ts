import type { CmsCategoryTreeNode } from "@/features/categories/services/category.service";
import { publicCategoryHref } from "@/features/categories/public-category-url";
import { isValidImageSrc } from "@/lib/imagePaths";
import type { HomepageCategoryItem } from "@/features/home/homepage.types";
import { HOMEPAGE_CATEGORY_CARD_LIMIT } from "@/features/home/homepage-category.constants";

export type HomepageChildCategorySource = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  featuredImage: string | null;
  productCount: number;
  isActive?: boolean;
  parentName: string;
  parentSortOrder: number;
  sortOrder: number;
};

function resolveChildImageUrl(child: Pick<HomepageChildCategorySource, "imageUrl" | "featuredImage">): string | null {
  if (child.imageUrl && isValidImageSrc(child.imageUrl)) return child.imageUrl;
  if (child.featuredImage && isValidImageSrc(child.featuredImage)) return child.featuredImage;
  return null;
}

export function isPublicHomepageChildCategory(child: HomepageChildCategorySource): boolean {
  return child.isActive !== false;
}

/** Product-count line for public category cards (homepage + hierarchy page). */
export function formatPublicCategoryProductCountLabel(productCount: number): string | undefined {
  if (productCount > 0) return `${productCount}+ lựa chọn`;
  return "Đang cập nhật sản phẩm";
}

export function compareHomepageChildCategories(
  a: HomepageChildCategorySource,
  b: HomepageChildCategorySource,
): number {
  if (a.parentSortOrder !== b.parentSortOrder) {
    return a.parentSortOrder - b.parentSortOrder;
  }
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.parentName !== b.parentName) {
    return a.parentName.localeCompare(b.parentName, "vi");
  }
  return a.name.localeCompare(b.name, "vi");
}

export function flattenPublicChildCategoriesFromTree(
  tree: CmsCategoryTreeNode[],
): HomepageChildCategorySource[] {
  const items: HomepageChildCategorySource[] = [];

  for (const parent of tree) {
    if (parent.isActive === false) continue;
    for (const child of parent.children) {
      items.push({
        id: child.id,
        slug: child.slug,
        name: child.name,
        imageUrl: child.imageUrl,
        featuredImage: child.featuredImage,
        productCount: child.productCount,
        isActive: child.isActive,
        parentName: parent.name,
        parentSortOrder: parent.sortOrder,
        sortOrder: child.sortOrder,
      });
    }
  }

  return items
    .filter(isPublicHomepageChildCategory)
    .sort(compareHomepageChildCategories);
}

export function mapHomepageChildCategory(child: HomepageChildCategorySource): HomepageCategoryItem {
  return {
    id: child.id,
    name: child.name,
    slug: child.slug,
    href: publicCategoryHref(child.slug),
    imageUrl: resolveChildImageUrl(child),
    productCount: child.productCount,
    parentName: child.parentName,
  };
}

export function buildHomepageChildCategoryGrid(tree: CmsCategoryTreeNode[]): {
  items: HomepageCategoryItem[];
  totalVisible: number;
  showViewAllCta: boolean;
  limit: number;
} {
  const flattened = flattenPublicChildCategoriesFromTree(tree).map(mapHomepageChildCategory);
  const totalVisible = flattened.length;
  const limit = HOMEPAGE_CATEGORY_CARD_LIMIT;

  return {
    items: flattened.slice(0, limit),
    totalVisible,
    showViewAllCta: totalVisible > limit,
    limit,
  };
}
