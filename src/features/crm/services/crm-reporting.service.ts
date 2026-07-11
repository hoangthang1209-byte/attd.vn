import type { CRMActivityType, LeadStatus, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CustomerReportResponse,
  CrmKpiCard,
  CrmReportFilters,
  LeadSourceReportResponse,
  OverviewReportResponse,
  PipelineReportResponse,
  SalesPerformanceRow,
  SalesReportResponse,
} from "@/features/crm/reporting.types";
import { CRM_SOURCE_LABELS, CRM_STATUS_LABELS } from "@/features/crm/labels";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { buildReportingScope } from "@/features/crm/services/crm-reporting-scope";

const ACTIVE_LEAD_STATUSES: LeadStatus[] = ["CONTACTED", "QUALIFIED", "NEED_PRICING", "QUOTED", "NEGOTIATING"];
const QUOTE_WAITING_STATUSES: QuoteStatus[] = ["SENT", "VIEWED"];
const LOST_STATUSES: LeadStatus[] = ["LOST", "NOT_FIT"];
const FOLLOWUP_ACTIVITY_TYPES: CRMActivityType[] = ["CALL", "EMAIL", "MEETING", "FOLLOW_UP", "ZALO"];

function sum(items: Array<number | null | undefined>) {
  return items.reduce<number>((acc, item) => acc + (item ?? 0), 0);
}

export async function getOverviewReport(
  session: AdminSessionUser,
  filters: CrmReportFilters,
): Promise<OverviewReportResponse> {
  const scope = buildReportingScope(session, filters);
  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 3600 * 1000);

  const [newLeads, dueToday, overdue, quoteWaiting, quoteExpiring, quoteConverted, crmOrders, newCustomers, customerRows, quoteValueAgg, orderValueAgg] =
    await Promise.all([
      prisma.lead.count({ where: { ...scope.leadWhere, status: "NEW" } }),
      prisma.lead.count({ where: { ...scope.leadWhere, nextFollowUpAt: { gte: now, lt: inThreeDays } } }),
      prisma.lead.count({ where: { ...scope.leadWhere, nextFollowUpAt: { lt: now }, status: { notIn: ["WON", "LOST", "NOT_FIT"] } } }),
      prisma.quote.count({ where: { ...scope.quoteWhere, status: { in: QUOTE_WAITING_STATUSES } } }),
      prisma.quote.count({ where: { ...scope.quoteWhere, status: { in: QUOTE_WAITING_STATUSES }, validUntil: { gte: now, lt: inThreeDays } } }),
      prisma.quote.count({ where: { ...scope.quoteWhere, order: { isNot: null } } }),
      prisma.order.count({ where: { ...scope.orderWhere, quoteId: { not: null } } }),
      prisma.customer.count({ where: scope.customerWhere }),
      prisma.customer.findMany({ where: scope.customerWhere, select: { id: true }, take: 5000 }),
      scope.meta.canViewFinancials ? prisma.quote.aggregate({ where: scope.quoteWhere, _sum: { totalAmount: true } }) : Promise.resolve(null),
      scope.meta.canViewFinancials ? prisma.order.aggregate({ where: scope.orderWhere, _sum: { totalAmount: true }, _avg: { totalAmount: true } }) : Promise.resolve(null),
    ]);

  const customerIds = customerRows.map((row) => row.id);
  const returningCustomers = customerIds.length
    ? await prisma.order.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customerIds }, createdAt: { lt: filters.to } },
        _count: { _all: true },
      }).then((rows) => rows.filter((row) => row._count._all > 1).length)
    : 0;

  const kpis: CrmKpiCard[] = [
    { key: "new_leads", label: "Lead mới", value: newLeads, href: "/admin/crm/leads?status=NEW", kind: "count" as const },
    { key: "due_today", label: "Lead cần chăm sóc hôm nay", value: dueToday, href: "/admin/crm/leads", kind: "count" as const },
    { key: "overdue", label: "Follow-up quá hạn", value: overdue, href: "/admin/crm/leads", kind: "count" as const },
    { key: "quote_waiting", label: "Báo giá chờ phản hồi", value: quoteWaiting, href: "/admin/quotes?status=SENT", kind: "count" as const },
    { key: "quote_expiring", label: "Báo giá sắp hết hạn", value: quoteExpiring, href: "/admin/quotes?status=VIEWED", kind: "count" as const },
    { key: "quote_converted", label: "Báo giá đã chuyển đơn", value: quoteConverted, href: "/admin/orders", kind: "count" as const },
    { key: "crm_orders", label: "Đơn hàng từ CRM", value: crmOrders, href: "/admin/orders", kind: "count" as const },
    { key: "new_customers", label: "Khách hàng mới", value: newCustomers, href: "/admin/crm/customers", kind: "count" as const },
    { key: "returning_customers", label: "Khách hàng quay lại", value: returningCustomers, href: "/admin/crm/customers", kind: "count" as const },
  ];

  if (scope.meta.canViewFinancials) {
    const quoteValue = quoteValueAgg?._sum.totalAmount?.toNumber() ?? 0;
    const orderValue = orderValueAgg?._sum.totalAmount?.toNumber() ?? 0;
    const avgOrderValue = orderValueAgg?._avg.totalAmount?.toNumber() ?? 0;
    kpis.push(
      { key: "quote_value", label: "Giá trị báo giá", value: quoteValue, href: "/admin/quotes", kind: "money" as const },
      { key: "order_value", label: "Giá trị đơn hàng từ CRM", value: orderValue, href: "/admin/orders", kind: "money" as const },
      { key: "avg_order_value", label: "Giá trị đơn hàng trung bình", value: avgOrderValue, href: "/admin/orders", kind: "money" as const },
      { key: "returning_value", label: "Giá trị khách hàng quay lại", value: orderValue, href: "/admin/crm/customers", kind: "money" as const },
    );
  }

  return { meta: scope.meta, kpis };
}

