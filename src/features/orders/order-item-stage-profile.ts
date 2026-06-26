import type { OrderItemProcessingMethod, OrderItemSupplySource, ProductionStageType } from "@prisma/client";
import { getOrderItemOperationalFlow } from "@/features/orders/order-item-classification";

export function getRequiredProductionStageTypes(input: {
  supplySource?: OrderItemSupplySource | null;
  processingMethod?: OrderItemProcessingMethod | null;
}): ProductionStageType[] {
  const supply = input.supplySource;
  const processing = input.processingMethod;
  const flow = getOrderItemOperationalFlow({ supplySource: supply, processingMethod: processing });

  if (!flow.allowProductionOperation) {
    return ["PACKING"];
  }

  const decorationStages: ProductionStageType[] = [];
  if (processing === "PRINT" || processing === "PRINT_AND_EMBROIDERY") {
    decorationStages.push("PRINTING");
  }
  if (processing === "EMBROIDERY" || processing === "PRINT_AND_EMBROIDERY") {
    decorationStages.push("EMBROIDERY");
  }

  if (supply === "ATTD_STOCK" && decorationStages.length > 0) {
    return [...decorationStages, "FINISHING", "QC", "PACKING"];
  }

  if (supply === "CUSTOMER_SUPPLIED" && decorationStages.length > 0) {
    return [...decorationStages, "FINISHING", "QC", "PACKING"];
  }

  if (supply === "EXTERNAL_PURCHASE" && decorationStages.length > 0) {
    return [...decorationStages, "FINISHING", "QC", "PACKING"];
  }

  if (supply === "MADE_TO_ORDER" && processing === "MADE_TO_ORDER") {
    return ["CUTTING", "SEWING", ...decorationStages, "FINISHING", "QC", "PACKING"];
  }

  if (processing === "OTHER_SERVICE") {
    return ["FINISHING", "QC", "PACKING"];
  }

  return ["CUTTING", "SEWING", "PRINTING", "EMBROIDERY", "FINISHING", "QC", "PACKING"];
}

export function itemRequiresProductionDocuments(input: {
  supplySource?: OrderItemSupplySource | null;
  processingMethod?: OrderItemProcessingMethod | null;
}): boolean {
  const flow = getOrderItemOperationalFlow({
    supplySource: input.supplySource,
    processingMethod: input.processingMethod,
  });
  if (!flow.allowProductionOperation) return false;
  return !(input.supplySource === "ATTD_STOCK" && input.processingMethod === "AS_IS");
}
