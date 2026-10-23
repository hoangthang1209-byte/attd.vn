import type { LeadSource, LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { marketingChannelLabel } from "@/features/growth/marketing-taxonomy";
import { normalizeMarketingAttribution } from "@/features/growth/normalize-attribution";
import type {
  GrowthChannelRow,
  GrowthDashboardKpi,
  GrowthDashboardResponse,
  GrowthReportFilters,
} from "@/features/growth/growth-dashboard.types";
import { growthDashboardMeta } from "@/features/growth/services/growth-reporting-scope";

const QUALIFIED_STATUSES: LeadStatus[] = [
  "QUALIFIED",
  "NEED_PRICING",
  "QUOTED",
  "NEGOTIATING",
  "WON",
];

type LeadSlice = {
  id: string;
  status: LeadStatus;
  source: LeadSource;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  landingPage: string | null;
  marketingChannel: string | null;
  marketingCampaign: string | null;
};

function rowKey(channel: string, campaign: string | null) {
  return `${channel}::${campaign ?? ""}`;
}

function resolveChannel(lead: LeadSlice): string {
  if (lead.marketingChannel?.trim()) return lead.marketingChannel.trim();
  return normalizeMarketingAttribution({
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    referrer: lead.referrer,
    landingPage: lead.landingPage,
    leadSource: lead.source,
  }).marketingChannel;
}

function resolveCampaign(lead: LeadSlice): string | null {
  if (lead.marketingCampaign?.trim()) return lead.marketingCampaign.trim();
  return normalizeMarketingAttribution({
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    referrer: lead.referrer,
    leadSource: lead.source,
  }).marketingCampaign;
}

function campaignLabel(campaign: string | null): string {
  if (!campaign) return "—";
  return campaign.replace(/-/g, " ");
}

export async function getGrowthDashboardReport(
  session: AdminSessionUser,
  filters: GrowthReportFilters,
): Promise<GrowthDashboardResponse> {
  const meta = growthDashboardMeta(session);

  const leads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: filters.from, lt: filters.to },
      ...(filters.marketingChannel ? { marketingChannel: filters.marketingChannel } : {}),
    },
    select: {
      id: true,
      status: true,
      source: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      referrer: true,
      landingPage: true,
      marketingChannel: true,
      marketingCampaign: true,
    },
    take: 15000,
  });

  const leadIds = leads.map((l) => l.id);
  const bucket = new Map<
    string,
    {
      channel: string;
      campaign: string | null;
      leadIds: Set<string>;
      qualified: number;
      leads: number;
    }
  >();

  for (const lead of leads) {
    const channel = resolveChannel(lead);
    const campaign = resolveCampaign(lead);
    const key = rowKey(channel, campaign);
    let entry = bucket.get(key);
    if (!entry) {
      entry = { channel, campaign, leadIds: new Set(), qualified: 0, leads: 0 };
      bucket.set(key, entry);
    }
    entry.leads += 1;
    entry.leadIds.add(lead.id);
    if (QUALIFIED_STATUSES.includes(lead.status)) {
      entry.qualified += 1;
    }
  }

  const [quoteGroups, orderRows] = leadIds.length
    ? await Promise.all([
        prisma.quote.groupBy({
          by: ["leadId"],
          where: { leadId: { in: leadIds } },
          _count: { _all: true },
        }),
        prisma.order.findMany({
          where: { quote: { leadId: { in: leadIds } } },
          select: {
            totalAmount: true,
            quote: { select: { leadId: true } },
          },
        }),
      ])
    : [[], []];

  const quotesByLead = new Map(
    quoteGroups.filter((r) => r.leadId).map((r) => [r.leadId!, r._count._all]),
  );
  const ordersByLead = new Map<string, { count: number; revenue: number }>();
  for (const order of orderRows) {
    const leadId = order.quote?.leadId;
    if (!leadId) continue;
    const existing = ordersByLead.get(leadId) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    if (meta.canViewFinancials) {
      existing.revenue += order.totalAmount.toNumber();
    }
    ordersByLead.set(leadId, existing);
  }

  const rows: GrowthChannelRow[] = [];

  for (const entry of bucket.values()) {
    let quotations = 0;
    let orders = 0;
    let revenue = 0;
    for (const id of entry.leadIds) {
      quotations += quotesByLead.get(id) ?? 0;
      const order = ordersByLead.get(id);
      if (order) {
        orders += order.count;
        revenue += order.revenue;
      }
    }
    const conversionRate = entry.leads > 0 ? orders / entry.leads : null;
    const params = new URLSearchParams();
    if (entry.channel) params.set("marketingChannel", entry.channel);
    if (entry.campaign) params.set("marketingCampaign", entry.campaign);

    rows.push({
      channel: entry.channel,
      channelLabel: marketingChannelLabel(entry.channel),
      campaign: entry.campaign,
      campaignLabel: campaignLabel(entry.campaign),
      leads: entry.leads,
      qualifiedLeads: entry.qualified,
      quotations,
      orders,
      revenue: meta.canViewFinancials ? revenue : null,
      conversionRate,
      href: `/admin/crm/leads?${params.toString()}`,
    });
  }

  rows.sort((a, b) => b.leads - a.leads || b.orders - a.orders);

  const totals = rows.reduce(
    (acc, row) => ({
      leads: acc.leads + row.leads,
      qualified: acc.qualified + row.qualifiedLeads,
      quotations: acc.quotations + row.quotations,
      orders: acc.orders + row.orders,
      revenue: acc.revenue + (row.revenue ?? 0),
    }),
    { leads: 0, qualified: 0, quotations: 0, orders: 0, revenue: 0 },
  );

  const kpis: GrowthDashboardKpi[] = [
    { key: "leads", label: "Lead", value: totals.leads, kind: "count", href: "/admin/crm/leads" },
    {
      key: "qualified",
      label: "Lead đủ điều kiện",
      value: totals.qualified,
      kind: "count",
      href: "/admin/crm/leads?status=QUALIFIED",
    },
    {
      key: "quotations",
      label: "Báo giá",
      value: totals.quotations,
      kind: "count",
      href: "/admin/quotes",
    },
    {
      key: "orders",
      label: "Đơn hàng",
      value: totals.orders,
      kind: "count",
      href: "/admin/orders",
    },
  ];

  if (meta.canViewFinancials) {
    kpis.push({
      key: "revenue",
      label: "Doanh thu (đơn gắn lead)",
      value: totals.revenue,
      kind: "money",
      href: "/admin/orders",
    });
  }

  return {
    meta: {
      rangeLabel: filters.rangeLabel,
      canViewFinancials: meta.canViewFinancials,
    },
    kpis,
    rows,
  };
}