export async function getPipelineReport(
  session: AdminSessionUser,
  filters: CrmReportFilters,
): Promise<PipelineReportResponse> {
  const scope = buildReportingScope(session, filters);
  const now = new Date();
  const stages: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "NEED_PRICING", "QUOTED", "NEGOTIATING", "WON", "LOST", "NOT_FIT"];

  const [counts, overdueCounts, rowsForAging] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where: scope.leadWhere, _count: { _all: true } }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { ...scope.leadWhere, nextFollowUpAt: { lt: now }, status: { notIn: ["WON", "LOST", "NOT_FIT"] } },
      _count: { _all: true },
    }),
    prisma.lead.findMany({ where: scope.leadWhere, select: { createdAt: true, status: true, message: true }, take: 4000 }),
  ]);

  const countMap = new Map(counts.map((item) => [item.status, item._count._all]));
  const overdueMap = new Map(overdueCounts.map((item) => [item.status, item._count._all]));

  const byStage = stages.map((status) => ({
    status,
    label: CRM_STATUS_LABELS[status],
    count: countMap.get(status) ?? 0,
    overdueFollowUps: overdueMap.get(status) ?? 0,
    href: `/admin/crm/leads?status=${status}`,
  }));

  const aging = { "0-3": 0, "4-7": 0, "8-14": 0, "15+": 0 };
  const lossReasonMap = new Map<string, number>();

  rowsForAging.forEach((lead) => {
    const age = Math.floor((now.getTime() - lead.createdAt.getTime()) / (24 * 3600 * 1000));
    if (age <= 3) aging["0-3"] += 1;
    else if (age <= 7) aging["4-7"] += 1;
    else if (age <= 14) aging["8-14"] += 1;
    else aging["15+"] += 1;

    if (LOST_STATUSES.includes(lead.status) && lead.message) {
      const key = lead.message.split("\n")[0].trim().slice(0, 90);
      if (key) lossReasonMap.set(key, (lossReasonMap.get(key) ?? 0) + 1);
    }
  });

  return {
    meta: scope.meta,
    byStage,
    aging: [
      { bucket: "0-3", count: aging["0-3"] },
      { bucket: "4-7", count: aging["4-7"] },
      { bucket: "8-14", count: aging["8-14"] },
      { bucket: "15+", count: aging["15+"] },
    ],
    lossReasons: [...lossReasonMap.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    hasReliableStageConversion: false,
  };
}

