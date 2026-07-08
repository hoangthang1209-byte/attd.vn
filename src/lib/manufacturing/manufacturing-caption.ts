import type { ManufacturingEvidenceItem } from "@/lib/manufacturing-library.types";

const CATEGORY_ACTIVITY_LABELS: Record<string, string> = {
  warehouse: "Kho hàng",
  production: "Khu vực sản xuất",
  cutting: "Cắt vải",
  sewing: "May mẫu",
  printing: "In ấn",
  embroidery: "Thêu",
  qc: "Kiểm tra chất lượng",
  packing: "Đóng gói đơn hàng",
  delivery: "Giao hàng",
  "material-sample": "Mẫu vải",
  "material-samples": "Mẫu vải",
  "real-order": "Đơn hàng thực tế",
  "real-orders": "Đơn hàng thực tế",
  "case-study": "Dự án triển khai",
  "case-studies": "Dự án triển khai",
  machines: "Máy móc sản xuất",
  certificates: "Chứng nhận",
  team: "Đội ngũ vận hành",
  videos: "Hoạt động sản xuất",
};

function isUsableCaption(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("minh chứng")) return false;
  if (normalized.includes("evidence")) return false;
  if (normalized.includes("proof")) return false;
  return true;
}

/** Short activity label for gallery captions — prefers asset title, then category name. */
export function getManufacturingActivityCaption(item: ManufacturingEvidenceItem): string {
  if (isUsableCaption(item.title)) return item.title.trim();
  if (isUsableCaption(item.categoryName)) return item.categoryName!.trim();
  return CATEGORY_ACTIVITY_LABELS[item.category] ?? "Tại ATTD";
}
