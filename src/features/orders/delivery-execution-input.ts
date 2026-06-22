import type {
  DeliveryAttemptResult,
  DeliveryExecutionStatus,
  DeliveryProofType,
} from "@prisma/client";
import type { DeliveryExecutionItemInput } from "@/features/orders/delivery-execution.service";

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

const EXECUTION_STATUSES = new Set<DeliveryExecutionStatus>([
  "DRAFT",
  "READY_TO_DISPATCH",
  "DISPATCHED",
  "IN_TRANSIT",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNING",
  "RETURNED",
  "CANCELLED",
]);

const ATTEMPT_RESULTS = new Set<DeliveryAttemptResult>([
  "PENDING",
  "DELIVERED",
  "PARTIAL",
  "FAILED",
  "REFUSED",
  "NO_RECIPIENT",
  "WRONG_ADDRESS",
  "DAMAGED",
  "RETURNED",
]);

const PROOF_TYPES = new Set<DeliveryProofType>([
  "SIGNED_RECEIPT",
  "DELIVERY_PHOTO",
  "RECIPIENT_CONFIRMATION",
  "DAMAGE_EVIDENCE",
  "RETURN_DOCUMENT",
  "OTHER",
]);

export function parseDeliveryExecutionItems(raw: unknown): DeliveryExecutionItemInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row, index) => ({
      orderItemId: parseOptionalString(row.orderItemId),
      orderItemVariantId: parseOptionalString(row.orderItemVariantId),
      productNameSnapshot:
        typeof row.productNameSnapshot === "string" ? row.productNameSnapshot : "Sản phẩm",
      colorNameSnapshot: parseOptionalString(row.colorNameSnapshot),
      sizeValueSnapshot: parseOptionalString(row.sizeValueSnapshot),
      skuSnapshot: parseOptionalString(row.skuSnapshot),
      unitSnapshot: parseOptionalString(row.unitSnapshot),
      plannedQuantity: row.plannedQuantity,
      dispatchedQuantity: row.dispatchedQuantity,
      note: parseOptionalString(row.note),
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
    }));
}

export function parseCreateDeliveryExecutionBody(raw: Record<string, unknown>) {
  const status =
    typeof raw.status === "string" && EXECUTION_STATUSES.has(raw.status as DeliveryExecutionStatus)
      ? (raw.status as DeliveryExecutionStatus)
      : undefined;

  return {
    deliveryMethodId: parseOptionalString(raw.deliveryMethodId),
    deliveryCarrierId: parseOptionalString(raw.deliveryCarrierId),
    carrierNameSnapshot: parseOptionalString(raw.carrierNameSnapshot),
    trackingCode: parseOptionalString(raw.trackingCode),
    assignedEmployeeId: parseOptionalString(raw.assignedEmployeeId),
    recipientNameSnapshot: parseOptionalString(raw.recipientNameSnapshot),
    recipientPhoneSnapshot: parseOptionalString(raw.recipientPhoneSnapshot),
    recipientAddressSnapshot: parseOptionalString(raw.recipientAddressSnapshot),
    expectedDeliveryAt: parseOptionalString(raw.expectedDeliveryAt),
    note: parseOptionalString(raw.note),
    status,
    items: parseDeliveryExecutionItems(raw.items),
    quantityOverrideReason: parseOptionalString(raw.quantityOverrideReason),
  };
}

export function parseDeliveryAttemptBody(raw: Record<string, unknown>) {
  const result =
    typeof raw.result === "string" && ATTEMPT_RESULTS.has(raw.result as DeliveryAttemptResult)
      ? (raw.result as DeliveryAttemptResult)
      : undefined;

  const itemQuantities = Array.isArray(raw.itemQuantities)
    ? raw.itemQuantities
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((row) => ({
          itemId: typeof row.itemId === "string" ? row.itemId : "",
          deliveredQuantity: row.deliveredQuantity,
          returnedQuantity: row.returnedQuantity,
          damagedQuantity: row.damagedQuantity,
        }))
        .filter((row) => row.itemId)
    : undefined;

  return {
    attemptedAt: parseOptionalString(raw.attemptedAt),
    attemptedByEmployeeId: parseOptionalString(raw.attemptedByEmployeeId),
    result,
    recipientName: parseOptionalString(raw.recipientName),
    recipientPhone: parseOptionalString(raw.recipientPhone),
    note: parseOptionalString(raw.note),
    failureReason: parseOptionalString(raw.failureReason),
    nextAttemptAt: parseOptionalString(raw.nextAttemptAt),
    itemQuantities,
    quantityOverrideReason: parseOptionalString(raw.quantityOverrideReason),
  };
}

export function parseDeliveryProofBody(raw: Record<string, unknown>) {
  const proofType =
    typeof raw.proofType === "string" && PROOF_TYPES.has(raw.proofType as DeliveryProofType)
      ? (raw.proofType as DeliveryProofType)
      : undefined;

  return {
    mediaAssetId: typeof raw.mediaAssetId === "string" ? raw.mediaAssetId : "",
    proofType,
    title: parseOptionalString(raw.title),
    note: parseOptionalString(raw.note),
    deliveryAttemptId: parseOptionalString(raw.deliveryAttemptId),
  };
}

export function parseExecutionStatusBody(raw: Record<string, unknown>): DeliveryExecutionStatus {
  if (
    typeof raw.status !== "string" ||
    !EXECUTION_STATUSES.has(raw.status as DeliveryExecutionStatus)
  ) {
    throw new Error("Trạng thái chuyến giao hàng không hợp lệ.");
  }
  return raw.status as DeliveryExecutionStatus;
}
