import type {
  OrderPaymentMethod,
  OrderPaymentType,
  OrderProductGender,
  OrderStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeConfirmedNetPaid,
  computeOrderFinancials,
} from "@/features/orders/order-finance";
import {
  isOrderProductGender,
  orderProductGenderLabel,
} from "@/features/orders/order-gender";
import { allocateOrderCustomSku } from "@/features/orders/order-custom-sku";
import {
  buildOrderItemVariantSkuBase,
} from "@/features/orders/order-item-variant-sku";
import { ensureProductSystemCode } from "@/features/products/product-system-code";
import { resolveDeliveryMethodSnapshot } from "@/features/delivery/delivery-method.service";
import { resolveDeliveryCarrierSnapshot } from "@/features/delivery/delivery-carrier.service";
import {
  resolveProductionOwnerSnapshot,
  resolveSalesEmployeeSnapshot,
} from "@/features/employees/employee.service";
import {
  canUpdateOrderStatus,
  formatOrderStatusCorrection,
  formatOrderStatusTransition,
  isOrderEditable,
  isOrderPaymentLocked,
  validateDeliveryForShipped,
} from "@/features/orders/order-status";
import {
  computeOrderItem,
  computeOrderTotals,
  type OrderItemInput,
  type OrderItemVariantInput,
} from "@/features/orders/order-totals";
import { generateOrderNo } from "@/features/orders/order-code";
import {
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_TYPE_LABELS,
  type OrderPaymentStateFilter,
} from "@/features/orders/order-labels";
import type {
  CreateManualOrderInput,
  EditOrderPaymentInput,
  OrderDetailRecord,
  OrderListRecord,
  RecordOrderPaymentInput,
  UpdateOrderDeliveryInput,
  UpdateOrderInput,
  UpdateOrderProductionInput,
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
  editReason: string | null;
  editedAt: Date | null;
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
    editReason: payment.editReason,
    editedAt: payment.editedAt?.toISOString() ?? null,
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
    salesRepresentativeId: row.salesRepresentativeId,
    salesEmployeeId: row.salesEmployeeId,
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
    productionDueDate: row.productionDueDate?.toISOString() ?? null,
    productionOwnerId: row.productionOwnerId,
    productionOwnerName: row.productionOwnerName ?? row.productionOwner?.fullName ?? null,
    productionNote: row.productionNote,
    deliveryMethodId: row.deliveryMethodId,
    deliveryMethodName: row.deliveryMethodName ?? row.deliveryMethodRef?.name ?? row.deliveryMethod,
    deliveryMethod: row.deliveryMethod ?? row.deliveryMethodRef?.name ?? null,
    deliveryOwnerId: row.deliveryOwnerId,
    deliveryOwnerName: row.deliveryOwner?.fullName ?? null,
    deliveryRecipientName: row.deliveryRecipientName,
    deliveryRecipientPhone: row.deliveryRecipientPhone,
    deliveryAddress: row.deliveryAddress,
    deliveryTrackingCode: row.deliveryTrackingCode,
    deliveryCarrier: row.deliveryCarrier,
    deliveryCarrierId: row.deliveryCarrierId,
    deliveryCarrierName: row.deliveryCarrierName ?? row.deliveryCarrierRef?.name ?? row.deliveryCarrier,
    deliveryNote: row.deliveryNote,
    deliveryExpectedAt: row.deliveryExpectedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
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
      colorId: item.colorId,
      categoryId: item.categoryId,
      gender: item.gender,
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
      variants: item.variants.map((variant) => ({
        id: variant.id,
        colorId: variant.colorId,
        colorNameSnapshot: variant.colorNameSnapshot,
        sizeValue: variant.sizeValue,
        skuSnapshot: variant.skuSnapshot,
        quantity: variant.quantity,
        unit: variant.unit,
        sortOrder: variant.sortOrder,
      })),
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
      productionOwner: { select: { id: true, fullName: true, isActive: true } },
      deliveryOwner: { select: { id: true, fullName: true, isActive: true } },
      deliveryMethodRef: { select: { id: true, name: true, isActive: true, requiresCarrier: true } },
      deliveryCarrierRef: { select: { id: true, name: true, isActive: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      },
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

  const transition = canUpdateOrderStatus(order.status, input.status, {
    correctionReason: input.correctionReason,
  });
  if (!transition.allowed) {
    throw new OrderValidationError(transition.error ?? "Không thể chuyển đơn hàng sang trạng thái này.");
  }

  if (input.status === "CANCELLED" && !input.cancelReason?.trim()) {
    throw new OrderValidationError("Vui lòng nhập lý do hủy đơn hàng.");
  }

  if (input.status === "SHIPPED") {
    const methodId = order.deliveryMethodId;
    let deliveryMethodRequiresCarrier = false;
    if (methodId) {
      const method = await prisma.deliveryMethod.findUnique({ where: { id: methodId } });
      deliveryMethodRequiresCarrier = method?.requiresCarrier ?? false;
    }
    const deliveryError = validateDeliveryForShipped({
      deliveryRecipientName: order.deliveryRecipientName,
      deliveryRecipientPhone: order.deliveryRecipientPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryMethodId: order.deliveryMethodId,
      deliveryMethodName: order.deliveryMethodName,
      deliveryMethod: order.deliveryMethod,
      deliveryMethodRequiresCarrier,
      deliveryCarrierId: order.deliveryCarrierId,
      deliveryCarrierName: order.deliveryCarrierName,
      deliveryCarrier: order.deliveryCarrier,
    });
    if (deliveryError) throw new OrderValidationError(deliveryError);
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
  if (input.status === "SHIPPED") {
    if (!order.shippedAt) data.shippedAt = now;
    if (!order.deliveredAt) data.deliveredAt = now;
  }
  if (input.status === "COMPLETED" && !order.completedAt) data.completedAt = now;

  const activityTitle = transition.isCorrection
    ? formatOrderStatusCorrection(order.status, input.status)
    : formatOrderStatusTransition(order.status, input.status);
  const activityDetail = input.status === "CANCELLED"
    ? input.cancelReason?.trim() ?? null
    : transition.isCorrection
      ? input.correctionReason?.trim() ?? null
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data });
    await tx.orderActivity.create({
      data: {
        orderId: id,
        type: "STATUS_CHANGED",
        title: activityTitle,
        detail: activityDetail,
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

function isOrderNoUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function buildOrderItemCreates(items: ReturnType<typeof computeOrderItem>[]) {
  return items.map((item, index) => ({
    productId: item.productId ?? null,
    variantId: item.variantId ?? null,
    colorId: item.colorId ?? null,
    categoryId: item.categoryId ?? null,
    gender: item.gender ?? null,
    productNameSnapshot: item.productNameSnapshot?.trim() || null,
    variantNameSnapshot: item.variantNameSnapshot?.trim() || null,
    description: item.description?.trim() || null,
    designMediaAssetId: item.designMediaAssetId ?? null,
    designImageUrl: item.designImageUrl?.trim() || null,
    skuSnapshot: item.skuSnapshot?.trim() || null,
    colorSnapshot: item.colorSnapshot?.trim() || null,
    categorySnapshot: item.categorySnapshot?.trim() || null,
    genderSnapshot: item.genderSnapshot?.trim() || null,
    moqSnapshot: item.moqSnapshot ?? null,
    itemNote: item.itemNote?.trim() || null,
    productionLeadTime: item.productionLeadTime?.trim() || null,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    sortOrder: item.sortOrder ?? index,
    ...(item.variants?.length
      ? {
          variants: {
            create: item.variants.map((variant, variantIndex) => ({
              colorId: variant.colorId ?? null,
              colorNameSnapshot: variant.colorNameSnapshot?.trim() || null,
              sizeValue: variant.sizeValue?.trim() || null,
              skuSnapshot: variant.skuSnapshot?.trim() || null,
              quantity: variant.quantity,
              unit: variant.unit?.trim() || item.unit,
              sortOrder: variant.sortOrder ?? variantIndex,
            })),
          },
        }
      : {}),
  }));
}

function buildOrderDataFromInput(
  input: CreateManualOrderInput,
  totals: ReturnType<typeof computeOrderTotals>,
  salesSnapshots?: Awaited<ReturnType<typeof resolveSalesEmployeeSnapshot>>,
) {
  const orderDate = new Date(input.orderDate);
  if (Number.isNaN(orderDate.getTime())) {
    throw new OrderValidationError("Ngày đơn hàng không hợp lệ.");
  }

  return {
    customerId: input.customerId ?? null,
    contactId: input.contactId ?? null,
    salesRepresentativeId:
      salesSnapshots?.salesRepresentativeId ?? input.salesRepresentativeId ?? null,
    salesEmployeeId: salesSnapshots?.salesEmployeeId ?? input.salesEmployeeId ?? null,
    currency: input.currency?.trim() || "VND",
    priceVatType: input.priceVatType ?? "EXCLUDING_VAT",
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    shippingFee: totals.shippingFee,
    vatAmount: totals.vatAmount,
    totalAmount: totals.totalAmount,
    orderDate,
    customerNote: input.customerNote?.trim() || null,
    internalNote: input.internalNote?.trim() || null,
    terms: input.terms?.trim() || null,
    sampleFee: input.sampleFee ?? null,
    sampleLeadTime: input.sampleLeadTime?.trim() || null,
    sampleRefundCondition: input.sampleRefundCondition?.trim() || null,
    customerCompanyName: input.customerCompanyName?.trim() || null,
    customerCode: input.customerCode?.trim() || null,
    customerTaxCode: input.customerTaxCode?.trim() || null,
    customerAddress: input.customerAddress?.trim() || null,
    contactName: input.contactName?.trim() || null,
    contactTitle: input.contactTitle?.trim() || null,
    contactPhone: input.contactPhone?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    salesName: salesSnapshots?.salesName ?? (input.salesName?.trim() || null),
    salesTitle: salesSnapshots?.salesTitle ?? (input.salesTitle?.trim() || null),
    salesPhone: salesSnapshots?.salesPhone ?? (input.salesPhone?.trim() || null),
    salesEmail: salesSnapshots?.salesEmail ?? (input.salesEmail?.trim() || null),
    deliveryRecipientName: input.contactName?.trim() || null,
    deliveryRecipientPhone: input.contactPhone?.trim() || null,
    deliveryAddress: input.customerAddress?.trim() || null,
  };
}

function validateOrderItemsInput(input: CreateManualOrderInput) {
  if (!input.items.length) {
    throw new OrderValidationError("Vui lòng thêm ít nhất một dòng sản phẩm.");
  }
  for (const item of input.items) {
    if (!item.productNameSnapshot?.trim()) {
      throw new OrderValidationError("Vui lòng nhập tên sản phẩm cho tất cả dòng.");
    }
    if (item.variants?.length) {
      const seen = new Set<string>();
      for (const variant of item.variants) {
        const key = `${variant.colorId ?? ""}|${(variant.sizeValue ?? "").trim().toUpperCase()}`;
        if (seen.has(key)) {
          throw new OrderValidationError("Màu và size này đã tồn tại trong sản phẩm.");
        }
        seen.add(key);
        if (variant.quantity < 1) {
          throw new OrderValidationError("Số lượng biến thể phải lớn hơn 0.");
        }
      }
    } else if (item.quantity < 1) {
      throw new OrderValidationError("Số lượng phải lớn hơn 0.");
    }
    if (item.unitPrice < 0) {
      throw new OrderValidationError("Đơn giá không hợp lệ.");
    }
  }
}

async function resolveOrderItemSnapshot(
  item: OrderItemInput,
  tx?: Prisma.TransactionClient,
): Promise<OrderItemInput> {
  const db = tx ?? prisma;
  let colorSnapshot = item.colorSnapshot ?? null;
  let categorySnapshot = item.categorySnapshot ?? null;
  let genderSnapshot = item.genderSnapshot ?? null;

  if (item.colorId) {
    const color = await db.color.findUnique({ where: { id: item.colorId } });
    if (!color) throw new OrderValidationError("Màu sắc không hợp lệ.");
    colorSnapshot = color.name;
  } else if (item.colorSnapshot?.trim()) {
    throw new OrderValidationError("Vui lòng chọn màu sắc từ danh sách hệ thống.");
  }

  if (item.categoryId) {
    const category = await db.category.findUnique({ where: { id: item.categoryId } });
    if (!category) throw new OrderValidationError("Danh mục không hợp lệ.");
    categorySnapshot = category.name;
  } else if (item.categorySnapshot?.trim()) {
    throw new OrderValidationError("Vui lòng chọn danh mục từ danh sách hệ thống.");
  }

  if (item.gender) {
    if (!isOrderProductGender(item.gender)) {
      throw new OrderValidationError("Giới tính không hợp lệ.");
    }
    genderSnapshot = orderProductGenderLabel(item.gender as OrderProductGender);
  } else if (item.genderSnapshot?.trim()) {
    throw new OrderValidationError("Vui lòng chọn giới tính từ danh sách.");
  }

  return { ...item, colorSnapshot, categorySnapshot, genderSnapshot };
}

async function prepareOrderItemVariantsForSave(
  variants: OrderItemVariantInput[] | undefined,
  item: OrderItemInput,
  customerCode: string | null | undefined,
  tx?: Prisma.TransactionClient,
): Promise<OrderItemVariantInput[] | undefined> {
  if (!variants?.length) return undefined;

  const db = tx ?? prisma;
  const product = item.productId
    ? await db.product.findUnique({
        where: { id: item.productId },
        select: { systemCode: true },
      })
    : null;
  const systemCode =
    product?.systemCode ??
    (item.productId ? await ensureProductSystemCode(item.productId) : null);

  const usedSkus = new Set<string>();
  const prepared: OrderItemVariantInput[] = [];

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    let colorNameSnapshot = variant.colorNameSnapshot ?? null;
    let colorSlug: string | undefined;

    if (variant.colorId) {
      const color = await db.color.findUnique({ where: { id: variant.colorId } });
      if (!color) throw new OrderValidationError("Màu sắc biến thể không hợp lệ.");
      colorNameSnapshot = color.name;
      colorSlug = color.slug;
    }

    const quantity = Math.max(1, Math.floor(variant.quantity));
    let skuSnapshot = variant.skuSnapshot?.trim() || null;

    if (!skuSnapshot && customerCode?.trim() && systemCode) {
      const base = buildOrderItemVariantSkuBase({
        customerCode: customerCode.trim(),
        systemCode,
        colorName: colorNameSnapshot,
        colorSlug,
        sizeValue: variant.sizeValue,
      });
      skuSnapshot = base;
      let suffix = 0;
      while (usedSkus.has(skuSnapshot)) {
        suffix += 1;
        skuSnapshot = `${base}-${String(suffix).padStart(2, "0")}`;
      }
    }

    if (skuSnapshot) usedSkus.add(skuSnapshot);

    prepared.push({
      ...variant,
      colorNameSnapshot,
      sizeValue: variant.sizeValue?.trim() || null,
      skuSnapshot,
      quantity,
      unit: variant.unit?.trim() || item.unit || "cái",
      sortOrder: variant.sortOrder ?? index,
    });
  }

  return prepared;
}

async function prepareOrderItemsForSave(
  items: OrderItemInput[],
  customerCode: string | null | undefined,
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  const prepared: ReturnType<typeof computeOrderItem>[] = [];

  for (const raw of items) {
    const preparedVariants = await prepareOrderItemVariantsForSave(
      raw.variants,
      raw,
      customerCode,
      tx,
    );
    const resolved = await resolveOrderItemSnapshot(
      {
        ...raw,
        variants: preparedVariants,
      },
      tx,
    );
    let skuSnapshot = resolved.skuSnapshot?.trim() || null;

    if (!skuSnapshot && customerCode?.trim() && resolved.productId && !preparedVariants?.length) {
      const product = await db.product.findUnique({
        where: { id: resolved.productId },
        select: { systemCode: true },
      });
      const variant = resolved.variantId
        ? await db.productVariant.findUnique({
            where: { id: resolved.variantId },
            select: { colorName: true, sizeName: true },
          })
        : null;
      const systemCode = product?.systemCode
        ?? (resolved.productId ? await ensureProductSystemCode(resolved.productId) : null);
      if (systemCode) {
        skuSnapshot = await allocateOrderCustomSku(
          {
            customerCode: customerCode.trim(),
            systemCode,
            colorName: variant?.colorName ?? resolved.colorSnapshot,
            sizeName: variant?.sizeName ?? null,
          },
          tx,
        );
      }
    }

    prepared.push(
      computeOrderItem({
        ...resolved,
        skuSnapshot,
        variants: preparedVariants,
      }),
    );
  }

  return prepared;
}

export async function createManualOrder(input: CreateManualOrderInput) {
  validateOrderItemsInput(input);
  const salesSnapshots = input.salesEmployeeId
    ? await resolveSalesEmployeeSnapshot(input.salesEmployeeId)
    : undefined;
  const computedItems = await prepareOrderItemsForSave(input.items, input.customerCode);
  const totals = computeOrderTotals(computedItems, {
    discountAmount: input.discountAmount,
    shippingFee: input.shippingFee,
    vatRate: input.vatRate,
    vatAmount: input.vatAmount,
  });
  const orderData = buildOrderDataFromInput(input, totals, salesSnapshots);
  const itemCreates = buildOrderItemCreates(computedItems);

  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const orderNo = await generateOrderNo();
    try {
      const orderId = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNo,
            status: "NEW",
            ...orderData,
            items: { create: itemCreates },
          },
          select: { id: true },
        });
        await tx.orderActivity.create({
          data: {
            orderId: created.id,
            type: "CREATED",
            title: "Tạo đơn hàng thủ công",
            detail: `${orderNo} · ${input.customerCompanyName?.trim() ?? ""}`.trim(),
          },
        });
        return created.id;
      });

      const detail = await getOrderDetail(orderId);
      if (!detail) throw new OrderValidationError("Không tìm thấy đơn hàng.");
      return detail;
    } catch (error) {
      if (isOrderNoUniqueError(error) && attempt < maxAttempts - 1) continue;
      throw error;
    }
  }

  throw new OrderValidationError("Không thể tạo mã đơn hàng.");
}

