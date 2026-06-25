import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapProductToPublicDetail } from "@/features/products/product-detail.mapper";
import type {
  ProductOptionGroup,
  PublicProductVariantDetail,
} from "@/features/products/product-detail.types";
import {
  buildPdpImageAllowlist,
  acceptProductScopedImageUrl,
} from "@/lib/productImageScope";
import {
  getInitialSelection,
  resolvePdpGalleryImageUrl,
} from "@/lib/productOptionSelection";
import { mergeGalleryWithVariantImage } from "@/lib/productVariants";

const PRIMARY = "/uploads/products/default.jpg";
const BLACK_EXACT = "/uploads/products/black-l.jpg";
const BLACK_OPTION = "/uploads/products/black.jpg";
const BLACK_M = "/uploads/products/black-m.jpg";
const UNRELATED = "/uploads/other/evil.jpg";

const colorGroup: ProductOptionGroup = {
  id: "color-group",
  slug: "color",
  name: "Màu sắc",
  sortOrder: 0,
  values: [
    {
      id: "black-value",
      label: "Đen",
      valueCode: "BLK",
      imageUrl: BLACK_OPTION,
      sortOrder: 0,
    },
    {
      id: "white-value",
      label: "Trắng",
      valueCode: "WHT",
      imageUrl: "/uploads/products/white.jpg",
      sortOrder: 1,
    },
  ],
};

const sizeGroup: ProductOptionGroup = {
  id: "size-group",
  slug: "size",
  name: "Kích thước",
  sortOrder: 1,
  values: [
    { id: "size-m", label: "M", valueCode: "M", imageUrl: null, sortOrder: 0 },
    { id: "size-l", label: "L", valueCode: "L", imageUrl: null, sortOrder: 1 },
  ],
};

const optionGroups = [colorGroup, sizeGroup];

function buildVariants(): PublicProductVariantDetail[] {
  return [
    {
      id: "v-black-m",
      sku: "TS-BLK-M",
      label: "Đen / M",
      stockStatus: "IN_STOCK",
      imageUrl: BLACK_M,
      optionValueIds: ["black-value", "size-m"],
      optionSelections: { color: "Đen", size: "M" },
    },
    {
      id: "v-black-l",
      sku: "TS-BLK-L",
      label: "Đen / L",
      stockStatus: "IN_STOCK",
      imageUrl: BLACK_EXACT,
      optionValueIds: ["black-value", "size-l"],
      optionSelections: { color: "Đen", size: "L" },
    },
    {
      id: "v-white-m",
      sku: "TS-WHT-M",
      label: "Trắng / M",
      stockStatus: "IN_STOCK",
      imageUrl: null,
      optionValueIds: ["white-value", "size-m"],
      optionSelections: { color: "Trắng", size: "M" },
    },
  ];
}

function buildAllowlist(variants: PublicProductVariantDetail[]) {
  return buildPdpImageAllowlist({
    images: [{ id: "primary", imageUrl: PRIMARY, sortOrder: 0 }],
    variantImageUrls: variants.map((variant) => variant.imageUrl),
    optionValueImageUrls: optionGroups.flatMap((group) =>
      group.values.map((value) => value.imageUrl),
    ),
  });
}

describe("resolvePdpGalleryImageUrl", () => {
  const variants = buildVariants();
  const allowlist = buildAllowlist(variants);

  it("returns exact variant image for fully selected Black + L", () => {
    const selection = { color: "Đen", size: "L" };
    assert.equal(
      resolvePdpGalleryImageUrl(variants, optionGroups, selection, allowlist, PRIMARY),
      BLACK_EXACT,
    );
  });

  it("returns color option-value image when exact variant image is missing", () => {
    const noExact = variants.map((variant) =>
      variant.id === "v-black-l" ? { ...variant, imageUrl: null } : variant,
    );
    const selection = { color: "Đen", size: "L" };
    assert.equal(
      resolvePdpGalleryImageUrl(noExact, optionGroups, selection, allowlist, PRIMARY),
      BLACK_OPTION,
    );
  });

  it("returns deterministic same-color sibling image when exact and color option images are missing", () => {
    const siblingOnly = variants.map((variant) => ({
      ...variant,
      imageUrl: variant.id === "v-black-m" ? BLACK_M : null,
    }));
    const groupsWithoutBlackOption = optionGroups.map((group) =>
      group.slug === "color"
        ? {
            ...group,
            values: group.values.map((value) =>
              value.label === "Đen" ? { ...value, imageUrl: null } : value,
            ),
          }
        : group,
    );
    const selection = { color: "Đen", size: "L" };
    assert.equal(
      resolvePdpGalleryImageUrl(
        siblingOnly,
        groupsWithoutBlackOption,
        selection,
        allowlist,
        PRIMARY,
      ),
      BLACK_M,
    );
  });

  it("falls back to product primary image when no color or variant image matches", () => {
    const bare = variants.map((variant) => ({ ...variant, imageUrl: null }));
    const bareGroups = optionGroups.map((group) => ({
      ...group,
      values: group.values.map((value) => ({ ...value, imageUrl: null })),
    }));
    const selection = { color: "Đen", size: "L" };
    assert.equal(
      resolvePdpGalleryImageUrl(bare, bareGroups, selection, allowlist, PRIMARY),
      PRIMARY,
    );
  });
});

