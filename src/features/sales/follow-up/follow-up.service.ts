import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SALES_OPPORTUNITY_STAGE_LABELS } from "@/features/sales/opportunities/labels";
import { getQuoteStatusLabel } from "@/features/quotes/labels";
import { resolveQuoteDisplayAmount } from "@/features/quotes/quote-amount";
import { getLeadStatusLabel } from "@/features/crm/labels";
import type {
  SalesFollowUpCenterResult,
  SalesFollowUpItem,
  SalesFollowUpPriority,
  SalesFollowUpType,
} from "@/features/sales/follow-up/types";

const SOURCE_LIMIT = 100;
const TERMINAL_OPPORTUNITY_STAGES = ["WON", "LOST"] as const;
const TERMINAL_LEAD_STATUSES = ["WON", "LOST", "NOT_FIT"] as const;
const ACTIVE_QUOTE_STATUSES = ["DRAFT", "SENT", "VIEWED"] as const;

const PRIORITY_RANK: Record<SalesFollowUpPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday(): Date {
  const end = startOfToday();
  end.setDate(end.getDate() + 1);
  return end;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function overduePriority(dueAt: Date, now = new Date()): SalesFollowUpPriority {
  const days = daysBetween(dueAt, now);
  if (days >= 3) return "URGENT";
  if (days >= 1) return "HIGH";
  return "NORMAL";
}

function resolveLeadFollowUpAt(lead: {
  nextFollowUpAt: Date | null;
  followUpAt: Date | null;
}): Date | null {
  return lead.nextFollowUpAt ?? lead.followUpAt;
}

function dedupeItems(items: SalesFollowUpItem[]): SalesFollowUpItem[] {
  const byEntity = new Map<string, SalesFollowUpItem>();

  for (const item of items) {
    const key =
      item.opportunityId != null
        ? `opp:${item.opportunityId}`
        : item.quoteId != null
          ? `quote:${item.quoteId}`
          : item.leadId != null
            ? `lead:${item.leadId}`
            : item.activityId != null
              ? `activity:${item.activityId}`
              : item.id;

    const existing = byEntity.get(key);
    if (!existing) {
      byEntity.set(key, item);
      continue;
    }

    const existingRank = PRIORITY_RANK[existing.priority];
    const nextRank = PRIORITY_RANK[item.priority];
    if (nextRank < existingRank) {
      byEntity.set(key, item);
      continue;
    }
    if (nextRank === existingRank) {
      const existingDue = existing.dueAt ? new Date(existing.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const nextDue = item.dueAt ? new Date(item.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (nextDue < existingDue) byEntity.set(key, item);
    }
  }

  return Array.from(byEntity.values());
}

function sortItems(items: SalesFollowUpItem[]): SalesFollowUpItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;

    const aAmount = a.amount ?? 0;
    const bAmount = b.amount ?? 0;
    return bAmount - aAmount;
  });
}

function buildStats(items: SalesFollowUpItem[]) {
  return {
    total: items.length,
    urgent: items.filter((item) => item.priority === "URGENT").length,
    overdue: items.filter((item) =>
      item.type === "OPPORTUNITY_OVERDUE" ||
      (item.type === "LEAD_FOLLOW_UP" && item.dueAt && new Date(item.dueAt) < startOfToday()),
    ).length,
    today: items.filter((item) => item.type === "OPPORTUNITY_TODAY").length,
    quoteExpiring: items.filter((item) => item.type === "QUOTE_EXPIRING").length,
    noResponse: items.filter((item) => item.type === "QUOTE_NO_RESPONSE").length,
    leadFollowUp: items.filter((item) => item.type === "LEAD_FOLLOW_UP").length,
  };
}

