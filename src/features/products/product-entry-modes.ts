/**
 * P0.2A — Revenue Product Entry V1
 * Config-driven product ENTRY accelerators. Not categories, not ERP BOM.
 * Persisted via Product.metadata.productEntry (no schema migration).
 */

export type ProductEntryMode =
  | "WHOLESALE_AVAILABLE"
  | "MADE_TO_ORDER"
  | "GIFT_MERCHANDISE"
  | "OEM_SOURCING";

export type ProductStockMode = "IN_STOCK" | "MADE_TO_ORDER" | "PREORDER";
export type ProductPricingMode = "QUOTE_BY_QUANTITY" | "FIXED" | "CONTACT_QUOTE";
export type ProductVariantAxisKind = "COLOR" | "SIZE" | "CAPACITY" | "DIMENSION";

export const PRODUCT_ENTRY_MODE_LABELS: Record<ProductEntryMode, string> = {
  WHOLESALE_AVAILABLE: "Hàng có sẵn / bán sỉ",
  MADE_TO_ORDER: "Sản xuất theo yêu cầu",
  GIFT_MERCHANDISE: "Quà tặng / merchandise",
  OEM_SOURCING: "OEM / sourcing",
};

export const PRODUCT_STOCK_MODE_LABELS: Record<ProductStockMode, string> = {
  IN_STOCK: "Có sẵn tồn kho",
  MADE_TO_ORDER: "Sản xuất theo đơn",
  PREORDER: "Đặt trước",
};

export const PRODUCT_PRICING_MODE_LABELS: Record<ProductPricingMode, string> = {
  QUOTE_BY_QUANTITY: "Báo giá theo số lượng",
  FIXED: "Giá cố định",
  CONTACT_QUOTE: "Liên hệ báo giá",
};

export const PRODUCT_MODE_HELPER =
  "Loại sản phẩm giúp hệ thống tự gợi ý trường cần nhập, tồn kho, giá, MOQ và nội dung SEO.";

export const PRODUCT_TEMPLATE_HELPER =
  "Mẫu sản phẩm giúp tự điền biến thể, MOQ, thời gian sản xuất và checklist xuất bản.";

export type ProductModePublishRequirement =
  | "PRICING_MODE"
  | "STOCK_MODE"
  | "VARIANTS_OR_NO_VARIANT"
  | "MOQ"
  | "LEAD_TIME"
  | "CUSTOMIZATION_OR_QUOTE"
  | "MOQ_OR_QUOTE"
  | "QUOTE_CTA";

export type ProductModeConfig = {
  key: ProductEntryMode;
  name: string;
  description: string;
  defaultStockMode: ProductStockMode;
  defaultPricingMode: ProductPricingMode;
  pricingModes: ProductPricingMode[];
  quoteFirst: boolean;
  requiresPublicPrice: boolean;
  requiresStock: boolean;
  requiresMoqLeadTime: boolean;
  publishRequirements: ProductModePublishRequirement[];
};

export const PRODUCT_ENTRY_MODES: ProductModeConfig[] = [
  {
    key: "WHOLESALE_AVAILABLE",
    name: PRODUCT_ENTRY_MODE_LABELS.WHOLESALE_AVAILABLE,
    description: "Áo/phụ kiện trơn có sẵn tồn kho và giá đại lý.",
    defaultStockMode: "IN_STOCK",
    defaultPricingMode: "QUOTE_BY_QUANTITY",
    pricingModes: ["QUOTE_BY_QUANTITY", "FIXED"],
    quoteFirst: false,
    requiresPublicPrice: true,
    requiresStock: true,
    requiresMoqLeadTime: false,
    publishRequirements: ["PRICING_MODE", "STOCK_MODE", "VARIANTS_OR_NO_VARIANT"],
  },
  {
    key: "MADE_TO_ORDER",
    name: PRODUCT_ENTRY_MODE_LABELS.MADE_TO_ORDER,
    description: "Đồng phục, sản phẩm may/gia công theo yêu cầu, chú trọng MOQ và thời gian.",
    defaultStockMode: "MADE_TO_ORDER",
    defaultPricingMode: "QUOTE_BY_QUANTITY",
    pricingModes: ["QUOTE_BY_QUANTITY", "CONTACT_QUOTE"],
    quoteFirst: false,
    requiresPublicPrice: false,
    requiresStock: false,
    requiresMoqLeadTime: true,
    publishRequirements: ["MOQ", "LEAD_TIME", "CUSTOMIZATION_OR_QUOTE"],
  },
  {
    key: "GIFT_MERCHANDISE",
    name: PRODUCT_ENTRY_MODE_LABELS.GIFT_MERCHANDISE,
    description: "Ly/bình giữ nhiệt, quà tặng, merchandise, sản phẩm khuyến mãi.",
    defaultStockMode: "MADE_TO_ORDER",
    defaultPricingMode: "QUOTE_BY_QUANTITY",
    pricingModes: ["QUOTE_BY_QUANTITY", "FIXED", "CONTACT_QUOTE"],
    quoteFirst: false,
    requiresPublicPrice: false,
    requiresStock: false,
    requiresMoqLeadTime: true,
    publishRequirements: ["MOQ_OR_QUOTE"],
  },
  {
    key: "OEM_SOURCING",
    name: PRODUCT_ENTRY_MODE_LABELS.OEM_SOURCING,
    description: "Sản phẩm private-label/sourcing, thường báo giá trước (quote-first).",
    defaultStockMode: "MADE_TO_ORDER",
    defaultPricingMode: "CONTACT_QUOTE",
    pricingModes: ["CONTACT_QUOTE", "QUOTE_BY_QUANTITY"],
    quoteFirst: true,
    requiresPublicPrice: false,
    requiresStock: false,
    requiresMoqLeadTime: false,
    publishRequirements: ["QUOTE_CTA"],
  },
];

