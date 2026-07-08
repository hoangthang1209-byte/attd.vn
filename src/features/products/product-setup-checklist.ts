import { getProductModeConfig, getProductTemplateConfig } from "@/features/products/product-entry-modes";

export type SetupChecklistStatus = "done" | "todo" | "optional";

export type SetupChecklistItem = {
  key: string;
  label: string;
  status: SetupChecklistStatus;
  hint?: string;
};

export type SetupChecklistGroup = {
  key: string;
  title: string;
  items: SetupChecklistItem[];
};

export type ProductSetupChecklistInput = {
  productMode?: string | null;
  productTemplateKey?: string | null;
  name?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  hasImage?: boolean;
  categoryId?: string | null;
  categoryHasSkuCode?: boolean;
  activeVariantCount?: number;
  noVariantConfirmed?: boolean;
  defaultMoq?: number | null;
  leadTime?: string | null;
  pricingMode?: string | null;
  stockMode?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  hasSeoFallback?: boolean;
  publishReady?: boolean;
};

function status(done: boolean, required: boolean): SetupChecklistStatus {
  if (done) return "done";
  return required ? "todo" : "optional";
}

function filled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function buildProductSetupChecklist(input: ProductSetupChecklistInput): SetupChecklistGroup[] {
  const mode = getProductModeConfig(input.productMode);
  const template = getProductTemplateConfig(input.productTemplateKey);
  const isNoVariantTemplate = template ? template.variantAxes.length === 0 : false;
  const requiresStock = mode?.requiresStock ?? false;
  const requiresMoqLeadTime = mode?.requiresMoqLeadTime ?? false;
  const requiresPublicPrice = mode?.requiresPublicPrice ?? false;
  const hasVariants = (input.activeVariantCount ?? 0) > 0;
  const seoDone = (filled(input.seoTitle) && filled(input.seoDescription)) || Boolean(input.hasSeoFallback);
  const hasMode = Boolean(input.productMode);
  const hasTemplate = Boolean(input.productTemplateKey);

  return [
    {
      key: "basic",
      title: "Thông tin cơ bản",
      items: [
        { key: "name", label: "Tên sản phẩm", status: status(filled(input.name), true) },
        { key: "shortDescription", label: "Mô tả ngắn", status: status(filled(input.shortDescription), false) },
        { key: "description", label: "Mô tả chi tiết", status: status(filled(input.description), true) },
        {
          key: "productMode",
          label: "Loại sản phẩm",
          status: hasMode ? "done" : "optional",
          hint: hasMode ? undefined : "Sản phẩm cũ — không bắt buộc trừ khi xuất bản theo luồng mới.",
        },
        {
          key: "productTemplate",
          label: "Mẫu sản phẩm",
          status: hasTemplate ? "done" : "optional",
          hint: hasTemplate ? undefined : "Sản phẩm cũ — không bắt buộc trừ khi xuất bản theo luồng mới.",
        },
      ],
    },
    {
      key: "images",
      title: "Ảnh sản phẩm",
      items: [{ key: "featuredImage", label: "Ảnh chính", status: status(Boolean(input.hasImage), true) }],
    },
    {
      key: "category",
      title: "Danh mục & phân loại",
      items: [
        { key: "categoryId", label: "Đã chọn danh mục", status: status(filled(input.categoryId), true) },
        {
          key: "categorySkuCode",
          label: "Danh mục có mã (SKU)",
          status: status(Boolean(input.categoryHasSkuCode), false),
          hint: input.categoryHasSkuCode ? undefined : "Danh mục thiếu mã — cần bổ sung trước khi tạo SKU hàng loạt.",
        },
      ],
    },
    {
      key: "variants",
      title: "Biến thể",
      items: [
        {
          key: "variants",
          label: isNoVariantTemplate ? "Không dùng biến thể" : "Có biến thể",
          status: isNoVariantTemplate ? "optional" : status(hasVariants || Boolean(input.noVariantConfirmed), true),
        },
      ],
    },
    {
      key: "pricing",
      title: "Giá & MOQ",
      items: [
        { key: "pricingMode", label: "Hình thức giá", status: status(filled(input.pricingMode), requiresPublicPrice) },
        { key: "defaultMoq", label: "MOQ", status: status(typeof input.defaultMoq === "number" && input.defaultMoq > 0, requiresMoqLeadTime) },
        { key: "leadTime", label: "Thời gian sản xuất", status: status(filled(input.leadTime), requiresMoqLeadTime) },
      ],
    },
    {
      key: "stock",
      title: "Tồn kho / khả dụng",
      items: [{ key: "stockMode", label: "Trạng thái tồn kho / khả dụng", status: status(filled(input.stockMode), requiresStock) }],
    },
    {
      key: "seo",
      title: "SEO",
      items: [{ key: "seo", label: "Tiêu đề & mô tả SEO (có thể dùng bản tự tạo)", status: status(seoDone, true) }],
    },
    {
      key: "publish",
      title: "Sẵn sàng xuất bản",
      items: [{ key: "publishReady", label: "Đã đủ điều kiện xuất bản", status: status(Boolean(input.publishReady), true) }],
    },
  ];
}
