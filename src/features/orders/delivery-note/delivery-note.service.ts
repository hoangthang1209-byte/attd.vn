import { prisma } from "@/lib/prisma";
import { formatOrderDateTime } from "@/features/orders/order-format";
import { formatQuantityDisplay } from "@/features/orders/production-quantity";
import { DELIVERY_EXECUTION_STATUS_LABELS } from "@/features/orders/delivery-execution-labels";

export type DeliveryNoteViewModel = {
  orderNo: string;
  executionCode: string;
  statusLabel: string;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  deliveryMethodName: string | null;
  carrierName: string | null;
  trackingCode: string | null;
  assignedEmployeeName: string | null;
  dispatchedAt: string | null;
  note: string | null;
  items: Array<{
    productName: string;
    colorName: string | null;
    sizeValue: string | null;
    sku: string | null;
    unit: string | null;
    dispatchedQuantity: string;
    note: string | null;
  }>;
};

export async function buildDeliveryNoteViewModel(
  orderId: string,
  executionId: string,
): Promise<DeliveryNoteViewModel | null> {
  const execution = await prisma.orderDeliveryExecution.findFirst({
    where: { id: executionId, orderId },
    include: {
      order: { select: { orderNo: true } },
      deliveryMethod: { select: { name: true } },
      assignedEmployee: { select: { fullName: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!execution) return null;

  return {
    orderNo: execution.order.orderNo,
    executionCode: execution.executionCode,
    statusLabel: DELIVERY_EXECUTION_STATUS_LABELS[execution.status],
    recipientName: execution.recipientNameSnapshot,
    recipientPhone: execution.recipientPhoneSnapshot,
    recipientAddress: execution.recipientAddressSnapshot,
    deliveryMethodName: execution.deliveryMethod?.name ?? null,
    carrierName: execution.carrierNameSnapshot,
    trackingCode: execution.trackingCode,
    assignedEmployeeName: execution.assignedEmployee?.fullName ?? null,
    dispatchedAt: execution.dispatchedAt
      ? formatOrderDateTime(execution.dispatchedAt.toISOString())
      : null,
    note: execution.note,
    items: execution.items.map((item) => ({
      productName: item.productNameSnapshot,
      colorName: item.colorNameSnapshot,
      sizeValue: item.sizeValueSnapshot,
      sku: item.skuSnapshot,
      unit: item.unitSnapshot,
      dispatchedQuantity: formatQuantityDisplay(item.dispatchedQuantity),
      note: item.note,
    })),
  };
}

export function formatDeliveryNoteDate(value: string | null): string {
  if (!value) return "—";
  return value;
}
