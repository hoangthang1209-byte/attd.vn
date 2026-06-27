import type {
  OrderDetailRecord,
  OrderItemRecord,
  OrderListRecord,
} from "@/features/orders/order.types";
import type { OrderOperationalSummary } from "@/features/orders/order-operations.types";

const PAYMENT_ACTIVITY_TYPES = new Set([
  "PAYMENT_RECORDED",
  "PAYMENT_VOIDED",
  "PAYMENT_EDITED",
]);

export type OrderDetailOperationalView = Omit<
  OrderDetailRecord,
  | "subtotal"
  | "discountAmount"
  | "shippingFee"
  | "vatAmount"
  | "totalAmount"
  | "sampleFee"
  | "customerTaxCode"
  | "payments"
  | "financials"
  | "priceVatType"
  | "items"
> & {
  items: Array<Omit<OrderItemRecord, "unitPrice" | "lineTotal">>;
};

export type OrderListOperationalView = Omit<
  OrderListRecord,
  "totalAmount" | "paidAmount" | "outstandingAmount" | "overpaidAmount" | "paymentState"
>;

export type AdminFinancialPermissions = {
  canViewFinancials: boolean;
};

export function omitOrderDetailFinancialFields(order: OrderDetailRecord): OrderDetailOperationalView {
  const {
    subtotal: _subtotal,
    discountAmount: _discountAmount,
    shippingFee: _shippingFee,
    vatAmount: _vatAmount,
    totalAmount: _totalAmount,
    sampleFee: _sampleFee,
    customerTaxCode: _customerTaxCode,
    payments: _payments,
    financials: _financials,
    priceVatType: _priceVatType,
    items,
    activities,
    ...rest
  } = order;

  return {
    ...rest,
    items: items.map(({ unitPrice: _unitPrice, lineTotal: _lineTotal, ...item }) => item) as Array<
      Omit<OrderItemRecord, "unitPrice" | "lineTotal">
    >,
    activities: activities.filter((activity) => !PAYMENT_ACTIVITY_TYPES.has(activity.type)),
  };
}

export function omitOrderListFinancialFields(order: OrderListRecord): OrderListOperationalView {
  const {
    totalAmount: _totalAmount,
    paidAmount: _paidAmount,
    outstandingAmount: _outstandingAmount,
    overpaidAmount: _overpaidAmount,
    paymentState: _paymentState,
    ...rest
  } = order;
  return rest;
}

export function shapeOrderDetailResponse(
  order: OrderDetailRecord,
  canViewFinancials: boolean,
): { order: OrderDetailRecord | OrderDetailOperationalView; permissions: AdminFinancialPermissions } {
  return {
    order: canViewFinancials ? order : omitOrderDetailFinancialFields(order),
    permissions: { canViewFinancials },
  };
}

export function shapeOrderListResponse(
  orders: OrderListRecord[],
  canViewFinancials: boolean,
): { orders: Array<OrderListRecord | OrderListOperationalView>; permissions: AdminFinancialPermissions } {
  return {
    orders: canViewFinancials ? orders : orders.map(omitOrderListFinancialFields),
    permissions: { canViewFinancials },
  };
}

export function redactOperationalSummary(summary: OrderOperationalSummary): OrderOperationalSummary {
  return {
    ...summary,
    totalOutstandingActive: 0,
  };
}

export function shapeOperationalSummaryResponse(
  summary: OrderOperationalSummary,
  canViewFinancials: boolean,
): { summary: OrderOperationalSummary; permissions: AdminFinancialPermissions } {
  return {
    summary: canViewFinancials ? summary : redactOperationalSummary(summary),
    permissions: { canViewFinancials },
  };
}
