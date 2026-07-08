import type { QuoteStatus, SalesOpportunityStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  convertQuoteToOrder,
  OrderConversionError,
} from "@/features/orders/order-conversion.service";

export class OrderHandoverError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "OrderHandoverError";
    this.statusCode = statusCode;
  }
}

export function isOpportunityHandoverEligible(
  stage: SalesOpportunityStage,
  quoteStatus: QuoteStatus | null | undefined,
): boolean {
  return stage === "WON" || quoteStatus === "ACCEPTED";
}

function buildHandoverInternalNote(opportunity: {
  code: string;
  title: string;
  estimatedValue: { toNumber(): number } | null;
  note: string | null;
  pricingCalculation: { code: string; totalAmount: { toNumber(): number } } | null;
}): string {
  const lines = [`[Bàn giao từ cơ hội] ${opportunity.code} · ${opportunity.title}`];

  if (opportunity.estimatedValue != null) {
    lines.push(`Giá trị ước tính: ${opportunity.estimatedValue.toNumber().toLocaleString("vi-VN")} VND`);
  }
  if (opportunity.pricingCalculation) {
    lines.push(
      `Bản tính giá: ${opportunity.pricingCalculation.code} · ${opportunity.pricingCalculation.totalAmount.toNumber().toLocaleString("vi-VN")} VND`,
    );
  }
  if (opportunity.note?.trim()) {
    lines.push(`Ghi chú cơ hội: ${opportunity.note.trim()}`);
  }

  return lines.join("\n");
}

export async function createOrderDraftFromOpportunity(
  opportunityId: string,
): Promise<{ id: string; orderNo: string }> {
  const opportunity = await prisma.salesOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      quote: {
        include: {
          order: { select: { id: true, orderNo: true } },
          _count: { select: { items: true } },
        },
      },
      pricingCalculation: {
        select: { id: true, code: true, totalAmount: true },
      },
    },
  });

  if (!opportunity) {
    throw new OrderHandoverError("Cơ hội không tồn tại", 404);
  }

  if (!isOpportunityHandoverEligible(opportunity.stage, opportunity.quote?.status)) {
    throw new OrderHandoverError(
      "Chỉ tạo đơn hàng nháp khi cơ hội đã thắng hoặc báo giá đã được chấp nhận.",
    );
  }

  if (!opportunity.quoteId || !opportunity.quote) {
    throw new OrderHandoverError("Cần liên kết báo giá để tạo đơn hàng nháp.");
  }

  if (opportunity.quote.order) {
    throw new OrderHandoverError("Cơ hội này đã có đơn hàng/lệnh sản xuất.", 409);
  }

  if (opportunity.quote._count.items === 0) {
    throw new OrderHandoverError("Báo giá không có dòng sản phẩm để chuyển đơn.");
  }

  const relaxAcceptedStatus =
    opportunity.stage === "WON" && opportunity.quote.status !== "ACCEPTED";

  let orderDetail;
  try {
    orderDetail = await convertQuoteToOrder(opportunity.quoteId, { relaxAcceptedStatus });
  } catch (error) {
    if (error instanceof OrderConversionError) {
      throw new OrderHandoverError(error.message);
    }
    throw error;
  }

  const handoverNote = buildHandoverInternalNote(opportunity);
  const mergedNote = [orderDetail.internalNote, handoverNote].filter(Boolean).join("\n\n");

  const orderPatch: {
    internalNote: string | null;
    customerId?: string;
    contactId?: string;
  } = { internalNote: mergedNote || null };

  if (!orderDetail.customerId && opportunity.customerId) {
    orderPatch.customerId = opportunity.customerId;
  }
  if (!orderDetail.contactId && opportunity.contactId) {
    orderPatch.contactId = opportunity.contactId;
  }

  await prisma.order.update({
    where: { id: orderDetail.id },
    data: orderPatch,
  });

  if (opportunity.leadId || opportunity.customerId) {
    await prisma.cRMActivity.create({
      data: {
        leadId: opportunity.leadId,
        customerId: opportunity.customerId,
        contactId: opportunity.contactId,
        type: "STATUS_CHANGE",
        title: `Tạo đơn hàng nháp từ cơ hội ${opportunity.code}`,
        content: orderDetail.orderNo,
      },
    });
  }

  return { id: orderDetail.id, orderNo: orderDetail.orderNo };
}
