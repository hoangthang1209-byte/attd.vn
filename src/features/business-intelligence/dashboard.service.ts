import type { OrderStatus, QuoteStatus, SalesOpportunityStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExecutiveDashboardPayload } from "@/features/business-intelligence/types";
import { getNotificationCenter } from "@/features/notifications/notification-center.service";
import { getSalesFollowUpCenter } from "@/features/sales/follow-up/follow-up.service";
import {
  SALES_OPPORTUNITY_STAGE_LABELS,
  SALES_OPPORTUNITY_STAGE_ORDER,
} from "@/features/sales/opportunities/labels";
import { getQuoteStatusLabel } from "@/features/quotes/labels";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import { EXECUTIVE_FUNNEL_LABELS } from "@/features/business-intelligence/labels";

const TERMINAL_OPPORTUNITY_STAGES = ["WON", "LOST"] as const;
const TERMINAL_LEAD_STATUSES = ["WON", "LOST", "NOT_FIT"] as const;
const TOP_LIMIT = 5;
const MARGIN_ROW_LIMIT = 300;

type MonthRange = {
  start: Date;
  end: Date;
};

function decimalToNumber(value: { toNumber(): number } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

function getMonthRange(reference = new Date()): MonthRange {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return { start, end };
}

function getPreviousMonthRange(reference = new Date()): MonthRange {
  const start = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  const end = new Date(reference.getFullYear(), reference.getMonth(), 1);
  return { start, end };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function wonOpportunityWhere(range: MonthRange) {
  return {
    stage: "WON" as const,
    OR: [
      { wonAt: { gte: range.start, lt: range.end } },
      { wonAt: null, updatedAt: { gte: range.start, lt: range.end } },
    ],
  };
}

async function sumWonValue(range: MonthRange): Promise<number> {
  const rows = await prisma.salesOpportunity.findMany({
    where: wonOpportunityWhere(range),
    select: { estimatedValue: true },
  });
  return rows.reduce((sum, row) => sum + decimalToNumber(row.estimatedValue), 0);
}

async function sumQuoteValue(range: MonthRange): Promise<number> {
  const aggregate = await prisma.quote.aggregate({
    where: { createdAt: { gte: range.start, lt: range.end } },
    _sum: { totalAmount: true },
  });
  return decimalToNumber(aggregate._sum.totalAmount);
}

async function sumOrderValue(range: MonthRange): Promise<number> {
  const aggregate = await prisma.order.aggregate({
    where: { createdAt: { gte: range.start, lt: range.end } },
    _sum: { totalAmount: true },
  });
  return decimalToNumber(aggregate._sum.totalAmount);
}

type MarginRow = {
  label: string;
  marginRate: number;
  value: number;
};

async function loadMarginRows(): Promise<MarginRow[]> {
  const [quoteItems, pricingItems] = await Promise.all([
    prisma.quoteItem.findMany({
      where: { marginRate: { not: null } },
      select: {
        marginRate: true,
        lineTotal: true,
        productNameSnapshot: true,
        variantNameSnapshot: true,
      },
      orderBy: { updatedAt: "desc" },
      take: MARGIN_ROW_LIMIT,
    }),
    prisma.pricingCalculationItem.findMany({
      where: { marginRate: { not: null } },
      select: {
        marginRate: true,
        lineTotal: true,
        productNameSnapshot: true,
        variantNameSnapshot: true,
      },
      orderBy: { updatedAt: "desc" },
      take: MARGIN_ROW_LIMIT,
    }),
  ]);

  const rows: MarginRow[] = [];

  for (const item of [...quoteItems, ...pricingItems]) {
    const marginRate = decimalToNumber(item.marginRate);
    if (!Number.isFinite(marginRate)) continue;
    const label =
      item.productNameSnapshot?.trim() ||
      item.variantNameSnapshot?.trim() ||
      "Hạng mục chưa đặt tên";
    rows.push({
      label,
      marginRate,
      value: decimalToNumber(item.lineTotal),
    });
  }

  return rows;
}

export async function getExecutiveDashboard(): Promise<ExecutiveDashboardPayload> {
  const now = new Date();
  const currentMonth = getMonthRange(now);
  const previousMonth = getPreviousMonthRange(now);

  const [
    openOpportunities,
    wonValueThisMonth,
    wonValuePreviousMonth,
    quoteValueThisMonth,
    quoteValuePreviousMonth,
    orderValueThisMonth,
    orderValuePreviousMonth,
    quotes,
    orders,
    funnelCounts,
    followUpCenter,
    notificationCenter,
    topCustomerGroups,
    quoteItemsThisMonth,
    marginRows,
  ] = await Promise.all([
    prisma.salesOpportunity.findMany({
      where: { stage: { notIn: [...TERMINAL_OPPORTUNITY_STAGES] } },
      select: {
        stage: true,
        estimatedValue: true,
        probability: true,
      },
    }),
    sumWonValue(currentMonth),
    sumWonValue(previousMonth),
    sumQuoteValue(currentMonth),
    sumQuoteValue(previousMonth),
    sumOrderValue(currentMonth),
    sumOrderValue(previousMonth),
    prisma.quote.findMany({
      select: { status: true, totalAmount: true },
    }),
    prisma.order.findMany({
      select: { status: true, totalAmount: true },
    }),
    Promise.all([
      prisma.lead.count({ where: { status: { notIn: [...TERMINAL_LEAD_STATUSES] } } }),
      prisma.salesOpportunity.count({ where: { stage: { notIn: [...TERMINAL_OPPORTUNITY_STAGES] } } }),
      prisma.pricingCalculation.count({
        where: { status: { in: ["DRAFT", "CALCULATED"] } },
      }),
      prisma.quote.count({ where: { status: { notIn: ["CANCELLED", "REJECTED"] } } }),
      prisma.salesOpportunity.count({ where: { stage: "WON" } }),
      prisma.order.count({ where: { status: { notIn: ["CANCELLED"] } } }),
    ]),
    getSalesFollowUpCenter(),
    getNotificationCenter(),
    prisma.order.groupBy({
      by: ["customerId"],
      where: { customerId: { not: null } },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: TOP_LIMIT,
    }),
    prisma.quoteItem.findMany({
      where: {
        quote: { createdAt: { gte: currentMonth.start, lt: currentMonth.end } },
      },
      select: {
        productNameSnapshot: true,
        variantNameSnapshot: true,
        lineTotal: true,
        quantity: true,
      },
    }),
    loadMarginRows(),
  ]);

  const openPipelineValue = openOpportunities.reduce(
    (sum, row) => sum + decimalToNumber(row.estimatedValue),
    0,
  );
  const weightedForecastValue = openOpportunities.reduce((sum, row) => {
    const value = decimalToNumber(row.estimatedValue);
    return sum + value * (row.probability / 100);
  }, 0);

  const stageMap = new Map<
    SalesOpportunityStage,
    { count: number; estimatedValue: number; weightedValue: number }
  >();

  for (const stage of SALES_OPPORTUNITY_STAGE_ORDER) {
    if (TERMINAL_OPPORTUNITY_STAGES.includes(stage as (typeof TERMINAL_OPPORTUNITY_STAGES)[number])) {
      continue;
    }
    stageMap.set(stage, { count: 0, estimatedValue: 0, weightedValue: 0 });
  }

  for (const row of openOpportunities) {
    const bucket = stageMap.get(row.stage) ?? { count: 0, estimatedValue: 0, weightedValue: 0 };
    const estimatedValue = decimalToNumber(row.estimatedValue);
    bucket.count += 1;
    bucket.estimatedValue += estimatedValue;
    bucket.weightedValue += estimatedValue * (row.probability / 100);
    stageMap.set(row.stage, bucket);
  }

  const opportunityByStage = SALES_OPPORTUNITY_STAGE_ORDER.filter(
    (stage) => !TERMINAL_OPPORTUNITY_STAGES.includes(stage as (typeof TERMINAL_OPPORTUNITY_STAGES)[number]),
  ).map((stage) => {
    const bucket = stageMap.get(stage) ?? { count: 0, estimatedValue: 0, weightedValue: 0 };
    return {
      stage,
      label: SALES_OPPORTUNITY_STAGE_LABELS[stage],
      count: bucket.count,
      estimatedValue: bucket.estimatedValue,
      weightedValue: bucket.weightedValue,
    };
  });

  const quoteStatusMap = new Map<QuoteStatus, { count: number; value: number }>();
  for (const quote of quotes) {
    const bucket = quoteStatusMap.get(quote.status) ?? { count: 0, value: 0 };
    bucket.count += 1;
    bucket.value += decimalToNumber(quote.totalAmount);
    quoteStatusMap.set(quote.status, bucket);
  }

  const quoteByStatus = Array.from(quoteStatusMap.entries())
    .map(([status, bucket]) => ({
      status,
      label: getQuoteStatusLabel(status),
      count: bucket.count,
      value: bucket.value,
    }))
    .sort((a, b) => b.value - a.value);

  const orderStatusMap = new Map<OrderStatus, { count: number; value: number }>();
  for (const order of orders) {
    const bucket = orderStatusMap.get(order.status) ?? { count: 0, value: 0 };
    bucket.count += 1;
    bucket.value += decimalToNumber(order.totalAmount);
    orderStatusMap.set(order.status, bucket);
  }

  const orderByStatus = Array.from(orderStatusMap.entries())
    .map(([status, bucket]) => ({
      status,
      label: ORDER_STATUS_LABELS[status] ?? status,
      count: bucket.count,
      value: bucket.value,
    }))
    .sort((a, b) => b.value - a.value);

  const [
    leadCount,
    opportunityCount,
    costingCount,
    quoteCount,
    wonCount,
    orderCount,
  ] = funnelCounts;

  const funnel = [
    { key: "lead", label: EXECUTIVE_FUNNEL_LABELS.lead, count: leadCount },
    { key: "opportunity", label: EXECUTIVE_FUNNEL_LABELS.opportunity, count: opportunityCount, value: openPipelineValue },
    { key: "costing", label: EXECUTIVE_FUNNEL_LABELS.costing, count: costingCount },
    { key: "quote", label: EXECUTIVE_FUNNEL_LABELS.quote, count: quoteCount },
    { key: "won", label: EXECUTIVE_FUNNEL_LABELS.won, count: wonCount, value: wonValueThisMonth },
    { key: "order", label: EXECUTIVE_FUNNEL_LABELS.order, count: orderCount, value: orderValueThisMonth },
  ];

  const customerIds = topCustomerGroups
    .map((group) => group.customerId)
    .filter((id): id is string => id != null);

  const customers = customerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      })
    : [];

  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.name]));

  const topCustomers = topCustomerGroups
    .filter((group) => group.customerId != null)
    .map((group) => ({
      id: group.customerId!,
      name: customerNameById.get(group.customerId!) ?? "Khách hàng",
      value: decimalToNumber(group._sum.totalAmount),
      count: group._count.id,
      href: `/admin/crm/customers/${group.customerId}`,
    }));

  const productMap = new Map<string, { value: number; count: number }>();
  for (const item of quoteItemsThisMonth) {
    const label =
      item.productNameSnapshot?.trim() ||
      item.variantNameSnapshot?.trim() ||
      "Sản phẩm chưa đặt tên";
    const bucket = productMap.get(label) ?? { value: 0, count: 0 };
    bucket.value += decimalToNumber(item.lineTotal);
    bucket.count += item.quantity;
    productMap.set(label, bucket);
  }

  const topProducts = Array.from(productMap.entries())
    .map(([label, bucket]) => ({
      label,
      value: bucket.value,
      count: bucket.count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_LIMIT);

  const averageGrossMargin =
    marginRows.length > 0
      ? marginRows.reduce((sum, row) => sum + row.marginRate, 0) / marginRows.length
      : null;

  const highest = [...marginRows].sort((a, b) => b.marginRate - a.marginRate).slice(0, TOP_LIMIT);
  const lowest = [...marginRows].sort((a, b) => a.marginRate - b.marginRate).slice(0, TOP_LIMIT);

  const alerts = notificationCenter.notifications.slice(0, TOP_LIMIT).map((item) => ({
    id: item.id,
    title: item.title,
    severity: item.severity,
    href: item.href,
  }));

  return {
    kpis: {
      openPipelineValue,
      weightedForecastValue,
      wonValueThisMonth,
      quoteValueThisMonth,
      orderValueThisMonth,
      averageGrossMargin,
      overdueFollowUps: followUpCenter.stats.overdue,
      notificationCount: notificationCenter.stats.total,
    },
    deltas: {
      wonValueChangePct: pctChange(wonValueThisMonth, wonValuePreviousMonth),
      quoteValueChangePct: pctChange(quoteValueThisMonth, quoteValuePreviousMonth),
      orderValueChangePct: pctChange(orderValueThisMonth, orderValuePreviousMonth),
    },
    opportunityByStage,
    quoteByStatus,
    orderByStatus,
    funnel,
    followUp: {
      overdue: followUpCenter.stats.overdue,
      today: followUpCenter.stats.today,
      quoteExpiring: followUpCenter.stats.quoteExpiring,
      noResponse: followUpCenter.stats.noResponse,
      leadFollowUp: followUpCenter.stats.leadFollowUp,
    },
    topCustomers,
    topProducts,
    margin: {
      average: averageGrossMargin,
      highest,
      lowest,
    },
    alerts,
    generatedAt: now.toISOString(),
  };
}