describe("mergeGalleryWithVariantImage", () => {
  const baseImages = [{ id: "primary", imageUrl: PRIMARY, sortOrder: 0 }];
  const allowlist = buildAllowlist(buildVariants());

  it("prepends selected image not present in stored gallery", () => {
    const merged = mergeGalleryWithVariantImage(baseImages, BLACK_OPTION, allowlist);
    assert.equal(merged[0]?.imageUrl, BLACK_OPTION);
    assert.equal(merged.length, 2);
  });

  it("does not duplicate URLs already in gallery", () => {
    const merged = mergeGalleryWithVariantImage(baseImages, PRIMARY, allowlist);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.imageUrl, PRIMARY);
  });

  it("does not mutate the stored gallery input", () => {
    const snapshot = baseImages.map((image) => ({ ...image }));
    mergeGalleryWithVariantImage(baseImages, BLACK_OPTION, allowlist);
    assert.deepEqual(baseImages, snapshot);
  });
});

describe("product-owned image scope", () => {
  it("retains valid product-owned variant and option images in public mapper", () => {
    const detail = mapProductToPublicDetail({
      id: "p1",
      slug: "ao-thun",
      name: "Áo thun",
      productCode: "TS001",
      shortDescription: null,
      description: null,
      seoTitle: null,
      seoDescription: null,
      material: null,
      form: null,
      fit: null,
      gsm: null,
      defaultMoq: null,
      leadTime: null,
      supportsPrinting: false,
      supportsEmbroidery: false,
      supportsOem: false,
      useCases: [],
      targetCustomers: [],
      featuredImage: PRIMARY,
      gallery: [],
      category: { id: "c1", name: "Áo thun", slug: "ao-thun-tron" },
      images: [],
      options: [
        {
          id: "opt-color",
          name: "Màu sắc",
          slug: "color",
          sortOrder: 0,
          values: [
            {
              id: "ov-black",
              label: "Đen",
              valueCode: "BLK",
              imageUrl: BLACK_OPTION,
              sortOrder: 0,
            },
          ],
        },
        {
          id: "opt-size",
          name: "Kích thước",
          slug: "size",
          sortOrder: 1,
          values: [
            {
              id: "ov-m",
              label: "M",
              valueCode: "M",
              imageUrl: null,
              sortOrder: 0,
            },
          ],
        },
      ],
      specifications: [],
      customizationCapabilities: [],
      variants: [
        {
          id: "v1",
          sku: "TS-BLK-M",
          displayLabel: null,
          colorName: null,
          colorCode: null,
          sizeName: null,
          dimensions: null,
          capacity: null,
          stockStatus: "IN_STOCK",
          stockQty: 1,
          imageUrl: BLACK_M,
          moqOverride: null,
          leadTimeOverride: null,
          materialOverride: null,
          color: null,
          size: null,
          optionValues: [
            {
              optionValue: {
                id: "ov-black",
                label: "Đen",
                valueCode: "BLK",
                imageUrl: BLACK_OPTION,
                sortOrder: 0,
                option: { id: "opt-color", slug: "color", name: "Màu sắc" },
              },
            },
            {
              optionValue: {
                id: "ov-m",
                label: "M",
                valueCode: "M",
                imageUrl: null,
                sortOrder: 0,
                option: { id: "opt-size", slug: "size", name: "Kích thước" },
              },
            },
          ],
        },
      ],
    });

    assert.equal(detail.variants[0]?.imageUrl, BLACK_M);
    assert.equal(detail.optionGroups[0]?.values[0]?.imageUrl, BLACK_OPTION);
    assert.equal(detail.images[0]?.imageUrl, PRIMARY);
  });

  it("rejects unrelated URLs not owned by the product", () => {
    const allowlist = buildPdpImageAllowlist({
      images: [{ id: "primary", imageUrl: PRIMARY, sortOrder: 0 }],
      variantImageUrls: [BLACK_M],
      optionValueImageUrls: [BLACK_OPTION],
    });
    assert.equal(acceptProductScopedImageUrl(UNRELATED, allowlist), null);
    assert.equal(acceptProductScopedImageUrl(BLACK_M, allowlist), BLACK_M);
  });
});

describe("selection-driven gallery resolution", () => {
  it("switches resolved image when color selection changes", () => {
    const variants = buildVariants();
    const allowlist = buildAllowlist(variants);
    const blackSelection = { color: "Đen", size: "M" };
    const whiteSelection = { color: "Trắng", size: "M" };

    assert.equal(
      resolvePdpGalleryImageUrl(variants, optionGroups, blackSelection, allowlist, PRIMARY),
      BLACK_M,
    );
    assert.equal(
      resolvePdpGalleryImageUrl(variants, optionGroups, whiteSelection, allowlist, PRIMARY),
      "/uploads/products/white.jpg",
    );
  });

  it("starts from empty selection without throwing", () => {
    const selection = getInitialSelection(optionGroups);
    assert.equal(
      resolvePdpGalleryImageUrl(buildVariants(), optionGroups, selection, buildAllowlist(buildVariants()), PRIMARY),
      PRIMARY,
    );
  });
});
