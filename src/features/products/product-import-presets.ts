import type { ProductImportPresetId, ProductImportColumnMapping } from "@/features/products/product-import-types";

export type ProductImportPreset = {
  id: ProductImportPresetId;
  label: string;
  description: string;
  expectedColumns: string[];
  columnMapping: ProductImportColumnMapping;
  defaults: Record<string, unknown>;
};

export const PRODUCT_IMPORT_PRESETS: ProductImportPreset[] = [
  {
    id: "blank-apparel",
    label: "Áo trơn / Blank Apparel",
    description: "Nhập áo thun trơn, áo polo, hoodie và áo khoác dùng cho sỉ và xưởng in.",
    expectedColumns: [
      "productName", "category", "material", "colorName", "sizeName",
      "stockQty", "wholesalePrice", "dealerPrice", "defaultMoq", "tags",
    ],
    columnMapping: {
      productName: "productName",
      category: "category",
      material: "material",
      colorName: "colorName",
      sizeName: "sizeName",
      stockQty: "stockQty",
      wholesalePrice: "wholesalePrice",
      dealerPrice: "dealerPrice",
      defaultMoq: "defaultMoq",
      tags: "tags",
    },
    defaults: {
      supportsPrinting: true,
      supportsEmbroidery: false,
      supportsOem: true,
      status: "ACTIVE",
      stockStatus: "IN_STOCK",
    },
  },
  {
    id: "corporate-gift",
    label: "Quà tặng doanh nghiệp",
    description: "Nhập tote bag, bình giữ nhiệt, nón, bandana và phụ kiện quà tặng B2B.",
    expectedColumns: [
      "productName", "category", "material", "colorName", "dimensions", "capacity",
      "stockQty", "wholesalePrice", "dealerPrice", "defaultMoq", "tags",
    ],
    columnMapping: {
      productName: "productName",
      category: "category",
      material: "material",
      colorName: "colorName",
      dimensions: "dimensions",
      capacity: "capacity",
      stockQty: "stockQty",
      wholesalePrice: "wholesalePrice",
      dealerPrice: "dealerPrice",
      defaultMoq: "defaultMoq",
      tags: "tags",
    },
    defaults: {
      supportsPrinting: true,
      supportsEmbroidery: false,
      supportsOem: true,
      status: "ACTIVE",
      stockStatus: "IN_STOCK",
    },
  },
  {
    id: "oem-product",
    label: "Sản phẩm OEM / Private Label",
    description: "Nhập sản phẩm OEM, may theo yêu cầu doanh nghiệp — DRAFT mặc định.",
    expectedColumns: [
      "productName", "category", "material", "description", "defaultMoq",
      "useCases", "targetCustomers", "tags",
    ],
    columnMapping: {
      productName: "productName",
      category: "category",
      material: "material",
      description: "description",
      defaultMoq: "defaultMoq",
      useCases: "useCases",
      targetCustomers: "targetCustomers",
      tags: "tags",
    },
    defaults: {
      supportsPrinting: true,
      supportsEmbroidery: true,
      supportsOem: true,
      status: "DRAFT",
      stockStatus: "PREORDER",
    },
  },
  {
    id: "custom",
    label: "Tùy chỉnh",
    description: "Ánh xạ cột thủ công — phù hợp với file import tùy ý.",
    expectedColumns: ["productName", "category"],
    columnMapping: { productName: "productName", category: "category" },
    defaults: {},
  },
];

export function getPreset(id: ProductImportPresetId): ProductImportPreset {
  return PRODUCT_IMPORT_PRESETS.find((p) => p.id === id) ?? PRODUCT_IMPORT_PRESETS[3];
}
