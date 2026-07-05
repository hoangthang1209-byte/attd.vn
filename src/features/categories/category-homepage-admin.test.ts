import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { getCategoryAdminDetailHref } from "@/features/categories/category-admin-routes";
import type { CmsCategoryTreeNode } from "@/features/categories/services/category.service";
import { buildPublicCategoryHierarchy } from "@/features/categories/public-category-hierarchy.utils";
import {
  HOMEPAGE_CATEGORY_CARD_LIMIT,
  PUBLIC_ALL_CATEGORIES_PATH,
  PUBLIC_ALL_CATEGORIES_SLUG,
} from "@/features/home/homepage-category.constants";
import {
  buildHomepageChildCategoryGrid,
  flattenPublicChildCategoriesFromTree,
  formatPublicCategoryProductCountLabel,
  isPublicHomepageChildCategory,
} from "@/features/home/homepage-category.utils";
import { MEDIA_PICKER_DEFAULT_LIBRARY_VIEW } from "@/components/admin/media/media-library-api";
import { publicCategoryHref } from "@/features/categories/public-category-url";
import { trackHomepageViewAllCategoriesClick } from "@/lib/analytics";
import {
  INDEXABLE_STATIC_COMMERCIAL_PATHS,
  isBlockedDynamicCategorySegment,
} from "@/lib/seo/indexable-category-routes";

const CATEGORY_ADMIN_ROW_ACTIONS = [
  "Sửa nhanh",
  "Chi tiết",
  "Xem",
  "Xóa",
] as const;

function buildTree(): CmsCategoryTreeNode[] {
  return [
    {
      id: "parent-b",
      slug: "ao-polo",
      name: "Áo polo",
      skuCode: "POLO",
      imageUrl: null,
      featuredImage: null,
      productCount: 10,
      isActive: true,
      sortOrder: 2,
      children: [
        {
          id: "child-b1",
          slug: "polo-tron",
          name: "Polo trơn",
          skuCode: "PLTR",
          imageUrl: "/uploads/categories/polo.jpg",
          productCount: 4,
          featuredImage: null,
          isActive: true,
          sortOrder: 0,
        },
      ],
    },
    {
      id: "parent-a",
      slug: "ao-thun",
      name: "Áo thun",
      skuCode: "THUN",
      imageUrl: null,
      featuredImage: null,
      productCount: 20,
      isActive: true,
      sortOrder: 1,
      children: [
        {
          id: "child-a1",
          slug: "ao-thun-tron",
          name: "Áo thun trơn",
          skuCode: "ATTR",
          imageUrl: "/uploads/categories/thun.jpg",
          productCount: 8,
          featuredImage: null,
          isActive: true,
          sortOrder: 1,
        },
        {
          id: "child-a2",
          slug: "ao-thun-cvc",
          name: "Áo thun CVC",
          skuCode: "ATCV",
          imageUrl: "/uploads/categories/cvc.jpg",
          productCount: 0,
          featuredImage: null,
          isActive: true,
          sortOrder: 0,
        },
        {
          id: "child-hidden",
          slug: "ao-thun-an",
          name: "Ẩn",
          skuCode: "HIDE",
          imageUrl: "/uploads/categories/hidden.jpg",
          productCount: 3,
          featuredImage: null,
          isActive: false,
          sortOrder: 2,
        },
      ],
    },
    {
      id: "parent-root-only",
      slug: "root-only",
      name: "Chỉ cha",
      skuCode: "ROOT",
      imageUrl: null,
      featuredImage: null,
      productCount: 5,
      isActive: true,
      sortOrder: 0,
      children: [],
    },
  ];
}

describe("category admin row actions", () => {
  it("defines Vietnamese action labels in required order", () => {
    assert.deepEqual(CATEGORY_ADMIN_ROW_ACTIONS, [
      "Sửa nhanh",
      "Chi tiết",
      "Xem",
      "Xóa",
    ]);
  });

  it("links Chi tiết to the full inline editor route", () => {
    assert.equal(
      getCategoryAdminDetailHref("cat-123"),
      "/admin/danh-muc?editCategory=cat-123",
    );
  });
});

describe("homepage category grid OEM card", () => {
  it("does not hard-code an OEM / Private Label card in the grid section", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/home/HomeCategoryGridSection.tsx"),
      "utf8",
    );
    assert.equal(source.includes("OEM / Private Label"), false);
    assert.equal(source.includes('href="/oem"'), false);
  });
});

