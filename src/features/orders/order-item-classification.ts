import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";

export const ORDER_ITEM_SUPPLY_SOURCE_LABELS: Record<OrderItemSupplySource, string> = {
  ATTD_STOCK: "Kho ATTD",
  EXTERNAL_PURCHASE: "Mua ngoài",
  MADE_TO_ORDER: "May mới",
  CUSTOMER_SUPPLIED: "Khách cung cấp",
};

export const ORDER_ITEM_PROCESSING_METHOD_LABELS: Record<OrderItemProcessingMethod, string> = {
  AS_IS: "Giao nguyên bản",
  PRINT: "In",
  EMBROIDERY: "Thêu",
  PRINT_AND_EMBROIDERY: "In + thêu",
  MADE_TO_ORDER: "May theo yêu cầu",
  OTHER_SERVICE: "Gia công khác",
};

export const SUPPLY_SOURCE_OPTIONS = Object.entries(ORDER_ITEM_SUPPLY_SOURCE_LABELS).map(
  ([value, label]) => ({ value: value as OrderItemSupplySource, label }),
);

export const PROCESSING_METHOD_OPTIONS = Object.entries(ORDER_ITEM_PROCESSING_METHOD_LABELS).map(
  ([value, label]) => ({ value: value as OrderItemProcessingMethod, label }),
);

export function getOrderItemSupplySourceLabel(
  value: OrderItemSupplySource | null | undefined,
): string {
  if (!value) return "Chưa phân loại";
  return ORDER_ITEM_SUPPLY_SOURCE_LABELS[value] ?? value;
}

export function getOrderItemProcessingMethodLabel(
  value: OrderItemProcessingMethod | null | undefined,
): string {
  if (!value) return "Chưa phân loại";
  return ORDER_ITEM_PROCESSING_METHOD_LABELS[value] ?? value;
}

export type OrderItemOperationalFlow = {
  reserveWarehouseStock: boolean;
  createGarmentBom: boolean;
  allowPurchaseWorkflow: boolean;
  allowProductionOperation: boolean;
  allowQc: boolean;
  typicalRevenueCategoryCodes: string[];
};

export function getOrderItemOperationalFlow(input: {
  supplySource?: OrderItemSupplySource | null;
  processingMethod?: OrderItemProcessingMethod | null;
}): OrderItemOperationalFlow {
  const supply = input.supplySource;
  const processing = input.processingMethod;

  if (supply === "ATTD_STOCK" && processing === "AS_IS") {
    return {
      reserveWarehouseStock: true,
      createGarmentBom: false,
      allowPurchaseWorkflow: false,
      allowProductionOperation: false,
      allowQc: true,
      typicalRevenueCategoryCodes: ["WHOLESALE_BLANK"],
    };
  }

  if (
    supply === "ATTD_STOCK" &&
    processing &&
    ["PRINT", "EMBROIDERY", "PRINT_AND_EMBROIDERY"].includes(processing)
  ) {
    return {
      reserveWarehouseStock: true,
      createGarmentBom: false,
      allowPurchaseWorkflow: false,
      allowProductionOperation: true,
      allowQc: true,
      typicalRevenueCategoryCodes: ["UNIFORM", "EVENT_MERCH"],
    };
  }

  if (
    supply === "EXTERNAL_PURCHASE" &&
    processing &&
    ["PRINT", "EMBROIDERY", "PRINT_AND_EMBROIDERY"].includes(processing)
  ) {
    return {
      reserveWarehouseStock: false,
      createGarmentBom: false,
      allowPurchaseWorkflow: true,
      allowProductionOperation: true,
      allowQc: true,
      typicalRevenueCategoryCodes: ["SERVICE"],
    };
  }

  if (supply === "MADE_TO_ORDER" && processing === "MADE_TO_ORDER") {
    return {
      reserveWarehouseStock: false,
      createGarmentBom: true,
      allowPurchaseWorkflow: true,
      allowProductionOperation: true,
      allowQc: true,
      typicalRevenueCategoryCodes: ["UNIFORM", "EVENT_MERCH"],
    };
  }

  if (
    supply === "CUSTOMER_SUPPLIED" &&
    processing &&
    ["PRINT", "EMBROIDERY", "PRINT_AND_EMBROIDERY", "OTHER_SERVICE"].includes(processing)
  ) {
    return {
      reserveWarehouseStock: false,
      createGarmentBom: false,
      allowPurchaseWorkflow: false,
      allowProductionOperation: true,
      allowQc: true,
      typicalRevenueCategoryCodes: ["SERVICE", "SERVICE_CUSTOMER_GOODS_PRINT", "SERVICE_CUSTOMER_GOODS_EMBROIDERY"],
    };
  }

  return {
    reserveWarehouseStock: false,
    createGarmentBom: false,
    allowPurchaseWorkflow: false,
    allowProductionOperation: true,
    allowQc: true,
    typicalRevenueCategoryCodes: [],
  };
}

export function isProcessingWithDecoration(
  processing: OrderItemProcessingMethod | null | undefined,
): boolean {
  return Boolean(
    processing &&
      ["PRINT", "EMBROIDERY", "PRINT_AND_EMBROIDERY", "OTHER_SERVICE"].includes(processing),
  );
}
