import type { VariantStatus } from "@prisma/client";

/** Canonical Vietnamese labels for variant lifecycle status (admin UI). */
export const VARIANT_STATUS_LABELS: Record<VariantStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng sử dụng",
  ARCHIVED: "Lưu trữ",
};

export const VARIANT_STATUS_OPTIONS: Array<{ value: VariantStatus; label: string }> = [
  { value: "ACTIVE", label: VARIANT_STATUS_LABELS.ACTIVE },
  { value: "INACTIVE", label: VARIANT_STATUS_LABELS.INACTIVE },
  { value: "ARCHIVED", label: VARIANT_STATUS_LABELS.ARCHIVED },
];

export const STOCK_STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết",
  OUT_OF_STOCK: "Hết hàng",
  PREORDER: "Đặt trước",
};

export function variantStatusLabel(status: string): string {
  if (status === "ACTIVE" || status === "INACTIVE" || status === "ARCHIVED") {
    return VARIANT_STATUS_LABELS[status];
  }
  return status;
}

export function variantStatusBadgeClass(status: string): string {
  if (status === "ARCHIVED") return "admin-variant-status-badge admin-variant-status-badge--archived";
  if (status === "INACTIVE") return "admin-variant-status-badge admin-variant-status-badge--inactive";
  return "admin-variant-status-badge admin-variant-status-badge--active";
}

export function variantMatrixRowClass(status: string): string {
  if (status === "ARCHIVED") return "admin-variant-matrix-row is-archived";
  if (status !== "ACTIVE") return "admin-variant-matrix-row is-inactive";
  return "admin-variant-matrix-row";
}
