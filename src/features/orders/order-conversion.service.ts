import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateOrderNo } from "@/features/orders/order-code";
import { copyProductBomToOrderItems } from "@/features/orders/production-pack.service";
import { getOrderDetail } from "@/features/orders/order.service";
import {
  enrichOrderInputFromCrmSnapshots,
} from "@/features/crm/order-customer-snapshot";

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

function resolveQuoteItemVariantData(item: {
  variantNameSnapshot: string | null;
  colorSnapshot: string | null;
  quantity: number;
  unit: string;
}) {
  const parts = item.variantNameSnapshot?.split(" · ").map((p) => p.trim()) ?? [];
  const sizeValue = parts.length >= 2 ? parts[parts.length - 1] : null;
  const hasColorOrSize = Boolean(item.colorSnapshot?.trim() || sizeValue);
  if (!hasColorOrSize) return null;
  return {
    colorNameSnapshot: item.colorSnapshot,
    sizeValue,
    quantity: item.quantity,
    unit: item.unit,
    sortOrder: 0,
  };
}

async function buildQuoteConversionItems(
  tx: Prisma.TransactionClient,
  quoteItems: Array<{
    productId: string | null;
    variantId: string | null;
    productNameSnapshot: string | null;
    variantNameSnapshot: string | null;
    description: string | null;
    designMediaAssetId: string | null;
    designImageUrl: string | null;
    skuSnapshot: string | null;
    colorSnapshot: string | null;
    categorySnapshot: string | null;
    genderSnapshot: string | null;
    moqSnapshot: number | null;
    itemNote: string | null;
    productionLeadTime: string | null;
    quantity: number;
    unit: string;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    sortOrder: number;
    revenueCategoryId: string | null;
    revenueCategoryNameSnapshot: string | null;
    revenueCategoryCodeSnapshot: string | null;
  }>,
) {
  const variantIds = quoteItems.map((item) => item.variantId).filter(Boolean) as string[];
  const productVariants = variantIds.length
    ? await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { color: true },
      })
    : [];
  const variantById = new Map(productVariants.map((v) => [v.id, v]));

  return quoteItems.map((item, index) => {
    const linkedVariant = item.variantId ? variantById.get(item.variantId) : null;
    const variantSeed = resolveQuoteItemVariantData(item);
    const variantCreates = [];

    if (variantSeed) {
      variantCreates.push({
        colorId: linkedVariant?.colorId ?? null,
        colorNameSnapshot: linkedVariant?.color?.name ?? variantSeed.colorNameSnapshot,
        sizeValue: linkedVariant?.sizeName ?? variantSeed.sizeValue,
        skuSnapshot: item.skuSnapshot,
        quantity: variantSeed.quantity,
        unit: variantSeed.unit,
        sortOrder: 0,
      });
    }

    return {
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
      revenueCategoryId: item.revenueCategoryId,
      revenueCategoryNameSnapshot: item.revenueCategoryNameSnapshot,
      revenueCategoryCodeSnapshot: item.revenueCategoryCodeSnapshot,
      ...(variantCreates.length ? { variants: { create: variantCreates } } : {}),
    };
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
      customer: {
        select: {
          code: true,
          name: true,
          legalName: true,
          taxCode: true,
          phone: true,
          email: true,
          website: true,
          addressLine1: true,
          wardNameSnapshot: true,
          provinceNameSnapshot: true,
          address: true,
          district: true,
          province: true,
        },
      },
      contact: {
        select: {
          fullName: true,
          title: true,
          department: true,
          phone: true,
          email: true,
        },
      },
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

        const itemCreates = await buildQuoteConversionItems(tx, quote.items);

        const enriched = quote.customer
          ? enrichOrderInputFromCrmSnapshots(
              {
                customerId: quote.customerId,
                contactId: quote.contactId,
                orderDate: new Date().toISOString(),
                items: [],
                customerCompanyName: quote.customerCompanySnapshot,
                customerCode: quote.customer?.code ?? null,
                customerTaxCode: quote.customerTaxCodeSnapshot,
                customerAddress: quote.customerAddressSnapshot,
                contactName: quote.customerContactNameSnapshot,
                contactTitle: quote.customerContactTitleSnapshot,
                contactPhone: quote.customerPhoneSnapshot,
                contactEmail: quote.customerEmailSnapshot,
              },
              quote.customer,
              quote.contact,
            )
          : null;

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
            customerCompanyName: enriched?.customerCompanyName ?? quote.customerCompanySnapshot,
            customerCode: enriched?.customerCode ?? quote.customer?.code ?? null,
            customerTaxCode: enriched?.customerTaxCode ?? quote.customerTaxCodeSnapshot,
            customerAddress: enriched?.customerAddress ?? quote.customerAddressSnapshot,
            customerNameSnapshot: enriched?.customerNameSnapshot ?? null,
            customerLegalNameSnapshot: enriched?.customerLegalNameSnapshot ?? null,
            customerPhoneSnapshot: enriched?.customerPhoneSnapshot ?? quote.customerPhoneSnapshot,
            customerEmailSnapshot: enriched?.customerEmailSnapshot ?? quote.customerEmailSnapshot,
            customerWebsiteSnapshot: enriched?.customerWebsiteSnapshot ?? null,
            customerProvinceNameSnapshot: enriched?.customerProvinceNameSnapshot ?? null,
            customerWardNameSnapshot: enriched?.customerWardNameSnapshot ?? null,
            customerAddressLine1Snapshot: enriched?.customerAddressLine1Snapshot ?? null,
            contactName: enriched?.contactName ?? quote.customerContactNameSnapshot,
            contactTitle: enriched?.contactTitle ?? quote.customerContactTitleSnapshot,
            contactDepartment: enriched?.contactDepartment ?? quote.contact?.department ?? null,
            contactPhone: enriched?.contactPhone ?? quote.customerPhoneSnapshot,
            contactEmail: enriched?.contactEmail ?? quote.customerEmailSnapshot,
            salesName: quote.salesName,
            salesTitle: quote.salesTitleSnapshot,
            salesPhone: quote.salesPhone,
            salesEmail: quote.salesEmail,
            sourceQuoteNo: quote.quoteNo,
            sourceQuoteDate: quote.quoteDate,
            sourceQuoteValidUntil: quote.validUntil,
            items: { create: itemCreates },
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

        await copyProductBomToOrderItems(tx, created.id);

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