export async function getSalesPerformanceReport(
  session: AdminSessionUser,
  filters: CrmReportFilters,
): Promise<SalesReportResponse> {
  const scope = buildReportingScope(session, filters);
  const ownerFilter = scope.scopedEmployeeId ? { id: scope.scopedEmployeeId } : { role: "SALES" as const };
  const employees = await prisma.employee.findMany({
    where: { ...ownerFilter, isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const rows: SalesPerformanceRow[] = await Promise.all(
    employees.map(async (employee) => {
      const [leadsAssigned, leadsContacted, leadsWon, leadsLost, followUpOverdue, activitiesCompleted, quotesCreated, quoteConvertedToOrders, customersCreated, ordersCreated, quoteValueAgg, orderValueAgg] =
        await Promise.all([
          prisma.lead.count({ where: { ...scope.leadWhere, assignedTo: employee.id } }),
          prisma.lead.count({ where: { ...scope.leadWhere, assignedTo: employee.id, status: { in: ACTIVE_LEAD_STATUSES } } }),
          prisma.lead.count({ where: { ...scope.leadWhere, assignedTo: employee.id, status: "WON" } }),
          prisma.lead.count({ where: { ...scope.leadWhere, assignedTo: employee.id, status: { in: LOST_STATUSES } } }),
          prisma.lead.count({ where: { ...scope.leadWhere, assignedTo: employee.id, nextFollowUpAt: { lt: new Date() }, status: { notIn: ["WON", "LOST", "NOT_FIT"] } } }),
          prisma.cRMActivity.count({ where: { createdAt: { gte: filters.from, lt: filters.to }, lead: { assignedTo: employee.id }, type: { in: FOLLOWUP_ACTIVITY_TYPES } } }),
          prisma.quote.count({ where: { ...scope.quoteWhere, OR: [{ lead: { assignedTo: employee.id } }, { salesRepresentative: { employeeId: employee.id } }] } }),
          prisma.quote.count({ where: { ...scope.quoteWhere, OR: [{ lead: { assignedTo: employee.id } }, { salesRepresentative: { employeeId: employee.id } }], order: { isNot: null } } }),
          prisma.customer.count({ where: { ...scope.customerWhere, leads: { some: { assignedTo: employee.id } } } }),
          prisma.order.count({ where: { ...scope.orderWhere, salesEmployeeId: employee.id, quoteId: { not: null } } }),
          scope.meta.canViewFinancials ? prisma.quote.aggregate({ where: { ...scope.quoteWhere, OR: [{ lead: { assignedTo: employee.id } }, { salesRepresentative: { employeeId: employee.id } }] }, _sum: { totalAmount: true } }) : Promise.resolve(null),
          scope.meta.canViewFinancials ? prisma.order.aggregate({ where: { ...scope.orderWhere, salesEmployeeId: employee.id }, _sum: { totalAmount: true }, _avg: { totalAmount: true } }) : Promise.resolve(null),
        ]);

      return {
        employeeId: employee.id,
        salesName: employee.fullName,
        leadsAssigned,
        leadsContacted,
        leadsWon,
        leadsLost,
        followUpOverdue,
        activitiesCompleted,
        quotesCreated,
        quotesConvertedToOrders: quoteConvertedToOrders,
        customersCreated,
        ordersCreatedFromCrm: ordersCreated,
        quoteValue: scope.meta.canViewFinancials ? quoteValueAgg?._sum.totalAmount?.toNumber() ?? 0 : null,
        orderValue: scope.meta.canViewFinancials ? orderValueAgg?._sum.totalAmount?.toNumber() ?? 0 : null,
        averageOrderValue: scope.meta.canViewFinancials ? orderValueAgg?._avg.totalAmount?.toNumber() ?? 0 : null,
        leadsHref: `/admin/crm/leads`,
        quotesHref: `/admin/quotes`,
        ordersHref: `/admin/orders`,
      };
    }),
  );

  return { meta: scope.meta, rows };
}

export async function getLeadSourceReport(
  session: AdminSessionUser,
  filters: CrmReportFilters,
): Promise<LeadSourceReportResponse> {
  const scope = buildReportingScope(session, filters);
  const rows = await prisma.lead.groupBy({
    by: ["source"],
    where: scope.leadWhere,
    _count: { _all: true },
  });

  const mapped = await Promise.all(
    rows.map(async (row) => {
      const sourceWhere = { ...scope.leadWhere, source: row.source };
      const [activeLeads, wonLeads, lostLeads, quotesCreated, ordersCreated, quoteValueAgg] = await Promise.all([
        prisma.lead.count({ where: { ...sourceWhere, status: { in: ACTIVE_LEAD_STATUSES } } }),
        prisma.lead.count({ where: { ...sourceWhere, status: "WON" } }),
        prisma.lead.count({ where: { ...sourceWhere, status: { in: LOST_STATUSES } } }),
        prisma.quote.count({ where: { ...scope.quoteWhere, lead: { source: row.source } } }),
        prisma.order.count({ where: { ...scope.orderWhere, quote: { is: { lead: { is: { source: row.source } } } } } }),
        scope.meta.canViewFinancials ? prisma.order.aggregate({ where: { ...scope.orderWhere, quote: { is: { lead: { is: { source: row.source } } } } }, _sum: { totalAmount: true } }) : Promise.resolve(null),
      ]);

      return {
        source: row.source,
        label: CRM_SOURCE_LABELS[row.source] ?? row.source,
        newLeads: row._count._all,
        activeLeads,
        wonLeads,
        lostLeads,
        quotesCreated,
        ordersCreated,
        conversionRate: row._count._all > 0 ? ordersCreated / row._count._all : null,
        financialValue: scope.meta.canViewFinancials ? quoteValueAgg?._sum?.totalAmount?.toNumber() ?? 0 : null,
        href: `/admin/crm/leads?source=${row.source}`,
      };
    }),
  );

  mapped.sort((a, b) => b.newLeads - a.newLeads);
  return { meta: scope.meta, rows: mapped };
}

export async function getCustomerReport(
  session: AdminSessionUser,
  filters: CrmReportFilters,
): Promise<CustomerReportResponse> {
  const scope = buildReportingScope(session, filters);
  const customerRows = await prisma.customer.findMany({
    where: scope.customerWhere,
    select: { id: true, name: true, legacyType: true, leads: { select: { source: true }, take: 1 } },
    take: 5000,
  });
  const customerIds = customerRows.map((row) => row.id);
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const d60 = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
  const d90 = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

  const [ordersByCustomer, activeQuoteCustomers, overdueFollowupCustomers, typeBreakdown, topOrders] = await Promise.all([
    customerIds.length
      ? prisma.order.groupBy({ by: ["customerId"], where: { customerId: { in: customerIds }, ...scope.orderWhere }, _count: { _all: true }, _sum: { totalAmount: true } })
      : Promise.resolve([]),
    customerIds.length ? prisma.quote.groupBy({ by: ["customerId"], where: { customerId: { in: customerIds }, status: { in: QUOTE_WAITING_STATUSES } }, _count: { _all: true } }) : Promise.resolve([]),
    customerIds.length ? prisma.lead.groupBy({ by: ["customerId"], where: { customerId: { in: customerIds }, nextFollowUpAt: { lt: now }, status: { notIn: ["WON", "LOST", "NOT_FIT"] } }, _count: { _all: true } }) : Promise.resolve([]),
    prisma.customer.groupBy({ by: ["legacyType"], where: scope.customerWhere, _count: { _all: true } }),
    customerIds.length ? prisma.order.groupBy({ by: ["customerId"], where: { customerId: { in: customerIds }, ...scope.orderWhere }, _count: { _all: true }, _sum: { totalAmount: true } }) : Promise.resolve([]),
  ]);

  const orderCountMap = new Map(ordersByCustomer.map((row) => [row.customerId ?? "", row._count._all]));
  const activeQuoteSet = new Set(activeQuoteCustomers.map((row) => row.customerId ?? ""));
  const overdueSet = new Set(overdueFollowupCustomers.map((row) => row.customerId ?? ""));
  const returningCustomers = [...orderCountMap.values()].filter((count) => count > 1).length;

  const inactivity = [
    { label: "Không tương tác 30 ngày", threshold: d30, key: "30d" },
    { label: "Không tương tác 60 ngày", threshold: d60, key: "60d" },
    { label: "Không tương tác 90 ngày", threshold: d90, key: "90d" },
  ];

  const activityRows = customerIds.length
    ? await prisma.cRMActivity.groupBy({ by: ["customerId"], where: { customerId: { in: customerIds } }, _max: { createdAt: true } })
    : [];
  const activityMap = new Map(activityRows.map((row) => [row.customerId ?? "", row._max.createdAt ?? null]));

  const inactivityStats = inactivity.map((item) => ({
    label: item.label,
    count: customerIds.filter((id) => {
      const last = activityMap.get(id);
      return !last || last < item.threshold;
    }).length,
    href: "/admin/crm/customers",
  }));

  const sourceBreakdown = customerRows.reduce<Map<string, number>>((acc, row) => {
    const source = row.leads[0]?.source ?? "OTHER";
    acc.set(source, (acc.get(source) ?? 0) + 1);
    return acc;
  }, new Map());

  const topCustomers = topOrders
    .filter((row) => row.customerId)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 10)
    .map((row) => {
      const customer = customerRows.find((item) => item.id === row.customerId);
      return {
        customerId: row.customerId!,
        name: customer?.name ?? "Khách hàng",
        orderCount: row._count._all,
        value: scope.meta.canViewFinancials ? row._sum.totalAmount?.toNumber() ?? 0 : null,
        href: `/admin/crm/customers/${row.customerId}`,
      };
    });

  const kpis = [
    { key: "new", label: "Khách hàng mới", value: customerRows.length, href: "/admin/crm/customers" },
    { key: "returning", label: "Khách hàng quay lại", value: returningCustomers, href: "/admin/crm/customers" },
    { key: "active_quote", label: "Khách có báo giá đang mở", value: activeQuoteSet.size, href: "/admin/quotes" },
    { key: "overdue_followup", label: "Khách có follow-up quá hạn", value: overdueSet.size, href: "/admin/crm/leads" },
  ];

  return {
    meta: scope.meta,
    kpis,
    inactivity: inactivityStats,
    typeBreakdown: typeBreakdown.map((row) => ({ type: row.legacyType, count: row._count._all })),
    sourceBreakdown: [...sourceBreakdown.entries()].map(([source, count]) => ({ source, count })),
    topCustomers,
  };
}

export function serializeReportForCsv(rows: Array<Record<string, string | number | null>>, headers: string[]) {
  const escaped = (value: string | number | null) => {
    const raw = value == null ? "" : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };
  const csvRows = [headers.map(escaped).join(",")];
  rows.forEach((row) => {
    csvRows.push(headers.map((header) => escaped(row[header] ?? "")).join(","));
  });
  return csvRows.join("\n");
}

export function sumSalesFinancials(rows: SalesPerformanceRow[]) {
  return {
    quote: sum(rows.map((row) => row.quoteValue)),
    order: sum(rows.map((row) => row.orderValue)),
  };
}