describe("homepage child category grid", () => {
  it("includes only database-backed active child categories", () => {
    const flattened = flattenPublicChildCategoriesFromTree(buildTree());
    assert.equal(
      flattened.some((item) => item.slug === "root-only"),
      false,
    );
    assert.equal(
      flattened.some((item) => item.slug === "ao-thun-an"),
      false,
    );
    assert.equal(flattened.length, 3);
    assert.ok(
      flattened.every((item) =>
        isPublicHomepageChildCategory({
          ...item,
          featuredImage: null,
        }),
      ),
    );
  });

  it("includes active child categories with zero products", () => {
    const flattened = flattenPublicChildCategoriesFromTree(buildTree());
    const zeroProduct = flattened.find((item) => item.slug === "ao-thun-cvc");
    assert.ok(zeroProduct);
    assert.equal(zeroProduct.productCount, 0);
  });

  it("excludes active child categories under an inactive parent", () => {
    const tree: CmsCategoryTreeNode[] = [
      {
        id: "parent-inactive",
        slug: "inactive-parent",
        name: "Cha ẩn",
        skuCode: "HIDP",
        imageUrl: null,
        featuredImage: null,
        productCount: 10,
        isActive: false,
        sortOrder: 0,
        children: [
          {
            id: "child-under-inactive",
            slug: "child-visible",
            name: "Con",
            skuCode: "CHLD",
            imageUrl: null,
            productCount: 2,
            featuredImage: null,
            isActive: true,
            sortOrder: 0,
          },
        ],
      },
    ];
    const flattened = flattenPublicChildCategoriesFromTree(tree);
    assert.equal(flattened.length, 0);
  });

  it("orders by parent sort order, then child sort order, then name", () => {
    const flattened = flattenPublicChildCategoriesFromTree(buildTree());
    assert.deepEqual(
      flattened.map((item) => item.slug),
      ["ao-thun-cvc", "ao-thun-tron", "polo-tron"],
    );
  });

  it("renders at most the shared homepage category limit", () => {
    assert.equal(HOMEPAGE_CATEGORY_CARD_LIMIT, 20);

    const manyChildren: CmsCategoryTreeNode[] = [
      {
        id: "parent",
        slug: "parent",
        name: "Cha",
        skuCode: "PRNT",
        imageUrl: null,
        featuredImage: null,
        productCount: 99,
        isActive: true,
        sortOrder: 0,
        children: Array.from({ length: HOMEPAGE_CATEGORY_CARD_LIMIT + 5 }, (_, index) => ({
          id: `child-${index}`,
          slug: `child-${index}`,
          name: `Con ${index}`,
          skuCode: `C${index}`,
          imageUrl: null,
          productCount: index === 3 ? 0 : 1,
          featuredImage: null,
          isActive: true,
          sortOrder: index,
        })),
      },
    ];

    const largeGrid = buildHomepageChildCategoryGrid(manyChildren);
    assert.equal(largeGrid.items.length, HOMEPAGE_CATEGORY_CARD_LIMIT);
    assert.equal(largeGrid.limit, HOMEPAGE_CATEGORY_CARD_LIMIT);
    assert.equal(largeGrid.totalVisible, HOMEPAGE_CATEGORY_CARD_LIMIT + 5);
  });

  it("shows view-all CTA only when eligible children exceed the homepage limit", () => {
    const smallGrid = buildHomepageChildCategoryGrid(buildTree());
    assert.equal(smallGrid.showViewAllCta, false);
    assert.equal(smallGrid.items.length, 3);

    const exactlyLimit: CmsCategoryTreeNode[] = [
      {
        id: "parent",
        slug: "parent",
        name: "Cha",
        skuCode: "PRNT",
        imageUrl: null,
        featuredImage: null,
        productCount: 1,
        isActive: true,
        sortOrder: 0,
        children: Array.from({ length: HOMEPAGE_CATEGORY_CARD_LIMIT }, (_, index) => ({
          id: `child-${index}`,
          slug: `child-${index}`,
          name: `Con ${index}`,
          skuCode: `C${index}`,
          imageUrl: null,
          productCount: 1,
          featuredImage: null,
          isActive: true,
          sortOrder: index,
        })),
      },
    ];
    const atLimitGrid = buildHomepageChildCategoryGrid(exactlyLimit);
    assert.equal(atLimitGrid.showViewAllCta, false);

    const manyChildren: CmsCategoryTreeNode[] = [
      {
        id: "parent",
        slug: "parent",
        name: "Cha",
        skuCode: "PRNT",
        imageUrl: null,
        featuredImage: null,
        productCount: 99,
        isActive: true,
        sortOrder: 0,
        children: Array.from({ length: HOMEPAGE_CATEGORY_CARD_LIMIT + 1 }, (_, index) => ({
          id: `child-${index}`,
          slug: `child-${index}`,
          name: `Con ${index}`,
          skuCode: `C${index}`,
          imageUrl: null,
          productCount: 1,
          featuredImage: null,
          isActive: true,
          sortOrder: index,
        })),
      },
    ];
    const largeGrid = buildHomepageChildCategoryGrid(manyChildren);
    assert.equal(largeGrid.showViewAllCta, true);
  });
});

