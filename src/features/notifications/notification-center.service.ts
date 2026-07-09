import { prisma } from "@/lib/prisma";
import { getSalesFollowUpCenter } from "@/features/sales/follow-up/follow-up.service";
import type { SalesFollowUpItem } from "@/features/sales/follow-up/types";
import type {
  NotificationCenterResponse,
  NotificationItem,
  NotificationSeverity,
  NotificationType,
} from "@/features/notifications/types";

const TOTAL_LIMIT = 100;
const QUOTE_NO_RESPONSE_DAYS = 3;
const TERMINAL_ORDER_STATUSES = ["COMPLETED", "CANCELLED"] as const;

const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

function buildStats(notifications: NotificationItem[]) {
  return {
    total: notifications.length,
    urgent: notifications.filter((item) => item.severity === "URGENT").length,
    high: notifications.filter((item) => item.severity === "HIGH").length,
    normal: notifications.filter((item) => item.severity === "NORMAL").length,
    low: notifications.filter((item) => item.severity === "LOW").length,
  };
}

function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severityDiff !== 0) return severityDiff;

    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function dedupeNotifications(items: NotificationItem[]): NotificationItem[] {
  const byKey = new Map<string, NotificationItem>();

  for (const item of items) {
    const key = item.entityType && item.entityId ? `${item.type}:${item.entityType}:${item.entityId}` : item.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    if (SEVERITY_RANK[item.severity] < SEVERITY_RANK[existing.severity]) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values());
}

function mapFollowUpItem(item: SalesFollowUpItem, now: Date): NotificationItem | null {
  if (item.type === "LEAD_FOLLOW_UP") return null;

  if (item.type === "QUOTE_NO_RESPONSE") {
    const reference = item.dueAt ? new Date(item.dueAt) : null;
    if (!reference || daysBetween(reference, now) < QUOTE_NO_RESPONSE_DAYS) return null;
  }

  const typeMap: Partial<Record<SalesFollowUpItem["type"], NotificationType>> = {
    OPPORTUNITY_OVERDUE: "OPPORTUNITY_OVERDUE",
    OPPORTUNITY_TODAY: "FOLLOW_UP_TODAY",
    QUOTE_EXPIRING: "QUOTE_EXPIRING",
    QUOTE_NO_RESPONSE: "QUOTE_NO_RESPONSE",
    ACTIVITY_FOLLOW_UP: "CRM_ACTIVITY",
  };

  const type = typeMap[item.type];
  if (!type) return null;

  const severityByType: Record<NotificationType, NotificationSeverity> = {
    OPPORTUNITY_OVERDUE: "URGENT",
    FOLLOW_UP_TODAY: "NORMAL",
    QUOTE_EXPIRING: "HIGH",
    QUOTE_NO_RESPONSE: "NORMAL",
    CRM_ACTIVITY: item.priority === "URGENT" || item.priority === "HIGH" ? item.priority : "NORMAL",
    READY_FOR_HANDOVER: "HIGH",
    NEW_ORDER: "LOW",
    ORDER_OVERDUE: "HIGH",
  };

  const entityType = item.opportunityId
    ? "OPPORTUNITY"
    : item.quoteId
      ? "QUOTE"
      : item.activityId
        ? "ACTIVITY"
        : undefined;

  const entityId = item.opportunityId ?? item.quoteId ?? item.activityId ?? undefined;

  return {
    id: `notification:${type}:${entityId ?? item.id}`,
    type,
    severity: severityByType[type],
    title: item.title,
    message: item.reason,
    href: item.href ?? (item.opportunityId ? `/admin/sales/opportunity/${item.opportunityId}` : "/admin/sales/follow-up"),
    entityType,
    entityId,
    createdAt: item.dueAt ?? now.toISOString(),
    dueAt: item.dueAt ?? null,
  };
}

