import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProductAdminEditInitialData,
  mapOptionsToFormRows,
  mapVariantsToFormRows,
} from "./product-catalog-form-mappers";

/** Demo polo shape: structured options, 12 variants, scoped gallery media. */
const DEMO_POLO_ADMIN_PRODUCT = {
  id: "cmqq3eb1d0001rwo0eknjhrig",
  slug: "ao-polo-the-thao-pique-pro-demo",
  name: "Áo polo thể thao Pique Pro",
  productCode: "POLO-001",
  categoryId: "cat-polo",
  shortDescription: "Polo demo",
  description: "<p>Demo</p>",
  material: "Pique",
  form: null,
  fit: null,
  defaultMoq: 50,
  leadTime: "7 ngày",
  useCases: ["Đồng phục công ty"],
  targetCustomers: ["Doanh nghiệp"],
  supportsPrinting: true,
  supportsEmbroidery: true,
  supportsOem: true,
  tags: ["áo polo"],
  status: "ACTIVE",
  featuredImage:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-Ya-tron-GzLHUcMeuxkEP9ObPK83XMxLPCmRD4.jpg",
  gallery: [
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-Ya-tron-GzLHUcMeuxkEP9ObPK83XMxLPCmRD4.jpg",
  ],
  specifications: [{ id: "spec-1", label: "Chất liệu", value: "Pique", sortOrder: 0 }],
  customizationCapabilities: [
    { id: "cap-1", label: "In logo", description: null, sortOrder: 0, enabled: true },
  ],
  options: [
    {
      id: "opt-color",
      name: "Màu sắc",
      slug: "mau-sac",
      sortOrder: 0,
      values: [
        {
          id: "val-white",
          label: "Trắng",
          valueCode: "WHITE",
          imageUrl: null,
          sortOrder: 0,
        },
      ],
    },
    {
      id: "opt-size",
      name: "Kích thước",
      slug: "kich-thuoc",
      sortOrder: 1,
      values: [
        {
          id: "val-m",
          label: "M",
          valueCode: "M",
          imageUrl: null,
          sortOrder: 0,
        },
      ],
    },
  ],
  variants: [
    {
      id: "var-1",
      sku: "POLO-001-WHITE-M",
      colorName: "Trắng",
      colorCode: "WHITE",
      sizeName: "M",
      dimensions: null,
      capacity: null,
      displayLabel: "Trắng / M",
      moqOverride: null,
      leadTimeOverride: null,
      materialOverride: null,
      wholesalePrice: null,
      dealerPrice: null,
      stockQty: 100,
      stockStatus: "IN_STOCK",
      variantStatus: "ACTIVE",
      imageUrl: null,
      internalNote: null,
      optionValues: [{ optionValueId: "val-white" }, { optionValueId: "val-m" }],
    },
  ],
  seoTitle: null,
  seoDescription: null,
};

describe("mapOptionsToFormRows", () => {
  it("tolerates missing option values (post-media-cleanup shape)", () => {
    const rows = mapOptionsToFormRows([
      {
        id: "opt-1",
        name: "Màu sắc",
        slug: "mau-sac",
        sortOrder: 0,
        values: null,
      },
    ]);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0]?.values, []);
  });
});

describe("mapVariantsToFormRows", () => {
  it("maps structured variants with cleared image URLs", () => {
    const rows = mapVariantsToFormRows(DEMO_POLO_ADMIN_PRODUCT.variants);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.variantKind, "structured");
    assert.equal(rows[0]?.imageUrl, "");
    assert.deepEqual(rows[0]?.optionValueIds, ["val-white", "val-m"]);
  });
});

describe("buildProductAdminEditInitialData", () => {
  it("produces JSON-serializable initial data for demo structured product", () => {
    const initialData = buildProductAdminEditInitialData(DEMO_POLO_ADMIN_PRODUCT);
    assert.equal(initialData.options.length, 2);
    assert.equal(initialData.variants.length, 1);
    assert.equal(initialData.gallery.length, 1);
    JSON.stringify(initialData);
  });

  it("maps legacy product without variants", () => {
    const initialData = buildProductAdminEditInitialData({
      ...DEMO_POLO_ADMIN_PRODUCT,
      options: [],
      variants: [],
      useCases: null,
      targetCustomers: null,
      tags: null,
      gallery: null,
    });
    assert.equal(initialData.useCases, "");
    assert.equal(initialData.tags, "");
    assert.deepEqual(initialData.gallery, []);
    assert.deepEqual(initialData.variants, []);
    JSON.stringify(initialData);
  });
});