export async function updateOrderDetails(id: string, input: UpdateOrderInput) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  if (!isOrderEditable(order.status)) {
    throw new OrderValidationError("Không thể chỉnh sửa đơn hàng đã hoàn tất hoặc đã hủy.");
  }

  validateOrderItemsInput(input);
  const salesSnapshots = input.salesEmployeeId
    ? await resolveSalesEmployeeSnapshot(input.salesEmployeeId)
    : undefined;
  const computedItems = await prepareOrderItemsForSave(input.items, input.customerCode);
  const totals = computeOrderTotals(computedItems, {
    discountAmount: input.discountAmount,
    shippingFee: input.shippingFee,
    vatRate: input.vatRate,
    vatAmount: input.vatAmount,
  });
  const orderData = buildOrderDataFromInput(input, totals, salesSnapshots);
  const itemCreates = buildOrderItemCreates(computedItems);

  const previousItemCount = await prisma.orderItem.count({ where: { orderId: id } });
  const changes: string[] = [];
  if (order.totalAmount.toNumber() !== totals.totalAmount) {
    changes.push(
      `Tổng: ${order.totalAmount.toNumber().toLocaleString("vi-VN")} → ${totals.totalAmount.toLocaleString("vi-VN")} đ`,
    );
  }
  if (previousItemCount !== computedItems.length) {
    changes.push(`Số dòng: ${computedItems.length}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.update({
      where: { id },
      data: {
        ...orderData,
        items: { create: itemCreates },
      },
    });
    await tx.orderActivity.create({
      data: {
        orderId: id,
        type: "ORDER_EDITED",
        title: "Đã cập nhật thông tin đơn hàng",
        detail: changes.length ? changes.join(" · ") : "Cập nhật thông tin và sản phẩm",
      },
    });
  });

  const detail = await getOrderDetail(id);
  if (!detail) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  return detail;
}

export async function editOrderPayment(
  orderId: string,
  paymentId: string,
  input: EditOrderPaymentInput,
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
  if (payment.status !== "CONFIRMED") {
    throw new OrderValidationError("Chỉ có thể chỉnh sửa ghi nhận đã xác nhận.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new OrderValidationError("Số tiền thanh toán phải lớn hơn 0.");
  }

  const paidAt = new Date(input.paidAt);
  if (Number.isNaN(paidAt.getTime())) {
    throw new OrderValidationError("Ngày thanh toán không hợp lệ.");
  }

  const otherPayments = order.payments
    .filter((p) => p.id !== paymentId)
    .map((p) => ({
      type: p.type,
      status: p.status,
      amount: p.amount.toNumber(),
    }));
  const totalAmount = order.totalAmount.toNumber();
  const { outstandingAmount } = computeOrderFinancials(totalAmount, otherPayments);
  const netPaid = computeConfirmedNetPaid(otherPayments);

  if (input.type === "REFUND") {
    if (input.amount > netPaid) {
      throw new OrderValidationError("Số tiền hoàn không được vượt quá tổng đã thanh toán.");
    }
  } else if (input.amount > outstandingAmount) {
    throw new OrderValidationError("Số tiền không được vượt quá số còn phải thu.");
  }

  const beforeSummary = [
    ORDER_PAYMENT_TYPE_LABELS[payment.type],
    `${payment.amount.toNumber().toLocaleString("vi-VN")} đ`,
  ].join(" · ");
  const afterSummary = [
    ORDER_PAYMENT_TYPE_LABELS[input.type],
    `${input.amount.toLocaleString("vi-VN")} đ`,
  ].join(" · ");

  await prisma.$transaction(async (tx) => {
    await tx.orderPayment.update({
      where: { id: paymentId },
      data: {
        type: input.type,
        method: input.method,
        amount: input.amount,
        paidAt,
        referenceCode: input.referenceCode?.trim() || null,
        note: input.note?.trim() || null,
        editReason: input.editReason.trim(),
        editedAt: new Date(),
      },
    });
    await tx.orderActivity.create({
      data: {
        orderId,
        type: "PAYMENT_EDITED",
        title: "Đã chỉnh sửa ghi nhận thanh toán",
        detail: `${beforeSummary} → ${afterSummary} · Lý do: ${input.editReason.trim()}`,
      },
    });
  });

  const detail = await getOrderDetail(orderId);
  if (!detail) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  return detail;
}

function parseProductionDueDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new OrderValidationError("Hạn hoàn thành dự kiến không hợp lệ.");
  }
  return date;
}

export async function updateOrderProduction(
  id: string,
  input: UpdateOrderProductionInput,
) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  if (!isOrderEditable(order.status)) {
    throw new OrderValidationError("Không thể cập nhật sản xuất cho đơn hàng đã hoàn tất hoặc đã hủy.");
  }

  const productionDueDate = parseProductionDueDate(input.productionDueDate);
  const productionOwnerSnapshot = await resolveProductionOwnerSnapshot(input.productionOwnerId, {
    allowExistingId: order.productionOwnerId,
  });
  const { productionOwnerId, productionOwnerName } = productionOwnerSnapshot;

  const details: string[] = [];
  if (productionOwnerName !== (order.productionOwnerName ?? null)) {
    details.push(`Phụ trách: ${productionOwnerName ?? "—"}`);
  }
  if (productionDueDate?.toISOString() !== order.productionDueDate?.toISOString()) {
    details.push(
      productionDueDate
        ? `Hạn: ${productionDueDate.toLocaleDateString("vi-VN")}`
        : "Đã xóa hạn hoàn thành",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        productionOwnerId,
        productionOwnerName,
        productionDueDate,
        productionNote: input.productionNote?.trim() || null,
      },
    });
    await tx.orderActivity.create({
      data: {
        orderId: id,
        type: "PRODUCTION_UPDATED",
        title: "Đã cập nhật thông tin sản xuất",
        detail: details.length ? details.join(" · ") : "Cập nhật ghi chú sản xuất",
      },
    });
  });

  const detail = await getOrderDetail(id);
  if (!detail) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  return detail;
}

function parseDeliveryExpectedAt(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new OrderValidationError("Ngày dự kiến giao không hợp lệ.");
  }
  return date;
}

export async function updateOrderDelivery(
  id: string,
  input: UpdateOrderDeliveryInput,
) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  if (!isOrderEditable(order.status)) {
    throw new OrderValidationError("Không thể cập nhật giao hàng cho đơn hàng đã hoàn tất hoặc đã hủy.");
  }

  const deliveryExpectedAt = parseDeliveryExpectedAt(input.deliveryExpectedAt);
  const deliveryMethodSnapshot = await resolveDeliveryMethodSnapshot(input.deliveryMethodId, {
    allowInactiveId: order.deliveryMethodId,
  });
  const deliveryCarrierSnapshot = await resolveDeliveryCarrierSnapshot(input.deliveryCarrierId, {
    allowInactiveId: order.deliveryCarrierId,
  });
  let deliveryOwnerId: string | null = null;
  let deliveryOwnerName: string | null = null;
  if (input.deliveryOwnerId) {
    const employee = await prisma.employee.findUnique({ where: { id: input.deliveryOwnerId } });
    if (!employee) throw new OrderValidationError("Nhân viên phụ trách giao hàng không hợp lệ.");
    deliveryOwnerId = employee.id;
    deliveryOwnerName = employee.fullName;
  }

  const details: string[] = [];
  if (deliveryMethodSnapshot.deliveryMethodName) {
    details.push(`Hình thức: ${deliveryMethodSnapshot.deliveryMethodName}`);
  }
  if (deliveryOwnerName) {
    details.push(`Phụ trách giao: ${deliveryOwnerName}`);
  }
  if (input.deliveryTrackingCode?.trim()) {
    details.push(`Mã vận đơn: ${input.deliveryTrackingCode.trim()}`);
  }
  if (deliveryCarrierSnapshot.deliveryCarrierName) {
    details.push(`ĐVVC: ${deliveryCarrierSnapshot.deliveryCarrierName}`);
  }
  if (input.deliveryRecipientName?.trim()) {
    details.push(`Người nhận: ${input.deliveryRecipientName.trim()}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        deliveryMethodId: deliveryMethodSnapshot.deliveryMethodId,
        deliveryMethodName: deliveryMethodSnapshot.deliveryMethodName,
        deliveryMethod: deliveryMethodSnapshot.deliveryMethod,
        deliveryOwnerId,
        deliveryCarrierId: deliveryCarrierSnapshot.deliveryCarrierId,
        deliveryCarrierName: deliveryCarrierSnapshot.deliveryCarrierName,
        deliveryTrackingCode: input.deliveryTrackingCode?.trim() || null,
        deliveryRecipientName: input.deliveryRecipientName?.trim() || null,
        deliveryRecipientPhone: input.deliveryRecipientPhone?.trim() || null,
        deliveryAddress: input.deliveryAddress?.trim() || null,
        deliveryExpectedAt,
        deliveryNote: input.deliveryNote?.trim() || null,
      },
    });
    await tx.orderActivity.create({
      data: {
        orderId: id,
        type: "DELIVERY_UPDATED",
        title: "Đã cập nhật thông tin giao hàng",
        detail: details.length ? details.join(" · ") : "Cập nhật thông tin giao hàng",
      },
    });
  });

  const detail = await getOrderDetail(id);
  if (!detail) throw new OrderValidationError("Không tìm thấy đơn hàng.");
  return detail;
}
