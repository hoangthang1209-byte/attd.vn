export const CRM_PRODUCT_SERVICE_OPTIONS = [
  { key: "inLogo", label: "In logo" },
  { key: "embroidery", label: "Thêu" },
  { key: "customSewing", label: "May theo yêu cầu" },
  { key: "packaging", label: "Đóng gói" },
  { key: "sample", label: "Cần mẫu" },
] as const;

export type CrmVariantOption = {
  id: string;
  sku: string;
  colorName?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  capacity?: string | null;
};

export type CrmProductOption = {
  id: string;
  name: string;
  productCode: string | null;
};

export type CrmProductInterestRowState = {
  key: string;
  productId: string;
  variantId: string;
  productNameSnapshot: string;
  quantity: string;
  unit: string;
  requirementNote: string;
  serviceNeeds: Record<string, boolean>;
};

export function createEmptyProductInterestRow(): CrmProductInterestRowState {
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return {
    key,
    productId: "",
    variantId: "",
    productNameSnapshot: "",
    quantity: "",
    unit: "cái",
    requirementNote: "",
    serviceNeeds: {},
  };
}

export function formatVariantLabel(variant: CrmVariantOption): string {
  const parts = [variant.sku];
  if (variant.colorName?.trim()) parts.push(variant.colorName.trim());
  if (variant.sizeName?.trim()) parts.push(variant.sizeName.trim());
  if (variant.dimensions?.trim()) parts.push(variant.dimensions.trim());
  if (variant.capacity?.trim()) parts.push(variant.capacity.trim());
  return parts.join(" · ");
}

export function buildProductInterestSnapshot(
  productName: string,
  variant?: CrmVariantOption | null
): string {
  const base = productName.trim();
  if (!variant) return base;
  const variantLabel = formatVariantLabel(variant);
  return variantLabel ? `${base} (${variantLabel})` : base;
}

export function rowHasProductInterestData(row: CrmProductInterestRowState): boolean {
  return Boolean(
    row.productId ||
      row.productNameSnapshot.trim() ||
      row.quantity.trim() ||
      row.requirementNote.trim()
  );
}