export type ProductTemplateVariantAxis = {
  kind: ProductVariantAxisKind;
  label: string;
  sampleValues: string[];
};

export type ProductTemplateConfig = {
  key: string;
  name: string;
  helper?: string;
  recommendedCategorySlugs: string[];
  variantAxes: ProductTemplateVariantAxis[];
  defaultMoq: number;
  defaultLeadTime: string;
  defaultStockMode: ProductStockMode;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  requiredPublishFields: string[];
  seoTitlePattern: string;
  metaDescriptionPattern: string;
  descriptionOutline: string[];
  compatibleModes: ProductEntryMode[];
};

const AXIS_COLOR: ProductTemplateVariantAxis = {
  kind: "COLOR",
  label: "Màu sắc",
  sampleValues: ["Trắng", "Đen", "Xanh navy", "Đỏ"],
};

const AXIS_SIZE_APPAREL: ProductTemplateVariantAxis = {
  kind: "SIZE",
  label: "Kích thước",
  sampleValues: ["S", "M", "L", "XL", "XXL"],
};

export const PRODUCT_ENTRY_SEO_TITLE_PATTERN = "{name} | {company}";
const META_PATTERN_DEFAULT =
  "{name} thuộc nhóm {category}. MOQ từ {moq}, thời gian sản xuất {leadTime}. Đặt in logo theo yêu cầu tại {company}.";