async function fetchReadyForHandover(now: Date): Promise<NotificationItem[]> {
  const rows = await prisma.salesOpportunity.findMany({
    where: {
      stage: "WON",
      OR: [{ quoteId: null }, { quote: { is: { order: null } } }],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: TOTAL_LIMIT,
    include: {
      customer: { select: { name: true } },
      lead: { select: { companyName: true, company: true } },
      quote: { select: { id: true, quoteNo: true } },
    },
  });

  return rows.map((row) => ({
    id: `notification:READY_FOR_HANDOVER:OPPORTUNITY:${row.id}`,
    type: "READY_FOR_HANDOVER",
    severity: "HIGH",
    title: `${row.code} — ${row.title}`,
    message: "Cơ hội đã thắng nhưng chưa có đơn hàng liên kết.",
    href: `/admin/revenue/workspace/${row.id}`,
    entityType: "OPPORTUNITY",
    entityId: row.id,
    createdAt: (row.wonAt ?? row.updatedAt).toISOString(),
    dueAt: row.wonAt?.toISOString() ?? null,
  }));
}

async function fetchNewOrders(now: Date): Promise<NotificationItem[]> {
  const since = addDays(now, -1);

  const rows = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    orderBy: [{ createdAt: "desc" }],
    take: TOTAL_LIMIT,
    select: {
      id: true,
      orderNo: true,
      status: true,
      customerNameSnapshot: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: `notification:NEW_ORDER:ORDER:${row.id}`,
    type: "NEW_ORDER",
    severity: "LOW",
    title: row.orderNo,
    message: row.customerNameSnapshot
      ? `Đơn hàng mới từ ${row.customerNameSnapshot}.`
      : "Đơn hàng mới được tạo trong 24 giờ qua.",
    href: `/admin/orders/${row.id}`,
    entityType: "ORDER",
    entityId: row.id,
    createdAt: row.createdAt.toISOString(),
    dueAt: null,
  }));
}

async function fetchOrderOverdue(now: Date): Promise<NotificationItem[]> {
  const todayStart = startOfToday();

  const rows = await prisma.order.findMany({
    where: {
      deliveryExpectedAt: { not: null, lt: todayStart },
      status: { notIn: [...TERMINAL_ORDER_STATUSES] },
    },
    orderBy: [{ deliveryExpectedAt: "asc" }],
    take: TOTAL_LIMIT,
    select: {
      id: true,
      orderNo: true,
      status: true,
      customerNameSnapshot: true,
      deliveryExpectedAt: true,
      updatedAt: true,
    },
  });

  return rows.map((row) => {
    const dueAt = row.deliveryExpectedAt!;
    const overdueDays = daysBetween(dueAt, now);
    return {
      id: `notification:ORDER_OVERDUE:ORDER:${row.id}`,
      type: "ORDER_OVERDUE",
      severity: overdueDays >= 3 ? "URGENT" : "HIGH",
      title: row.orderNo,
      message: row.customerNameSnapshot
        ? `Quá hạn giao ${overdueDays} ngày · ${row.customerNameSnapshot}`
        : `Quá hạn giao ${overdueDays} ngày`,
      href: `/admin/orders/${row.id}`,
      entityType: "ORDER",
      entityId: row.id,
      createdAt: row.updatedAt.toISOString(),
      dueAt: dueAt.toISOString(),
    };
  });
}

function isNotificationRelatedToOpportunity(
  item: NotificationItem,
  context: {
    opportunityId: string;
    quoteId: string | null;
    leadId: string | null;
    customerId: string | null;
    orderId: string | null;
  },
): boolean {
  if (item.entityType === "OPPORTUNITY" && item.entityId === context.opportunityId) return true;
  if (context.quoteId && item.entityType === "QUOTE" && item.entityId === context.quoteId) return true;
  if (context.leadId && item.entityType === "LEAD" && item.entityId === context.leadId) return true;
  if (context.customerId && item.entityType === "CUSTOMER" && item.entityId === context.customerId) return true;
  if (context.orderId && item.entityType === "ORDER" && item.entityId === context.orderId) return true;
  return false;
}

export async function getNotificationCenter(): Promise<NotificationCenterResponse> {
  const now = new Date();

  const [followUpCenter, handoverItems, newOrders, overdueOrders] = await Promise.all([
    getSalesFollowUpCenter(),
    fetchReadyForHandover(now),
    fetchNewOrders(now),
    fetchOrderOverdue(now),
  ]);

  const followUpItems = followUpCenter.items
    .map((item) => mapFollowUpItem(item, now))
    .filter((item): item is NotificationItem => item != null);

  const notifications = sortNotifications(
    dedupeNotifications([...followUpItems, ...handoverItems, ...newOrders, ...overdueOrders]),
  ).slice(0, TOTAL_LIMIT);

  return {
    notifications,
    stats: buildStats(notifications),
  };
}

export async function getOpportunityRelatedNotifications(
  opportunityId: string,
  limit = 5,
): Promise<NotificationItem[]> {
  const opportunity = await prisma.salesOpportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      quoteId: true,
      leadId: true,
      customerId: true,
      quote: { select: { order: { select: { id: true } } } },
    },
  });

  if (!opportunity) return [];

  const center = await getNotificationCenter();
  const context = {
    opportunityId: opportunity.id,
    quoteId: opportunity.quoteId,
    leadId: opportunity.leadId,
    customerId: opportunity.customerId,
    orderId: opportunity.quote?.order?.id ?? null,
  };

  return center.notifications
    .filter((item) => isNotificationRelatedToOpportunity(item, context))
    .slice(0, limit);
}
