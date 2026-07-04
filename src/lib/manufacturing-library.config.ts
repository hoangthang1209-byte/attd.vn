import type {
  ManufacturingEvidenceItem,
  ManufacturingEvidenceSurface,
} from "@/lib/manufacturing-library.types";

const MANUFACTURING_LIBRARY_SEED_ITEMS = [
  {
    id: "warehouse-stock",
    title: "Kho hàng",
    description: "Khu vực lưu trữ sản phẩm và chuẩn bị đơn hàng.",
    category: "warehouse",
    imageUrl: undefined,
    alt: "Kho hàng ATTD",
    tags: ["dealer", "inventory", "sourcing"],
    applicableSurfaces: ["dealer", "homepage"],
    priority: 10,
  },
  {
    id: "printing-logo-process",
    title: "In logo",
    description: "Quy trình in logo cho đơn đồng phục và quà tặng doanh nghiệp.",
    category: "printing",
    imageUrl: undefined,
    alt: "Quy trình in logo tại ATTD",
    tags: ["printing", "logo", "customization"],
    applicableSurfaces: ["pdp", "rfq", "quote-pdf"],
    relatedProductTypes: ["apparel", "corporate-gift"],
    priority: 20,
  },
  {
    id: "qc-before-packing",
    title: "Kiểm tra trước khi đóng gói",
    description: "Kiểm tra sản phẩm trước khi đóng gói và bàn giao.",
    category: "qc",
    imageUrl: undefined,
    alt: "Kiểm tra chất lượng đơn hàng ATTD",
    tags: ["qc", "packing", "order"],
    applicableSurfaces: ["dealer", "pdp", "quote-pdf"],
    priority: 30,
  },
] as const satisfies readonly ManufacturingEvidenceItem[];

export const MANUFACTURING_LIBRARY_ITEMS: readonly ManufacturingEvidenceItem[] =
  MANUFACTURING_LIBRARY_SEED_ITEMS;

export function getManufacturingEvidenceForSurface(
  surface: ManufacturingEvidenceSurface,
  options?: {
    relatedProductTypes?: readonly string[];
    limit?: number;
  },
): readonly ManufacturingEvidenceItem[] {
  const relatedProductTypes = options?.relatedProductTypes ?? [];
  const items = MANUFACTURING_LIBRARY_ITEMS.filter((item) => {
    if (!item.applicableSurfaces.includes(surface)) return false;
    if (relatedProductTypes.length === 0 || !item.relatedProductTypes?.length) {
      return true;
    }
    return item.relatedProductTypes.some((type) => relatedProductTypes.includes(type));
  }).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  return typeof options?.limit === "number" ? items.slice(0, options.limit) : items;
}
