import type {
  OrderPaymentMethod,
  OrderPaymentType,
  OrderStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeConfirmedNetPaid,
  computeOrderFinancials,
} from "@/features/orders/order-finance";
import {
  canTransitionOrderStatus,
  formatOrderStatusTransition,
  isOrderPaymentLocked,
} from "@/features/orders/order-status";
import {
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_TYPE_LABELS,
  type OrderPaymentStateFilter,
} from "@/features/orders/order-labels";
import type {
  OrderDetailRecord,
  OrderListRecord,
  RecordOrderPaymentInput,
  UpdateOrderStatusInput,
} from "@/features/orders/order.types";

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

function decimalToNum(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

function mapPaymentRow(payment: {
  id: string;
  type: OrderPaymentType;
  method: OrderPaymentMethod;
  status: import("@prisma/client").OrderPaymentStatus;
  amount: Prisma.Decimal;
  paidAt: Date;
  referenceCode: string | null;
  note: string | null;
  voidReason: string | null;
  createdAt: Date;
}) {
  return {
    id: payment.id,
    type: payment.type,
    method: payment.method,
    status: payment.status,
    amount: payment.amount.toNumber(),
    paidAt: payment.paidAt.toISOString(),
    referenceCode: payment.referenceCode,
    note: payment.note,
    voidReason: payment.voidReason,
    createdAt: payment.createdAt.toISOString(),
  };
}

function mapOrderDetail(row: NonNullable<Awaited<ReturnType<typeof fetchOrderRow>>>): OrderDetailRecord {
  const payments = row.payments.map(mapPaymentRow);
  const totalAmount = row.totalAmount.toNumber();
  const financials = computeOrderFinancials(totalAmount, payments);

  return {
    id: row.id,
    orderNo: row.orderNo,
    quoteId: row.quoteId,
    customerId: row.customerId,
    contactId: row.contactId,
    status: row.status,
    currency: row.currency,
    priceVatType: row.priceVatType,
    subtotal: row.subtotal.toNumber(),
    discountAmount: row.discountAmount.toNumber(),
    shippingFee: row.shippingFee.toNumber(),
    vatAmount: row.vatAmount.toNumber(),
    totalAmount,
    orderDate: row.orderDate.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    productionStartedAt: row.productionStartedAt?.toISOString() ?? null,
    readyToShipAt: row.readyToShipAt?.toISOString() ?? null,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelReason: row.cancelReason,
    customerNote: row.customerNote,
    internalNote: row.internalNote,
    terms: row.terms,
    sampleFee: decimalToNum(row.sampleFee),
    sampleLeadTime: row.sampleLeadTime,
    sampleRefundCondition: row.sampleRefundCondition,
    customerCompanyName: row.customerCompanyName,
    customerCode: row.customerCode,
    customerTaxCode: row.customerTaxCode,
    customerAddress: row.customerAddress,
    contactName: row.contactName,
    contactTitle: row.contactTitle,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    salesName: row.salesName,
    salesTitle: row.salesTitle,
    salesPhone: row.salesPhone,
    salesEmail: row.salesEmail,
    sourceQuoteNo: row.sourceQuoteNo,
    sourceQuoteDate: row.sourceQuoteDate?.toISOString() ?? null,
    sourceQuoteValidUntil: row.sourceQuoteValidUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customer: row.customer,
    quote: row.quote,
    items: row.items.map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      description: item.description,
      designImageUrl: item.designImageUrl,
      skuSnapshot: item.skuSnapshot,
      colorSnapshot: item.colorSnapshot,
      categorySnapshot: item.categorySnapshot,
      genderSnapshot: item.genderSnapshot,
      moqSnapshot: item.moqSnapshot,
      itemNote: item.itemNote,
      productionLeadTime: item.productionLeadTime,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice.toNumber(),
      lineTotal: item.lineTotal.toNumber(),
      sortOrder: item.sortOrder,
    })),
    payments,
    activities: row.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      detail: activity.detail,
      createdAt: activity.createdAt.toISOString(),
    })),
    financials: {
      totalAmount,
      ...financials,
    },
  };
}

async function fetchOrderRow(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, code: true } },
      quote: { select: { id: true, quoteNo: true } },
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getOrderDetail(id: string): Promise<OrderDetailRecord | null> {
  const row = await fetchOrderRow(id);
  if (!row) return null;
  return mapOrderDetail(row);
}