export const PRODUCT_ENTRY_TEMPLATES: ProductTemplateConfig[] = [
  {
    key: "tshirt",
    name: "Áo thun",
    recommendedCategorySlugs: ["ao-thun-tron", "ao-thun", "ao-thun-regular"],
    variantAxes: [AXIS_COLOR, AXIS_SIZE_APPAREL],
    defaultMoq: 50,
    defaultLeadTime: "7-10 ngày",
    defaultStockMode: "IN_STOCK",
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: false,
    requiredPublishFields: ["name", "categoryId", "featuredImage", "seo", "description", "variants"],
    seoTitlePattern: PRODUCT_ENTRY_SEO_TITLE_PATTERN,
    metaDescriptionPattern: META_PATTERN_DEFAULT,
    descriptionOutline: ["Giới thiệu chất liệu vải và định lượng (GSM).", "Form dáng, phom may và bảng size.", "Khả năng in/thêu logo.", "MOQ, thời gian sản xuất."],
    compatibleModes: ["WHOLESALE_AVAILABLE", "MADE_TO_ORDER", "OEM_SOURCING"],
  },
  {
    key: "polo",
    name: "Áo polo",
    recommendedCategorySlugs: ["ao-polo-tron", "ao-polo", "ao-polo-the-thao"],
    variantAxes: [AXIS_COLOR, AXIS_SIZE_APPAREL],
    defaultMoq: 50,
    defaultLeadTime: "7-12 ngày",
    defaultStockMode: "IN_STOCK",
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: false,
    requiredPublishFields: ["name", "categoryId", "featuredImage", "seo", "description", "variants"],
    seoTitlePattern: PRODUCT_ENTRY_SEO_TITLE_PATTERN,
    metaDescriptionPattern: META_PATTERN_DEFAULT,
    descriptionOutline: ["Chất liệu vải (cá sấu/cotton).", "Chi tiết bo cổ, bo tay.", "In/thêu logo.", "MOQ, thời gian sản xuất."],
    compatibleModes: ["WHOLESALE_AVAILABLE", "MADE_TO_ORDER", "OEM_SOURCING"],
  },
  {
    key: "hoodie",
    name: "Áo hoodie / sweater",
    recommendedCategorySlugs: ["ao-hoodie", "ao-hoodie-zip", "ao-sweater"],
    variantAxes: [AXIS_COLOR, AXIS_SIZE_APPAREL],
    defaultMoq: 30,
    defaultLeadTime: "10-15 ngày",
    defaultStockMode: "MADE_TO_ORDER",
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: false,
    requiredPublishFields: ["name", "categoryId", "featuredImage", "seo", "description", "variants"],
    seoTitlePattern: PRODUCT_ENTRY_SEO_TITLE_PATTERN,
    metaDescriptionPattern: META_PATTERN_DEFAULT,
    descriptionOutline: ["Chất liệu nỉ.", "Chi tiết mũ, dây rút.", "In/thêu.", "MOQ, thời gian sản xuất."],
    compatibleModes: ["WHOLESALE_AVAILABLE", "MADE_TO_ORDER", "OEM_SOURCING"],
  },
  {
    key: "cap",
    name: "Nón",
    recommendedCategorySlugs: ["non", "non-cap", "non-baseball", "non-luoi-trai"],
    variantAxes: [AXIS_COLOR, { kind: "SIZE", label: "Size / Freesize", sampleValues: ["Freesize"] }],
    defaultMoq: 50,
    defaultLeadTime: "7-12 ngày",
    defaultStockMode: "IN_STOCK",
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: false,
    requiredPublishFields: ["name", "categoryId", "featuredImage", "seo", "description", "variants"],
    seoTitlePattern: PRODUCT_ENTRY_SEO_TITLE_PATTERN,
    metaDescriptionPattern: META_PATTERN_DEFAULT,
    descriptionOutline: ["Kiểu dáng nón.", "In/thêu logo.", "MOQ, thời gian sản xuất."],
    compatibleModes: ["WHOLESALE_AVAILABLE", "MADE_TO_ORDER", "GIFT_MERCHANDISE"],
  },
  {
    key: "tote",
    name: "Túi tote / túi vải",
    recommendedCategorySlugs: ["tui-tote", "tote-bag", "tui-vai", "tui"],
    variantAxes: [AXIS_COLOR, { kind: "DIMENSION", label: "Kích thước / quy cách", sampleValues: ["35x40cm", "30x35cm"] }],
    defaultMoq: 100,
    defaultLeadTime: "10-15 ngày",
    defaultStockMode: "MADE_TO_ORDER",
    supportsPrinting: true,
    supportsEmbroidery: false,
    supportsOem: false,
    requiredPublishFields: ["name", "categoryId", "featuredImage", "seo", "description", "variants"],
    seoTitlePattern: PRODUCT_ENTRY_SEO_TITLE_PATTERN,
    metaDescriptionPattern: META_PATTERN_DEFAULT,
    descriptionOutline: ["Chất liệu canvas.", "Quy cách quai, kích thước.", "In logo.", "MOQ, thời gian sản xuất."],
    compatibleModes: ["MADE_TO_ORDER", "GIFT_MERCHANDISE", "OEM_SOURCING"],
  },
  {
    key: "drinkware",
    name: "Bình / ly giữ nhiệt",
    recommendedCategorySlugs: ["binh-giu-nhiet", "ly-giu-nhiet", "binh-ly-giu-nhiet", "binh-nuoc"],
    variantAxes: [AXIS_COLOR, { kind: "CAPACITY", label: "Dung tích", sampleValues: ["500ml", "750ml", "1000ml"] }],
    defaultMoq: 50,
    defaultLeadTime: "12-20 ngày",
    defaultStockMode: "MADE_TO_ORDER",
    supportsPrinting: true,
    supportsEmbroidery: false,
    supportsOem: true,
    requiredPublishFields: ["name", "categoryId", "featuredImage", "seo", "description", "variants"],
    seoTitlePattern: PRODUCT_ENTRY_SEO_TITLE_PATTERN,
    metaDescriptionPattern: META_PATTERN_DEFAULT,
    descriptionOutline: ["Chất liệu bình/ly.", "Dung tích.", "In UV / khắc laser.", "MOQ, thời gian sản xuất."],
    compatibleModes: ["GIFT_MERCHANDISE", "OEM_SOURCING", "WHOLESALE_AVAILABLE"],
  },
  {
    key: "apron",
    name: "Tạp dề",
    recommendedCategorySlugs: ["tap-de"],
    variantAxes: [AXIS_COLOR, AXIS_SIZE_APPAREL],
    defaultMoq: 50,
    defaultLeadTime: "7-12 ngày",
    defaultStockMode: "MADE_TO_ORDER",
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: false,
    requiredPublishFields: ["name", "categoryId", "featuredImage", "seo", "description", "variants"],
    seoTitlePattern: PRODUCT_ENTRY_SEO_TITLE_PATTERN,
    metaDescriptionPattern: META_PATTERN_DEFAULT,
    descriptionOutline: ["Chất liệu vải.", "Kiểu dáng.", "In/thêu logo.", "MOQ, thời gian sản xuất."],
    compatibleModes: ["MADE_TO_ORDER", "GIFT_MERCHANDISE", "WHOLESALE_AVAILABLE"],
  },
  {
    key: "no-variant",
    name: "Sản phẩm không biến thể",
    helper: "Sản phẩm đơn, không có ma trận màu/size.",
    recommendedCategorySlugs: [],
    variantAxes: [],
    defaultMoq: 1,
    defaultLeadTime: "",
    defaultStockMode: "IN_STOCK",
    supportsPrinting: false,
    supportsEmbroidery: false,
    supportsOem: false,
    requiredPublishFields: ["name", "categoryId", "featuredImage", "seo", "description"],
    seoTitlePattern: PRODUCT_ENTRY_SEO_TITLE_PATTERN,
    metaDescriptionPattern: META_PATTERN_DEFAULT,
    descriptionOutline: ["Mô tả sản phẩm.", "Thông số chính.", "MOQ, thời gian sản xuất (nếu có)."],
    compatibleModes: ["WHOLESALE_AVAILABLE", "MADE_TO_ORDER", "GIFT_MERCHANDISE", "OEM_SOURCING"],
  },
];

