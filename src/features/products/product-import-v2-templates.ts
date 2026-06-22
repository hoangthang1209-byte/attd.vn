import type { ImportTemplateDefinition } from "@/features/import/import-template-utils";
import { IMPORT_SHEET_NAMES } from "@/features/products/product-import-constants";

export const PRODUCT_IMPORT_HEADERS = [
  "productCode",
  "systemCode",
  "name",
  "slug",
  "categorySlug",
  "shortDescription",
  "description",
  "material",
  "form",
  "fit",
  "gsm",
  "defaultMoq",
  "leadTime",
  "supportsPrinting",
  "supportsEmbroidery",
  "supportsOem",
  "tags",
  "featuredImageUrl",
  "galleryUrls",
  "status",
  "seoTitle",
  "seoDescription",
];

const PRODUCT_HEADERS = PRODUCT_IMPORT_HEADERS;

export const VARIANT_IMPORT_HEADERS = [
  "productCode",
  "sku",
  "displayLabel",
  "optionValues",
  "colorName",
  "colorCode",
  "sizeName",
  "materialOverride",
  "stockQty",
  "stockStatus",
  "moqOverride",
  "leadTimeOverride",
  "imageUrl",
  "variantStatus",
  "wholesalePrice",
  "dealerPrice",
];

const VARIANT_HEADERS = VARIANT_IMPORT_HEADERS;

export const SPEC_IMPORT_HEADERS = ["productCode", "group", "label", "value", "sortOrder"];

const SPEC_HEADERS = SPEC_IMPORT_HEADERS;

export const CUSTOMIZATION_IMPORT_HEADERS = ["productCode", "capability", "description", "sortOrder", "enabled"];

const CUSTOMIZATION_HEADERS = CUSTOMIZATION_IMPORT_HEADERS;

const GUIDE_ROWS = [
  {
    muc: "Chế độ nhập",
    noiDung:
      "Chọn chế độ trước khi upload: Tạo sản phẩm mới | Cập nhật sản phẩm | Nhập biến thể | Cập nhật biến thể hàng loạt.",
  },
  {
    muc: "optionValues",
    noiDung: "Định dạng: Màu sắc=Đen | Kích thước=M | Chất liệu=Cotton 250gsm",
  },
  {
    muc: "galleryUrls",
    noiDung: "Nhiều URL cách nhau bằng dấu |. Ví dụ: https://example.com/a.jpg|https://example.com/b.jpg",
  },
  {
    muc: "Xóa giá trị",
    noiDung: "Nhập __CLEAR__ để xóa giá trị hiện có khi cập nhật.",
  },
  {
    muc: "Ô trống",
    noiDung: "Ô trống giữ nguyên dữ liệu hiện có (chế độ cập nhật).",
  },
  {
    muc: "Biến thể",
    noiDung: "Chỉ tạo các dòng biến thể có trong file — không tự sinh tổ hợp Cartesian.",
  },
];