describe("public all-categories hierarchy", () => {
  it("includes active child categories with zero products", () => {
    const sections = buildPublicCategoryHierarchy(buildTree());
    assert.equal(sections.length, 2);
    assert.equal(sections[0]?.name, "Áo thun");
    assert.deepEqual(
      sections[0]?.children.map((child) => child.slug),
      ["ao-thun-cvc", "ao-thun-tron"],
    );
    assert.equal(PUBLIC_ALL_CATEGORIES_PATH, "/danh-muc-san-pham");
  });
});

describe("canonical public category URLs", () => {
  it("uses indexable landing URLs for approved commercial categories", () => {
    const slug = "ao-thun-tron";
    const href = publicCategoryHref(slug);
    assert.equal(href, "/ao-thun-tron");

    const grid = buildHomepageChildCategoryGrid(buildTree());
    assert.ok(grid.items.every((item) => item.href === publicCategoryHref(item.slug)));

    const sections = buildPublicCategoryHierarchy(buildTree());
    assert.ok(
      sections.every((section) =>
        section.children.every((child) => child.href === publicCategoryHref(child.slug)),
      ),
    );
  });

  it("falls back to catalog filter URLs for non-indexable categories", () => {
    assert.equal(publicCategoryHref("ao-thun-cvc"), "/san-pham?category=ao-thun-cvc");
  });
});

describe("zero-product category card labels", () => {
  it("does not render 0+ lựa chọn for zero-product categories", () => {
    assert.equal(formatPublicCategoryProductCountLabel(0), "Đang cập nhật sản phẩm");
    assert.notEqual(formatPublicCategoryProductCountLabel(0), "0+ lựa chọn");
  });

  it("keeps the positive product-count label for stocked categories", () => {
    assert.equal(formatPublicCategoryProductCountLabel(8), "8+ lựa chọn");
  });
});

describe("OEM route", () => {
  it("remains available outside the homepage category grid", () => {
    const oemPagePath = join(process.cwd(), "src/app/(public)/oem/page.tsx");
    const source = readFileSync(oemPagePath, "utf8");
    assert.ok(source.includes("resolveBespokeLanding"));
    assert.ok(source.includes('"oem"'));
  });
});

describe("homepage view-all CTA", () => {
  it("links to the public category index with a styled secondary button", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/home/HomeCategoryViewAllCta.tsx"),
      "utf8",
    );
    assert.ok(source.includes('href={PUBLIC_ALL_CATEGORIES_PATH}'));
    assert.ok(source.includes("btn-secondary"));
    assert.ok(source.includes("home-category-grid__cta"));
    assert.ok(source.includes("Xem tất cả danh mục"));
    assert.ok(source.includes("trackHomepageViewAllCategoriesClick"));
  });
});