export async function listOrders(params?: {
  search?: string;
  status?: OrderStatus;
  paymentState?: OrderPaymentStateFilter;
  customerId?: string;
  leadId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(params?.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params?.pageSize ?? 50, 1), 100);
  const search = params?.search?.trim();

  const rows = await prisma.order.findMany({
    where: {
      status: params?.status,
      customerId: params?.customerId,
      ...(params?.leadId
        ? { quote: { leadId: params.leadId } }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNo: { contains: search, mode: "insensitive" } },
              { sourceQuoteNo: { contains: search, mode: "insensitive" } },
              { customerCompanyName: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped: OrderListRecord[] = rows.map((row) => {
    const payments = row.payments.map((p) => ({
      type: p.type,
      status: p.status,
      amount: p.amount.toNumber(),
    }));
    const totalAmount = row.totalAmount.toNumber();
    const financials = computeOrderFinancials(totalAmount, payments);
    return {
      id: row.id,
      orderNo: row.orderNo,
      sourceQuoteNo: row.sourceQuoteNo,
      customerCompanyName: row.customerCompanyName,
      contactName: row.contactName,
      status: row.status,
      totalAmount,
      paidAmount: financials.paidAmount,
      outstandingAmount: financials.outstandingAmount,
      overpaidAmount: financials.overpaidAmount,
      paymentState: financials.paymentState,
      createdAt: row.createdAt.toISOString(),
    };
  });

  const filtered = params?.paymentState
    ? mapped.filter((row) => row.paymentState === params.paymentState)
    : mapped;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const orders = filtered.slice(start, start + pageSize);

  return { orders, total, page, pageSize };
}

export async function updateOrderStatus(id: string, input: UpdateOrderStatusInput) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new OrderValidationError("Không tìm thấy đơn hàng.");

  if (!canTransitionOrderStatus(order.status, input.status)) {
    throw new OrderValidationError("Không thể chuyển đơn hàng sang trạng thái này.");
  }

  if (input.status === "CANCELLED" && !input.cancelReason?.trim()) {
    throw new OrderValidationError("Vui lòng nhập lý do hủy đơn hàng.");
  }

  const now = new Date();
  const data: Prisma.OrderUpdateInput = {
    status: input.status,
  };

  if (input.status === "CANCELLED") {
    data.cancelReason = input.cancelReason?.trim() ?? null;
    if (!order.cancelledAt) data.cancelledAt = now;
  }
  if (input.status === "CONFIRMED" && !order.confirmedAt) data.confirmedAt = now;
  if (input.status === "IN_PRODUCTION" && !order.productionStartedAt) data.productionStartedAt = now;
  if (input.status === "READY_TO_SHIP" && !order.readyToShipAt) data.readyToShipAt = now;
  if (input.status === "SHIPPED" && !order.shippedAt) data.shippedAt = now;
  if (input.status === "COMPLETED" && !order.completedAt) data.completedAt = now;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data });
    await tx.orderActivity.create({
      data: {
        orderId: id,
        type: "STATUS_CHANGED",
        title: formatOrderStatusTransition(order.status, input.status),
        detail: input.status === "CANCELLED" ? input.cancelReason?.trim() ?? null : null,
      },
    });
  });

  const detail = await getOrderDetail(id);
  if (!detail) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  return detail;
}

export async function recordOrderPayment(orderId: string, input: RecordOrderPaymentInput) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) throw new OrderValidationError("Không tìm thấy đơn hàng.");

  if (isOrderPaymentLocked(order.status)) {
    throw new OrderValidationError("Đơn hàng đã hoàn tất hoặc đã hủy không thể cập nhật thanh toán.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new OrderValidationError("Số tiền thanh toán phải lớn hơn 0.");
  }

  const payments = order.payments.map((p) => ({
    type: p.type,
    status: p.status,
    amount: p.amount.toNumber(),
  }));
  const totalAmount = order.totalAmount.toNumber();
  const { outstandingAmount } = computeOrderFinancials(totalAmount, payments);
  const netPaid = computeConfirmedNetPaid(payments);

  if (input.type === "REFUND") {
    if (input.amount > netPaid) {
      throw new OrderValidationError("Số tiền hoàn không được vượt quá tổng đã thanh toán.");
    }
  } else if (input.amount > outstandingAmount) {
    throw new OrderValidationError("Số tiền không được vượt quá số còn phải thu.");
  }

  const paidAt = new Date(input.paidAt);
  if (Number.isNaN(paidAt.getTime())) {
    throw new OrderValidationError("Ngày thanh toán không hợp lệ.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderPayment.create({
      data: {
        orderId,
        type: input.type,
        method: input.method,
        amount: input.amount,
        paidAt,
        referenceCode: input.referenceCode?.trim() || null,
        note: input.note?.trim() || null,
      },
    });
    await tx.orderActivity.create({
      data: {
        orderId,
        type: "PAYMENT_RECORDED",
        title: `Ghi nhận ${ORDER_PAYMENT_TYPE_LABELS[input.type].toLowerCase()}: ${input.amount.toLocaleString("vi-VN")} đ`,
        detail: [
          ORDER_PAYMENT_METHOD_LABELS[input.method],
          input.referenceCode?.trim(),
          input.note?.trim(),
        ]
          .filter(Boolean)
          .join(" · ") || null,
      },
    });
  });

  const detail = await getOrderDetail(orderId);
  if (!detail) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  return detail;
}

export async function voidOrderPayment(
  orderId: string,
  paymentId: string,
  voidReason?: string | null,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) throw new OrderValidationError("Không tìm thấy đơn hàng.");

  if (isOrderPaymentLocked(order.status)) {
    throw new OrderValidationError("Đơn hàng đã hoàn tất hoặc đã hủy không thể cập nhật thanh toán.");
  }

  const payment = order.payments.find((p) => p.id === paymentId);
  if (!payment) throw new OrderValidationError("Không tìm thấy ghi nhận thanh toán.");
  if (payment.status === "VOID") {
    throw new OrderValidationError("Ghi nhận thanh toán này đã được hủy.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderPayment.update({
      where: { id: paymentId },
      data: {
        status: "VOID",
        voidReason: voidReason?.trim() || null,
      },
    });
    await tx.orderActivity.create({
      data: {
        orderId,
        type: "PAYMENT_VOIDED",
        title: `Hủy ghi nhận ${ORDER_PAYMENT_TYPE_LABELS[payment.type].toLowerCase()}: ${payment.amount.toNumber().toLocaleString("vi-VN")} đ`,
        detail: voidReason?.trim() || null,
      },
    });
  });

  const detail = await getOrderDetail(orderId);
  if (!detail) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  return detail;
}

export async function getOrderIdByQuoteId(quoteId: string): Promise<string | null> {
  const row = await prisma.order.findUnique({
    where: { quoteId },
    select: { id: true },
  });
  return row?.id ?? null;
}
