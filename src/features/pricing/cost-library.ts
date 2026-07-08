import type { CostingComponentType } from "@/features/pricing/costing-types";

export type CostLibraryCategory =
  | "PRINTING"
  | "EMBROIDERY"
  | "SEWING"
  | "CUTTING"
  | "PACKAGING"
  | "LOGISTICS"
  | "ACCESSORY"
  | "OTHER";

export type CostLibraryItem = {
  id: string;
  name: string;
  category: CostLibraryCategory;
  description?: string;
  defaultUnitCost: number;
  defaultQuantityFactor?: number;
  defaultNote?: string;
};

export const COST_LIBRARY_CATEGORY_LABELS: Record<CostLibraryCategory, string> = {
  PRINTING: "In",
  EMBROIDERY: "Thêu",
  SEWING: "May",
  CUTTING: "Cắt",
  PACKAGING: "Đóng gói",
  LOGISTICS: "Logistics",
  ACCESSORY: "Phụ liệu",
  OTHER: "Khác",
};

export function costLibraryCategoryToComponentType(
  category: CostLibraryCategory,
  name: string,
): CostingComponentType {
  if (category === "ACCESSORY") return "OTHER";
  if (category === "OTHER" && name.toLocaleLowerCase("vi-VN").includes("wash")) return "WASH";
  return category as CostingComponentType;
}

export const COST_LIBRARY: CostLibraryItem[] = [
  // Printing
  { id: "print-silk-1c", name: "In lụa 1 màu", category: "PRINTING", defaultUnitCost: 7000, defaultQuantityFactor: 1 },
  { id: "print-silk-multi", name: "In lụa nhiều màu", category: "PRINTING", defaultUnitCost: 12000, defaultQuantityFactor: 1 },
  { id: "print-heat-transfer", name: "In chuyển nhiệt", category: "PRINTING", defaultUnitCost: 9000, defaultQuantityFactor: 1 },
  { id: "print-pet", name: "In PET", category: "PRINTING", defaultUnitCost: 11000, defaultQuantityFactor: 1 },
  { id: "print-dtf", name: "In DTF", category: "PRINTING", defaultUnitCost: 15000, defaultQuantityFactor: 1 },
  { id: "print-decal", name: "In decal", category: "PRINTING", defaultUnitCost: 8000, defaultQuantityFactor: 1 },
  { id: "print-uv", name: "In UV", category: "PRINTING", defaultUnitCost: 18000, defaultQuantityFactor: 1 },

  // Embroidery
  { id: "emb-standard", name: "Thêu thường", category: "EMBROIDERY", defaultUnitCost: 5500, defaultQuantityFactor: 1 },
  { id: "emb-3d", name: "Thêu 3D", category: "EMBROIDERY", defaultUnitCost: 12000, defaultQuantityFactor: 1 },
  { id: "emb-computer", name: "Thêu vi tính", category: "EMBROIDERY", defaultUnitCost: 8000, defaultQuantityFactor: 1 },

  // Sewing
  { id: "sew-basic", name: "May cơ bản", category: "SEWING", defaultUnitCost: 20000, defaultQuantityFactor: 1 },
  { id: "sew-polo", name: "May polo", category: "SEWING", defaultUnitCost: 24000, defaultQuantityFactor: 1 },
  { id: "sew-hoodie", name: "May hoodie", category: "SEWING", defaultUnitCost: 42000, defaultQuantityFactor: 1 },
  { id: "sew-bag", name: "May túi", category: "SEWING", defaultUnitCost: 18000, defaultQuantityFactor: 1 },
  { id: "sew-cap", name: "May nón", category: "SEWING", defaultUnitCost: 12000, defaultQuantityFactor: 1 },

  // Cutting
  { id: "cut-basic", name: "Cắt cơ bản", category: "CUTTING", defaultUnitCost: 1000, defaultQuantityFactor: 1 },
  { id: "cut-laser", name: "Cắt laser", category: "CUTTING", defaultUnitCost: 3500, defaultQuantityFactor: 1 },

  // Packaging
  { id: "pack-pe-bag", name: "Túi PE", category: "PACKAGING", defaultUnitCost: 500, defaultQuantityFactor: 1 },
  { id: "pack-zipper-bag", name: "Túi zipper", category: "PACKAGING", defaultUnitCost: 2500, defaultQuantityFactor: 1 },
  { id: "pack-paper-box", name: "Hộp giấy", category: "PACKAGING", defaultUnitCost: 4500, defaultQuantityFactor: 1 },
  { id: "pack-carton", name: "Carton", category: "PACKAGING", defaultUnitCost: 3000, defaultQuantityFactor: 1 },
  { id: "pack-label", name: "Tem", category: "PACKAGING", defaultUnitCost: 800, defaultQuantityFactor: 1 },
  { id: "pack-hangtag", name: "Hangtag", category: "PACKAGING", defaultUnitCost: 1200, defaultQuantityFactor: 1 },

  // Logistics
  { id: "log-local", name: "Giao nội thành", category: "LOGISTICS", defaultUnitCost: 15000, defaultNote: "Theo đơn/lô" },
  { id: "log-interprovince", name: "Giao liên tỉnh", category: "LOGISTICS", defaultUnitCost: 35000, defaultNote: "Theo đơn/lô" },
  { id: "log-pallet", name: "Pallet", category: "LOGISTICS", defaultUnitCost: 250000, defaultNote: "Theo pallet" },
  { id: "log-export", name: "Xuất khẩu", category: "LOGISTICS", defaultUnitCost: 500000, defaultNote: "Theo lô xuất" },

  // Accessory
  { id: "acc-button", name: "Nút", category: "ACCESSORY", defaultUnitCost: 500, defaultQuantityFactor: 1 },
  { id: "acc-cord", name: "Dây", category: "ACCESSORY", defaultUnitCost: 1200, defaultQuantityFactor: 1 },
  { id: "acc-neck-rib", name: "Bo cổ", category: "ACCESSORY", defaultUnitCost: 2500, defaultQuantityFactor: 1 },
  { id: "acc-cuff-rib", name: "Bo tay", category: "ACCESSORY", defaultUnitCost: 2000, defaultQuantityFactor: 1 },
  { id: "acc-label", name: "Nhãn", category: "ACCESSORY", defaultUnitCost: 800, defaultQuantityFactor: 1 },
  { id: "acc-wash-care", name: "Wash care", category: "ACCESSORY", defaultUnitCost: 600, defaultQuantityFactor: 1 },
  { id: "acc-sticker", name: "Sticker", category: "ACCESSORY", defaultUnitCost: 400, defaultQuantityFactor: 1 },

  // Other
  { id: "other-qc", name: "QC", category: "OTHER", defaultUnitCost: 1500, defaultQuantityFactor: 1 },
  { id: "other-wash", name: "Wash", category: "OTHER", defaultUnitCost: 5000, defaultQuantityFactor: 1 },
  { id: "other-sample", name: "Sample", category: "OTHER", defaultUnitCost: 150000, defaultNote: "Phí mẫu" },
  { id: "other-setup", name: "Setup", category: "OTHER", defaultUnitCost: 500000, defaultNote: "Phí setup máy/in" },
];
