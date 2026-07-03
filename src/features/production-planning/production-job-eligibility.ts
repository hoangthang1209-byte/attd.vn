import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";
import { getOrderItemOperationalFlow } from "@/features/orders/order-item-classification";

export function isOrderItemProductionEligible(input: {
  supplySource?: OrderItemSupplySource | null;
  processingMethod?: OrderItemProcessingMethod | null;
}): boolean {
  const flow = getOrderItemOperationalFlow({
    supplySource: input.supplySource,
    processingMethod: input.processingMethod,
  });
  return flow.allowProductionOperation || flow.allowQc;
}

export function requiresProductionPlanning(input: {
  supplySource?: OrderItemSupplySource | null;
  processingMethod?: OrderItemProcessingMethod | null;
}): boolean {
  return getOrderItemOperationalFlow({
    supplySource: input.supplySource,
    processingMethod: input.processingMethod,
  }).allowProductionOperation;
}

export function buildProductionJobCode(orderNo: string, itemIndex: number): string {
  const seq = String(itemIndex + 1).padStart(2, "0");
  return `SX-${orderNo}-${seq}`;
}
