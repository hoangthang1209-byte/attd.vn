import type {
  OrderPaymentMethod,
  OrderPaymentType,
  OrderStatus,
} from "@prisma/client";
import { parseMoneyInput } from "@/features/pricing/parse-money";
import type { RecordOrderPaymentInput, UpdateOrderStatusInput } from "@/features/orders/order.types";

const PAYMENT_TYPES = new Set<OrderPaymentType>(["DEPOSIT", "PAYMENT", "REFUND", "ADJUSTMENT"]);
const PAYMENT_METHODS = new Set<OrderPaymentMethod>(["BANK_TRANSFER", "CASH", "OTHER"]);
const ORDER_STATUSES = new Set<OrderStatus>([
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
]);

export function parseRecordOrderPaymentBody(raw: Record<string, unknown>): RecordOrderPaymentInput {
  const type = typeof raw.type === "string" && PAYMENT_TYPES.has(raw.type as OrderPaymentType)
    ? (raw.type as OrderPaymentType)
    : "DEPOSIT";
  const method = typeof raw.method === "string" && PAYMENT_METHODS.has(raw.method as OrderPaymentMethod)
    ? (raw.method as OrderPaymentMethod)
    : "BANK_TRANSFER";
  const amount = parseMoneyInput(raw.amount);
  if (amount == null || amount <= 0) {
    throw new Error("Số tiền thanh toán phải lớn hơn 0.");
  }
  const paidAt = typeof raw.paidAt === "string" && raw.paidAt.trim()
    ? raw.paidAt
    : new Date().toISOString();
  return {
    type,
    method,
    amount,
    paidAt,
    referenceCode: typeof raw.referenceCode === "string" ? raw.referenceCode : null,
    note: typeof raw.note === "string" ? raw.note : null,
  };
}

export function parseUpdateOrderStatusBody(raw: Record<string, unknown>): UpdateOrderStatusInput {
  if (typeof raw.status !== "string" || !ORDER_STATUSES.has(raw.status as OrderStatus)) {
    throw new Error("Trạng thái đơn hàng không hợp lệ.");
  }
  return {
    status: raw.status as OrderStatus,
    cancelReason: typeof raw.cancelReason === "string" ? raw.cancelReason : null,
  };
}

export function parseVoidPaymentBody(raw: Record<string, unknown>) {
  return {
    voidReason: typeof raw.voidReason === "string" ? raw.voidReason : null,
  };
}
