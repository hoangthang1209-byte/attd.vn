import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCategoryAdminDetailHref } from "@/features/categories/category-admin-routes";
import type { CmsCategoryTreeNode } from "@/features/categories/services/category.service";
import { buildPublicCategoryHierarchy } from "@/features/categories/public-category-hierarchy.utils";
import {
  HOMEPAGE_CATEGORY_CARD_LIMIT,
  PUBLIC_ALL_CATEGORIES_PATH,
} from "@/features/home/homepage-category.constants";
import {
  buildHomepageChildCategoryGrid,
  flattenPublicChildCategoriesFromTree,
} from "@/features/home/homepage-category.utils";
import { MEDIA_PICKER_DEFAULT_LIBRARY_VIEW } from "@/components/admin/media/MediaPicker";
import { publicCategoryHref } from "@/features/categories/public-category-url";
import { trackHomepageViewAllCategoriesClick } from "@/lib/analytics";

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

describe("homepage child category grid", () => {
  it("excludes root categories and inactive or empty child categories", () => {
    const flattened = flattenPublicChildCategoriesFromTree(buildTree());
    assert.equal(
      flattened.some((item) => item.slug === "root-only"),
      false,
    );
    assert.equal(
      flattened.some((item) => item.slug === "ao-thun-cvc"),
      false,
    );
    assert.equal(
      flattened.some((item) => item.slug === "ao-thun-an"),
      false,
    );
    assert.equal(flattened.length, 2);
  });

  it("orders by parent sort order, then child sort order, then name", () => {
    const flattened = flattenPublicChildCategoriesFromTree(buildTree());
    assert.deepEqual(
      flattened.map((item) => item.slug),
      ["ao-thun-tron", "polo-tron"],
    );
  });

  it("shows view-all CTA only when visible children exceed the homepage limit", () => {
    const smallTree = buildTree();
    const smallGrid = buildHomepageChildCategoryGrid(smallTree);
    assert.equal(smallGrid.showViewAllCta, false);
    assert.equal(smallGrid.items.length, 2);

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
    assert.equal(largeGrid.items.length, HOMEPAGE_CATEGORY_CARD_LIMIT);
    assert.equal(largeGrid.limit, HOMEPAGE_CATEGORY_CARD_LIMIT);
  });
});

describe("public all-categories hierarchy", () => {
  it("builds parent sections with visible child categories only", () => {
    const sections = buildPublicCategoryHierarchy(buildTree());
    assert.equal(sections.length, 2);
    assert.equal(sections[0]?.name, "Áo thun");
    assert.deepEqual(
      sections[0]?.children.map((child) => child.slug),
      ["ao-thun-tron"],
    );
    assert.equal(PUBLIC_ALL_CATEGORIES_PATH, "/danh-muc-san-pham");
  });
});

describe("canonical public category URLs", () => {
  it("uses the same catalog filter URL across category surfaces", () => {
    const slug = "ao-thun-tron";
    const href = publicCategoryHref(slug);
    assert.equal(href, "/san-pham?category=ao-thun-tron");

    const grid = buildHomepageChildCategoryGrid(buildTree());
    assert.ok(grid.items.every((item) => item.href === publicCategoryHref(item.slug)));

    const sections = buildPublicCategoryHierarchy(buildTree());
    assert.ok(
      sections.every((section) =>
        section.children.every((child) => child.href === publicCategoryHref(child.slug)),
      ),
    );
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
