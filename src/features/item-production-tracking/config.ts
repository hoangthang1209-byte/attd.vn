import type { ItemProductionStageKey } from "@prisma/client";

/** Centralized thresholds for Sprint M1 risk engine (no magic numbers in UI). */
export const ITEM_PRODUCTION_RISK_CONFIG = {
  /** Days before promised delivery when behind progress becomes AT_RISK */
  atRiskDaysBeforeDue: 3,
  /** Progress ratio below which item is considered behind near due date */
  atRiskBehindProgressRatio: 0.7,
  /** Ready/ordered ratio below which near-due items are AT_RISK */
  atRiskBehindReadyRatio: 0.5,
  /** Days without progress update → NEEDS_ATTENTION */
  staleUpdateDays: 3,
} as const;

export const ITEM_PRODUCTION_STAGE_LABELS: Record<ItemProductionStageKey, string> = {
  MATERIAL_SYNC: "Đồng bộ NPL",
  CUTTING: "Cắt hàng",
  PRINT_EMBROIDERY: "In/Thêu",
  SEWING: "May",
  WASHING: "Wash",
  FINISHING: "Hoàn thiện",
  IRONING: "Ủi",
  QC: "QC",
  PACKING: "Đóng gói",
  READY_TO_SHIP: "Sẵn sàng giao",
};

/** Compact labels for production board stage strip */
export const ITEM_PRODUCTION_STAGE_SHORT_LABELS: Record<ItemProductionStageKey, string> = {
  MATERIAL_SYNC: "NPL",
  CUTTING: "Cắt",
  PRINT_EMBROIDERY: "In/Thêu",
  SEWING: "May",
  WASHING: "Wash",
  FINISHING: "HT",
  IRONING: "Ủi",
  QC: "QC",
  PACKING: "ĐG",
  READY_TO_SHIP: "Ready",
};

export const ITEM_PRODUCTION_DEFAULT_WEIGHTS: Record<ItemProductionStageKey, number> = {
  MATERIAL_SYNC: 10,
  CUTTING: 10,
  PRINT_EMBROIDERY: 15,
  SEWING: 30,
  WASHING: 10,
  FINISHING: 10,
  IRONING: 5,
  QC: 15,
  PACKING: 10,
  READY_TO_SHIP: 5,
};

export const ALL_ITEM_PRODUCTION_STAGE_KEYS = Object.keys(
  ITEM_PRODUCTION_STAGE_LABELS,
) as ItemProductionStageKey[];

export type WorkflowTemplateDefinition = {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  stageKeys: ItemProductionStageKey[];
};

export const SYSTEM_WORKFLOW_TEMPLATES: WorkflowTemplateDefinition[] = [
  {
    code: "TEE_PRINT_EMBROIDERY",
    name: "Áo có in/thêu",
    description: "May + in/thêu, không wash",
    sortOrder: 10,
    stageKeys: [
      "MATERIAL_SYNC",
      "CUTTING",
      "PRINT_EMBROIDERY",
      "SEWING",
      "IRONING",
      "QC",
      "PACKING",
      "READY_TO_SHIP",
    ],
  },
  {
    code: "TEE_WASH",
    name: "Áo wash",
    description: "May + wash + hoàn thiện",
    sortOrder: 20,
    stageKeys: [
      "MATERIAL_SYNC",
      "CUTTING",
      "SEWING",
      "WASHING",
      "FINISHING",
      "QC",
      "PACKING",
      "READY_TO_SHIP",
    ],
  },
  {
    code: "CAP",
    name: "Nón",
    description: "Nón / headwear có in/thêu",
    sortOrder: 30,
    stageKeys: [
      "MATERIAL_SYNC",
      "CUTTING",
      "PRINT_EMBROIDERY",
      "SEWING",
      "FINISHING",
      "QC",
      "PACKING",
      "READY_TO_SHIP",
    ],
  },
  {
    code: "EXTERNAL_ACCESSORY",
    name: "Hàng mua ngoài / phụ kiện",
    description: "Mua ngoài, kiểm và đóng gói",
    sortOrder: 40,
    stageKeys: ["MATERIAL_SYNC", "FINISHING", "QC", "PACKING", "READY_TO_SHIP"],
  },
  {
    code: "CUSTOM",
    name: "Custom",
    description: "Cho phép bật/tắt công đoạn theo item",
    sortOrder: 90,
    stageKeys: [...ALL_ITEM_PRODUCTION_STAGE_KEYS],
  },
];