describe("public category index route", () => {
  it("resolves under the public route group with public layout", () => {
    const pagePath = join(
      process.cwd(),
      "src/app/(public)/danh-muc-san-pham/page.tsx",
    );
    const layoutPath = join(process.cwd(), "src/app/(public)/layout.tsx");
    const pageSource = readFileSync(pagePath, "utf8");
    const layoutSource = readFileSync(layoutPath, "utf8");
    assert.ok(pageSource.includes("buildPublicCategoryHierarchy"));
    assert.ok(layoutSource.includes("Header"));
    assert.ok(layoutSource.includes("Footer"));
  });

  it("is included in indexable static commercial paths for sitemap discovery", () => {
    assert.ok(INDEXABLE_STATIC_COMMERCIAL_PATHS.includes(PUBLIC_ALL_CATEGORIES_PATH));
  });

  it("blocks the dynamic [category] route from shadowing the static index slug", () => {
    assert.equal(isBlockedDynamicCategorySegment(PUBLIC_ALL_CATEGORIES_SLUG), true);
    assert.equal(isBlockedDynamicCategorySegment("danh-muc-san-pham"), true);

    const dynamicPageSource = readFileSync(
      join(process.cwd(), "src/app/(public)/[category]/page.tsx"),
      "utf8",
    );
    assert.ok(dynamicPageSource.includes("isBlockedDynamicCategorySegment"));
  });

  it("renders active parent sections with active children and zero-product labels", () => {
    const sections = buildPublicCategoryHierarchy(buildTree());
    assert.equal(sections.length, 2);
    assert.equal(sections.some((section) => section.slug === "root-only"), false);

    const thunSection = sections.find((section) => section.slug === "ao-thun");
    assert.ok(thunSection);
    assert.deepEqual(
      thunSection.children.map((child) => child.slug),
      ["ao-thun-cvc", "ao-thun-tron"],
    );
    assert.equal(
      formatPublicCategoryProductCountLabel(
        thunSection.children.find((child) => child.slug === "ao-thun-cvc")!.productCount,
      ),
      "Đang cập nhật sản phẩm",
    );
    assert.equal(
      formatPublicCategoryProductCountLabel(
        thunSection.children.find((child) => child.slug === "ao-thun-tron")!.productCount,
      ),
      "8+ lựa chọn",
    );
  });

  it("hides inactive categories and children under inactive parents", () => {
    const tree: CmsCategoryTreeNode[] = [
      {
        id: "parent-inactive",
        slug: "inactive-parent",
        name: "Cha ẩn",
        skuCode: "HIDP",
        imageUrl: null,
        featuredImage: null,
        productCount: 10,
        isActive: false,
        sortOrder: 0,
        children: [
          {
            id: "child-under-inactive",
            slug: "child-visible",
            name: "Con",
            skuCode: "CHLD",
            imageUrl: null,
            productCount: 2,
            featuredImage: null,
            isActive: true,
            sortOrder: 0,
          },
        ],
      },
    ];
    const sections = buildPublicCategoryHierarchy(tree);
    assert.equal(sections.length, 0);
  });

  it("uses CategoryCard with canonical category URLs on the index page", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "src/app/(public)/danh-muc-san-pham/page.tsx"),
      "utf8",
    );
    assert.ok(pageSource.includes("CategoryCard"));
    assert.ok(pageSource.includes('variant="marketplace"'));
    assert.ok(pageSource.includes("child.href"));

    const sections = buildPublicCategoryHierarchy(buildTree());
    assert.ok(
      sections.every((section) =>
        section.children.every((child) => child.href === publicCategoryHref(child.slug)),
      ),
    );
  });
});

describe("footer category index discoverability", () => {
  it("adds Danh mục sản phẩm to the footer products group", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/public/Footer.tsx"),
      "utf8",
    );
    assert.ok(source.includes('href: "/danh-muc-san-pham"'));
    assert.ok(source.includes('label: "Danh mục sản phẩm"'));
  });
});

describe("homepage view-all analytics", () => {
  it("emits homepage_view_all_categories_click without throwing when gtag is absent", () => {
    const originalGtag = globalThis.window?.gtag;
    if (typeof globalThis.window !== "undefined") {
      globalThis.window.gtag = undefined;
    }

    assert.doesNotThrow(() => {
      trackHomepageViewAllCategoriesClick({
        visible_category_count: 12,
        homepage_category_limit: HOMEPAGE_CATEGORY_CARD_LIMIT,
        destination_path: PUBLIC_ALL_CATEGORIES_PATH,
      });
    });

    if (typeof globalThis.window !== "undefined") {
      globalThis.window.gtag = originalGtag;
    }
  });
});

describe("category media picker defaults", () => {
  it("opens on the full library view, not a folder-only subset", () => {
    assert.equal(MEDIA_PICKER_DEFAULT_LIBRARY_VIEW, "all");
  });
});