async function fetchOpportunityFollowUps(now: Date): Promise<SalesFollowUpItem[]> {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [overdueRows, todayRows] = await Promise.all([
    prisma.salesOpportunity.findMany({
      where: {
        stage: { notIn: [...TERMINAL_OPPORTUNITY_STAGES] },
        nextFollowUpAt: { lt: todayStart },
      },
      orderBy: [{ nextFollowUpAt: "asc" }],
      take: SOURCE_LIMIT,
      include: { lead: true, customer: true, contact: true, quote: true },
    }),
    prisma.salesOpportunity.findMany({
      where: {
        stage: { notIn: [...TERMINAL_OPPORTUNITY_STAGES] },
        nextFollowUpAt: { gte: todayStart, lt: todayEnd },
      },
      orderBy: [{ nextFollowUpAt: "asc" }],
      take: SOURCE_LIMIT,
      include: { lead: true, customer: true, contact: true, quote: true },
    }),
  ]);

  const mapRow = (
    row: (typeof overdueRows)[number],
    type: SalesFollowUpType,
    priority: SalesFollowUpPriority,
    reason: string,
  ): SalesFollowUpItem => ({
    id: `${type}:${row.id}`,
    type,
    priority,
    title: `${row.code} — ${row.title}`,
    subtitle: SALES_OPPORTUNITY_STAGE_LABELS[row.stage],
    dueAt: row.nextFollowUpAt?.toISOString() ?? null,
    amount: decimalToNumber(row.estimatedValue),
    customerLabel: row.customer?.name ?? row.lead?.companyName ?? row.lead?.company ?? null,
    contactLabel:
      row.contact?.fullName ??
      row.lead?.contactName ??
      row.lead?.fullName ??
      row.customer?.name ??
      null,
    phone: row.lead?.phone ?? row.contact?.phone ?? row.customer?.phone ?? null,
    email: row.lead?.email ?? row.contact?.email ?? row.customer?.email ?? null,
    zalo: row.lead?.zalo ?? null,
    opportunityId: row.id,
    leadId: row.leadId,
    quoteId: row.quoteId,
    href: `/admin/sales/opportunity/${row.id}`,
    reason,
  });

  return [
    ...overdueRows.map((row) =>
      mapRow(
        row,
        "OPPORTUNITY_OVERDUE",
        overduePriority(row.nextFollowUpAt!, now),
        `Quá hạn follow-up ${daysBetween(row.nextFollowUpAt!, now)} ngày`,
      ),
    ),
    ...todayRows.map((row) =>
      mapRow(row, "OPPORTUNITY_TODAY", "NORMAL", "Cần follow-up hôm nay"),
    ),
  ];
}

async function fetchQuoteFollowUps(now: Date): Promise<SalesFollowUpItem[]> {
  const threeDaysLater = addDays(now, 3);
  const twoDaysAgo = addDays(now, -2);
  const threeDaysAgo = addDays(now, -3);

  const [expiringRows, noResponseRows] = await Promise.all([
    prisma.quote.findMany({
      where: {
        status: { in: [...ACTIVE_QUOTE_STATUSES] },
        validUntil: { not: null, lte: threeDaysLater, gte: now },
      },
      orderBy: [{ validUntil: "asc" }],
      take: SOURCE_LIMIT,
      include: { lead: true, customer: true, contact: true },
    }),
    prisma.quote.findMany({
      where: {
        status: { in: ["SENT", "VIEWED"] },
        OR: [
          { sentAt: { lt: twoDaysAgo } },
          { sentAt: null, createdAt: { lt: threeDaysAgo } },
        ],
      },
      orderBy: [{ sentAt: "asc" }, { createdAt: "asc" }],
      take: SOURCE_LIMIT,
      include: { lead: true, customer: true, contact: true },
    }),
  ]);

  const mapQuote = (
    row: (typeof expiringRows)[number],
    type: SalesFollowUpType,
    priority: SalesFollowUpPriority,
    reason: string,
    dueAt: Date | null,
  ): SalesFollowUpItem => ({
    id: `${type}:${row.id}`,
    type,
    priority,
    title: row.title?.trim() || row.quoteNo,
    subtitle: getQuoteStatusLabel(row.status),
    dueAt: dueAt?.toISOString() ?? null,
    amount: resolveQuoteDisplayAmount(row),
    customerLabel:
      row.customerCompanySnapshot ??
      row.customer?.name ??
      row.lead?.companyName ??
      row.lead?.company ??
      null,
    contactLabel:
      row.customerContactNameSnapshot ??
      row.contact?.fullName ??
      row.lead?.contactName ??
      row.lead?.fullName ??
      null,
    phone: row.customerPhoneSnapshot ?? row.lead?.phone ?? row.contact?.phone ?? row.customer?.phone ?? null,
    email: row.customerEmailSnapshot ?? row.lead?.email ?? row.contact?.email ?? row.customer?.email ?? null,
    zalo: row.lead?.zalo ?? null,
    leadId: row.leadId,
    quoteId: row.id,
    href: `/admin/quotes/${row.id}`,
    reason,
  });

  return [
    ...expiringRows.map((row) => {
      const daysLeft = row.validUntil ? daysBetween(now, row.validUntil) : 0;
      const priority: SalesFollowUpPriority = daysLeft <= 0 ? "URGENT" : daysLeft <= 1 ? "HIGH" : "NORMAL";
      return mapQuote(
        row,
        "QUOTE_EXPIRING",
        priority,
        daysLeft <= 0 ? "Báo giá hết hạn hôm nay" : `Còn ${daysLeft} ngày đến hạn`,
        row.validUntil,
      );
    }),
    ...noResponseRows.map((row) => {
      const reference = row.sentAt ?? row.createdAt;
      const daysSilent = daysBetween(reference, now);
      const priority: SalesFollowUpPriority = daysSilent >= 5 ? "URGENT" : daysSilent >= 3 ? "HIGH" : "NORMAL";
      return mapQuote(
        row,
        "QUOTE_NO_RESPONSE",
        priority,
        row.sentAt
          ? `Đã gửi ${daysSilent} ngày, chưa phản hồi`
          : `Tạo ${daysSilent} ngày, chưa gửi/phản hồi`,
        row.sentAt ?? row.createdAt,
      );
    }),
  ];
}

