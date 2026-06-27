import type { CmsCategoryTreeNode } from "@/features/categories/services/category.service";
import { publicCategoryHref } from "@/features/categories/public-category-url";
import { isValidImageSrc } from "@/lib/imagePaths";
import { isPublicHomepageChildCategory } from "@/features/home/homepage-category.utils";

export type PublicCategoryHierarchyChild = {
  id: string;
  name: string;
  slug: string;
  href: string;
  imageUrl: string | null;
  productCount: number;
};

export type PublicCategoryHierarchySection = {
  id: string;
  name: string;
  slug: string;
  children: PublicCategoryHierarchyChild[];
};

function resolveCategoryImageUrl(
  imageUrl: string | null,
  featuredImage: string | null,
): string | null {
  if (imageUrl && isValidImageSrc(imageUrl)) return imageUrl;
  if (featuredImage && isValidImageSrc(featuredImage)) return featuredImage;
  return null;
}

export function buildPublicCategoryHierarchy(
  tree: CmsCategoryTreeNode[],
): PublicCategoryHierarchySection[] {
  return [...tree]
    .filter((parent) => parent.isActive !== false)
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.name.localeCompare(b.name, "vi"),
    )
    .map((parent) => ({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
      children: parent.children
        .filter((child) =>
          isPublicHomepageChildCategory({
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
          }),
        )
        .map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          href: publicCategoryHref(child.slug),
          imageUrl: resolveCategoryImageUrl(child.imageUrl, child.featuredImage),
          productCount: child.productCount,
        })),
    }))
    .filter((section) => section.children.length > 0);
}