export const PRODUCT_IMPORT_V2_TEMPLATES: ImportTemplateDefinition[] = [
  {
    id: "catalog-product",
    label: "Mẫu sản phẩm",
    fileName: "attd-import-san-pham",
    requiredFields: ["name", "categorySlug"],
    headers: PRODUCT_HEADERS,
    sampleRows: [
      {
        productCode: "",
        systemCode: "",
        name: "Áo thun CVC Basic unisex",
        slug: "ao-thun-cvc-basic-unisex",
        categorySlug: "ao-thun-tron",
        shortDescription: "Áo thun CVC trơn unisex cho đại lý và xưởng in",
        description:
          "Áo thun CVC 65/35, form regular fit. MOQ 50 cái/màu. Phù hợp in lụa và in DTG.",
        material: "CVC 65/35",
        form: "Regular fit",
        fit: "Unisex",
        gsm: "180",
        defaultMoq: "50",
        leadTime: "7-10 ngày",
        supportsPrinting: "true",
        supportsEmbroidery: "false",
        supportsOem: "true",
        tags: "áo thun trơn, CVC, sỉ",
        featuredImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        galleryUrls: "",
        status: "DRAFT",
        seoTitle: "",
        seoDescription: "",
      },
      {
        productCode: "",
        systemCode: "",
        name: "Áo polo pique poly Basic",
        slug: "ao-polo-pique-poly-basic",
        categorySlug: "ao-polo-tron",
        shortDescription: "Áo polo pique polyester cho đại lý",
        description: "Áo polo pique poly, form regular fit. MOQ 50 cái.",
        material: "Polyester pique",
        form: "Regular fit",
        fit: "Regular",
        gsm: "200",
        defaultMoq: "50",
        leadTime: "7-10 ngày",
        supportsPrinting: "true",
        supportsEmbroidery: "true",
        supportsOem: "true",
        tags: "áo polo, pique, đồng phục",
        featuredImageUrl: "",
        galleryUrls: "",
        status: "DRAFT",
        seoTitle: "",
        seoDescription: "",
      },
      {
        productCode: "",
        systemCode: "",
        name: "Tote canvas basic 280gsm",
        slug: "tote-canvas-basic-280gsm",
        categorySlug: "tote-bag",
        shortDescription: "Tote bag canvas 280gsm sỉ cho doanh nghiệp",
        description: "Tote canvas 280gsm, kích thước 35x40cm. MOQ 100 cái.",
        material: "Canvas 280gsm",
        form: "",
        fit: "",
        gsm: "280",
        defaultMoq: "100",
        leadTime: "10-14 ngày",
        supportsPrinting: "true",
        supportsEmbroidery: "false",
        supportsOem: "true",
        tags: "tote bag, canvas, quà tặng",
        featuredImageUrl: "",
        galleryUrls: "",
        status: "DRAFT",
        seoTitle: "",
        seoDescription: "",
      },
    ],
  },
  {
    id: "catalog-variant",
    label: "Mẫu biến thể",
    fileName: "attd-import-bien-the",
    requiredFields: ["productCode", "optionValues"],
    headers: VARIANT_HEADERS,
    sampleRows: [
      {
        productCode: "TS0001",
        sku: "",
        displayLabel: "Đen / M",
        optionValues: "Màu sắc=Đen | Kích thước=M",
        colorName: "",
        colorCode: "",
        sizeName: "",
        materialOverride: "",
        stockQty: "500",
        stockStatus: "IN_STOCK",
        moqOverride: "",
        leadTimeOverride: "",
        imageUrl: "",
        variantStatus: "ACTIVE",
        wholesalePrice: "45000",
        dealerPrice: "40000",
      },
      {
        productCode: "TS0001",
        sku: "",
        displayLabel: "Trắng / L",
        optionValues: "Màu sắc=Trắng | Kích thước=L",
        colorName: "",
        colorCode: "",
        sizeName: "",
        materialOverride: "",
        stockQty: "300",
        stockStatus: "IN_STOCK",
        moqOverride: "",
        leadTimeOverride: "",
        imageUrl: "",
        variantStatus: "ACTIVE",
        wholesalePrice: "45000",
        dealerPrice: "40000",
      },
      {
        productCode: "TS0001",
        sku: "TS0001-NVY-XL",
        displayLabel: "Navy / XL",
        optionValues: "Màu sắc=Navy | Kích thước=XL",
        colorName: "",
        colorCode: "",
        sizeName: "",
        materialOverride: "",
        stockQty: "200",
        stockStatus: "IN_STOCK",
        moqOverride: "50",
        leadTimeOverride: "7 ngày",
        imageUrl: "",
        variantStatus: "ACTIVE",
        wholesalePrice: "45000",
        dealerPrice: "40000",
      },
    ],
  },
  {
    id: "catalog-spec",
    label: "Mẫu thông số",
    fileName: "attd-import-thong-so",
    requiredFields: ["productCode", "label", "value"],
    headers: SPEC_HEADERS,
    sampleRows: [
      { productCode: "TS0001", group: "Vải", label: "Thành phần", value: "CVC 65/35", sortOrder: "1" },
      { productCode: "TS0001", group: "Vải", label: "GSM", value: "180", sortOrder: "2" },
      { productCode: "TS0001", group: "Form", label: "Kiểu dáng", value: "Regular fit unisex", sortOrder: "3" },
    ],
  },
  {
    id: "catalog-customization",
    label: "Mẫu tùy chỉnh",
    fileName: "attd-import-tuy-chinh",
    requiredFields: ["productCode", "capability"],
    headers: CUSTOMIZATION_HEADERS,
    sampleRows: [
      {
        productCode: "TS0001",
        capability: "In lụa",
        description: "In logo 1-4 màu, vị trí ngực/trước/sau",
        sortOrder: "1",
        enabled: "true",
      },
      {
        productCode: "TS0001",
        capability: "Thêu vi tính",
        description: "Thêu logo tối đa 10x10cm",
        sortOrder: "2",
        enabled: "true",
      },
      {
        productCode: "TS0001",
        capability: "Đổi tem mác",
        description: "Tem riêng theo thương hiệu khách hàng (MOQ riêng)",
        sortOrder: "3",
        enabled: "false",
      },
    ],
  },
];

export const CATALOG_BUNDLE_TEMPLATE_ID = "catalog-bundle";

export function getProductImportV2Template(id: string): ImportTemplateDefinition | undefined {
  if (id === CATALOG_BUNDLE_TEMPLATE_ID) {
    return {
      id: CATALOG_BUNDLE_TEMPLATE_ID,
      label: "Bộ mẫu catalog đầy đủ (workbook)",
      fileName: "attd-import-catalog-bundle",
      requiredFields: ["name", "categorySlug", "productCode"],
      headers: PRODUCT_HEADERS,
      sampleRows: PRODUCT_IMPORT_V2_TEMPLATES[0].sampleRows,
    };
  }
  return PRODUCT_IMPORT_V2_TEMPLATES.find((t) => t.id === id);
}

export function getCatalogBundleSheets(): Array<{
  sheetName: string;
  headers: string[];
  sampleRows: Record<string, string>[];
}> {
  return [
    { sheetName: IMPORT_SHEET_NAMES.guide, headers: ["muc", "noiDung"], sampleRows: GUIDE_ROWS },
    {
      sheetName: IMPORT_SHEET_NAMES.product,
      headers: PRODUCT_HEADERS,
      sampleRows: PRODUCT_IMPORT_V2_TEMPLATES[0].sampleRows,
    },
    {
      sheetName: IMPORT_SHEET_NAMES.variant,
      headers: VARIANT_HEADERS,
      sampleRows: PRODUCT_IMPORT_V2_TEMPLATES[1].sampleRows,
    },
    {
      sheetName: IMPORT_SHEET_NAMES.specification,
      headers: SPEC_HEADERS,
      sampleRows: PRODUCT_IMPORT_V2_TEMPLATES[2].sampleRows,
    },
    {
      sheetName: IMPORT_SHEET_NAMES.customization,
      headers: CUSTOMIZATION_HEADERS,
      sampleRows: PRODUCT_IMPORT_V2_TEMPLATES[3].sampleRows,
    },
  ];
}