async function fetchLeadFollowUps(now: Date): Promise<SalesFollowUpItem[]> {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const rows = await prisma.lead.findMany({
    where: {
      status: { notIn: [...TERMINAL_LEAD_STATUSES] },
      OR: [
        { nextFollowUpAt: { lte: todayEnd } },
        { nextFollowUpAt: null, followUpAt: { lte: todayEnd } },
      ],
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { followUpAt: "asc" }],
    take: SOURCE_LIMIT,
    include: { customer: true },
  });

  const items: SalesFollowUpItem[] = [];

  for (const row of rows) {
    const dueAt = resolveLeadFollowUpAt(row);
    if (!dueAt) continue;

    const isOverdue = dueAt < todayStart;
    const isToday = dueAt >= todayStart && dueAt < todayEnd;
    if (!isOverdue && !isToday) continue;

    items.push({
      id: `LEAD_FOLLOW_UP:${row.id}`,
      type: "LEAD_FOLLOW_UP",
      priority: isOverdue ? overduePriority(dueAt, now) : "NORMAL",
      title: row.fullName,
      subtitle: getLeadStatusLabel(row.status),
      dueAt: dueAt.toISOString(),
      amount: decimalToNumber(row.estimatedValue),
      customerLabel: row.companyName ?? row.company ?? row.customer?.name ?? null,
      contactLabel: row.contactName ?? row.fullName,
      phone: row.phone,
      email: row.email,
      zalo: row.zalo,
      leadId: row.id,
      href: `/admin/crm/leads/${row.id}`,
      reason: isOverdue
        ? `Lead quá hạn follow-up ${daysBetween(dueAt, now)} ngày`
        : "Lead cần follow-up hôm nay",
    });
  }

  return items;
}

async function fetchActivityFollowUps(): Promise<SalesFollowUpItem[]> {
  const todayEnd = endOfToday();

  const rows = await prisma.cRMActivity.findMany({
    where: {
      nextFollowUpAt: { not: null, lte: todayEnd },
    },
    orderBy: [{ nextFollowUpAt: "asc" }],
    take: SOURCE_LIMIT,
    include: { lead: true, customer: true, contact: true },
  });

  const todayStart = startOfToday();
  const now = new Date();

  return rows.map((row) => {
    const dueAt = row.nextFollowUpAt!;
    const isOverdue = dueAt < todayStart;
    return {
      id: `ACTIVITY_FOLLOW_UP:${row.id}`,
      type: "ACTIVITY_FOLLOW_UP" as const,
      priority: isOverdue ? overduePriority(dueAt, now) : "LOW",
      title: row.title,
      subtitle: row.lead?.fullName ?? row.customer?.name ?? row.contact?.fullName ?? null,
      dueAt: dueAt.toISOString(),
      amount: decimalToNumber(row.lead?.estimatedValue),
      customerLabel: row.customer?.name ?? row.lead?.companyName ?? row.lead?.company ?? null,
      contactLabel: row.contact?.fullName ?? row.lead?.contactName ?? row.lead?.fullName ?? null,
      phone: row.lead?.phone ?? row.contact?.phone ?? row.customer?.phone ?? null,
      email: row.lead?.email ?? row.contact?.email ?? row.customer?.email ?? null,
      zalo: row.lead?.zalo ?? null,
      leadId: row.leadId,
      activityId: row.id,
      href: row.leadId
        ? `/admin/crm/leads/${row.leadId}`
        : row.customerId
          ? `/admin/crm/customers/${row.customerId}`
          : row.contact?.customerId
            ? `/admin/crm/customers/${row.contact.customerId}`
            : null,
      reason: isOverdue ? "Nhắc follow-up từ hoạt động CRM (quá hạn)" : "Nhắc follow-up từ hoạt động CRM",
    } satisfies SalesFollowUpItem;
  });
}

export async function getSalesFollowUpCenter(): Promise<SalesFollowUpCenterResult> {
  const now = new Date();

  const [opportunities, quotes, leads, activities] = await Promise.all([
    fetchOpportunityFollowUps(now),
    fetchQuoteFollowUps(now),
    fetchLeadFollowUps(now),
    fetchActivityFollowUps(),
  ]);

  const items = sortItems(dedupeItems([...opportunities, ...quotes, ...leads, ...activities]));

  return {
    items,
    stats: buildStats(items),
  };
}