const MODE_BY_KEY = new Map(PRODUCT_ENTRY_MODES.map((m) => [m.key, m]));
const TEMPLATE_BY_KEY = new Map(PRODUCT_ENTRY_TEMPLATES.map((t) => [t.key, t]));

export function isProductEntryMode(value: unknown): value is ProductEntryMode {
  return typeof value === "string" && MODE_BY_KEY.has(value as ProductEntryMode);
}

export function isProductTemplateKey(value: unknown): value is string {
  return typeof value === "string" && TEMPLATE_BY_KEY.has(value);
}

export function getProductModeConfig(key: string | null | undefined): ProductModeConfig | null {
  if (!key) return null;
  return MODE_BY_KEY.get(key as ProductEntryMode) ?? null;
}

export function getProductTemplateConfig(key: string | null | undefined): ProductTemplateConfig | null {
  if (!key) return null;
  return TEMPLATE_BY_KEY.get(key) ?? null;
}

export function listProductTemplatesForMode(mode?: ProductEntryMode | null): ProductTemplateConfig[] {
  if (!mode) return [...PRODUCT_ENTRY_TEMPLATES];
  return PRODUCT_ENTRY_TEMPLATES.filter((t) => t.compatibleModes.includes(mode));
}

export function getTemplateVariantAxes(key: string | null | undefined): ProductTemplateVariantAxis[] {
  return getProductTemplateConfig(key)?.variantAxes ?? [];
}

export function resolveRecommendedCategoryIds(
  templateKey: string | null | undefined,
  categories: Array<{ id: string; slug: string }>,
): string[] {
  const template = getProductTemplateConfig(templateKey);
  if (!template) return [];
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));
  return template.recommendedCategorySlugs.flatMap((slug) => {
    const id = bySlug.get(slug);
    return id ? [id] : [];
  });
}

export const PRODUCT_ENTRY_METADATA_KEY = "productEntry";

export type ProductEntryMeta = {
  mode?: ProductEntryMode;
  templateKey?: string;
  stockMode?: ProductStockMode;
  pricingMode?: ProductPricingMode;
};

