import type {
  OrderPaymentMethod,
  OrderPaymentType,
  OrderStatus,
  QuotePriceVatType,
} from "@prisma/client";
import { parseMoneyInput } from "@/features/pricing/parse-money";
import { parseOrderItemInput } from "@/features/orders/order-totals";
import type {
  CreateManualOrderInput,
  EditOrderPaymentInput,
  RecordOrderPaymentInput,
  UpdateOrderDeliveryInput,
  UpdateOrderInput,
  UpdateOrderProductionInput,
  UpdateOrderStatusInput,
} from "@/features/orders/order.types";

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
const VAT_TYPES = new Set<QuotePriceVatType>(["INCLUDING_VAT", "EXCLUDING_VAT"]);

function parseOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseOptionalMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  return parseMoneyInput(value);
}

function parseOrderItems(raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Vui lòng thêm ít nhất một dòng sản phẩm.");
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error("Dòng sản phẩm không hợp lệ.");
    }
    return parseOrderItemInput(item as Record<string, unknown>, index);
  });
}

function parseOrderFormBody(raw: Record<string, unknown>): CreateManualOrderInput {
  const orderDate =
    typeof raw.orderDate === "string" && raw.orderDate.trim()
      ? raw.orderDate
      : new Date().toISOString();
  const priceVatType =
    typeof raw.priceVatType === "string" && VAT_TYPES.has(raw.priceVatType as QuotePriceVatType)
      ? (raw.priceVatType as QuotePriceVatType)
      : "EXCLUDING_VAT";

  return {
    customerId: parseOptionalString(raw.customerId),
    contactId: parseOptionalString(raw.contactId),
    salesRepresentativeId: parseOptionalString(raw.salesRepresentativeId),
    orderDate,
    currency: typeof raw.currency === "string" ? raw.currency : "VND",
    priceVatType,
    customerCompanyName: parseOptionalString(raw.customerCompanyName),
    customerCode: parseOptionalString(raw.customerCode),
    customerTaxCode: parseOptionalString(raw.customerTaxCode),
    customerAddress: parseOptionalString(raw.customerAddress),
    contactName: parseOptionalString(raw.contactName),
    contactTitle: parseOptionalString(raw.contactTitle),
    contactPhone: parseOptionalString(raw.contactPhone),
    contactEmail: parseOptionalString(raw.contactEmail),
    salesName: parseOptionalString(raw.salesName),
    salesTitle: parseOptionalString(raw.salesTitle),
    salesPhone: parseOptionalString(raw.salesPhone),
    salesEmail: parseOptionalString(raw.salesEmail),
    terms: parseOptionalString(raw.terms),
    customerNote: parseOptionalString(raw.customerNote),
    internalNote: parseOptionalString(raw.internalNote),
    sampleFee: parseOptionalMoney(raw.sampleFee),
    sampleLeadTime: parseOptionalString(raw.sampleLeadTime),
    sampleRefundCondition: parseOptionalString(raw.sampleRefundCondition),
    discountAmount: parseMoneyInput(raw.discountAmount) ?? 0,
    shippingFee: parseMoneyInput(raw.shippingFee) ?? 0,
    vatRate: raw.vatRate != null ? Number(raw.vatRate) : undefined,
    vatAmount: parseOptionalMoney(raw.vatAmount) ?? undefined,
    items: parseOrderItems(raw.items),
  };
}

export function parseCreateManualOrderBody(raw: Record<string, unknown>): CreateManualOrderInput {
  const input = parseOrderFormBody(raw);
  if (!input.customerCompanyName?.trim()) {
    throw new Error("Vui lòng chọn hoặc nhập thông tin khách hàng.");
  }
  return input;
}

export function parseUpdateOrderBody(raw: Record<string, unknown>): UpdateOrderInput {
  return parseOrderFormBody(raw);
}

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
    referenceCode: parseOptionalString(raw.referenceCode),
    note: parseOptionalString(raw.note),
  };
}

export function parseEditOrderPaymentBody(raw: Record<string, unknown>): EditOrderPaymentInput {
  const base = parseRecordOrderPaymentBody(raw);
  const editReason = parseOptionalString(raw.editReason)?.trim();
  if (!editReason) {
    throw new Error("Vui lòng nhập lý do chỉnh sửa.");
  }
  return { ...base, editReason };
}

export function parseUpdateOrderStatusBody(raw: Record<string, unknown>): UpdateOrderStatusInput {
  if (typeof raw.status !== "string" || !ORDER_STATUSES.has(raw.status as OrderStatus)) {
    throw new Error("Trạng thái đơn hàng không hợp lệ.");
  }
  return {
    status: raw.status as OrderStatus,
    cancelReason: parseOptionalString(raw.cancelReason),
    correctionReason: parseOptionalString(raw.correctionReason),
  };
}

export function parseVoidPaymentBody(raw: Record<string, unknown>) {
  return {
    voidReason: parseOptionalString(raw.voidReason),
  };
}

export function parseUpdateOrderProductionBody(
  raw: Record<string, unknown>,
): UpdateOrderProductionInput {
  return {
    productionOwnerName: parseOptionalString(raw.productionOwnerName),
    productionDueDate: parseOptionalString(raw.productionDueDate),
    productionNote: parseOptionalString(raw.productionNote),
  };
}

export function parseUpdateOrderDeliveryBody(
  raw: Record<string, unknown>,
): UpdateOrderDeliveryInput {
  return {
    deliveryMethod: parseOptionalString(raw.deliveryMethod),
    deliveryCarrier: parseOptionalString(raw.deliveryCarrier),
    deliveryTrackingCode: parseOptionalString(raw.deliveryTrackingCode),
    deliveryRecipientName: parseOptionalString(raw.deliveryRecipientName),
    deliveryRecipientPhone: parseOptionalString(raw.deliveryRecipientPhone),
    deliveryAddress: parseOptionalString(raw.deliveryAddress),
    deliveryExpectedAt: parseOptionalString(raw.deliveryExpectedAt),
    deliveryNote: parseOptionalString(raw.deliveryNote),
  };
}

export function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
