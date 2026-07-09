import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapActivityRow } from "@/features/crm/mappers";
import type { RevenueWorkspacePayload } from "@/features/revenue/workspace/types";

function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

function formatCustomerLabel(row: { code: string; name: string } | null): string | null {
  if (!row) return null;
  return `${row.code} · ${row.name}`;
}

function extractGrossMargin(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const candidate = (snapshot as { grossProfit?: unknown }).grossProfit;
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

export async function getRevenueWorkspace(
  opportunityId: string,
): Promise<RevenueWorkspacePayload | null> {
  const opportunity = await prisma.salesOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      lead: {
        select: {
          id: true,
          code: true,
          fullName: true,
          companyName: true,
          company: true,
          phone: true,
          email: true,
          status: true,
        },
      },
      customer: {
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          email: true,
          taxCode: true,
          address: true,
        },
      },
      contact: {
        select: {
          id: true,
          fullName: true,
          title: true,
          phone: true,
          email: true,
        },
      },
      quote: {
        select: {
          id: true,
          quoteNo: true,
          status: true,
          totalAmount: true,
          manualOverride: true,
          manualTotalAmount: true,
          validUntil: true,
          createdAt: true,
          sentAt: true,
          viewedAt: true,
          acceptedAt: true,
          rejectedAt: true,
          publicShortCode: true,
        },
      },
      pricingCalculation: {
        select: {
          id: true,
          code: true,
          status: true,
          totalAmount: true,
          resultSnapshot: true,
          createdAt: true,
        },
      },
    },
  });

  if (!opportunity) return null;

  const relationQuoteFilters: Prisma.QuoteWhereInput[] = [];
  const relationCalculationFilters: Prisma.PricingCalculationWhereInput[] = [];
  const relationActivityFilters: Prisma.CRMActivityWhereInput[] = [];

  if (opportunity.leadId) {
    relationQuoteFilters.push({ leadId: opportunity.leadId });
    relationCalculationFilters.push({ leadId: opportunity.leadId });
    relationActivityFilters.push({ leadId: opportunity.leadId });
  }
  if (opportunity.customerId) {
    relationQuoteFilters.push({ customerId: opportunity.customerId });
    relationCalculationFilters.push({ customerId: opportunity.customerId });
    relationActivityFilters.push({ customerId: opportunity.customerId });
  }
  if (opportunity.contactId) {
    relationActivityFilters.push({ contactId: opportunity.contactId });
  }

  const [currentOrder, relatedQuoteRows, relatedCalculationRows, relatedOrderRows, activityRows] =
    await Promise.all([
      opportunity.quoteId
        ? prisma.order.findUnique({
            where: { quoteId: opportunity.quoteId },
            select: {
              id: true,
              orderNo: true,
              status: true,
              totalAmount: true,
              deliveryExpectedAt: true,
              createdAt: true,
            },
          })
        : Promise.resolve(null),
      relationQuoteFilters.length > 0
        ? prisma.quote.findMany({
            where: { OR: relationQuoteFilters },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              quoteNo: true,
              status: true,
              totalAmount: true,
              manualOverride: true,
              manualTotalAmount: true,
              validUntil: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      relationCalculationFilters.length > 0
        ? prisma.pricingCalculation.findMany({
            where: { OR: relationCalculationFilters },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              code: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      opportunity.customerId
        ? prisma.order.findMany({
            where: { customerId: opportunity.customerId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              orderNo: true,
              status: true,
              totalAmount: true,
              deliveryExpectedAt: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      relationActivityFilters.length > 0
        ? prisma.cRMActivity.findMany({
            where: { OR: relationActivityFilters },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

  const currentQuoteTotal =
    opportunity.quote?.manualOverride && opportunity.quote.manualTotalAmount != null
      ? opportunity.quote.manualTotalAmount.toNumber()
      : decimalToNumber(opportunity.quote?.totalAmount);

  const relatedQuotes = relatedQuoteRows
    .filter((row) => row.id !== opportunity.quoteId)
    .map((row) => ({
      id: row.id,
      quoteNo: row.quoteNo,
      status: row.status,
      totalAmount:
        row.manualOverride && row.manualTotalAmount != null
          ? row.manualTotalAmount.toNumber()
          : row.totalAmount.toNumber(),
      validUntil: row.validUntil?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));

  const relatedPricingCalculations = relatedCalculationRows
    .filter((row) => row.id !== opportunity.pricingCalculationId)
    .map((row) => ({
      id: row.id,
      code: row.code,
      status: row.status,
      totalAmount: row.totalAmount.toNumber(),
      createdAt: row.createdAt.toISOString(),
    }));

  const relatedOrders = relatedOrderRows
    .filter((row) => row.id !== currentOrder?.id)
    .map((row) => ({
      id: row.id,
      orderNo: row.orderNo,
      status: row.status,
      totalAmount: decimalToNumber(row.totalAmount),
      deliveryDate: row.deliveryExpectedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));

  const timeline: RevenueWorkspacePayload["timeline"] = [];
  const upsertTimeline = (entry: RevenueWorkspacePayload["timeline"][number]) => {
    timeline.push(entry);
  };

  upsertTimeline({
    id: `opp-created-${opportunity.id}`,
    type: "OPPORTUNITY",
    title: "Tạo cơ hội bán hàng",
    description: opportunity.note,
    at: opportunity.createdAt.toISOString(),
    href: `/admin/sales/opportunity/${opportunity.id}`,
  });

  if (opportunity.updatedAt.getTime() !== opportunity.createdAt.getTime()) {
    upsertTimeline({
      id: `opp-updated-${opportunity.id}`,
      type: "OPPORTUNITY",
      title: "Cập nhật cơ hội",
      description: opportunity.lostReason,
      at: opportunity.updatedAt.toISOString(),
      href: `/admin/sales/opportunity/${opportunity.id}`,
    });
  }

  if (opportunity.lead) {
    upsertTimeline({
      id: `lead-linked-${opportunity.lead.id}`,
      type: "LEAD",
      title: `Liên kết lead ${opportunity.lead.code ?? ""}`.trim(),
      description: opportunity.lead.companyName ?? opportunity.lead.fullName,
      at: opportunity.createdAt.toISOString(),
      href: `/admin/crm/leads/${opportunity.lead.id}`,
    });
  }

  if (opportunity.quote) {
    upsertTimeline({
      id: `quote-created-${opportunity.quote.id}`,
      type: "QUOTE",
      title: `Tạo báo giá ${opportunity.quote.quoteNo}`,
      at: opportunity.quote.createdAt.toISOString(),
      href: `/admin/quotes/${opportunity.quote.id}`,
    });
    if (opportunity.quote.sentAt) {
      upsertTimeline({
        id: `quote-sent-${opportunity.quote.id}`,
        type: "QUOTE",
        title: `Gửi báo giá ${opportunity.quote.quoteNo}`,
        at: opportunity.quote.sentAt.toISOString(),
        href: `/admin/quotes/${opportunity.quote.id}`,
      });
    }
    if (opportunity.quote.viewedAt) {
      upsertTimeline({
        id: `quote-viewed-${opportunity.quote.id}`,
        type: "QUOTE",
        title: `Khách đã xem báo giá ${opportunity.quote.quoteNo}`,
        at: opportunity.quote.viewedAt.toISOString(),
        href: `/admin/quotes/${opportunity.quote.id}`,
      });
    }
    if (opportunity.quote.acceptedAt) {
      upsertTimeline({
        id: `quote-accepted-${opportunity.quote.id}`,
        type: "QUOTE",
        title: `Báo giá ${opportunity.quote.quoteNo} được chấp nhận`,
        at: opportunity.quote.acceptedAt.toISOString(),
        href: `/admin/quotes/${opportunity.quote.id}`,
      });
    }
    if (opportunity.quote.rejectedAt) {
      upsertTimeline({
        id: `quote-rejected-${opportunity.quote.id}`,
        type: "QUOTE",
        title: `Báo giá ${opportunity.quote.quoteNo} bị từ chối`,
        at: opportunity.quote.rejectedAt.toISOString(),
        href: `/admin/quotes/${opportunity.quote.id}`,
      });
    }
  }

  if (opportunity.pricingCalculation) {
    upsertTimeline({
      id: `costing-created-${opportunity.pricingCalculation.id}`,
      type: "COSTING",
      title: `Tạo bản tính ${opportunity.pricingCalculation.code}`,
      at: opportunity.pricingCalculation.createdAt.toISOString(),
      href: `/admin/pricing/history/${opportunity.pricingCalculation.id}`,
    });
  }

  if (currentOrder) {
    upsertTimeline({
      id: `order-created-${currentOrder.id}`,
      type: "ORDER",
      title: `Tạo đơn hàng ${currentOrder.orderNo}`,
      at: currentOrder.createdAt.toISOString(),
      href: `/admin/orders/${currentOrder.id}`,
    });
  }

  activityRows.map(mapActivityRow).forEach((activity) => {
    upsertTimeline({
      id: `activity-${activity.id}`,
      type: "ACTIVITY",
      title: activity.title,
      description: activity.content,
      at: activity.createdAt,
      href:
        activity.leadId != null
          ? `/admin/crm/leads/${activity.leadId}`
          : activity.customerId != null
            ? `/admin/crm/customers/${activity.customerId}`
            : null,
    });
  });

  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const payload: RevenueWorkspacePayload = {
    opportunity: {
      id: opportunity.id,
      code: opportunity.code,
      title: opportunity.title,
      stage: opportunity.stage,
      priority: opportunity.priority,
      estimatedValue: decimalToNumber(opportunity.estimatedValue),
      probability: opportunity.probability,
      expectedCloseDate: opportunity.expectedCloseDate?.toISOString() ?? null,
      nextFollowUpAt: opportunity.nextFollowUpAt?.toISOString() ?? null,
      assignedTo: opportunity.assignedTo,
      source: opportunity.source,
      note: opportunity.note,
      lostReason: opportunity.lostReason,
      createdAt: opportunity.createdAt.toISOString(),
      updatedAt: opportunity.updatedAt.toISOString(),
    },
    customer: {
      id: opportunity.customer?.id ?? null,
      label: formatCustomerLabel(opportunity.customer ?? null),
      code: opportunity.customer?.code ?? null,
      phone: opportunity.customer?.phone ?? null,
      email: opportunity.customer?.email ?? null,
      taxCode: opportunity.customer?.taxCode ?? null,
      address: opportunity.customer?.address ?? null,
    },
    contact: {
      id: opportunity.contact?.id ?? null,
      label: opportunity.contact?.fullName ?? null,
      phone: opportunity.contact?.phone ?? null,
      email: opportunity.contact?.email ?? null,
      title: opportunity.contact?.title ?? null,
    },
    lead: {
      id: opportunity.lead?.id ?? null,
      code: opportunity.lead?.code ?? null,
      label:
        opportunity.lead == null
          ? null
          : `${opportunity.lead.code ? `${opportunity.lead.code} · ` : ""}${opportunity.lead.fullName}`,
      company: opportunity.lead?.companyName ?? opportunity.lead?.company ?? null,
      phone: opportunity.lead?.phone ?? null,
      email: opportunity.lead?.email ?? null,
      status: opportunity.lead?.status ?? null,
    },
    currentQuote: {
      id: opportunity.quote?.id ?? null,
      quoteNo: opportunity.quote?.quoteNo ?? null,
      status: opportunity.quote?.status ?? null,
      totalAmount: currentQuoteTotal,
      validUntil: opportunity.quote?.validUntil?.toISOString() ?? null,
      publicShortCode: opportunity.quote?.publicShortCode ?? null,
    },
    pricingCalculation: {
      id: opportunity.pricingCalculation?.id ?? null,
      code: opportunity.pricingCalculation?.code ?? null,
      totalAmount: decimalToNumber(opportunity.pricingCalculation?.totalAmount),
      status: opportunity.pricingCalculation?.status ?? null,
      resultSnapshot: opportunity.pricingCalculation?.resultSnapshot,
    },
    order: {
      id: currentOrder?.id ?? null,
      orderNo: currentOrder?.orderNo ?? null,
      status: currentOrder?.status ?? null,
      totalAmount: decimalToNumber(currentOrder?.totalAmount),
      deliveryDate: currentOrder?.deliveryExpectedAt?.toISOString() ?? null,
    },
    relatedQuotes,
    relatedPricingCalculations,
    relatedOrders,
    timeline,
    stats: {
      estimatedValue: decimalToNumber(opportunity.estimatedValue),
      quoteValue: currentQuoteTotal,
      orderValue: decimalToNumber(currentOrder?.totalAmount),
      grossMargin: extractGrossMargin(opportunity.pricingCalculation?.resultSnapshot),
      probability: opportunity.probability,
    },
  };

  return payload;
}