export function readProductEntryFromMetadata(metadata: unknown): ProductEntryMeta {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const raw = (metadata as Record<string, unknown>)[PRODUCT_ENTRY_METADATA_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entry = raw as Record<string, unknown>;
  const result: ProductEntryMeta = {};
  if (isProductEntryMode(entry.mode)) result.mode = entry.mode;
  if (isProductTemplateKey(entry.templateKey)) result.templateKey = entry.templateKey as string;
  if (entry.stockMode === "IN_STOCK" || entry.stockMode === "MADE_TO_ORDER" || entry.stockMode === "PREORDER") {
    result.stockMode = entry.stockMode;
  }
  if (
    entry.pricingMode === "QUOTE_BY_QUANTITY" ||
    entry.pricingMode === "FIXED" ||
    entry.pricingMode === "CONTACT_QUOTE"
  ) {
    result.pricingMode = entry.pricingMode;
  }
  return result;
}

export function mergeProductEntryIntoMetadata(
  existingMetadata: unknown,
  entry: ProductEntryMeta,
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {};
  const cleaned: Record<string, unknown> = {};
  if (entry.mode) cleaned.mode = entry.mode;
  if (entry.templateKey) cleaned.templateKey = entry.templateKey;
  if (entry.stockMode) cleaned.stockMode = entry.stockMode;
  if (entry.pricingMode) cleaned.pricingMode = entry.pricingMode;
  if (Object.keys(cleaned).length === 0) delete base[PRODUCT_ENTRY_METADATA_KEY];
  else base[PRODUCT_ENTRY_METADATA_KEY] = cleaned;
  return base;
}

export type ModePublishRequirementInput = {
  productMode?: string | null;
  pricingMode?: string | null;
  stockMode?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  quoteCtaEnabled?: boolean;
  hasActiveVariants?: boolean;
  noVariantConfirmed?: boolean;
};

export type ModePublishIssue = { field: string; label: string; message: string };

function hasCustomizationCapability(input: ModePublishRequirementInput): boolean {
  return Boolean(input.supportsPrinting || input.supportsEmbroidery || input.supportsOem);
}

export function evaluateProductModePublishRequirements(
  input: ModePublishRequirementInput,
): ModePublishIssue[] {
  const mode = getProductModeConfig(input.productMode);
  if (!mode) return [];

  const issues: ModePublishIssue[] = [];
  const moqOk = typeof input.defaultMoq === "number" && input.defaultMoq > 0;
  const leadOk = Boolean(input.leadTime?.trim());
  const quoteOk = Boolean(input.quoteCtaEnabled);

  for (const requirement of mode.publishRequirements) {
    switch (requirement) {
      case "PRICING_MODE":
        if (!input.pricingMode?.trim()) {
          issues.push({ field: "pricingMode", label: "Hình thức giá", message: "Vui lòng chọn hình thức giá trước khi xuất bản." });
        }
        break;
      case "STOCK_MODE":
        if (!input.stockMode?.trim()) {
          issues.push({ field: "stockMode", label: "Trạng thái tồn kho", message: "Sản phẩm có sẵn cần chọn trạng thái tồn kho/khả dụng." });
        }
        break;
      case "VARIANTS_OR_NO_VARIANT":
        if (!input.hasActiveVariants && !input.noVariantConfirmed) {
          issues.push({ field: "variants", label: "Biến thể", message: "Vui lòng tạo biến thể hoặc xác nhận sản phẩm không dùng biến thể." });
        }
        break;
      case "MOQ":
        if (!moqOk) issues.push({ field: "defaultMoq", label: "MOQ", message: "Sản phẩm sản xuất theo yêu cầu cần có MOQ." });
        break;
      case "LEAD_TIME":
        if (!leadOk) issues.push({ field: "leadTime", label: "Thời gian sản xuất", message: "Sản phẩm sản xuất theo yêu cầu cần có thời gian sản xuất." });
        break;
      case "CUSTOMIZATION_OR_QUOTE":
        if (!hasCustomizationCapability(input) && !quoteOk) {
          issues.push({ field: "customization", label: "Khả năng tùy chỉnh / báo giá", message: "Cần bật ít nhất một khả năng in/thêu/OEM hoặc kêu gọi liên hệ báo giá." });
        }
        break;
      case "MOQ_OR_QUOTE":
        if (!moqOk && !quoteOk) {
          issues.push({ field: "defaultMoq", label: "MOQ hoặc báo giá", message: "Cần có MOQ hoặc kêu gọi liên hệ báo giá." });
        }
        break;
      case "QUOTE_CTA":
        if (!quoteOk) {
          issues.push({ field: "quoteCta", label: "Kêu gọi báo giá", message: "Sản phẩm OEM/sourcing cần bật kêu gọi liên hệ báo giá (quote-first)." });
        }
        break;
    }
  }
  return issues;
}
