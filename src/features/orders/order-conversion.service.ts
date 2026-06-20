import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateOrderNo } from "@/features/orders/order-code";
import { getOrderDetail } from "@/features/orders/order.service";

export class OrderConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderConversionError";
  }
}

function isOrderNoUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function logOrderConversionActivity(
  tx: Prisma.TransactionClient,
  params: {
    leadId?: string | null;
    customerId?: string | null;
    contactId?: string | null;
    title: string;
    content?: string | null;
  },
) {
  if (!params.leadId && !params.customerId) return;
  await tx.cRMActivity.create({
    data: {
      leadId: params.leadId ?? null,
      customerId: params.customerId ?? null,
      contactId: params.contactId ?? null,
      type: "STATUS_CHANGE",
      title: params.title,
      content: params.content ?? null,
    },
  });
}

function resolveCommercialTotal(quote: {
  manualOverride: boolean;
  manualTotalAmount: Prisma.Decimal | null;
  totalAmount: Prisma.Decimal;
}): Prisma.Decimal {
  if (quote.manualOverride && quote.manualTotalAmount != null) {
    return quote.manualTotalAmount;
  }
  return quote.totalAmount;
}

export async function convertQuoteToOrder(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: { select: { code: true } },
      items: { orderBy: { sortOrder: "asc" } },
      order: { select: { id: true } },
    },
  });

  if (!quote) {
    throw new OrderConversionError("Không tìm thấy báo giá.");
  }

  if (quote.order) {
    const existing = await getOrderDetail(quote.order.id);
    if (!existing) throw new OrderConversionError("Không tìm thấy đơn hàng liên quan.");
    return existing;
  }

  if (quote.status !== "ACCEPTED") {
    throw new OrderConversionError(
      "Chỉ có thể tạo đơn hàng từ báo giá đã được khách đồng ý.",
    );
  }

  if (!quote.items.length) {
    throw new OrderConversionError("Báo giá không có dòng sản phẩm để chuyển đơn.");
  }

  const commercialTotal = resolveCommercialTotal(quote);
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const orderNo = await generateOrderNo();
    try {
      const orderId = await prisma.$transaction(async (tx) => {
        const duplicate = await tx.order.findUnique({
          where: { quoteId },
          select: { id: true },
        });
        if (duplicate) return duplicate.id;

        const created = await tx.order.create({
          data: {
            orderNo,
            quoteId: quote.id,
            customerId: quote.customerId,
            contactId: quote.contactId,
            salesRepresentativeId: quote.salesRepresentativeId,
            status: "NEW",
            currency: quote.currency,
            priceVatType: quote.priceVatType,
            subtotal: quote.subtotal,
            discountAmount: quote.discountAmount,
            shippingFee: quote.shippingFee,
            vatAmount: quote.vatAmount,
            totalAmount: commercialTotal,
            orderDate: new Date(),
            customerNote: quote.customerNote,
            internalNote: quote.internalNote,
            terms: quote.terms,
            sampleFee: quote.sampleFee,
            sampleLeadTime: quote.sampleLeadTime,
            sampleRefundCondition: quote.sampleRefundCondition,
            customerCompanyName: quote.customerCompanySnapshot,
            customerCode: quote.customer?.code ?? null,
            customerTaxCode: quote.customerTaxCodeSnapshot,
            customerAddress: quote.customerAddressSnapshot,
            contactName: quote.customerContactNameSnapshot,
            contactTitle: quote.customerContactTitleSnapshot,
            contactPhone: quote.customerPhoneSnapshot,
            contactEmail: quote.customerEmailSnapshot,
            salesName: quote.salesName,
            salesTitle: quote.salesTitleSnapshot,
            salesPhone: quote.salesPhone,
            salesEmail: quote.salesEmail,
            sourceQuoteNo: quote.quoteNo,
            sourceQuoteDate: quote.quoteDate,
            sourceQuoteValidUntil: quote.validUntil,
            items: {
              create: quote.items.map((item, index) => ({
                productId: item.productId,
                variantId: item.variantId,
                productNameSnapshot: item.productNameSnapshot,
                variantNameSnapshot: item.variantNameSnapshot,
                description: item.description,
                designMediaAssetId: item.designMediaAssetId,
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
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
                sortOrder: item.sortOrder ?? index,
              })),
            },
            activities: {
              create: {
                type: "CREATED",
                title: `Đơn hàng được tạo từ báo giá ${quote.quoteNo}`,
              },
            },
          },
          select: { id: true },
        });

        await logOrderConversionActivity(tx, {
          leadId: quote.leadId,
          customerId: quote.customerId,
          contactId: quote.contactId,
          title: `Đã chuyển báo giá ${quote.quoteNo} thành đơn hàng ${orderNo}`,
          content: orderNo,
        });

        return created.id;
      });

      const detail = await getOrderDetail(orderId);
      if (!detail) throw new OrderConversionError("Không thể tải đơn hàng vừa tạo.");
      return detail;
    } catch (error) {
      if (isOrderNoUniqueError(error)) continue;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.order.findUnique({ where: { quoteId } });
        if (existing) {
          const detail = await getOrderDetail(existing.id);
          if (detail) return detail;
        }
      }
      throw error;
    }
  }

  throw new OrderConversionError("Không thể tạo mã đơn hàng. Vui lòng thử lại.");
}
